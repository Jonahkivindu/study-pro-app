import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useLectureStore } from '../stores/lectureStore';
import { useRAG } from '../hooks/useRAG';
import { ChatBubble } from '../components/ChatBubble';
import { Send, ArrowLeft, Loader2, Play } from 'lucide-react';
import { Waveform } from '../components/Waveform';

export function Chat() {
  const { id } = useParams();
  const lecture = useLectureStore(s => s.getLecture(id || ''));
  const { messages, sendMessage, loading } = useRAG(lecture?.transcript);
  const [input, setInput] = useState('');

  if (!lecture) return <div className="p-4">Lecture not found</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto border-x bg-background relative">
      <header className="p-4 border-b flex items-center bg-card sticky top-0 z-10">
        <Link to="/library" className="mr-4 p-2 hover:bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bold max-w-[200px] sm:max-w-md truncate">{lecture.title}</h1>
          <p className="text-xs text-muted-foreground">{new Date(lecture.date).toLocaleDateString()}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {lecture.audioUrl && (
          <div className="bg-secondary/50 p-4 rounded-xl mb-6">
            <div className="flex items-center mb-2">
              <button className="mr-3 p-2 bg-primary text-primary-foreground rounded-full shadow-sm hover:scale-105 transition-transform"><Play className="w-4 h-4 fill-current"/></button> 
              <span className="text-sm font-medium">Lecture Audio Source</span>
            </div>
            <Waveform audioUrl={lecture.audioUrl} />
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="bg-popover border p-4 rounded-xl shadow-sm">
            <h3 className="font-bold border-b pb-2 mb-2 text-sm uppercase tracking-wider text-muted-foreground">Executive Summary</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {lecture.summary?.map((pt, i) => <li key={i}>{pt}</li>)}
            </ul>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-popover border p-4 rounded-xl shadow-sm">
              <h3 className="font-bold border-b pb-2 mb-2 text-sm uppercase tracking-wider text-muted-foreground">Key Concepts</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {lecture.keyConcepts?.map((pt, i) => <li key={i}>{pt}</li>)}
              </ul>
            </div>
            <div className="bg-popover border p-4 rounded-xl shadow-sm bg-accent/20">
              <h3 className="font-bold border-b pb-2 mb-2 text-sm uppercase tracking-wider text-muted-foreground text-primary">Exam Questions</h3>
              <ul className="list-decimal pl-5 space-y-1 text-sm font-medium">
                {lecture.examQuestions?.map((pt, i) => <li key={i}>{pt}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div className="w-full border-t my-4" />

        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && (
          <div className="flex items-center text-muted-foreground text-sm pl-2">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Retrieving context...
          </div>
        )}
      </div>

      <div className="p-4 bg-background border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this lecture (e.g. 'What did they say about DOM?')"
            className="flex-1 bg-secondary text-foreground p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border-transparent text-sm"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="bg-primary text-primary-foreground p-3 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
