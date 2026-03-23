import * as geminiClient from '../utils/gemini-client';
import * as openaiClient from '../utils/openai-client';
import * as kimiClient from '../utils/kimi-client';

// Helper to manage offscreen document
async function setupOffscreenDocument(path) {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(path)]
    });

    if (existingContexts.length > 0) {
        return;
    }

    await chrome.offscreen.createDocument({
        url: path,
        reasons: ['DOM_PARSER'],
        justification: 'Parsing PDF content'
    });
}

// Helper to get active tab
async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

async function getProvider() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['aiProvider'], (result) => {
            resolve(result.aiProvider || 'kimi'); // Default to kimi
        });
    });
}

function getClient(provider) {
    switch (provider) {
        case 'gemini':
            return geminiClient;
        case 'openai':
            return openaiClient;
        case 'kimi':
        default:
            return kimiClient;
    }
}

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if message is coming from offscreen document (to avoid loop or ignore if needed)
    if (request.offscreen) return false; 

    handleMessage(request, sendResponse);
    return true; // Keep channel open for async response
});

async function handleMessage(request, sendResponse) {
    try {
        const provider = await getProvider();
        const client = getClient(provider);

        if (request.action === 'ANALYZE_CURRENT_TAB') {
            const tab = await getActiveTab();

            if (!tab) {
                sendResponse({ error: 'No active tab found.' });
                return;
            }

            if (tab.url.endsWith('.pdf') || tab.url.includes('.pdf?')) {
                // Handle PDF via Offscreen Document
                try {
                    await setupOffscreenDocument('src/offscreen/index.html');
                    const response = await chrome.runtime.sendMessage({
                        action: 'PARSE_PDF',
                        url: tab.url,
                        offscreen: true
                    });

                    if (response.error) {
                        throw new Error(response.error);
                    }

                    await chrome.storage.local.set({ currentContext: response.result, contextType: 'pdf' });
                    sendResponse({ success: true, type: 'pdf' });
                } catch (err) {
                    sendResponse({ error: 'Failed to parse PDF: ' + err.message });
                }
            } else {
                // Handle Web Page
                try {
                    // Check if we can inject/communicate
                    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
                        sendResponse({ error: 'Cannot analyze browser system pages.' });
                        return;
                    }

                    const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_CONTENT' });
                    if (response && response.content) {
                        await chrome.storage.local.set({ currentContext: response.content, contextType: 'web' });
                        sendResponse({ success: true, type: 'web' });
                    } else {
                        sendResponse({ error: 'Could not extract content. Try refreshing the page.' });
                    }
                } catch (err) {
                    sendResponse({ error: 'Content script not ready. Refresh the page.' });
                }
            }
        }

        else if (request.action === 'GENERATE_SUMMARY') {
            const data = await chrome.storage.local.get(['currentContext']);
            if (!data.currentContext) {
                sendResponse({ error: 'No content analyzed yet.' });
                return;
            }
            const summary = await client.generateSummary(data.currentContext);
            sendResponse({ result: summary });
        }

        else if (request.action === 'GENERATE_CHEATSHEET') {
            const data = await chrome.storage.local.get(['currentContext']);
            if (!data.currentContext) {
                sendResponse({ error: 'No content analyzed yet.' });
                return;
            }
            const cheatsheet = await client.generateCheatsheet(data.currentContext);
            sendResponse({ result: cheatsheet });
        }

        else if (request.action === 'ASK_QUESTION') {
            const data = await chrome.storage.local.get(['currentContext']);
            if (!data.currentContext) {
                sendResponse({ error: 'No content analyzed yet.' });
                return;
            }
            const answer = await client.answerQuestion(data.currentContext, request.question);
            sendResponse({ result: answer });
        }

        else if (request.action === 'LIST_MODELS') {
            const models = await client.listModels();
            sendResponse({ result: models });
        }

    } catch (error) {
        console.error('Background error:', error);
        sendResponse({ error: error.message });
    }
}
