import { GoogleGenerativeAI } from "@google/generative-ai";

async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
            resolve(result.geminiApiKey);
        });
    });
}

async function getModel() {
    const apiKey = await getApiKey();
    if (!apiKey) {
        throw new Error('API Key not found. Please set it in the extension options.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
}

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000;
const MAX_WAIT_TIME_MS = 120000; // Cap wait time to 120 seconds

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry(model, prompt) {
    let currentDelay = INITIAL_RETRY_DELAY;
    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            return result;
        } catch (error) {
            lastError = error;
            const isQuotaError = error.message.includes("429") ||
                error.message.includes("Quota exceeded") ||
                error.status === 429;

            if (attempt < MAX_RETRIES && isQuotaError) {
                // Try to extract retry time from error message
                // Format: "Please retry in 22.655711632s" or just try strict regex
                let waitTime = currentDelay;
                const matchLong = error.message.match(/retry in (\d+(\.\d+)?)s/);
                const matchRetryDelay = error.message.match(/"retryDelay":"(\d+(\.\d+)?)s"/);

                if (matchLong) {
                    waitTime = parseFloat(matchLong[1]) * 1000 + 1000; // Add 1s buffer
                } else if (matchRetryDelay) {
                    waitTime = parseFloat(matchRetryDelay[1]) * 1000 + 1000;
                }

                // Cap wait time to avoid hanging too long
                if (waitTime > MAX_WAIT_TIME_MS) waitTime = MAX_WAIT_TIME_MS;

                const waitMsg = `Rate limit hit. Waiting ${Math.round(waitTime / 1000)}s... (Attempt ${attempt + 1}/${MAX_RETRIES})`;
                console.warn(waitMsg);

                // Notify Popup
                try {
                    if (typeof chrome !== 'undefined' && chrome.runtime) {
                        chrome.runtime.sendMessage({
                            action: 'STATUS_UPDATE',
                            message: waitMsg,
                            className: 'warning'
                        }).catch(() => { }); // Ignore if no listener (popup closed)
                    }
                } catch (e) { /* ignore */ }

                await delay(waitTime);

                // If we didn't find a specific time, backoff exponentially
                if (!matchLong && !matchRetryDelay) {
                    currentDelay *= 2;
                }
            } else {
                throw error;
            }
        }
    }
    throw lastError;
}

export async function listModels() {
    try {
        const apiKey = await getApiKey();
        if (!apiKey) throw new Error("No API Key set");

        // We have to use the REST API directly for listing models if the SDK doesn't expose it easily in this version
        // Or we can try to use the SDK if it has it. 
        // The SDK usually has a GoogleGenerativeAI instance, but listModels might be on the manager.
        // Let's try a direct fetch to be safe and avoid SDK version issues for this diagnostic tool.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }
        const data = await response.json();
        return data.models.map(m => m.name).join('\n');
    } catch (error) {
        throw new Error("Failed to list models: " + error.message);
    }
}

export async function generateSummary(text) {
    try {
        const model = await getModel();
        const prompt = `You are a helpful study assistant. Summarize the provided text concisely, highlighting key points.\n\nText:\n${text.substring(0, 30000)}`;
        const result = await generateWithRetry(model, prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        let msg = error.message || "Failed. Check API key.";
        if (msg.includes('429') || msg.includes('Quota')) {
            msg = "Rate limit reached. Please wait a few moments before trying again.";
        } else if (msg.includes('{')) {
            // Try to extract a clean message if it's a JSON dump
            try {
                const jsonPart = msg.substring(msg.indexOf('{'));
                const parsed = JSON.parse(jsonPart);
                if (parsed.error && parsed.error.message) msg = parsed.error.message;
            } catch (e) { }
        }
        throw new Error(msg);
    }
}

export async function generateCheatsheet(text) {
    try {
        const model = await getModel();
        const prompt = `You are a helpful study assistant. Create a study cheatsheet from the provided text. Include key definitions, formulas, and important dates/facts in a structured format.\n\nText:\n${text.substring(0, 30000)}`;
        const result = await generateWithRetry(model, prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        throw new Error(error.message || "Failed to generate cheatsheet. Check your API key.");
    }
}

export async function answerQuestion(context, question) {
    try {
        const model = await getModel();
        const prompt = `You are a helpful study assistant. Answer the user's question based on the provided context. If the answer is not in the context, use your general knowledge but mention that it's not in the source text.\n\nContext:\n${context.substring(0, 20000)}\n\nQuestion: ${question}`;
        const result = await generateWithRetry(model, prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        throw new Error(error.message || "Failed to answer question. Check your API key.");
    }
}
