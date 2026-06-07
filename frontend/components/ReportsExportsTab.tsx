"use client";

import { useState } from "react";
import { 
  FileSpreadsheet, 
  FileText, 
  Presentation, 
  Download, 
  CheckCircle, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Percent
} from "lucide-react";

interface ReportsExportsTabProps {
  datasetId: string;
  datasetName: string;
  scores: {
    quality: number;
    trust: number;
    completeness: number;
    uniqueness: number;
    validity: number;
    consistency: number;
  };
  storytelling?: {
    executive_narrative?: string;
    boardroom_summary?: string;
    business_stories?: string[];
  };
}

export default function ReportsExportsTab({ datasetId, datasetName, scores, storytelling }: ReportsExportsTabProps) {
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);

  const downloadCleanCsv = async () => {
    setDownloadingCsv(true);
    try {
      window.open(`http://localhost:8000/api/datasets/${datasetId}/export/clean`, "_blank");
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const downloadExecutiveDoc = async () => {
    setDownloadingDoc(true);
    try {
      window.open(`http://localhost:8000/api/datasets/${datasetId}/export?format=markdown`, "_blank");
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingDoc(false);
    }
  };

  const downloadPptxOutline = async () => {
    setDownloadingPptx(true);
    try {
      window.open(`http://localhost:8000/api/datasets/${datasetId}/export/pptx`, "_blank");
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingPptx(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Overview Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600">
          <p className="font-bold text-slate-800 text-sm mb-0.5">Dossier & presentation Export Hub</p>
          <p className="leading-relaxed">
            Generate and export cleaned file versions or executive summary outlines for stakeholder reporting.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Trust Summary Card */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Trust Score & Verification Shield */}
          <div className="fluent-card p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Dataset Verification Status</span>
            <h4 className="text-sm font-bold text-slate-850 mt-1">Audit Check Approved</h4>
            
            <div className="flex items-baseline gap-0.5 my-4">
              <span className="text-5xl font-extrabold text-blue-600">
                {Math.round(scores.trust)}
              </span>
              <span className="text-base text-slate-400 font-bold">%</span>
            </div>
            <p className="text-[10px] text-slate-450 leading-relaxed max-w-[200px] mb-4">
              System verified. All 6 diagnostic profiling agents cleared with average trust index.
            </p>

            <div className="w-full border-t border-slate-100 pt-4 flex flex-col gap-2.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Quality Score:</span>
                <span className="font-bold text-slate-800">{Math.round(scores.quality)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Completeness:</span>
                <span className="font-bold text-slate-800">{Math.round(scores.completeness)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Validity Score:</span>
                <span className="font-bold text-slate-800">{Math.round(scores.validity)}%</span>
              </div>
            </div>
          </div>

          {/* Active Storyteller Insight */}
          {storytelling && (
            <div className="fluent-card p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Executive Story Briefing</h4>
              <p className="text-xs text-slate-500 italic leading-relaxed pl-3 border-l-2 border-blue-500">
                "{storytelling.executive_narrative}"
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Download actions List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-850 mb-2">Available Exports</h3>
          
          {/* Action 1: Clean CSV */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-sm font-bold text-slate-800">Cleaned Spreadsheet (CSV)</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                  Download the sanitized version of <code className="font-mono bg-slate-50 text-[10px] px-1 py-0.5 border border-slate-100 rounded text-blue-600">{datasetName}</code> after applying cleaning strategies.
                </p>
              </div>
            </div>
            
            <button
              onClick={downloadCleanCsv}
              disabled={downloadingCsv}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer w-full md:w-auto shrink-0"
            >
              <Download className="h-4 w-4" /> Download CSV
            </button>
          </div>

          {/* Action 2: Executive Dossier MD */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-sm font-bold text-slate-800">Executive Diagnostics dossier (.MD)</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                  A high-fidelity audit briefing containing data quality scores, anomalies list, duplicate groups, and agent corrective recommendations.
                </p>
              </div>
            </div>

            <button
              onClick={downloadExecutiveDoc}
              disabled={downloadingDoc}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer w-full md:w-auto shrink-0"
            >
              <Download className="h-4 w-4" /> Download Report
            </button>
          </div>

          {/* Action 3: Boardroom Presentation Outline PPTX */}
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Presentation className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-sm font-bold text-slate-800">Boardroom Presentation outline</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                  Generate and download a PowerPoint presentation outline deck listing key quality metrics, findings, storytelling blocks, and next steps roadmap.
                </p>
              </div>
            </div>

            <button
              onClick={downloadPptxOutline}
              disabled={downloadingPptx}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer w-full md:w-auto shrink-0"
            >
              <Download className="h-4 w-4" /> Download Outline
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
