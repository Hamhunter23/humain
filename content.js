// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request.action);
    
    // Handle ping to check if content script is loaded
    if (request.action === "ping") {
        console.log("Ping received, responding with status ok");
        sendResponse({ status: "ok" });
        return true;
    }

    if (request.action === "getPageContent") {
        try {
            console.log("Getting page content...");
            
            // Get all visible text from the webpage
            const bodyText = document.body.innerText || "";
            const title = document.title || "No title";
            const url = window.location.href || "";
            
            // Get meta description if available
            const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
            
            // Combine all the content
            const pageContent = {
                title: title,
                url: url,
                description: metaDescription,
                content: bodyText
            };
            
            console.log("Page content retrieved successfully");
            sendResponse(pageContent);
        } catch (error) {
            console.error('Error getting page content:', error);
            // Send a more detailed error response
            sendResponse({
                error: true,
                message: error.message,
                stack: error.stack
            });
        }
        return true;
    }
    
    console.log("Unknown action:", request.action);
    return true;
}); 