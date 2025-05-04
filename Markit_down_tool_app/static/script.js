document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const convertBtn = document.getElementById('convert-btn');
    const youtubeUrlInput = document.getElementById('youtube-url');
    const youtubeConvertBtn = document.getElementById('youtube-convert-btn');
    const youtubeThumbnail = document.getElementById('youtube-thumbnail');
    const youtubeInfo = document.getElementById('youtube-info');
    const resultContainer = document.getElementById('result-container');
    const markdownResult = document.getElementById('markdown-result');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // State variables
    let selectedFile = null;
    let youtubeUrl = '';
    let currentMarkdown = '';
    let outputFilename = '';
    let activeTab = 'file-tab';

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to selected tab
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            activeTab = tabId;

            // Reset convert button state
            updateConvertButtonState();
        });
    });

    // File upload - click
    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });

    // File upload - drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('drag-over');
        }, false);
    });

    dropArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length) {
            handleFileSelect(files[0]);
        }
    });

    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    // YouTube URL input
    youtubeUrlInput.addEventListener('input', (e) => {
        youtubeUrl = e.target.value.trim();
        if (isValidYouTubeUrl(youtubeUrl)) {
            const videoId = extractYouTubeVideoId(youtubeUrl);
            if (videoId) {
                // Show thumbnail
                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                youtubeThumbnail.querySelector('img').src = thumbnailUrl;
                youtubeThumbnail.classList.remove('hidden');
                
                // For a real app, you might fetch video info from YouTube API
                // Here we just show a placeholder
                document.getElementById('video-title').textContent = 'YouTube Video';
                document.getElementById('video-channel').textContent = 'Channel Name';
                youtubeInfo.classList.remove('hidden');
            }
        } else {
            youtubeThumbnail.classList.add('hidden');
            youtubeInfo.classList.add('hidden');
        }
        updateConvertButtonState();
    });

    // Convert button
    convertBtn.addEventListener('click', () => {
        if (activeTab === 'file-tab') {
            convertFile();
        } else if (activeTab === 'youtube-tab') {
            convertYouTubeUrl();
        }
    });

    // YouTube convert button
    youtubeConvertBtn.addEventListener('click', convertYouTubeUrl);

    // Copy button
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(currentMarkdown).then(() => {
            showToast('Markdown copied to clipboard!');
        });
    });

    // Download button
    downloadBtn.addEventListener('click', () => {
        downloadMarkdown(currentMarkdown, outputFilename || 'output.md');
    });

    // Handle file selection
    function handleFileSelect(file) {
        if (!file) return;
        
        // Check if file format is supported
        const extension = file.name.split('.').pop().toLowerCase();
        const supportedExtensions = [
            'docx', 'doc', 'pdf', 'epub', 'xlsx', 'xls', 'pptx', 'ppt',
            'html', 'htm', 'csv', 'json', 'xml', 'zip'
        ];
        
        if (!supportedExtensions.includes(extension)) {
            showToast('Unsupported file format. Please select a supported file.');
            return;
        }
        
        selectedFile = file;
        fileName.textContent = file.name;
        updateConvertButtonState();
    }

    // Update convert button state
    function updateConvertButtonState() {
        if (activeTab === 'file-tab') {
            convertBtn.disabled = !selectedFile;
        } else if (activeTab === 'youtube-tab') {
            convertBtn.disabled = !isValidYouTubeUrl(youtubeUrl);
        }
    }

    // Convert file
    function convertFile() {
        if (!selectedFile) return;
        
        showLoading();
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        fetch('/api/convert/file', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error converting file');
            }
            return response.json();
        })
        .then(data => {
            handleConversionSuccess(data);
        })
        .catch(error => {
            showToast('Error: ' + error.message);
            hideLoading();
        });
    }

    // Convert YouTube URL
    function convertYouTubeUrl() {
        if (!isValidYouTubeUrl(youtubeUrl)) return;
        
        showLoading();
        
        fetch('/api/convert/youtube', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ youtube_url: youtubeUrl })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error converting YouTube URL');
            }
            return response.json();
        })
        .then(data => {
            handleConversionSuccess(data);
        })
        .catch(error => {
            showToast('Error: ' + error.message);
            hideLoading();
        });
    }

    // Handle successful conversion
    function handleConversionSuccess(data) {
        currentMarkdown = data.markdown;
        outputFilename = data.filename;
        
        markdownResult.textContent = currentMarkdown;
        resultContainer.classList.remove('hidden');
        
        // Animate result container
        setTimeout(() => {
            hideLoading();
            // Scroll to result
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }

    // Download markdown
    function downloadMarkdown(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    // Show loading overlay
    function showLoading() {
        loadingOverlay.classList.remove('hidden');
    }

    // Hide loading overlay
    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }

    // Show toast message
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // Validate YouTube URL
    function isValidYouTubeUrl(url) {
        const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        return pattern.test(url);
    }

    // Extract YouTube video ID
    function extractYouTubeVideoId(url) {
        const patterns = [
            /(?:v=|\/)([0-9A-Za-z_-]{11}).*/, // Standard YouTube URLs
            /(?:youtu\.be\/)([0-9A-Za-z_-]{11})/, // Short YouTube URLs
            /(?:embed\/)([0-9A-Za-z_-]{11})/ // Embedded YouTube URLs
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        return null;
    }

    // Add animation to all icons
    animateIcons();
});

// Function to add subtle animations to icons
function animateIcons() {
    const icons = document.querySelectorAll('.fas, .fab');
    
    icons.forEach(icon => {
        // Skip icons in the toast and loader
        if (icon.closest('.toast') || icon.closest('.loader')) return;
        
        // Add hover animation
        icon.parentElement.addEventListener('mouseenter', () => {
            icon.style.transform = 'scale(1.2)';
            icon.style.transition = 'transform 0.3s ease';
        });
        
        icon.parentElement.addEventListener('mouseleave', () => {
            icon.style.transform = 'scale(1)';
        });
    });
    
    // Add pulse animation to upload icon
    const uploadIcon = document.querySelector('.upload-icon i');
    if (uploadIcon) {
        setInterval(() => {
            uploadIcon.style.transform = 'scale(1.1)';
            setTimeout(() => {
                uploadIcon.style.transform = 'scale(1)';
            }, 500);
        }, 3000);
    }
}