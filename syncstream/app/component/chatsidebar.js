'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

export default function ChatSidebar({ socket, roomId, username }) {
  const chatEndRef = useRef(null);
  const [messages, setMessages] = useState([
    { sender: 'System', text: 'Welcome to SyncStream!', type: 'system' },
  ]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    };

    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgObject = {
      sender: username,
      text: inputText,
      time: timeString,
      type: 'user',
    };

    setMessages((prev) => [...prev, msgObject]);
    socket.emit('send-message', { roomId, message: msgObject });
    setInputText('');
  };

  return (
    // Fills the parent panel exactly — no own border/rounded/header/height here,
    // the parent (page.jsx) already provides the card chrome and section header.
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages — the single scroll region for this panel */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.sender === username ? 'items-end' : 'items-start'}`}
          >
            {msg.type === 'system' ? (
              <div className="my-1 w-full text-center">
                <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] text-slate-400">
                  {msg.text}
                </span>
              </div>
            ) : (
              <div
                className={`max-w-[85%] min-w-0 rounded-2xl p-3 ${
                  msg.sender === username
                    ? 'rounded-br-sm bg-indigo-600 text-white'
                    : 'rounded-bl-sm border border-white/[0.06] bg-white/[0.04] text-slate-200'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2 font-mono text-[10px] text-slate-300/80">
                  <span className="truncate font-bold">
                    {msg.sender === username ? 'You' : msg.sender}
                  </span>
                  <span className="shrink-0">{msg.time}</span>
                </div>
                <p className="break-words leading-relaxed">{msg.text}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input — pinned to the bottom of the panel, never scrolls away */}
      <form
        onSubmit={handleSendMessage}
        className="flex shrink-0 items-center gap-2 border-t border-white/[0.06] p-3"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message the room…"
          className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 active:scale-[0.97]"
        >
          <Send className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}