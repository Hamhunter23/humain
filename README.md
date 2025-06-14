# Hum(ai)n - AI-Powered Web Assistant

Hum(ai)n is a Chrome extension that brings AI-powered assistance to your web browsing experience. It allows you to ask questions about any webpage you're viewing and get intelligent responses powered by Google's Gemini AI.

## Features

- 🤖 AI-powered webpage analysis and Q&A
- 💬 Interactive chat interface
- 🔄 Dual-mode interface (popup and sidebar)
- 🔒 Secure API key management
- 🎨 Clean, modern UI design
- 📝 Markdown support for responses
- 🔍 Context-aware responses based on webpage content

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Hamhunter23/humain.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the cloned repository directory

## Setup

1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

2. Click the Hum(ai)n extension icon in your browser

3. Enter your Gemini API key in the popup interface

4. Click "Save" to store your API key securely

## Usage

### Popup Mode
1. Click the Hum(ai)n extension icon in your browser toolbar
2. Type your question about the current webpage
3. Press Enter or click the send button to get a response

### Sidebar Mode
1. Click the sidebar toggle button in the popup
2. The sidebar will open on the right side of your browser
3. Ask questions about the webpage content
4. Get responses while keeping the webpage in view

## Security

- Your API key is stored securely in Chrome's storage
- No data is sent to any servers other than Google's Gemini API
- All communication is encrypted using HTTPS

## Development

### Project Structure
- `manifest.json` - Extension configuration
- `popup.html/js/css` - Main popup interface
- `sidepanel.html/js/css` - Sidebar interface
- `content.js` - Webpage content interaction
- `background.js` - Background service worker
- `generative-ai.js` - AI integration logic

### Dependencies
- Google Gemini API
- DOMPurify (for security)
- Marked.js (for markdown rendering)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
