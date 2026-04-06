import { useState } from 'react';
import { askRAG } from '../services/geminiService';
import { chunkTranscript, searchChunks } from '../lib/rag';

export function useRAG(transcript: string | undefined) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (query: string) => {
    if (!transcript) return;
    
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      const chunks = chunkTranscript(transcript);
      const topChunks = searchChunks(query, chunks, 3);
      const answer = await askRAG(query, topChunks);
      
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that query." }]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, sendMessage, loading };
}
