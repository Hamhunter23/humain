document.addEventListener('DOMContentLoaded', async () => {
    const apiKeySection = document.getElementById('apiKeySection');
    const chatSection = document.getElementById('chatSection');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const chatContainer = document.getElementById('chatContainer');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const toggleViewMode = document.getElementById('toggleViewMode');
    
    // Configure marked for secure markdown rendering
    marked.setOptions({
        breaks: true, // Enable line breaks
        gfm: true, // GitHub flavored markdown
        headerIds: false, // Disable automatic header IDs
        mangle: false, // Disable mangled email addresses
        sanitize: false, // We'll use DOMPurify instead for better sanitization
    });

    // Get current tab ID
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab.id;

    // Toggle view mode
    toggleViewMode.addEventListener('click', () => {
        // Check if sidePanel API is available
        if (chrome.sidePanel) {
            try {
                // Open side panel and close popup
                chrome.sidePanel.open({ tabId });
                window.close();
            } catch (error) {
                console.error("Error opening side panel:", error);
                // Show error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = 'Side panel feature not available in your browser version.';
                document.body.appendChild(errorMessage);
                setTimeout(() => {
                    errorMessage.remove();
                }, 3000);
            }
        } else {
            // Inform user that side panel isn't available
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = 'Side panel feature not available in your browser version.';
            document.body.appendChild(errorMessage);
            setTimeout(() => {
                errorMessage.remove();
            }, 3000);
        }
    });

    // Load existing conversation for this tab
    async function loadConversation() {
        const result = await chrome.storage.local.get(['conversations']);
        const conversations = result.conversations || {};
        const messages = conversations[tabId] || [];
        
        // Clear existing messages
        chatContainer.innerHTML = '';
        
        // Add loaded messages
        messages.forEach(msg => {
            addMessage(msg.text, msg.isUser);
        });
    }

    // Save message to conversation
    async function saveMessage(text, isUser) {
        const result = await chrome.storage.local.get(['conversations']);
        const conversations = result.conversations || {};
        const messages = conversations[tabId] || [];
        
        messages.push({ text, isUser });
        conversations[tabId] = messages;
        
        await chrome.storage.local.set({ conversations });
    }

    // Check if API key exists
    chrome.storage.sync.get(['geminiApiKey'], async (result) => {
        if (result.geminiApiKey) {
            apiKeySection.style.display = 'none';
            chatSection.style.display = 'flex';
            
            // Load existing conversation
            await loadConversation();
            
            // Show welcome message if no existing messages
            if (chatContainer.children.length === 0) {
                const welcomeMessage = 'Hello! I can help you understand the content of this webpage. What would you like to know?';
                addMessage(welcomeMessage);
                await saveMessage(welcomeMessage, false);
            }
        }
    });

    // Save API key
    saveApiKeyButton.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ geminiApiKey: apiKey }, async () => {
                apiKeySection.style.display = 'none';
                chatSection.style.display = 'flex';
                
                const welcomeMessage = 'Hello! I can help you understand the content of this webpage. What would you like to know?';
                addMessage(welcomeMessage);
                await saveMessage(welcomeMessage, false);
            });
        }
    });

    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        if (isUser) {
            messageDiv.textContent = text;
        } else {
            // Use marked.js to render markdown for AI messages and sanitize with DOMPurify
            const markdown = marked.parse(text);
            messageDiv.innerHTML = DOMPurify.sanitize(markdown);
        }
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function handleUserQuestion() {
        const question = userInput.value.trim();
        if (!question) return;

        // Add user message to chat
        addMessage(question, true);
        await saveMessage(question, true);
        userInput.value = '';

        try {
            // Get the current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                addMessage('Error: Could not access the current tab.');
                return;
            }

            // Ensure content script is loaded
            await ensureContentScriptLoaded(tab);

            // Get the page content
            const pageContent = await chrome.tabs.sendMessage(tab.id, { action: "getPageContent" });
            if (!pageContent) {
                addMessage('Error: Could not access page content. Make sure the extension has permission to access this page.');
                return;
            }

            if (pageContent.error) {
                addMessage(`Error accessing page content: ${pageContent.message}`);
                console.error("Page content error:", pageContent);
                return;
            }

            // Add loading message
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message ai-message loading';
            loadingDiv.textContent = 'Thinking...';
            chatContainer.appendChild(loadingDiv);

            // Send to Gemini API
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: "askGemini",
                    pageContent: pageContent,
                    question: question
                }, resolve);
            });

            // Remove loading message
            chatContainer.removeChild(loadingDiv);

            if (response && response.success) {
                addMessage(response.answer);
                await saveMessage(response.answer, false);
            } else {
                const errorMessage = 'Sorry, I encountered an error: ' + (response?.error || 'Unknown error');
                addMessage(errorMessage);
                await saveMessage(errorMessage, false);
            }
        } catch (error) {
            const errorMessage = 'Sorry, I encountered an error: ' + error.message;
            addMessage(errorMessage);
            await saveMessage(errorMessage, false);
        }
    }

    // Ensure content script is loaded
    async function ensureContentScriptLoaded(tab) {
        try {
            console.log("Checking if content script is loaded in tab:", tab.id);
            // Try to send a test message to check if content script is loaded
            await chrome.tabs.sendMessage(tab.id, { action: "ping" });
            console.log("Content script is already loaded");
        } catch (error) {
            console.log("Content script not loaded, injecting now...", error);
            // If content script is not loaded, inject it
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                console.log("Content script injected successfully");
                // Wait a bit for the script to initialize
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (injectionError) {
                console.error("Error injecting content script:", injectionError);
                throw new Error("Failed to inject content script: " + injectionError.message);
            }
        }
    }

    // Make textarea auto-resize and toggle send button visibility
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Show or hide send button based on content
        if (this.value.trim()) {
            sendButton.style.opacity = '1';
        } else {
            sendButton.style.opacity = '0.5';
        }
    });

    // Initially hide the send button
    sendButton.style.opacity = '0.5';

    // Event listeners
    sendButton.addEventListener('click', handleUserQuestion);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserQuestion();
        }
    });

    // Clear conversation when tab is closed
    chrome.tabs.onRemoved.addListener(async (closedTabId) => {
        if (closedTabId === tabId) {
            const result = await chrome.storage.local.get(['conversations']);
            const conversations = result.conversations || {};
            delete conversations[tabId];
            await chrome.storage.local.set({ conversations });
        }
    });
}); 