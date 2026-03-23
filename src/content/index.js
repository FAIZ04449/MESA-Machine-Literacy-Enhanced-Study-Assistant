// Content Script

// Function to extract visible text from the page
function getPageText() {
    // Simple extraction: innerText of body
    // We can improve this by excluding scripts, styles, etc.

    const clone = document.body.cloneNode(true);

    // Remove unwanted elements
    const unwanted = ['script', 'style', 'noscript', 'iframe', 'svg'];
    unwanted.forEach(tag => {
        const elements = clone.querySelectorAll(tag);
        elements.forEach(el => el.remove());
    });

    let text = clone.innerText;

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}

// Listen for messages from Popup or Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_PAGE_CONTENT') {
        const text = getPageText();
        sendResponse({ content: text, type: 'web' });
    }
    // Return true to indicate async response if needed (not needed here yet)
});
