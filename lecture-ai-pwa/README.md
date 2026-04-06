# LectureAI Assistant (PWA) 🎓

An advanced, AI-powered Progressive Web App designed specifically for university students. LectureAI securely captures audio, provides highly accurate transcriptions, generates intelligent summaries, and includes a built-in interactive RAG Chat interface so you can literally "talk" to your past lectures. Built with a modern lightweight web-first stack optimized for mobile devices and varying network conditions.

## ✨ Core Features
*   **Audio Capture & Cloud Storage**: High-quality lecture recording straight from your browser/mobile device with robust cloud storage via Supabase.
*   **Whisper AI Transcriptions**: Seamless native integeration with OpenAI's Whisper API generating contextual timestamps.
*   **Google Gemini AI Brain**: Automatic summarization outputs tailored 5-bullet briefs, pulls out key concepts, and predicts potential exam questions based off course material.
*   **Offline Support & PWA**: Fully functional offline list and native install prompts using standard PWA APIs ensuring it works like a native app.
*   **Conversational Transcript (RAG)**: Chatbot module chunking transcripts locally to give you semantic text search and specific answers per recording.

## 🛠 Tech Stack
*   **Frontend**: Vite, React (TypeScript), Tailwind CSS v4.
*   **State & Storage**: Zustand (for reactive local caching) and IndexedDB architecture.
*   **Audio Pipeline**: Web Audio API (`MediaRecorder`) and Wavesurfer.js.
*   **Integrations**: OpenAI (Whisper), Google Gemini (Summaries/RAG), Supabase (PostgreSQL Auth & Objects).

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have an account or API configuration for the following tools:
- [Supabase](https://supabase.com) (Database and Audio File Storage)
- [OpenAI API](https://platform.openai.com) (For Whisper Transcriptions)
- [Google Gemini API](https://aistudio.google.com/app/apikey) (For the LLM summarization and RAG Engine)

### 2. Installation
Ensure you are running Node 18+:

```bash
cd lecture-ai-pwa
npm install
```

### 3. Environment Variable Setup
Copy the example environment credentials file into your local structure:
```bash
cp .env.example .env.local
```
Fill out `.env.local` with your exact API keys:
```text
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Running the Development Server
Spin up Vite to preview locally:
```bash
npm run dev
```

Navigate to `http://localhost:5173` to view the application. 

## 📦 Building for Production
Building this app utilizes Webpack/Vite plugins to securely bundle assets and inject customized Service Workers giving the application zero-latency PWA offline fallback.

```bash
npm run build
```
You can deploy this seamlessly using platforms like **Vercel**, **Netlify**, or AWS Amplify with zero zero configuration necessary outside of porting your Environment Variables over.
