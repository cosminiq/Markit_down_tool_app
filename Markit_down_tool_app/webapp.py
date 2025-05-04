"""
Markdown Converter Web App
A Flask application that converts various file formats to Markdown
"""
import os
import re
import tempfile
import io
from typing import Tuple, Dict, List, Optional, Any
from dataclasses import dataclass
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from markitdown import MarkItDown

# Core domain models
@dataclass
class ConversionResult:
    """Result of a conversion operation"""
    content: str
    filename: str
    success: bool
    error_message: Optional[str] = None

class FileConverter:
    """Base converter class for file-to-markdown conversion"""
    def convert(self, file_path: str) -> ConversionResult:
        """Convert a file to markdown"""
        raise NotImplementedError("Subclasses must implement convert method")

class MarkItDownConverter(FileConverter):
    """Converter implementation using MarkItDown library"""
    def __init__(self, enable_plugins: bool = False):
        self.md = MarkItDown(enable_plugins=enable_plugins)
    
    def convert(self, file_path: str) -> ConversionResult:
        try:
            result = self.md.convert(file_path)
            base_name = os.path.basename(file_path)
            filename = os.path.splitext(base_name)[0] + ".md"
            return ConversionResult(
                content=result.text_content,
                filename=filename,
                success=True
            )
        except Exception as e:
            return ConversionResult(
                content="",
                filename="",
                success=False,
                error_message=str(e)
            )

