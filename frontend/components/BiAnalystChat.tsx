"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, CheckCircle, BarChart3 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip 
} from "recharts";

interface Message {
  sender: "user" | "bot";
  text: string;
  supportingMetrics?: string[];
  confidence?: number;
  visualRec?: {
    type: "kpi" | "line" | "area" | "bar" | "pie" | "table";
    title: string;
    value?: string;
    detail?: string;
    xKey?: string;
    yKey?: string;
    data?: any[];
  };
}

interface BiAnalystChatProps {
  datasetId: string;
}

const COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

export default function BiAnalystChat({ datasetId }: BiAnalystChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hello, I am your Conversational BI Analyst. Ask me queries like 'Which region performs best?' or 'Which product is underperforming?'",
      confidence: 1.0
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starters = [
    "Which region performs best?",
    "Which product is underperforming?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/copilot/${datasetId}/bi-analyst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          chat_history: []
        })
      });

      if (!res.ok) throw new Error("BI Analysis failed");
      const data = await res.json();
      
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.summary,
          supportingMetrics: data.supporting_metrics,
          confidence: data.confidence_score,
          visualRec: data.visual_recommendation
        }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "I ran into a problem running calculations on the dataset. Make sure columns like 'Region' or 'Product' exist." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fluent-card p-6 bg-white flex flex-col gap-4 w-full h-[600px]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">Conversational BI Analyst</h3>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
          Agent 8
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-5">
        {messages.map((msg, idx) => {
          const isBot = msg.sender === "bot";
          return (
            <div 
              key={idx} 
              className={`flex items-start gap-2.5 max-w-[90%] ${isBot ? "self-start" : "self-end flex-row-reverse"}`}
            >
              {/* Icon */}
              <div className={`p-1.5 rounded border shrink-0 ${
                isBot 
                  ? "bg-blue-50 border-blue-100 text-blue-600" 
                  : "bg-slate-100 border-slate-200 text-slate-600"
              }`}>
                {isBot ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>

              {/* Chat Bubble Content */}
              <div className={`p-4 rounded-xl text-xs leading-relaxed flex flex-col gap-3 ${
                isBot 
                  ? "bg-slate-55 border border-slate-200 text-slate-700 rounded-tl-none w-full" 
                  : "bg-blue-600 text-white rounded-tr-none shadow-sm"
              }`}>
                <p className="whitespace-pre-line font-medium">{msg.text}</p>

                {/* Supporting Metrics */}
                {isBot && msg.supportingMetrics && msg.supportingMetrics.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-slate-200 pt-2 mt-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Supporting Metrics</span>
                    <ul className="list-disc list-inside flex flex-col gap-0.5 text-slate-600 font-mono text-[10px]">
                      {msg.supportingMetrics.map((sm, smIdx) => (
                        <li key={smIdx}>{sm}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Embedded Chart Recommendation */}
                {isBot && msg.visualRec && msg.visualRec.data && (
                  <div className="mt-2 bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col gap-2 shadow-sm">
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" /> Recommended Visual: {msg.visualRec.title}
                    </span>

                    {/* Rent KPI inside Chat */}
                    {msg.visualRec.type === "kpi" && (
                      <div className="py-2 text-center">
                        <span className="text-2xl font-bold text-slate-800">{msg.visualRec.value}</span>
                        {msg.visualRec.detail && <p className="text-[9px] text-slate-400">{msg.visualRec.detail}</p>}
                      </div>
                    )}

                    {/* Rent Bar Chart inside Chat */}
                    {msg.visualRec.type === "bar" && (
                      <div className="h-[140px] w-full mt-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={msg.visualRec.data} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", fontSize: 9 }} />
                            <Bar dataKey="value" fill="#2563eb" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Rent Pie Chart inside Chat */}
                    {msg.visualRec.type === "pie" && (
                      <div className="h-[140px] w-full flex items-center justify-center mt-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={msg.visualRec.data}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={45}
                              dataKey="value"
                            >
                              {msg.visualRec.data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", fontSize: 9 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* Confidence Score Gauge */}
                {isBot && msg.confidence !== undefined && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end mt-1 border-t border-slate-100 pt-1">
                    <span>AI Confidence:</span>
                    <span className="font-bold text-blue-600">{Math.round(msg.confidence * 100)}%</span>
                  </div>
                )}
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
              BI Analyst is running aggregations...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Starters */}
      {messages.length === 1 && !loading && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Suggested Queries</p>
          <div className="flex flex-wrap gap-2">
            {starters.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                className="text-[11px] px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-55 text-slate-600 hover:text-slate-800 text-left transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input */}
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
          placeholder="Ask analytical questions (e.g. Which region generated the highest sales?)"
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
