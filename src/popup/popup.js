import { marked } from 'marked';

// Debug Error Handler
window.onerror = function (message, source, lineno, colno, error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '10px';
    errorDiv.style.border = '1px solid red';
    errorDiv.style.margin = '10px';
    errorDiv.textContent = `Error: ${message} at ${source}:${lineno}`;
    document.body.prepend(errorDiv);
};

document.addEventListener('DOMContentLoaded', () => {
    try {

        // UI Elements
        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');
        const analyzeBtn = document.getElementById('analyze-btn');
        const summaryOutput = document.getElementById('summary-output');
        const cheatsheetBtn = document.getElementById('generate-cheatsheet-btn');
        const cheatsheetOutput = document.getElementById('cheatsheet-output');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const chatHistory = document.getElementById('chat-history');
        const settingsBtn = document.getElementById('settings-btn');

        // State
        let isAnalyzed = false;

        // Tab Switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const tabId = tab.dataset.tab;
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });

        // Settings
        settingsBtn.addEventListener('click', () => {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('src/options/index.html'));
            }
        });

        // Helper: Render Markdown
        function renderMarkdown(text, element) {
            element.innerHTML = marked.parse(text);
            element.classList.remove('placeholder');
        }

        // Helper: Show Loading
        function showLoading(element) {
            element.innerHTML = '<div class="loading">Thinking...</div>';
        }

        // Helper: Show Error
        function showError(element, message) {
            // Check for rate limit keywords
            if (message && (message.includes('429') || message.includes('Rate limit') || message.includes('Quota'))) {
                element.innerHTML = `
                    <div class="error" style="background-color: #fff3cd; color: #856404; border-color: #ffeeba; padding: 10px; border-radius: 4px; margin-top: 10px;">
                        <strong>Rate Limit Reached</strong><br>
                        <span style="font-size: 0.9em;">You are on the free tier. Please wait a minute before trying again.</span><br>
                        <small style="opacity: 0.8; display: block; margin-top: 5px;">Retried multiple times but the API is still busy.</small>
                    </div>
                 `;
            }
            // Check for 404 / Model Not Found
            else if (message && (message.includes('404') || message.includes('not found') || message.includes('not supported'))) {
                element.innerHTML = `<div class="error">
                    <strong>Model Error:</strong> ${message}<br><br>
                    Thinking... Checking available models...
                </div>`;

                // Diagnostic: List Models
                chrome.runtime.sendMessage({ action: 'LIST_MODELS' }).then(response => {
                    if (response.result) {
                        element.innerHTML += `
                            <div style="font-size: 0.8em; background: #eee; padding: 5px; margin-top: 5px; border-radius: 3px; color: #333;">
                                <strong>Available Models for your Key:</strong><br>
                                <pre style="white-space: pre-wrap;">${response.result}</pre>
                            </div>
                        `;
                    } else {
                        element.innerHTML += `<div style="font-size: 0.8em; margin-top:5px;">Could not list models: ${response.error}</div>`;
                    }
                }).catch(e => {
                    element.innerHTML += `<div style="font-size: 0.8em; margin-top:5px;">Check failed: ${e.message}</div>`;
                });

            } else {
                element.innerHTML = `<div class="error">${message}</div>`;
            }
        }

        // Helper: Hide Status Toast
        function hideStatusToast() {
            const toast = document.getElementById('status-toast');
            if (toast) toast.remove();
        }

        // 1. Analyze Page
        analyzeBtn.addEventListener('click', async () => {
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analyzing...';
            hideStatusToast();

            try {
                const response = await chrome.runtime.sendMessage({ action: 'ANALYZE_CURRENT_TAB' });

                if (response.error) {
                    showError(summaryOutput, response.error);
                    analyzeBtn.textContent = 'Analyze Current Page';
                    analyzeBtn.disabled = false;
                    return;
                }

                isAnalyzed = true;
                analyzeBtn.textContent = 'Re-Analyze Page';
                analyzeBtn.disabled = false;

                // Auto-generate summary after analysis
                generateSummary();

            } catch (err) {
                showError(summaryOutput, 'Connection error: ' + err.message);
                analyzeBtn.textContent = 'Analyze Current Page';
                analyzeBtn.disabled = false;
            }
        });

        // 2. Generate Summary
        async function generateSummary() {
            if (!isAnalyzed) return;

            showLoading(summaryOutput);
            hideStatusToast();

            try {
                const response = await chrome.runtime.sendMessage({ action: 'GENERATE_SUMMARY' });
                if (response.error) {
                    showError(summaryOutput, response.error);
                } else {
                    renderMarkdown(response.result, summaryOutput);
                }
            } catch (err) {
                showError(summaryOutput, err.message);
            } finally {
                hideStatusToast();
            }
        }

        // 3. Generate Cheatsheet
        cheatsheetBtn.addEventListener('click', async () => {
            if (!isAnalyzed) {
                showError(cheatsheetOutput, 'Please analyze the page first (go to Summarize tab).');
                return;
            }

            showLoading(cheatsheetOutput);
            hideStatusToast();

            try {
                const response = await chrome.runtime.sendMessage({ action: 'GENERATE_CHEATSHEET' });
                if (response.error) {
                    showError(cheatsheetOutput, response.error);
                } else {
                    renderMarkdown(response.result, cheatsheetOutput);
                }
            } catch (err) {
                showError(cheatsheetOutput, err.message);
            } finally {
                hideStatusToast();
            }
        });

        // 4. Chat
        async function sendChatMessage() {
            const question = chatInput.value.trim();
            if (!question) return;

            if (!isAnalyzed) {
                appendMessage('System', 'Please analyze the page first.', 'bot');
                return;
            }

            // Add User Message
            appendMessage('You', question, 'user');
            chatInput.value = '';

            // Add Loading Message
            const loadingId = appendMessage('Bot', 'Thinking...', 'bot', true);
            hideStatusToast();

            try {
                const response = await chrome.runtime.sendMessage({ action: 'ASK_QUESTION', question });

                // Remove Loading
                const loadingEl = document.getElementById(loadingId);
                if (loadingEl) loadingEl.remove();

                if (response.error) {
                    appendMessage('System', response.error, 'bot');
                } else {
                    appendMessage('Bot', response.result, 'bot');
                }
            } catch (err) {
                const loadingEl = document.getElementById(loadingId);
                if (loadingEl) loadingEl.remove();
                appendMessage('System', 'Error: ' + err.message, 'bot');
            } finally {
                hideStatusToast();
            }
        }

        sendBtn.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });

        function appendMessage(sender, text, type, isLoading = false) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${type}`;
            if (isLoading) msgDiv.id = 'msg-' + Date.now();

            if (type === 'bot' && !isLoading) {
                msgDiv.innerHTML = marked.parse(text);
            } else {
                msgDiv.textContent = text;
            }

            chatHistory.appendChild(msgDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;
            return msgDiv.id;
        }
    } catch (e) {
        console.error('Initialization error:', e);
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red';
        errorDiv.textContent = 'Init Error: ' + e.message;
        document.body.prepend(errorDiv);
    }

    // Status Listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'STATUS_UPDATE') {
            const statusDiv = document.getElementById('status-toast') || document.createElement('div');
            statusDiv.id = 'status-toast';
            statusDiv.style.position = 'fixed';
            statusDiv.style.bottom = '60px';
            statusDiv.style.left = '50%';
            statusDiv.style.transform = 'translateX(-50%)';
            statusDiv.style.backgroundColor = request.className === 'warning' ? '#ff9800' : '#333';
            statusDiv.style.color = 'white';
            statusDiv.style.padding = '8px 12px';
            statusDiv.style.borderRadius = '4px';
            statusDiv.style.zIndex = '1000';
            statusDiv.style.fontSize = '12px';
            statusDiv.textContent = request.message;

            if (!document.getElementById('status-toast')) {
                document.body.appendChild(statusDiv);
            }
        }
    });

});
