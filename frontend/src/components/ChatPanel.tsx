import { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  lectureTitle: string;
  transcript: string;
  onClose: () => void;
}

export function ChatPanel({ lectureTitle, transcript, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hi! I'm your study assistant. I've analyzed "${lectureTitle}" and I'm ready to answer your questions about the lecture. Ask me anything!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Simulate API call with mock response
    setTimeout(() => {
      const mockResponses = [
        `Based on the lecture, I found relevant information about "${input}". The key points are: 1) Definition and basics, 2) Practical applications, 3) Related concepts. Would you like me to elaborate on any of these?`,
        `That's a great question! The lecture covered this topic by explaining the theoretical framework first, then providing real-world examples. The main takeaway was the importance of understanding the underlying principles.`,
        `Looking at the transcript, I can see this was discussed around the middle of the lecture. The instructor emphasized that this concept is crucial for understanding the next topic. Would you like to know more about how it connects?`,
        `Excellent question! This relates to several concepts from the lecture. The instructor mentioned this in the context of problem-solving strategies. Let me break down the key components for you.`,
      ];

      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: randomResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center md:justify-center z-50">
      <div className="bg-white w-full md:w-2xl md:max-h-96 rounded-t-lg md:rounded-lg shadow-lg flex flex-col max-h-screen md:max-h-96">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg md:rounded-t-lg">
          <div>
            <h3 className="font-semibold">Chat with Study Assistant</h3>
            <p className="text-xs opacity-90">About: {lectureTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-xs lg:max-w-md py-2 px-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white text-gray-900 rounded-bl-none shadow-sm"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <span className="text-xs opacity-60 mt-1 block">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-indigo-600 animate-pulse" />
                </div>
              </div>
              <div className="bg-white text-gray-900 rounded-lg rounded-bl-none shadow-sm py-2 px-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="border-t p-4 bg-white rounded-b-lg md:rounded-b-lg"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the lecture..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Try asking: "What are the key concepts?" or "Explain the main topic"
          </p>
        </form>
      </div>
    </div>
  );
}
