import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Chat } from './pages/Chat';
import { Mic, BookOpen } from 'lucide-react';
import { cn } from './utils/cn';

function NavBar() {
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');
  
  if (isChat) return null; // Hide bottom bar on chat view to maximize space

  return (
    <nav className="fixed bottom-0 w-full bg-background/80 backdrop-blur-md border-t flex justify-around p-3 pb-safe-area shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
      <Link to="/" className={cn("flex flex-col items-center p-2 rounded-lg transition-colors text-sm font-medium w-24", location.pathname === '/' ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary")}>
        <Mic className="w-6 h-6 mb-1" />
        Record
      </Link>
      <Link to="/library" className={cn("flex flex-col items-center p-2 rounded-lg transition-colors text-sm font-medium w-24", location.pathname === '/library' ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary")}>
        <BookOpen className="w-6 h-6 mb-1" />
        Library
      </Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground bg-gradient-to-b from-background to-secondary/20 pb-20 sm:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/chat/:id" element={<Chat />} />
        </Routes>
        <NavBar />
      </div>
    </BrowserRouter>
  );
}

export default App;
