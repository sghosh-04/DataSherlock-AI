"use client";

import { useState } from "react";
import { 
  Database, 
  Sparkles, 
  Terminal, 
  Play, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  Copy,
  BookOpen,
  Info
} from "lucide-react";

interface SqlAnalyticsTabProps {
  datasetId: string;
  columns: string[];
}

export default function SqlAnalyticsTab({ datasetId, columns }: SqlAnalyticsTabProps) {
  // Query state
  const [query, setQuery] = useState("SELECT * FROM dataset LIMIT 10");
  const [translating, setTranslating] = useState(false);
  const [nlpPrompt, setNlpPrompt] = useState("");
  const [executing, setExecuting] = useState(false);
  
  // Results state
  const [results, setResults] = useState<{ columns: string[]; rows: any[]; insight?: string } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpPrompt.trim()) return;

    setTranslating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`http://localhost:8000/api/datasets/${datasetId}/sql/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: nlpPrompt })
      });
      if (!res.ok) throw new Error("Text-to-SQL translation failed");
      const json = await res.json();
      if (json.query) {
        setQuery(json.query);
        setSuccess("AI translation completed! The query below has been generated.");
        setNlpPrompt("");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error("Translation returned invalid query structure.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to translate prompt to SQL query.");
    } finally {
      setTranslating(false);
    }
  };

  const handleRunSQL = async () => {
    if (!query.trim()) return;

    setExecuting(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch(`http://localhost:8000/api/datasets/${datasetId}/sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query })
      });
      if (!res.ok) throw new Error("SQL execution failed");
      const json = await res.json();
      
      if (json.status === "error") {
        throw new Error(json.insight || "Syntax validation failed");
      }

      setResults(json);
    } catch (err: any) {
      setError(err.message || "Database query execution halted.");
    } finally {
      setExecuting(false);
    }
  };

  const applyTemplate = (tmpl: string) => {
    let sql = "";
    const primaryCol = columns[0] || "id";
    const numericCol = columns.find(c => c.toLowerCase().includes("sales") || c.toLowerCase().includes("revenue") || c.toLowerCase().includes("amount") || c.toLowerCase().includes("price") || c.toLowerCase().includes("score")) || columns[0] || "id";

    switch(tmpl) {
      case "select_all":
        sql = "SELECT * FROM dataset LIMIT 10";
        break;
      case "count_rows":
        sql = "SELECT COUNT(*) as Total_Records FROM dataset";
        break;
      case "avg_metric":
        sql = `SELECT AVG(\`${numericCol}\`) as Average_Val, MIN(\`${numericCol}\`) as Min_Val, MAX(\`${numericCol}\`) as Max_Val FROM dataset`;
        break;
      case "group_by":
        sql = `SELECT \`${primaryCol}\`, COUNT(*) as Group_Count FROM dataset GROUP BY \`${primaryCol}\` ORDER BY Group_Count DESC LIMIT 10`;
        break;
      default:
        sql = "SELECT * FROM dataset LIMIT 10";
    }
    setQuery(sql);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. NLP text-to-SQL Assistant Card */}
      <div className="fluent-card bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sparkles className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">AI SQL Writing Assistant</h3>
            <p className="text-[10px] text-slate-400">Describe what data you want to retrieve using plain English</p>
          </div>
        </div>

        <form onSubmit={handleTranslate} className="flex gap-2 w-full">
          <input
            type="text"
            required
            value={nlpPrompt}
            onChange={(e) => setNlpPrompt(e.target.value)}
            placeholder='e.g., "Find the top 5 highest sales regions", "Show average age grouped by department"...'
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-250 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={translating || !nlpPrompt.trim()}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer shrink-0"
          >
            {translating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-white" />
            )}
            Translate Prompt
          </button>
        </form>
      </div>

      {/* 2. SQL console and Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Templates Card (Left) */}
        <div className="lg:col-span-3 fluent-card bg-white p-4 border border-slate-200 rounded-xl shadow-sm flex flex-col gap-3 min-h-[350px]">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" /> Query Templates
          </h4>

          <div className="flex flex-col gap-1.5">
            <button 
              onClick={() => applyTemplate("select_all")}
              className="w-full text-left p-2 rounded hover:bg-slate-50 border border-slate-100 text-[11px] text-slate-650 transition-colors font-medium cursor-pointer"
            >
              📊 Select top 10 rows
            </button>
            <button 
              onClick={() => applyTemplate("count_rows")}
              className="w-full text-left p-2 rounded hover:bg-slate-50 border border-slate-100 text-[11px] text-slate-650 transition-colors font-medium cursor-pointer"
            >
              🔢 Count all records
            </button>
            <button 
              onClick={() => applyTemplate("avg_metric")}
              className="w-full text-left p-2 rounded hover:bg-slate-50 border border-slate-100 text-[11px] text-slate-650 transition-colors font-medium cursor-pointer"
            >
              📈 Compute numeric bounds
            </button>
            <button 
              onClick={() => applyTemplate("group_by")}
              className="w-full text-left p-2 rounded hover:bg-slate-50 border border-slate-100 text-[11px] text-slate-650 transition-colors font-medium cursor-pointer"
            >
              🔗 Group by primary column
            </button>
          </div>

          <div className="mt-auto p-2.5 rounded bg-slate-50 border border-slate-200 text-[9px] text-slate-400 leading-relaxed font-mono">
            <p className="font-bold text-slate-550 mb-1">Available Schema:</p>
            <div className="max-h-[100px] overflow-y-auto flex flex-col gap-0.5">
              {columns.map(c => <div key={c}>- `{c}`</div>)}
            </div>
          </div>
        </div>

        {/* SQL Console Card (Right) */}
        <div className="lg:col-span-9 fluent-card bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col gap-4 min-h-[350px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Terminal className="h-4.5 w-4.5 text-slate-600" /> SQL Sandbox Editor
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">
              SQLite v3.x
            </span>
          </div>

          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={6}
              className="w-full p-4 rounded-xl border border-slate-250 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ tabSize: 4 }}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              onClick={handleRunSQL}
              disabled={executing || !query.trim()}
              className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Play className="h-4 w-4 text-white" />
              )}
              Execute SQL Statement
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK alerts */}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-250 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Query Results Table Sheet */}
      {results && (
        <div className="fluent-card bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">SQL Executed Output Grid</h3>
              <p className="text-[10px] text-slate-400">Query evaluated successfully</p>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-600 font-bold border border-blue-100 px-2 py-0.5 rounded-full">
              {results.rows.length} Rows returned
            </span>
          </div>

          {/* AI Insights Description Card */}
          {results.insight && (
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-slate-650 flex items-start gap-2 animate-fadeIn">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Statistical Overview</span>
                <p>{results.insight}</p>
              </div>
            </div>
          )}

          {/* Data Sheet Grid */}
          {results.rows.length === 0 ? (
            <div className="p-6 text-center text-slate-450 text-xs">
              Statement executed successfully but returned zero results.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                    <th className="p-3 select-none text-center border-r border-slate-200 w-12 bg-slate-100">#</th>
                    {results.columns.map((c) => (
                      <th key={c} className="p-3 font-semibold font-mono text-[11px] bg-slate-50/50">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 hover:bg-slate-50/50 text-slate-700 transition-colors"
                    >
                      <td className="p-3 text-center border-r border-slate-200 font-mono text-[10px] bg-slate-50 text-slate-400">
                        {idx + 1}
                      </td>
                      {row.map((val: any, cIdx: number) => (
                        <td key={cIdx} className="p-3 max-w-[200px] truncate select-text">
                          {val === null || val === undefined ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-650 font-semibold uppercase tracking-wider">
                              NULL
                            </span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
