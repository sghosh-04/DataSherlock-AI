import Link from "next/link";
import { SearchCode, BarChart3, HelpCircle, GitCompare } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
      <Link href="/" className="flex items-center gap-3">
        <SearchCode className="h-6 w-6 text-indigo-400 animate-pulse" />
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
          DataSherlock AI
        </span>
      </Link>
      
      <div className="flex items-center gap-6">
        <Link href="/" className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1">
          Upload
        </Link>
        <Link href="/compare" className="text-sm font-medium text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1">
          <GitCompare className="h-4 w-4" /> Compare
        </Link>
      </div>
      
      <div className="hidden md:flex items-center gap-2">
        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400">
          Microsoft Build AI
        </span>
      </div>
    </nav>
  );
}
