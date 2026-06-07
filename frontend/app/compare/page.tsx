"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitCompare, Sparkles, TrendingUp, TrendingDown, ArrowRightLeft, Database } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import Sidebar from "@/components/Sidebar";

interface Dataset {
  id: string;
  filename: string;
  status: string;
  row_count: number;
  column_count: number;
  metrics: Record<string, number> | null;
}

export default function ComparePage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDatasets() {
      try {
        const res = await fetch("http://localhost:8000/api/datasets");
        if (res.ok) {
          const json = await res.json();
          setDatasets(json.filter((d: any) => d.status === "completed"));
        }
      } catch (err) {
        console.error("Failed to load datasets for comparison:", err);
      }
    }
    loadDatasets();
  }, []);

  const handleCompare = async () => {
    if (!idA || !idB) {
      setError("Please select two distinct datasets to run comparison.");
      return;
    }
    if (idA === idB) {
      setError("Please select two different datasets.");
      return;
    }

    setLoading(true);
    setError("");
    setComparison(null);

    try {
      const res = await fetch(`http://localhost:8000/api/datasets/compare/${idA}/${idB}`);
      if (!res.ok) throw new Error("Comparison calculation failed");
      const json = await res.json();
      
      const dsDetailsA = datasets.find(d => d.id === idA);
      const dsDetailsB = datasets.find(d => d.id === idB);
      
      setComparison({
        ...json,
        dataset_a: {
          ...json.dataset_a,
          rows: dsDetailsA?.row_count || 0,
          cols: dsDetailsA?.column_count || 0
        },
        dataset_b: {
          ...json.dataset_b,
          rows: dsDetailsB?.row_count || 0,
          cols: dsDetailsB?.column_count || 0
        }
      });
    } catch (err: any) {
      setError(err.message || "Failed to compare datasets.");
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!comparison) return [];
    const keys = ["quality", "trust", "completeness", "uniqueness", "validity", "consistency"];
    return keys.map(key => ({
      parameter: key.charAt(0).toUpperCase() + key.slice(1),
      [comparison.dataset_a.filename]: comparison.dataset_a.scores[key] || 0,
      [comparison.dataset_b.filename]: comparison.dataset_b.scores[key] || 0
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar />

      <main className="flex-1 ml-64 p-8 max-w-5xl flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-5">
          <Link href="/" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mb-1.5">
            <ArrowLeft className="h-3 w-3" /> Back to Uploads
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-blue-650" /> Dataset Comparison Studio
          </h1>
          <p className="text-xs text-slate-500">
            Select two versions of a dataset to audit differences, track cleansing, and map quality deltas.
          </p>
        </div>

        {/* Selection Input Area */}
        <div className="fluent-card p-6 bg-white flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 flex flex-col gap-1.5 w-full">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Base Dataset (A)</label>
            <select
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Choose Base Dataset A --</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.filename}</option>
              ))}
            </select>
          </div>

          <div className="p-2.5 text-slate-400 hidden md:block">
            <ArrowRightLeft className="h-4 w-4" />
          </div>

          <div className="flex-1 flex flex-col gap-1.5 w-full">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Compare Dataset (B)</label>
            <select
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Choose Compare Dataset B --</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.filename}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCompare}
            disabled={loading || !idA || !idB}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg border border-red-205 bg-red-50 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Side-by-Side Comparison Layout */}
        {comparison && (
          <div className="flex flex-col gap-8">
            
            {/* Side-by-Side Metadata Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Dataset A Card */}
              <div className="fluent-card p-6 bg-white relative overflow-hidden border-l-4 border-l-blue-600">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Base Dataset (A)</span>
                <h3 className="text-base font-bold text-slate-800 mt-1 truncate">{comparison.dataset_a.filename}</h3>
                
                <div className="grid grid-cols-3 gap-4 mt-4 border-t border-slate-100 pt-4 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Quality</span>
                    <span className="text-lg font-bold text-slate-850">{Math.round(comparison.dataset_a.scores.quality)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Trust</span>
                    <span className="text-lg font-bold text-slate-850">{Math.round(comparison.dataset_a.scores.trust)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Dimensions</span>
                    <span className="text-[11px] text-slate-500 font-semibold">{comparison.dataset_a.rows} × {comparison.dataset_a.cols}</span>
                  </div>
                </div>
              </div>

              {/* Dataset B Card */}
              <div className="fluent-card p-6 bg-white relative overflow-hidden border-l-4 border-l-sky-500">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Compare Dataset (B)</span>
                <h3 className="text-base font-bold text-slate-800 mt-1 truncate">{comparison.dataset_b.filename}</h3>
                
                <div className="grid grid-cols-3 gap-4 mt-4 border-t border-slate-100 pt-4 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Quality</span>
                    <span className="text-lg font-bold text-slate-850">{Math.round(comparison.dataset_b.scores.quality)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Trust</span>
                    <span className="text-lg font-bold text-slate-850">{Math.round(comparison.dataset_b.scores.trust)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Dimensions</span>
                    <span className="text-[11px] text-slate-500 font-semibold">{comparison.dataset_b.rows} × {comparison.dataset_b.cols}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Parameter Delta Grid and Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Comparative Charts Wrapper */}
              <div className="lg:col-span-8 fluent-card p-6 bg-white flex flex-col gap-4">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Dimensional Comparison Matrix</h3>
                
                <div className="h-[280px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="parameter" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", fontSize: 10 }} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey={comparison.dataset_a.filename} fill="#2563eb" radius={[3, 3, 0, 0]} />
                      <Bar dataKey={comparison.dataset_b.filename} fill="#06b6d4" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Deltas & Explanations Panel */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Metric Differences */}
                <div className="fluent-card p-6 bg-white flex flex-col gap-3">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Score Variations</h3>
                  <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                    {Object.entries(comparison.score_diffs).map(([key, diff]: any) => {
                      const isPositive = diff > 0;
                      const isZero = diff === 0;
                      return (
                        <div key={key} className="flex justify-between items-center text-xs">
                          <span className="capitalize text-slate-500 font-medium">{key}</span>
                          <span className={`font-bold font-mono flex items-center gap-0.5 ${
                            isZero ? "text-slate-400" : isPositive ? "text-emerald-600" : "text-red-650"
                          }`}>
                            {isZero ? "0%" : isPositive ? `+${diff}%` : `${diff}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Comparison Explanation */}
                <div className="fluent-card p-6 bg-white flex flex-col gap-3">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" /> AI Comparison Explanation
                  </h3>
                  <div className="text-xs text-slate-500 leading-relaxed flex flex-col gap-2.5">
                    <p>
                      Analysis indicates **{comparison.dataset_b.filename}** is the 
                      {comparison.score_diffs.quality > 0 ? " cleaner, more structured feed." : comparison.score_diffs.quality < 0 ? " legacy version, carrying more formatting issues." : " identical clone."}
                    </p>
                    {comparison.score_diffs.quality > 0 ? (
                      <p className="text-emerald-700 font-medium bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                        Recommendation: promote Dataset B to master production pipelines.
                      </p>
                    ) : comparison.score_diffs.quality < 0 ? (
                      <p className="text-red-700 font-medium bg-red-50 border border-red-100 p-2.5 rounded-lg">
                        Alert: Dataset B contains quality degradations. Investigate ingest scripts.
                      </p>
                    ) : null}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
