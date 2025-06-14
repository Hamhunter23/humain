importScripts('generative-ai.js');

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
};

// Store chat sessions for each tab
const chatSessions = new Map();

// Track if sidepanel is open
let isSidePanelOpen = false;

// Check if sidePanel API is available
const hasSidePanelSupport = chrome.sidePanel !== undefined;
console.log("Side panel support:", hasSidePanelSupport);

// Setup side panel functionality
chrome.runtime.onInstalled.addListener(() => {
    // Register the side panel if supported
    if (hasSidePanelSupport) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
            .catch(err => console.error("Error setting panel behavior:", err));
    }
});

// Listen for side panel state changes
if (hasSidePanelSupport) {
    chrome.sidePanel.onOpen?.addListener(() => {
        console.log("Side panel opened");
        isSidePanelOpen = true;
    });

    chrome.sidePanel.onClose?.addListener(() => {
        console.log("Side panel closed");
        isSidePanelOpen = false;
    });
}

// Listen for action button clicks (for side panel toggle)
chrome.action.onClicked.addListener(async (tab) => {
    if (hasSidePanelSupport) {
        try {
            if (isSidePanelOpen) {
                await chrome.sidePanel.close();
            } else {
                await chrome.sidePanel.open({ tabId: tab.id });
            }
        } catch (error) {
            console.error("Error toggling side panel:", error);
            // Fallback to opening popup
            chrome.action.openPopup();
        }
    } else {
        // Fallback to opening popup if side panel not supported
        chrome.action.openPopup();
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log("Tab activated in background script:", activeInfo.tabId);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "askGemini") {
        // Handle the Gemini request
        handleGeminiRequest(request, sender).then(sendResponse);
        return true; // Will respond asynchronously
    }

    // Handle clearing chat history when tab is closed
    if (request.action === "clearChatSession" && sender.tab?.id) {
        chatSessions.delete(sender.tab.id);
    }
});

async function handleGeminiRequest(request, sender) {
    try {
        // Validate request
        if (!request.pageContent) {
            throw new Error('No page content provided');
        }

        const { title = '', url = '', description = '', content = '' } = request.pageContent;

        const result = await chrome.storage.sync.get(['geminiApiKey']);
        
        if (!result.geminiApiKey) {
            return { success: false, error: 'API key not found. Please set your API key first.' };
        }

        const genAI = new GoogleGenerativeAI(result.geminiApiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });

        // Use tab ID from sender or from the request itself
        const tabId = sender.tab?.id || request.tabId;
        
        // Get or create chat session for this tab
        let chatSession = chatSessions.get(tabId);
        if (!chatSession) {
            chatSession = model.startChat({
                generationConfig,
                history: []
            });
            chatSessions.set(tabId, chatSession);
        }

        const prompt = `
        You are a helpful AI assistant that can both analyze webpage content and provide general knowledge assistance.

        Current webpage context:
        Title: ${title}
        URL: ${url}
        Description: ${description}
        Content: ${content.substring(0, 5000)}

        User Question: ${request.question || ''}

        Instructions:
        1. If the question is about the webpage content:
           - Provide a clear and concise answer based on the content
           - Quote relevant parts of the webpage if applicable
           - If the information isn't in the content, say so and provide general knowledge if possible

        2. If the question is general or not directly related to the webpage:
           - Provide a helpful answer based on your general knowledge
           - If relevant, connect your answer to the webpage content
           - Be informative but concise
           - If appropriate, suggest related topics the user might be interested in

        3. If the question is unclear:
           - Ask for clarification
           - Suggest possible interpretations
           - Provide the most likely helpful response

        Always aim to be:
        - Helpful and informative
        - Clear and concise
        - Accurate with facts
        - Engaging and conversational
        
        If you're not sure about something, be honest about it.`;

        const response = await chatSession.sendMessage(prompt);
        const answer = response.response.text();
        return { success: true, answer: answer };

    } catch (error) {
        console.error('Gemini API Error:', error);
        return { success: false, error: error.message };
    }
} 