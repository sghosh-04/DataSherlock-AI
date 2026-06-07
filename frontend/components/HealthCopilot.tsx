"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, Send, Loader2, Bot, User } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface Message {
  sender: "user" | "bot";
  text: string;
}

interface HealthCopilotProps {
  datasetId: string;
}

export default function HealthCopilot({ datasetId }: HealthCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hello! I am your Data Health Copilot. I have completed my analysis. What would you like to know about your dataset's health?"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "Why is the quality score low?",
    "What are the recommendations to fix this dataset?",
    "Tell me about duplicate records.",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInputValue("");
    setLoading(true);

    try {
      // Map history
      const history = messages.map((m) => ({
        role: m.sender === "bot" ? "assistant" : "user",
        content: m.text
      }));

      const res = await fetch(`${API_BASE_URL}/api/copilot/${datasetId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          chat_history: history
        })
      });

      if (!res.ok) throw new Error("Connection to copilot failed");

      const data = await res.json();
      setMessages((prev) => [...prev, { sender: "bot", text: data.response }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "I encountered an error connecting to the AI agent service. Please verify the backend is running." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fluent-card p-6 bg-white flex flex-col gap-4 w-full h-[500px]">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">Data Health Copilot</h3>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
          Azure OpenAI
        </span>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
        {messages.map((msg, idx) => {
          const isBot = msg.sender === "bot";
          return (
            <div 
              key={idx} 
              className={`flex items-start gap-2.5 max-w-[85%] ${isBot ? "self-start" : "self-end flex-row-reverse"}`}
            >
              <div className={`p-1.5 rounded border shrink-0 ${
                isBot 
                  ? "bg-blue-50 border-blue-100 text-blue-600" 
                  : "bg-slate-100 border-slate-200 text-slate-600"
              }`}>
                {isBot ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>
              
              <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                isBot 
                  ? "bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-none" 
                  : "bg-blue-600 text-white rounded-tr-none shadow-sm"
              }`}>
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-start gap-2.5 self-start">
            <div className="p-1.5 rounded border bg-blue-50 border-blue-100 text-blue-600 animate-spin">
              <Loader2 className="h-3.5 w-3.5" />
            </div>
            <div className="p-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-400 rounded-tl-none">
              Copilot is generating details...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion tags */}
      {messages.length === 1 && !loading && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Suggested Questions</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-[11px] px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-left transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="flex gap-2 border-t border-slate-200 pt-3"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about data quality anomalies, root causes..."
          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-250 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all flex items-center justify-center cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
