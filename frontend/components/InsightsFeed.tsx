"use client";

import { AlertTriangle, AlertCircle, Info, Activity, ShieldAlert, Cpu, Sparkles } from "lucide-react";

interface Insight {
  title: string;
  description: string;
  category: "critical" | "warning" | "info";
  impact_score: number;
}

interface RootCause {
  issue: string;
  root_cause: string;
  confidence: number;
  evidence: string;
  system_impact: string;
}

interface InsightsFeedProps {
  insights: Insight[];
  rootCauses: RootCause[];
}

export default function InsightsFeed({ insights, rootCauses }: InsightsFeedProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* AI Insights Column */}
      <div className="fluent-card p-6 bg-white flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Executive Insights Feed</h3>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
            Agent 3
          </span>
        </div>

        <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[400px] pr-1">
          {insights.map((insight, idx) => {
            const isCritical = insight.category === "critical";
            const isWarning = insight.category === "warning";
            
            return (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border flex gap-3.5 transition-colors ${
                  isCritical 
                    ? "bg-red-50/30 border-red-200" 
                    : isWarning 
                    ? "bg-amber-50/30 border-amber-200" 
                    : "bg-slate-50/50 border-slate-200"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCritical ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : isWarning ? (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                
                <div className="flex flex-col gap-1.5 w-full text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block">
                      {isCritical ? "CRITICAL RISK" : isWarning ? "WARNING" : "INFO REPORT"}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      insight.impact_score > 70 
                        ? "bg-red-100 text-red-700" 
                        : insight.impact_score > 30 
                        ? "bg-amber-100 text-amber-700" 
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      Impact: {insight.impact_score}/100
                    </span>
                  </div>
                  <span className="font-bold text-sm text-slate-800">{insight.title}</span>
                  <p className="text-slate-500 leading-normal">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Root Causes Column */}
      <div className="fluent-card p-6 bg-white flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Forensic Quality Audits</h3>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
            Agent 4
          </span>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto max-h-[400px] pr-1">
          {rootCauses.map((cause, idx) => (
            <div 
              key={idx} 
              className="p-4 rounded-lg border border-slate-200 bg-slate-50/20 flex flex-col gap-3 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Audit #{idx+1}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Confidence: {Math.round(cause.confidence * 100)}%
                </span>
              </div>
              
              <h4 className="text-sm font-bold text-slate-800">{cause.issue}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500 leading-normal">
                <div>
                  <span className="font-bold text-slate-700 block mb-0.5">Primary Cause:</span>
                  {cause.root_cause}
                </div>
                <div>
                  <span className="font-bold text-slate-700 block mb-0.5">Business Impact:</span>
                  {cause.system_impact}
                </div>
              </div>
              
              <div className="mt-1 bg-slate-50 p-2.5 rounded border border-slate-200 text-[10.5px] text-slate-500 font-mono">
                <span className="text-slate-400 uppercase font-bold text-[9px] tracking-wider block mb-1">Evidence Summary:</span>
                {cause.evidence}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
