import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export const Diagnostics: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hello. I can summarise guidelines, explain terms and help you think through a case. I do not make diagnoses or prescribe; final decisions stay with the treating clinician.',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      
      const responseText = await api.assistantChat(history, userMsg.text);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "I apologize, I couldn't generate a response.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
        console.error(error);
        const errorText = error?.message || "Error: Unable to reach the AI assistant on the server.";

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: errorText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-screen p-4 md:p-6 gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">AI Diagnostic Suite</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Interactive consultation assistant.</p>
        </div>
        <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold border border-green-200 dark:border-green-800 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Connected
        </div>
      </div>

      <div className="flex-1 bg-surface-light dark:bg-surface-dark rounded-clay shadow-clay dark:shadow-clay-dark border border-white/50 dark:border-slate-700 flex flex-col overflow-hidden relative">
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth" ref={scrollRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] md:max-w-[70%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-md ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`}>
                  {msg.role === 'user' ? (
                     <img src="https://picsum.photos/100/100" className="w-full h-full rounded-xl object-cover" alt="User" />
                  ) : (
                     <span className="material-symbols-outlined">neurology</span>
                  )}
                </div>
                <div className={`p-5 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' 
                  ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 rounded-tr-none' 
                  : 'bg-indigo-50 dark:bg-indigo-900/20 text-slate-800 dark:text-slate-100 rounded-tl-none border border-indigo-100 dark:border-indigo-900/30'
                }`}>
                  {msg.text}
                  <div className={`text-[10px] mt-2 font-bold opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
               <div className="flex max-w-[80%] gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined animate-pulse">neurology</span>
                  </div>
                  <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl rounded-tl-none border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white dark:bg-[#161f2e] border-t border-slate-200 dark:border-slate-700">
          <div className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 pr-2 border border-transparent focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <button className="p-3 text-slate-400 hover:text-primary transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-700">
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              rows={1}
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-white placeholder-slate-400 resize-none py-3 max-h-32"
              style={{minHeight: '44px'}}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-3 bg-primary text-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            AI-generated content may be inaccurate. Not a substitute for a doctor's judgement. Do not enter real patient identifiers.
          </p>
        </div>

      </div>
    </div>
  );
};