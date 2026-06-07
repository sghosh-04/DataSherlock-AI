"use client";

import { useState } from "react";
import { 
  Calculator, 
  Sparkles, 
  HelpCircle, 
  Play, 
  Loader2, 
  CheckCircle,
  Database,
  ArrowRight,
  TrendingUp,
  Percent
} from "lucide-react";
import BiPanel from "@/components/BiPanel";

interface InsightsTabProps {
  datasetId: string;
  columns: string[];
  dashboardConfig: any[];
}

export default function InsightsTab({ datasetId, columns, dashboardConfig }: InsightsTabProps) {
  // Metric builder state
  const [metricLabel, setMetricLabel] = useState("Total Revenue");
  const [func, setFunc] = useState("SUM");
  const [targetCol, setTargetCol] = useState(columns[0] || "");
  const [groupByCol, setGroupByCol] = useState("");
  const [calculating, setCalculating] = useState(false);
  
  // Results
  const [resultVal, setResultVal] = useState<string | null>(null);
  const [resultRows, setResultRows] = useState<any[] | null>(null);
  const [resultCols, setResultCols] = useState<string[] | null>(null);
  const [calcError, setCalcError] = useState("");

  const handleCalculateMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    setCalcError("");
    setResultVal(null);
    setResultRows(null);
    setResultCols(null);

    // Build the SQL statement
    let sql = "";
    if (groupByCol) {
      sql = `SELECT \`${groupByCol}\`, ${func}(\`${targetCol}\`) as \`${metricLabel}\` FROM dataset GROUP BY \`${groupByCol}\` ORDER BY \`${metricLabel}\` DESC LIMIT 10`;
    } else {
      sql = `SELECT ${func}(\`${targetCol}\`) as \`${metricLabel}\` FROM dataset`;
    }

    try {
      const res = await fetch(`http://localhost:8000/api/datasets/${datasetId}/sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql })
      });
      if (!res.ok) throw new Error("Formula calculation failed");
      const json = await res.json();
      
      if (json.status === "error") {
        throw new Error(json.insight || "SQL execution failed");
      }

      if (groupByCol) {
        setResultCols(json.columns);
        setResultRows(json.rows);
      } else {
        // Single KPI value
        const val = json.rows[0] ? json.rows[0][0] : null;
        if (typeof val === "number") {
          setResultVal(val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
        } else {
          setResultVal(val !== null ? String(val) : "0");
        }
      }
    } catch (err: any) {
      setCalcError(err.message || "Failed to compute formula.");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* 1. Main Dashboard Panel (AI Editor & Recharts Charts) */}
      <div className="w-full">
        <BiPanel datasetId={datasetId} initialWidgets={dashboardConfig} />
      </div>

      {/* 2. Metric Builder Form & Formula Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Metric Form Controls (Left) */}
        <div className="lg:col-span-5 fluent-card bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calculator className="h-4 w-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Dynamic Metric Builder</h3>
              <p className="text-[10px] text-slate-400">Compute aggregates and group-by indices in real-time</p>
            </div>
          </div>

          <form onSubmit={handleCalculateMetric} className="flex flex-col gap-4 text-xs">
            {/* Metric Alias */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-500">Metric Alias Name</label>
              <input
                type="text"
                required
                value={metricLabel}
                onChange={(e) => setMetricLabel(e.target.value)}
                placeholder="e.g. Total Revenue"
                className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Formula Function */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-500">Aggregate Function</label>
              <select
                value={func}
                onChange={(e) => setFunc(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="SUM">SUM (Total summation)</option>
                <option value="AVG">AVG (Average mean)</option>
                <option value="COUNT">COUNT (Row counting)</option>
                <option value="MIN">MIN (Minimum boundary)</option>
                <option value="MAX">MAX (Maximum boundary)</option>
              </select>
            </div>

            {/* Target Column */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-500">Target Column (Numeric/Field)</label>
              <select
                value={targetCol}
                onChange={(e) => setTargetCol(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Group By Column */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-500">Group By Dimension (Optional)</label>
              <select
                value={groupByCol}
                onChange={(e) => setGroupByCol(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None (Single summary metric)</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={calculating}
              className="mt-2 w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {calculating ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run Formula
            </button>
          </form>
        </div>

        {/* Metric Outputs / Results Panel (Right) */}
        <div className="lg:col-span-7 fluent-card bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800">Calculation Results</h3>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 flex items-center gap-1">
              <Database className="h-3 w-3" /> Live Query
            </span>
          </div>

          {calculating ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-xs">Evaluating metric schema...</span>
            </div>
          ) : calcError ? (
            <div className="flex-1 flex items-center justify-center p-4 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
              {calcError}
            </div>
          ) : resultVal !== null ? (
            /* RENDER KPI CARD */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-1 text-blue-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{metricLabel}</span>
              <span className="text-5xl font-extrabold text-slate-800 tracking-tight">{resultVal}</span>
              <div className="text-[10px] text-slate-400 font-mono mt-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full flex items-center gap-1">
                <span>Formula: {func}({targetCol})</span>
              </div>
            </div>
          ) : resultRows !== null && resultCols !== null ? (
            /* RENDER GROUPED RESULT TABLE */
            <div className="flex-1 flex flex-col gap-4">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span>Aggregated Breakdown for: </span>
                <span className="font-bold text-slate-800 font-mono">[{groupByCol}]</span>
              </div>
              
              <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="p-2 border-r border-slate-250 text-center w-12 bg-slate-100">#</th>
                      <th className="p-2 font-mono text-blue-600">{resultCols[0]}</th>
                      <th className="p-2 text-right font-mono text-slate-800">{resultCols[1]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 hover:bg-slate-50/50 text-slate-700 transition-colors"
                      >
                        <td className="p-2 text-center border-r border-slate-250 font-mono text-[10px] bg-slate-50 text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-2 truncate font-medium max-w-[200px]">
                          {row[0] === null ? <span className="text-slate-450 italic">None</span> : String(row[0])}
                        </td>
                        <td className="p-2 text-right font-mono font-bold">
                          {typeof row[1] === "number" 
                            ? row[1].toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                            : String(row[1])
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* INITIAL PLACEHOLDER */
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 text-center py-8">
              <HelpCircle className="h-8 w-8 text-slate-300" />
              <p className="text-xs">No metrics calculated yet.</p>
              <p className="text-[10px] text-slate-400 max-w-[280px]">
                Define aggregation aliases, functions, and columns in the builder on the left to inspect metric distributions.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
