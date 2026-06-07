"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Database, 
  GitCompare, 
  UploadCloud, 
  LayoutDashboard, 
  FileCheck2, 
  Terminal,
  FileDown
} from "lucide-react";

interface SidebarProps {
  datasetId?: string;
  filename?: string;
  activeTab?: number;
  setActiveTab?: (tab: number) => void;
}

export default function Sidebar({ datasetId, filename, activeTab, setActiveTab }: SidebarProps) {
  const pathname = usePathname();
  const isDashboard = pathname.includes("/dashboard/");

  const navItems = [
    { label: "Data Cleaning Studio", icon: FileCheck2, index: 0 },
    { label: "Insights Studio", icon: LayoutDashboard, index: 1 },
    { label: "SQL & Analytics Studio", icon: Terminal, index: 2 },
    { label: "Reports & Exports", icon: FileDown, index: 3 }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-400 flex flex-col h-screen fixed left-0 top-0 z-40 shrink-0">
      
      {/* Sidebar Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <Database className="h-6 w-6 text-blue-500" />
        <Link href="/" className="text-md font-bold text-slate-100 tracking-tight hover:text-blue-400 transition-colors">
          DataSherlock AI
        </Link>
      </div>

      {/* Global Workspace Section */}
      <div className="px-4 py-4 flex flex-col gap-1 border-b border-slate-800">
        <span className="text-[10px] font-bold text-slate-600 uppercase px-3 mb-2 tracking-wider">
          Workspace
        </span>
        <Link 
          href="/" 
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            pathname === "/" ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <UploadCloud className="h-4 w-4" /> Upload Datasets
        </Link>
        <Link 
          href="/compare" 
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            pathname.startsWith("/compare") ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <GitCompare className="h-4 w-4" /> Comparison Studio
        </Link>
      </div>

      {/* Dataset Detail Section (Shown only on Dashboard) */}
      {isDashboard && datasetId && (
        <div className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto">
          <div className="px-3 mb-2 flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Active Dataset
            </span>
            <span className="text-xs font-semibold text-slate-300 truncate max-w-[180px] block" title={filename}>
              {filename}
            </span>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.index;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveTab?.(item.index)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive 
                      ? "bg-slate-800 text-slate-100 font-semibold border-l-2 border-blue-500 rounded-l-none" 
                      : "hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-500" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-600 flex flex-col gap-1 items-center justify-center">
        <span>Microsoft Build AI Hackathon</span>
        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[8px]">
          Fabric Integrated
        </span>
      </div>

    </aside>
  );
}
