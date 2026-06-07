"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Download, 
  Activity, 
  HelpCircle, 
  FolderTree,
  Scale,
  Users,
  Layers,
  Sparkles,
  Loader2,
  AlertTriangle
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import DataCleaningTab from "@/components/DataCleaningTab";
import InsightsTab from "@/components/InsightsTab";
import SqlAnalyticsTab from "@/components/SqlAnalyticsTab";
import ReportsExportsTab from "@/components/ReportsExportsTab";
import HealthCopilot from "@/components/HealthCopilot";
import BiAnalystChat from "@/components/BiAnalystChat";
import DataPreview from "@/components/DataPreview";
import { API_BASE_URL } from "@/lib/api";
import InsightsFeed from "@/components/InsightsFeed";
import WhatIfSimulator from "@/components/WhatIfSimulator";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DashboardPage({ params }: PageProps) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState(0);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/datasets/${id}/report`);
      if (!res.ok) throw new Error("Failed to load dataset quality report");
      const json = await res.json();
      if (json.status && json.status !== "completed") {
        throw new Error(`Pipeline has not finished: current status is '${json.status}'`);
      }
      setReport(json);
    } catch (err: any) {
      setError(err.message || "Failed to fetch diagnostic report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const handleCleanApplied = () => {
    fetchReport();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
        <p className="text-xs font-mono">Running DataSherlock Diagnostic Agents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-4 text-red-600">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="text-sm font-semibold">{error}</p>
        <Link href="/" className="text-xs text-blue-600 hover:underline">
          Return to uploads workspace
        </Link>
      </div>
    );
  }

  const { dataset, profiling, duplicates, insights, root_causes, recommendations, forecasts, dashboard_config, storytelling } = report;
  const scores = dataset.scores;
  
  // Extract column list safely
  const columnNames = profiling?.columns ? Object.keys(profiling.columns) : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <Sidebar 
        datasetId={id} 
        filename={dataset.filename} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <main className="flex-1 ml-64 p-8 max-w-5xl flex flex-col gap-8">
        
        {/* Back Button & Control Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex flex-col gap-1">
            <Link 
              href="/" 
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Workspace
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {dataset.filename} 
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-500">
                {dataset.row_count} rows × {dataset.column_count} cols
              </span>
            </h1>
          </div>
        </div>

        {/* Wizard Step Progress Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 bg-white border border-slate-200 rounded-xl p-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 shadow-sm">
          {[
            { label: "1. Clean", subtitle: "Data Cleaning Studio", index: 0 },
            { label: "2. Analyze", subtitle: "Insights Studio", index: 1 },
            { label: "3. Query", subtitle: "SQL & Analytics Studio", index: 2 },
            { label: "4. Report", subtitle: "Reports & Exports", index: 3 }
          ].map((step, idx) => {
            const isCompleted = idx < activeTab;
            const isActive = idx === activeTab;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-3 text-left focus:outline-none cursor-pointer group p-2 transition-all first:pt-2 md:first:pt-0 ${
                  idx > 0 ? "pt-4 md:pt-0 md:pl-4" : ""
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all border ${
                  isCompleted 
                    ? "bg-blue-600 border-blue-600 text-white" 
                    : isActive 
                    ? "bg-white border-blue-600 text-blue-600 ring-2 ring-blue-100" 
                    : "bg-slate-50 border-slate-250 text-slate-400 group-hover:border-slate-350"
                }`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div className="flex flex-col truncate">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? "text-blue-600" : isCompleted ? "text-slate-700" : "text-slate-400"}`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-450 truncate">
                    {step.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Render */}
        <div className="w-full transition-all duration-200">
          
          {/* TAB 1: DATA CLEANING */}
          {activeTab === 0 && (
            <div className="flex flex-col gap-8 w-full animate-fadeIn">
              <DataCleaningTab 
                datasetId={id} 
                columns={columnNames} 
                onCleanApplied={handleCleanApplied} 
              />
              
              {/* Duplicate Record Clusters inside Data Cleaning tab */}
              {duplicates.duplicate_count > 0 && (
                <div className="fluent-card p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-slate-800 text-sm">Duplicate Record Clusters ({duplicates.duplicate_count} found)</h3>
                    </div>
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                      Agent 2
                    </span>
                  </div>

                  <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
                    {duplicates.groups.map((group: any) => (
                      <div key={group.group_id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                          <span className="font-bold text-slate-700">Cluster Group #{group.group_id}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-650 font-semibold border border-red-200">
                            Mean Similarity: {group.average_similarity}%
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 mt-1">
                          {group.records.map((rec: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs text-slate-500 font-mono pl-2 border-l border-blue-500/40">
                              <div className="truncate max-w-[500px]">
                                <span className="text-slate-400 font-semibold">Row {rec.row_index}:</span> {JSON.stringify(rec.record)}
                              </div>
                              <span className="text-[10px] text-blue-600 font-bold">
                                {rec.similarity === 100 ? "Anchor" : `Match: ${rec.similarity}%`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview */}
              <div className="fluent-card p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
                <DataPreview datasetId={id} />
              </div>
            </div>
          )}

          {/* TAB 2: INSIGHTS STUDIO */}
          {activeTab === 1 && (
            <div className="flex flex-col gap-8 w-full animate-fadeIn">
              <InsightsTab 
                datasetId={id} 
                columns={columnNames} 
                dashboardConfig={dashboard_config} 
              />

              {/* What-If Simulator inside Insights Studio */}
              <div className="w-full">
                <WhatIfSimulator currentScore={scores.quality} recommendations={recommendations} />
              </div>

              {/* Executive intelligence Feed & Alerts */}
              <div className="w-full">
                <InsightsFeed insights={insights} rootCauses={root_causes} />
              </div>
            </div>
          )}

          {/* TAB 3: SQL & ANALYTICS STUDIO */}
          {activeTab === 2 && (
            <div className="w-full animate-fadeIn">
              <SqlAnalyticsTab 
                datasetId={id} 
                columns={columnNames} 
              />
            </div>
          )}

          {/* TAB 4: REPORTS & EXPORTS */}
          {activeTab === 3 && (
            <div className="w-full animate-fadeIn">
              <ReportsExportsTab 
                datasetId={id} 
                datasetName={dataset.filename} 
                scores={scores} 
                storytelling={storytelling} 
              />
            </div>
          )}

        </div>

        {/* Conversational Assistants: Persistent at bottom */}
        <div className="scroll-mt-6 border-t border-slate-200 pt-8 mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <HelpCircle className="h-4.5 w-4.5 text-blue-600" /> AI Conversational Copilots
            </h3>
            <p className="text-[11px] text-slate-450">
              Interrogate your dataset health and metrics interactively using dedicated AI agents.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mt-2">
            <HealthCopilot datasetId={id} />
            <BiAnalystChat datasetId={id} />
          </div>
        </div>
      </main>
    </div>
  );
}
