const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // to handle large context strings

// Simple root route for health check / visual confirmation
app.get('/', (req, res) => {
    res.send('MESA Backend Proxy is running perfectly!');
});

app.post('/api/kimi/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages) {
            return res.status(400).json({ error: 'Messages array is required.' });
        }

        const apiKey = process.env.KIMI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'KIMI_API_KEY is not configured on the server.' });
        }

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "meta/llama-3.1-8b-instruct",
                messages: messages,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json({ error: error });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error proxying to Kimi API:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
