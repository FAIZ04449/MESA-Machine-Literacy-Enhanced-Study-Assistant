import OpenAI from 'openai';

async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['openaiApiKey'], (result) => {
            resolve(result.openaiApiKey);
        });
    });
}

async function getClient() {
    const apiKey = await getApiKey();
    if (!apiKey) {
        throw new Error('OpenAI API Key not found. Please set it in the extension options.');
    }
    return new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Required for running in extension
    });
}

async function makeOpenAIRequest(operation) {
    try {
        return await operation();
    } catch (error) {
        if (error.status === 429) {
            throw new Error('OpenAI API Quota Exceeded. Please check your billing details at platform.openai.com/account/billing.');
        } else if (error.status === 401) {
            throw new Error('Invalid OpenAI API Key. Please check your settings.');
        }
        throw error;
    }
}

export async function generateSummary(text) {
    const client = await getClient();
    return makeOpenAIRequest(async () => {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful study assistant. Summarize the provided text concisely, highlighting key points." },
                { role: "user", content: `Summarize this text:\n\n${text.substring(0, 15000)}` }
            ],
        });
        return response.choices[0].message.content;
    });
}

export async function generateCheatsheet(text) {
    const client = await getClient();
    return makeOpenAIRequest(async () => {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful study assistant. Create a study cheatsheet from the provided text. Include key definitions, formulas, and important dates/facts in a structured format." },
                { role: "user", content: `Create a cheatsheet for this text:\n\n${text.substring(0, 15000)}` }
            ],
        });
        return response.choices[0].message.content;
    });
}

export async function answerQuestion(context, question, history = []) {
    const client = await getClient();
    return makeOpenAIRequest(async () => {
        const messages = [
            { role: "system", content: "You are a helpful study assistant. Answer the user's question based on the provided context. If the answer is not in the context, use your general knowledge but mention that it's not in the source text." },
            { role: "user", content: `Context:\n${context.substring(0, 10000)}\n\nQuestion: ${question}` }
        ];

        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
        });
        return response.choices[0].message.content;
    });
}
