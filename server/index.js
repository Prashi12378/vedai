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

// Health check and Env check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        env: {
            GROQ: !!process.env.GROQ_API_KEY,
            TAVILY: !!process.env.TAVILY_API_KEY,
            SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
            SUPABASE_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
            VERCEL: !!process.env.VERCEL
        }
    });
});

// --- Tavily Search Helper ---
async function performTavilySearch(query) {
    if (!process.env.TAVILY_API_KEY) {
        console.warn('⚠️ TAVILY_API_KEY missing');
        return null;
    }

    try {
        console.log(`🌐 Tavily Searching for: "${query}"...`);
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: query,
                search_depth: "basic",
                include_answer: true,
                max_results: 5
            })
        });

        const data = await response.json();

        if (data.answer) {
            return `Tavily Answer: ${data.answer}\n\nContext:\n${data.results.map(r => `- ${r.title} (${r.url}): ${r.content}`).join('\n')}`;
        }

        return null;
    } catch (err) {
        console.error('❌ Tavily Error:', err);
        return null;
    }
}



// Serve static files from the dist directory (only for local development)
if (!process.env.VERCEL) {
    const distPath = path.join(__dirname, '../dist');
    console.log('Serving static files from:', distPath);
    app.use(express.static(distPath));
} else {
    console.log('Running on Vercel - static serving disabled in Express');
}



// Define routes
const handleChat = async (req, res) => {
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
            return res.json({ reply: 'Please set your GROQ_API_KEY in the Vercel Settings to use the AI features.' });
        }

        const client = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1",
        });

        // Definition of the base system prompt
        const baseSystemPrompt = `You are VedAI, an advanced AI assistant powered by Groq (running ${model || 'Llama 3'}).
Your goal is to provide helpful, accurate, and concise responses.
To Access Real-Time Information:
If the user asks about current events, sports scores, news, or anything requiring real-time data, you must output a search command.
Format: [SEARCH: <query>]
Example: [SEARCH: latest India vs NZ score]
Do NOT provide a made-up answer if you need to search. Just output the command.`;

        // 1. Initial Call (Tool Detection)
        let messages = [
            { role: "system", content: baseSystemPrompt },
            ...history
        ];

        console.log('🤖 Sending initial request to Groq...');
        let completion = await client.chat.completions.create({
            model: model || "llama-3.3-70b-versatile",
            messages: messages,
            stream: false,
        });

        let reply = completion.choices[0].message.content || "";
        console.log('📝 Initial Reply:', reply);

        // 2. Check for Search Command
        const searchMatch = reply ? reply.match(/\[SEARCH:\s*(.*?)\]/) : null;

        if (searchMatch) {
            const query = searchMatch[1];
            console.log('🕵️‍♂️ Detected Search Intent:', query);

            // 3. Perform Search
            const searchResults = await performTavilySearch(query);

            if (searchResults) {
                console.log('✅ Got Search Results, re-prompting AI...');

                // 4. Re-prompt with Context
                // We add the search command as a "assistant" message, and the results as "system" or "tool" context
                messages.push({ role: "assistant", content: reply });
                messages.push({
                    role: "system",
                    content: `SEARCH RESULTS FOR "${query}":\n${searchResults}\n\nINSTRUCTIONS: Use the above results to answer the user's original question which was: "${history[history.length - 1].content}". Cite the results if possible.\n\nCRITICAL: You MUST answer in the same language as the user's original message. If the user asked in Hindi, answer in Hindi. If Spanish, answer in Spanish.`
                });

                completion = await client.chat.completions.create({
                    model: model || "llama-3.3-70b-versatile",
                    messages: messages,
                    stream: false,
                });

                reply = completion.choices[0].message.content;
            } else {
                reply = "I tried to search for that but couldn't retrieve the information currently.";
            }
        }

        res.json({ reply });

    } catch (error) {
        console.error('❌ Groq API Error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            details: error.message || JSON.stringify(error)
        });
    }
};

app.post('/api/chat', handleChat);
app.post('/chat', handleChat); // Alias for Vercel functions mounted at /api/index.js
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