class YouTubeURLValidator:
    """Validates and extracts information from YouTube URLs"""
    @staticmethod
    def is_valid(url: str) -> bool:
        """Check if a URL is a valid YouTube URL"""
        youtube_regex = r"^(https?://)?(www\.)?(youtube\.com|youtu\.?be)/.+$"
        return bool(re.match(youtube_regex, url))
    
    @staticmethod
    def extract_id(url: str) -> Optional[str]:
        """Extract the YouTube video ID from a URL"""
        patterns = [
            r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",  # Standard YouTube URLs
            r"(?:youtu\.be\/)([0-9A-Za-z_-]{11})",  # Short YouTube URLs
            r"(?:embed\/)([0-9A-Za-z_-]{11})",  # Embedded YouTube URLs
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

class SupportedFormats:
    """Registry of supported file formats"""
    @staticmethod
    def get_formats() -> Dict[str, Dict[str, Any]]:
        """Get a dictionary of supported file formats categorized by type"""
        return {
            "📝 Documents": {
                "formats": ["Word (.docx, .doc)", "PDF", "EPub"],
                "extensions": ["docx", "doc", "pdf", "epub"],
            },
            "📊 Spreadsheets": {
                "formats": ["Excel (.xlsx, .xls)"],
                "extensions": ["xlsx", "xls"],
            },
            "📊 Presentations": {
                "formats": ["PowerPoint (.pptx, .ppt)"],
                "extensions": ["pptx", "ppt"],
            },
            "🌐 Web": {"formats": ["HTML", "YouTube URLs"], "extensions": ["html", "htm"]},
            "📁 Others": {
                "formats": ["CSV", "JSON", "XML", "ZIP (iterates over contents)"],
                "extensions": ["csv", "json", "xml", "zip"],
            },
        }
    
    @staticmethod
    def get_all_extensions() -> List[str]:
        """Get a flat list of all supported file extensions"""
        all_extensions = []
        formats = SupportedFormats.get_formats()
        for category, info in formats.items():
            all_extensions.extend(info["extensions"])
        return all_extensions

# Services
class FileService:
    """Service for handling file operations"""
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Extract the file extension from a filename"""
        return filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    
    @staticmethod
    def create_temp_file(file_data: bytes, extension: str) -> str:
        """Create a temporary file with the given data and extension"""
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{extension}") as tmp_file:
            tmp_file.write(file_data)
            return tmp_file.name

class ConversionService:
    """Service for handling conversions"""
    def __init__(self):
        self.converter = MarkItDownConverter(enable_plugins=False)
    
    def convert_file(self, file_data: bytes, filename: str) -> ConversionResult:
        """Convert a file to Markdown"""
        try:
            # Create a temporary file
            ext = FileService.get_file_extension(filename)
            temp_file_path = FileService.create_temp_file(file_data, ext)
            
            # Convert the file
            result = self.converter.convert(temp_file_path)
            
            # Clean up
            os.unlink(temp_file_path)
            
            # Set the output filename
            if result.success:
                result.filename = filename.rsplit(".", 1)[0] + ".md"
            
            return result
        except Exception as e:
            return ConversionResult(
                content="",
                filename="",
                success=False,
                error_message=str(e)
            )
    
    def convert_youtube_url(self, url: str) -> ConversionResult:
        """Convert a YouTube URL to Markdown"""
        try:
            # Convert the URL directly
            result = self.converter.convert(url)
            
            # Set the output filename
            if result.success:
                video_id = YouTubeURLValidator.extract_id(url)
                result.filename = f"youtube_{video_id}.md" if video_id else "youtube_video.md"
            
            return result
        except Exception as e:
            return ConversionResult(
                content="",
                filename="",
                success=False,
                error_message=str(e)
            )

# API Handlers
class APIResponse:
    """Helper class for consistent API responses"""
    @staticmethod
    def success(data: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
        """Create a successful API response"""
        return jsonify(data), 200
    
    @staticmethod
    def error(message: str, status_code: int = 400) -> Tuple[Dict[str, str], int]:
        """Create an error API response"""
        return jsonify({"error": message}), status_code

# Create static folder if it doesn't exist
static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
if not os.path.exists(static_folder):
    os.makedirs(static_folder)

# Flask application setup
app = Flask(__name__, static_folder='static')
conversion_service = ConversionService()

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html', formats=SupportedFormats.get_formats())

# Serve static files
@app.route('/style.css')
def serve_css():
    return send_from_directory('static', 'style.css')

@app.route('/script.js')
def serve_js():
    return send_from_directory('static', 'script.js')

@app.route('/api/convert/file', methods=['POST'])
def convert_file():
    """API endpoint for file conversion"""
    # Validate request
    if 'file' not in request.files:
        return APIResponse.error('No file part', 400)
    
    file = request.files['file']
    if file.filename == '':
        return APIResponse.error('No file selected', 400)
    
    # Check if the file extension is supported
    ext = FileService.get_file_extension(file.filename)
    if ext not in SupportedFormats.get_all_extensions():
        return APIResponse.error(f'Unsupported file format: {ext}', 400)
    
    # Convert the file
    file_data = file.read()
    result = conversion_service.convert_file(file_data, file.filename)
    
    if not result.success:
        return APIResponse.error(f'Error during conversion: {result.error_message}', 500)
    
    return APIResponse.success({
        'markdown': result.content,
        'filename': result.filename
    })

@app.route('/api/convert/youtube', methods=['POST'])
def convert_youtube():
    """API endpoint for YouTube URL conversion"""
    data = request.json
    youtube_url = data.get('youtube_url', '')
    
    if not youtube_url:
        return APIResponse.error('No YouTube URL provided', 400)
    
    if not YouTubeURLValidator.is_valid(youtube_url):
        return APIResponse.error('Invalid YouTube URL', 400)
    
    # Convert the YouTube URL
    result = conversion_service.convert_youtube_url(youtube_url)
    
    if not result.success:
        return APIResponse.error(f'Error during conversion: {result.error_message}', 500)
    
    return APIResponse.success({
        'markdown': result.content,
        'filename': result.filename
    })

@app.route('/api/download', methods=['POST'])
def download():
    """API endpoint for downloading converted content"""
    data = request.json
    markdown_content = data.get('markdown', '')
    filename = data.get('filename', 'output.md')
    
    # Create a file-like object in memory
    buffer = io.BytesIO()
    buffer.write(markdown_content.encode('utf-8'))
    buffer.seek(0)
    
    # Send the file
    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype='text/markdown'
    )

if __name__ == '__main__':
    app.run(debug=True)