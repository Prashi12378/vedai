import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the dist directory (only for local development)
if (!process.env.VERCEL) {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));
}



app.post('/api/chat', async (req, res) => {
    console.log('📨 API/CHAT Request received');
    try {
        const { history, model } = req.body;
        console.log('📝 Model:', model);

        if (!history || !Array.isArray(history) || history.length === 0) {
            console.warn('⚠️ No history provided');
            return res.status(400).json({ error: 'Conversation history is required' });
        }

        // Check for Groq API Key
        if (!process.env.GROQ_API_KEY) {
            console.error('❌ Missing GROQ_API_KEY');
            return res.json({ reply: 'Please set your GROQ_API_KEY in the .env file to use the Groq API.' });
        }

        // Initialize OpenAI client for Groq
        const client = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1",
        });

        // Convert history to OpenAI format
        const messages = [
            {
                role: "system",
                content: `You are VedAI, an advanced AI assistant powered by Groq (running ${model || 'Llama 3'}).
Your goal is to provide helpful, accurate, and concise responses.
You have a "memory" of previous messages in this conversation.
Always be polite and professional.`
            },
            ...history
        ];

        console.log('🤖 Sending request to Groq...');
        const completion = await client.chat.completions.create({
            model: model || "llama-3.3-70b-versatile",
            messages: messages,
            stream: false,
        });

        const reply = completion.choices[0].message.content;
        console.log('✅ Groq replied');
        res.json({ reply });

    } catch (error) {
        console.error('❌ Groq API Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
        res.json({
            reply: 'Sorry, I encountered an error communicating with Groq.',
            error: error.message
        });
    }
});
// Fallback for SPA (only for local development)
if (!process.env.VERCEL) {
    app.get('*', (req, res) => {
        const distPath = path.join(__dirname, '../dist');
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// For local development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default app;
