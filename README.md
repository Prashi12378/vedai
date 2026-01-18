# VedAI - Smart Conversational Assistant 🚀 <!-- Vercel Build Trigger -->

VedAI is a premium, AI-powered chatbot built with modern web technologies, featuring a sleek dark-mode enabled UI, persistent chat history via Supabase, and real-time streaming responses.

## ✨ Features

- **Premium UI/UX**: Professional design with glassmorphism, smooth animations, and a fully responsive layout for mobile and desktop.
- **Google Authentication**: Secure and fast login using Google OAuth via Supabase.
- **Persistent Chat History**: All your conversations are saved to the cloud (Supabase) and synced across devices.
- **Streaming Responses**: Real-time "Typewriter" effect for AI responses for a more natural conversational feel.
- **Smart Sidebar**:
  - Organized "Recents" section.
  - Per-chat deletion with hover-to-show trash icon.
  - Auto-expanding mouse-over sidebar on desktop.
- **User Profiles**: View and edit your profile directly within the app.
- **Customization**: Personalize the AI's behavior through system instructions in the settings.

## 🛠 Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Rich Aesthetics), Modern JavaScript (ES6+).
- **Backend/Database**: [Supabase](https://supabase.com/) (Auth, Postgres, RLS).
- **AI Model**: Gemini API (via Groq/Direct).
- **Deployment**: [Docker](https://www.docker.com/) + [Render](https://render.com/).

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- A Supabase Project
- A Groq or Gemini API Key

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_api_key
```

### 3. Install & Run
```bash
# Install dependencies
npm install

# Run development server
npm run dev:full
```

## 🐳 Docker Deployment

To build and push the production image:
```bash
# Build (Pass keys for frontend compilation)
docker build --platform linux/amd64 \
  --build-arg VITE_SUPABASE_URL=your_url \
  --build-arg VITE_SUPABASE_ANON_KEY=your_key \
  -t yourusername/ved-ai-chat:latest .

# Push
docker push yourusername/ved-ai-chat:latest
```

## 🔒 Security
- **RLS Enabled**: Row Level Security is configured in Supabase so users can only access their own chats.
- **Environment Variables**: Sensitive keys are never hardcoded and are managed via `.env` or CI/CD secrets.

## 📄 License
MIT License.
