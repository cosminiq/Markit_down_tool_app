# File & YouTube to Markdown Converter Web App

This project is a web-based application that allows users to upload various document files or input a YouTube URL and convert the content into Markdown format. The result can be copied or downloaded directly from the web interface.

## 🌐 Features

- 📁 **File Upload Conversion**: Supports file types like DOCX, PDF, XLSX, PPTX, HTML, CSV, and more.
- 📺 **YouTube URL Conversion**: Converts YouTube video descriptions or metadata into Markdown format.
- 📤 **Drag & Drop Support** for file uploads.
- 📄 **Preview and Download** the generated Markdown.
- 📋 **Copy to Clipboard** functionality.
- 🧠 **Interactive Interface** with tabbed navigation.

## 📦 Supported File Types

- `.doc`, `.docx`
- `.pdf`
- `.epub`
- `.xls`, `.xlsx`
- `.ppt`, `.pptx`
- `.html`, `.htm`
- `.csv`, `.json`, `.xml`
- `.zip`

## ⚙️ Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python (Flask)
- **API Endpoints**:
  - `POST /api/convert/file` – Convert uploaded file to Markdown
  - `POST /api/convert/youtube` – Convert YouTube URL to Markdown

## 🚀 How to Run

1. **Install dependencies**:
    ```bash
    pip install flask
    ```

2. **Run the app**:
    ```bash
    python webapp.py
    ```

3. **Access the web interface**:
    Open your browser and go to `http://localhost:5000`

## 📂 File Structure

- `webapp.py` – Flask server handling file and YouTube conversion.
- `script.js` – Client-side logic for interaction and UI behavior.
- `templates/` – HTML files (assumed to be present).
- `static/` – JS/CSS/Images (assumed to be present).

## 📝 To-Do

- Integrate actual YouTube data extraction (e.g., using `pytube` or YouTube API).
- Add support for more file formats.
- Improve file conversion accuracy and error handling.

## 📄 License

This project is licensed under the MIT License.

---

