"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileSpreadsheet, 
  Layers, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  Database,
  FileCheck,
  GitCompare,
  Grid
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import FileUpload from "@/components/FileUpload";

interface Dataset {
  id: string;
  filename: string;
  upload_time: string;
  status: "processing" | "completed" | "failed";
  row_count: number;
  column_count: number;
  metrics: {
    quality: number;
    trust: number;
  } | null;
}

export default function Home() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchDatasets() {
    try {
      const res = await fetch("http://localhost:8000/api/datasets");
      if (res.ok) {
        const json = await res.json();
        setDatasets(json);
      }
    } catch (err) {
      console.error("Failed to fetch datasets list:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Poll for updates if any dataset is 'processing'
  useEffect(() => {
    const hasProcessing = datasets.some((d) => d.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDatasets();
    }, 3000);

    return () => clearInterval(interval);
  }, [datasets]);

  const handleUploadSuccess = (newId: string) => {
    fetchDatasets();
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar />

      <main className="flex-1 ml-64 p-8 max-w-5xl flex flex-col gap-8">
        
        {/* Header Hero Section */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[10px] uppercase font-bold tracking-widest self-start">
            <Sparkles className="h-3 w-3" /> Microsoft Fluent Design
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Data Quality & BI Workspace
          </h1>
          <p className="text-sm text-slate-500 leading-normal max-w-2xl">
            Upload CSV, Excel, or JSON files. DataSherlock AI deploys a 10-Agent self-service BI pipeline to run diagnostic audits, cluster fuzzy duplicates, generate dynamic dashboards, and provide narrative briefings.
          </p>
        </section>

        {/* Upload Zone Card */}
        <section className="fluent-card p-6 bg-white">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </section>

        {/* Datasets List Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Datasets Repository</h2>
            </div>
            <Link href="/compare" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 transition-all">
              <GitCompare className="h-3.5 w-3.5" /> Comparison Studio <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="h-24 flex items-center justify-center text-slate-400 text-xs font-mono">
              Loading active repository...
            </div>
          ) : datasets.length === 0 ? (
            <div className="fluent-card p-12 bg-white text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <FileCheck className="h-8 w-8 text-slate-350" />
              <p className="text-sm font-semibold text-slate-700">Workspace is empty</p>
              <p className="text-xs text-slate-400 max-w-xs leading-normal">
                Ingest tabular files above to initiate dynamic analytics reports.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {datasets.map((ds) => {
                const isCompleted = ds.status === "completed";
                const isProcessing = ds.status === "processing";
                
                return (
                  <div 
                    key={ds.id} 
                    className="fluent-card fluent-card-hover p-5 bg-white flex flex-col justify-between gap-5 relative overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded border ${
                          isCompleted 
                            ? "bg-blue-50 border-blue-100 text-blue-600" 
                            : isProcessing
                            ? "bg-amber-50 border-amber-100 text-amber-600 animate-pulse"
                            : "bg-red-50 border-red-100 text-red-600"
                        }`}>
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-xs text-slate-800 truncate max-w-[150px] block" title={ds.filename}>
                            {ds.filename}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Calendar className="h-2.5 w-2.5" /> {formatDate(ds.upload_time)}
                          </span>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : isProcessing
                          ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}>
                        {ds.status}
                      </span>
                    </div>

                    {/* Stats & Quality Scores */}
                    {isCompleted && ds.metrics ? (
                      <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Quality Score</span>
                          <span className="text-xl font-bold text-slate-800">{Math.round(ds.metrics.quality)}%</span>
                        </div>
                        
                        <div className="flex flex-col text-right gap-0.5">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Dimensions</span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {ds.row_count} × {ds.column_count}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 flex items-center justify-center h-12 bg-slate-50 border border-slate-200/50 rounded-lg">
                        {isProcessing ? "Processing dataset parameters..." : "Pipeline execution failed."}
                      </div>
                    )}

                    {/* Link */}
                    {isCompleted && (
                      <Link 
                        href={`/dashboard/${ds.id}`}
                        className="w-full py-2.5 rounded-lg border border-blue-100 hover:border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-600 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                      >
                        Inspect Analytics Dashboard <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
