async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['kimiApiKey'], (result) => {
            resolve(result.kimiApiKey);
        });
    });
}

async function makeKimiRequest(messages) {
    const apiKey = await getApiKey();
    if (!apiKey) {
        throw new Error('Kimi API Key not found. Please set it in the extension options.');
    }

    try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "moonshotai/kimi-k2.5",
                messages: messages,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            let errorMsg;
            try {
                const error = await response.json();
                errorMsg = error.error?.message || error.message || response.statusText;
            } catch (e) {
                errorMsg = `Status ${response.status}: ${response.statusText}`;
            }
            throw new Error(`NVIDIA API Error: ${errorMsg}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (err) {
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
            throw new Error('Network error: Failed to connect to NVIDIA API. Please check your internet connection and ensure the extension has permission to access integrate.api.nvidia.com. Also, try reloading the extension in chrome://extensions.');
        }
        throw err;
    }
}

export async function generateSummary(text) {
    return makeKimiRequest([
        { role: "system", content: "You are a helpful study assistant. Summarize the provided text concisely, highlighting key points." },
        { role: "user", content: `Summarize this text:\n\n${text.substring(0, 15000)}` }
    ]);
}

export async function generateCheatsheet(text) {
    return makeKimiRequest([
        { role: "system", content: "You are a helpful study assistant. Create a study cheatsheet from the provided text. Include key definitions, formulas, and important dates/facts in a structured format." },
        { role: "user", content: `Create a cheatsheet for this text:\n\n${text.substring(0, 15000)}` }
    ]);
}

export async function answerQuestion(context, question) {
    return makeKimiRequest([
        { role: "system", content: "You are a helpful study assistant. Answer the user's question based on the provided context. If the answer is not in the context, use your general knowledge but mention that it's not in the source text." },
        { role: "user", content: `Context:\n${context.substring(0, 10000)}\n\nQuestion: ${question}` }
    ]);
}

export async function listModels() {
    return "moonshotai/kimi-k2.5";
}
