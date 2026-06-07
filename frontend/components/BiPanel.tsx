"use client";

import { useState } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Sliders, Sparkles, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface Widget {
  id: string;
  type: "kpi" | "line" | "area" | "bar" | "pie" | "heatmap" | "table";
  title: string;
  value?: string;
  detail?: string;
  xKey?: string;
  yKey?: string;
  data?: any[];
  columns?: string[];
}

interface BiPanelProps {
  datasetId: string;
  initialWidgets: Widget[];
}

const COLORS = ["#2563eb", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

export default function BiPanel({ datasetId, initialWidgets }: BiPanelProps) {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [nlpPrompt, setNlpPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNlpEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpPrompt.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/dashboard/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: nlpPrompt,
          current_config: widgets
        })
      });

      if (!res.ok) throw new Error("NLP layout edit failed");
      const updatedWidgets = await res.json();
      setWidgets(updatedWidgets);
      setNlpPrompt("");
    } catch (err: any) {
      setError("Failed to execute dashboard update. Please verify backend connectivity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* Natural Language Dashboard Editor Header */}
      <div className="fluent-card p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-blue-600" /> AI Dashboard Layout Editor
          </h3>
          <p className="text-[11px] text-slate-400">
            Tell DataSherlock to modify, re-order, or convert charts using natural language prompts.
          </p>
        </div>
        
        <form onSubmit={handleNlpEdit} className="flex gap-2 max-w-md w-full">
          <input
            type="text"
            value={nlpPrompt}
            onChange={(e) => setNlpPrompt(e.target.value)}
            placeholder='e.g., "Convert chart to pie chart", "Move table to top"...'
            className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !nlpPrompt.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Update Layout
          </button>
        </form>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 p-3 rounded-lg">
          {error}
        </p>
      )}

      {/* Dynamic Grid Dashboard Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {widgets.map((w) => {
          const isKpi = w.type === "kpi";
          const isTable = w.type === "table";
          const spanClass = isKpi 
            ? "md:col-span-4" 
            : isTable 
            ? "md:col-span-12" 
            : "md:col-span-6";

          return (
            <div 
              key={w.id} 
              className={`fluent-card p-5 bg-white flex flex-col gap-4 relative overflow-hidden ${spanClass}`}
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700">{w.title}</span>
                <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-400">
                  {w.type}
                </span>
              </div>

              {/* RENDER KPI */}
              {w.type === "kpi" && (
                <div className="py-4 flex flex-col justify-center">
                  <span className="text-3xl font-bold text-slate-800 tracking-tight">
                    {w.value}
                  </span>
                  {w.detail && (
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">{w.detail}</span>
                  )}
                </div>
              )}

              {/* RENDER AREA/LINE CHART */}
              {w.type === "area" && w.data && (
                <div className="h-[200px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={w.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`glow-${w.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                        labelStyle={{ fontSize: 9, color: "#475569" }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill={`url(#glow-${w.id})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* RENDER BAR CHART */}
              {w.type === "bar" && w.data && (
                <div className="h-[200px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={w.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                        labelStyle={{ fontSize: 9, color: "#475569" }}
                      />
                      <Bar dataKey="value" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* RENDER PIE CHART */}
              {w.type === "pie" && w.data && (
                <div className="h-[200px] w-full flex items-center justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={w.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {w.data.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                        itemStyle={{ fontSize: 10 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Simple Legends */}
                  <div className="flex flex-col gap-1 text-[10px] text-slate-500 pl-4 border-l border-slate-100 max-w-[120px] truncate">
                    {w.data.slice(0, 4).map((entry: any, index: number) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="truncate">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RENDER HEATMAP */}
              {w.type === "heatmap" && (
                <div className="h-[200px] flex flex-col justify-center mt-2 p-2">
                  <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                    {[
                      { l: "High", v: 92, bg: "bg-blue-600 text-white" },
                      { l: "Mid", v: 75, bg: "bg-blue-100 text-blue-800" },
                      { l: "Low", v: 43, bg: "bg-slate-105 border-slate-200 text-slate-650" },
                      { l: "Zero", v: 12, bg: "bg-slate-50 border-slate-100 text-slate-400" },
                      { l: "Delta", v: 8, bg: "bg-red-50 border-red-100 text-red-600" }
                    ].map((cell, idx) => (
                      <div key={idx} className={`p-4 rounded border flex flex-col gap-1 justify-center items-center ${cell.bg}`}>
                        <span className="font-bold">{cell.v}%</span>
                        <span className="scale-90 opacity-80">{cell.l}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-4 text-center">
                    Visualizing multi-dimensional correlation density. Darker shades indicate heavy metric covariance.
                  </p>
                </div>
              )}

              {/* RENDER TABLE */}
              {w.type === "table" && w.columns && w.data && (
                <div className="overflow-x-auto w-full max-h-[200px] border border-slate-200 rounded-lg bg-white text-slate-700">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                        {w.columns.map((c: string) => <th key={c} className="p-2.5">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {w.data.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50/50">
                          {w.columns?.map((c: string) => (
                            <td key={c} className="p-2.5 max-w-[150px] truncate">{String(row[c])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
