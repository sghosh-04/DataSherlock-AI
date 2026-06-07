"use client";

import { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle, 
  Sparkles, 
  Loader2, 
  RefreshCw,
  Info,
  ShieldAlert,
  HelpCircle,
  Database,
  Filter,
  Layers,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface AuditIssue {
  row: number;
  column: string;
  value: string;
  type: string;
  message: string;
}

interface CleanOperation {
  id: string;
  type: string;
  column: string;
  strategy: string;
  value?: string;
}

interface CleanPreviewItem {
  row: number;
  column: string;
  old_value: string;
  new_value: string;
}

interface HealthSummary {
  total_rows: number;
  total_columns: number;
  missing_count: number;
  duplicate_count: number;
  invalid_count: number;
  outlier_count: number;
  health_score: number;
}

interface DataCleaningTabProps {
  datasetId: string;
  columns: string[];
  onCleanApplied: () => void;
}

export default function DataCleaningTab({ datasetId, columns, onCleanApplied }: DataCleaningTabProps) {
  // Audit and Health Overview states
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [schema, setSchema] = useState<Record<string, string>>({});
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(true);

  // Duplicate Controller states
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [customDuplicates, setCustomDuplicates] = useState<any>(null);

  // Operations roadmap state
  const [operations, setOperations] = useState<CleanOperation[]>([]);
  
  // Builder form state
  const [selectedCol, setSelectedCol] = useState(columns[0] || "");
  const [opType, setOpType] = useState("fill_text");
  const [strategy, setStrategy] = useState("custom");
  const [customVal, setCustomVal] = useState("");
  const [clientValError, setClientValError] = useState("");

  // Preview / Apply states
  const [previews, setPreviews] = useState<CleanPreviewItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [summaryLogs, setSummaryLogs] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    fetchAuditAndSchema();
  }, [datasetId]);

  // Sync builder options whenever column changes
  useEffect(() => {
    if (!selectedCol || !schema[selectedCol]) return;
    const colType = schema[selectedCol];
    
    // Automatically set type-aware defaults
    if (colType === "numeric") {
      setOpType("fill_numeric");
      setStrategy("mean");
    } else if (colType === "date") {
      setOpType("standardize_dates");
      setStrategy("");
    } else if (colType === "categorical" || colType === "text") {
      setOpType("fill_text");
      setStrategy("common");
    }
    setCustomVal("");
    setClientValError("");
  }, [selectedCol, schema]);

  // Client side validation on custom values input
  useEffect(() => {
    if (!selectedCol) return;
    const colType = schema[selectedCol];
    setClientValError("");

    if (strategy === "custom" && customVal.trim() !== "") {
      if (colType === "numeric" || opType === "fill_numeric") {
        if (isNaN(Number(customVal))) {
          setClientValError("Validation Warning: Custom value must be a valid numeric representation.");
        }
      }
    }
  }, [customVal, strategy, selectedCol, opType]);

  async function fetchAuditAndSchema() {
    setLoadingAudit(true);
    setBackendError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/audit`);
      if (!res.ok) throw new Error("Failed to run data audit");
      const json = await res.json();
      setIssues(json.issues || []);
      setSchema(json.schema || {});
      setHealth(json.health || null);
      setCustomDuplicates(null); // Reset custom duplicate query
      setSelectedKeys([]); // Reset checkbox keys
    } catch (err: any) {
      setBackendError(err.message || "Failed to load dataset health audit.");
    } finally {
      setLoadingAudit(false);
    }
  }

  const handleDuplicateSearch = async () => {
    setSearchingDuplicates(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/duplicates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_columns: selectedKeys })
      });
      if (!res.ok) throw new Error("Duplicates detection failed");
      const json = await res.json();
      setCustomDuplicates(json);
    } catch (err: any) {
      setBackendError("Duplicates filter error: " + err.message);
    } finally {
      setSearchingDuplicates(false);
    }
  };

  const toggleKeyColumn = (col: string) => {
    if (selectedKeys.includes(col)) {
      setSelectedKeys(selectedKeys.filter(k => k !== col));
    } else {
      setSelectedKeys([...selectedKeys, col]);
    }
  };

  const addOperation = (op: Omit<CleanOperation, "id">) => {
    const newOp = { ...op, id: Math.random().toString(36).substring(2, 9) };
    setOperations([...operations, newOp]);
  };

  const removeOperation = (id: string) => {
    setOperations(operations.filter(op => op.id !== id));
  };

  const handleAddFromForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientValError) return;

    addOperation({
      type: opType,
      column: selectedCol,
      strategy: strategy,
      value: customVal
    });
    setCustomVal("");
  };

  const handleQuickResolve = (issue: AuditIssue) => {
    if (issue.type === "missing") {
      const colType = schema[issue.column] || "text";
      addOperation({
        type: colType === "numeric" ? "fill_numeric" : "fill_text",
        column: issue.column,
        strategy: colType === "numeric" ? "mean" : "common",
        value: ""
      });
    } else if (issue.type === "outlier") {
      addOperation({
        type: "cap_outliers",
        column: issue.column,
        strategy: "",
        value: ""
      });
    } else if (issue.type === "invalid" && (issue.column.toLowerCase().includes("date") || issue.message.toLowerCase().includes("date"))) {
      addOperation({
        type: "standardize_dates",
        column: issue.column,
        strategy: "",
        value: ""
      });
    } else {
      addOperation({
        type: "trim_whitespace",
        column: issue.column,
        strategy: "",
        value: ""
      });
    }
  };

  const handlePreview = async () => {
    if (operations.length === 0) {
      setBackendError("Please add at least one cleaning operation first.");
      return;
    }
    setBackendError("");
    setPreviews([]);
    setLoadingPreview(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/clean/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Cleansing preview simulation failed");
      }
      const json = await res.json();
      setPreviews(json.previews || []);
      if (json.previews && json.previews.length === 0) {
        setBackendError("No matching cells require changes under these operations.");
      }
    } catch (err: any) {
      setBackendError(err.message || "Failed to generate previews.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    if (operations.length === 0) {
      setBackendError("Please add at least one cleaning operation first.");
      return;
    }
    setBackendError("");
    setLoadingApply(true);
    setSummaryLogs([]);
    setShowSummary(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/datasets/${datasetId}/clean/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations })
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to apply cleansing roadmap.");
      }
      const json = await res.json();
      if (json.status === "success") {
        setSummaryLogs(json.summary || []);
        setShowSummary(true);
        setOperations([]);
        setPreviews([]);
        
        // Refresh audit and trigger reload of parent state
        fetchAuditAndSchema();
        onCleanApplied();
      }
    } catch (err: any) {
      setBackendError(err.message || "Failed to apply cleansing.");
    } finally {
      setLoadingApply(false);
    }
  };

  const activeColType = schema[selectedCol] || "text";

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* 1. DATASET HEALTH OVERVIEW CARD */}
      {health && (
        <div className="fluent-card p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="h-4.5 w-4.5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Dataset Diagnostics Health Overview</h3>
              <p className="text-[10px] text-slate-400">Total volume profiling summary before applying clean filters</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
            {/* Health Score circular gauge representation */}
            <div className="md:col-span-1 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-center items-center text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Health Index</span>
              <div className="my-2 relative flex items-center justify-center">
                <span className="text-4xl font-extrabold text-blue-600">{health.health_score}</span>
                <span className="text-sm font-bold text-slate-450">%</span>
              </div>
              <span className="text-[9px] font-semibold text-slate-500">
                {health.health_score >= 90 ? "Excellent" : health.health_score >= 70 ? "Fair quality" : "Unstable quality"}
              </span>
            </div>

            {/* Counters grid */}
            <div className="md:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Missing counter */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Missing Values</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-slate-800">{health.missing_count}</span>
                  <span className="text-[10px] text-slate-400">cells</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, (health.missing_count / (health.total_rows * health.total_columns || 1)) * 1000)}%` }}
                  />
                </div>
              </div>

              {/* Inconsistent counters */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Invalid Formats</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-slate-800">{health.invalid_count}</span>
                  <span className="text-[10px] text-slate-400">rules failed</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, (health.invalid_count / health.total_rows || 0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Duplicate counter */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Duplicate Rows</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-slate-800">{health.duplicate_count}</span>
                  <span className="text-[10px] text-slate-400">exact rows</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full" 
                    style={{ width: `${Math.min(100, (health.duplicate_count / health.total_rows || 0) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Outlier counter */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Outlier Fields</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-slate-800">{health.outlier_count}</span>
                  <span className="text-[10px] text-slate-400">skewed cells</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-purple-600 h-full rounded-full" 
                    style={{ width: `${Math.min(100, (health.outlier_count / health.total_rows || 0) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. POST-CLEANING SUMMARY REPORT */}
      {showSummary && summaryLogs.length > 0 && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
            <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle className="h-4.5 w-4.5 text-emerald-600" /> Data Cleaning Executive Summary Report
            </h4>
            <button 
              onClick={() => setShowSummary(false)} 
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-950 uppercase"
            >
              Dismiss
            </button>
          </div>
          <div className="flex flex-col gap-1.5 text-xs text-emerald-800">
            {summaryLogs.map((log, idx) => (
              <p key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 3. MAIN DUAL-COLUMN CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Anomaly Audit Logs List */}
        <div className="lg:col-span-5 fluent-card bg-white p-5 flex flex-col gap-4 border border-slate-200 rounded-xl shadow-sm min-h-[500px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Anomaly Audit Logs</h3>
              <p className="text-[10px] text-slate-400">Row-level issues detected by Data Profiling Agents</p>
            </div>
            <span className="text-[10px] bg-red-50 text-red-600 font-bold border border-red-100 px-2 py-0.5 rounded-full">
              {issues.length} Issues
            </span>
          </div>

          {loadingAudit ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 h-64">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-xs">Auditing columns...</span>
            </div>
          ) : issues.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 h-64 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">Perfect Cleanness!</span>
              <p className="text-[10px] max-w-[200px] mt-1">No missing cells, invalid formats, exact duplicates, or numeric outliers detected.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[420px] flex flex-col gap-3 pr-1">
              {issues.map((issue, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border text-xs flex flex-col gap-2 transition-all ${
                    issue.type === "missing" 
                      ? "border-amber-100 bg-amber-50/20 text-amber-900" 
                      : issue.type === "invalid"
                      ? "border-rose-100 bg-rose-50/20 text-rose-900"
                      : issue.type === "outlier"
                      ? "border-purple-100 bg-purple-50/20 text-purple-900"
                      : "border-blue-100 bg-blue-50/20 text-blue-900"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold flex items-center gap-1 capitalize">
                      <AlertTriangle className={`h-3.5 w-3.5 ${
                        issue.type === "missing" 
                          ? "text-amber-500" 
                          : issue.type === "invalid" 
                          ? "text-rose-500" 
                          : issue.type === "outlier" 
                          ? "text-purple-500" 
                          : "text-blue-500"
                      }`} />
                      Row {issue.row}: {issue.column}
                    </span>
                    <span className="text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border bg-white/80">
                      {issue.type}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5 text-[11px] text-slate-650">
                    <p className="font-medium text-slate-800">{issue.message}</p>
                    <p>Current value: <code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px] border border-black/5">{issue.value}</code></p>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleQuickResolve(issue)}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Quick Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Key-column duplicate multi-select & cleaning builder */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Key-column Duplicate Settings Panel */}
          <div className="fluent-card bg-white p-5 flex flex-col gap-4 border border-slate-200 rounded-xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Key-Column Duplicate Settings</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50 border px-2 py-0.5 rounded">Agent 2</span>
            </h3>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] text-slate-450 leading-relaxed">
                By default, DataSherlock identifies exact duplicates of complete rows. 
                Optionally select key-columns below to identify rows matching identical values across only those fields:
              </p>

              {/* Columns checkboxes list */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border border-slate-150 p-3 rounded-lg bg-slate-50/50 max-h-[120px] overflow-y-auto">
                {columns.map((col) => {
                  const isChecked = selectedKeys.includes(col);
                  return (
                    <label key={col} className="flex items-center gap-2 text-xs text-slate-650 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleKeyColumn(col)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span className="truncate max-w-[120px]">{col}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleDuplicateSearch}
                  disabled={searchingDuplicates}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {searchingDuplicates ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" /> : <Filter className="h-3.5 w-3.5 text-slate-500" />}
                  Analyze Duplicates
                </button>
              </div>
            </div>
          </div>

          {/* Type-Aware Operations Builder */}
          <div className="fluent-card bg-white p-5 flex flex-col gap-4 border border-slate-200 rounded-xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
              Dataset Cleansing Operations (Type-Aware)
            </h3>

            <form onSubmit={handleAddFromForm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Column Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  Target Column 
                  {schema[selectedCol] && (
                    <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.25 bg-blue-55 rounded text-blue-700 bg-blue-50">
                      {schema[selectedCol]}
                    </span>
                  )}
                </label>
                <select
                  value={selectedCol}
                  onChange={(e) => setSelectedCol(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {columns.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Operation Type Select - Filtered dynamically by activeColType */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Operation Type</label>
                <select
                  value={opType}
                  onChange={(e) => {
                    setOpType(e.target.value);
                    if (e.target.value === "normalize_case") {
                      setStrategy("title");
                    } else if (e.target.value === "fill_numeric") {
                      setStrategy("mean");
                    } else if (e.target.value === "fill_text") {
                      setStrategy("common");
                    } else {
                      setStrategy("");
                    }
                    setCustomVal("");
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {activeColType === "numeric" && (
                    <>
                      <option value="fill_numeric">Fill Missing Numbers (Nulls)</option>
                      <option value="cap_outliers">Cap Outliers (IQR boundaries)</option>
                      <option value="delete_outliers">Delete Outlier Rows</option>
                      <option value="delete_rows">Delete Rows With Missing Values</option>
                    </>
                  )}
                  {activeColType === "text" && (
                    <>
                      <option value="fill_text">Fill Missing Text (Nulls)</option>
                      <option value="trim_whitespace">Trim Whitespace</option>
                      <option value="normalize_case">Standardize Text Case Style</option>
                      <option value="delete_rows">Delete Rows With Missing Values</option>
                    </>
                  )}
                  {activeColType === "categorical" && (
                    <>
                      <option value="fill_text">Fill Missing Text (Nulls)</option>
                      <option value="trim_whitespace">Trim Whitespace</option>
                      <option value="normalize_case">Standardize Text Case Style</option>
                      <option value="delete_rows">Delete Rows With Missing Values</option>
                    </>
                  )}
                  {activeColType === "date" && (
                    <>
                      <option value="fill_text">Fill Missing Value (Nulls)</option>
                      <option value="standardize_dates">Standardize Dates (YYYY-MM-DD)</option>
                      <option value="delete_rows">Delete Rows With Missing Values</option>
                    </>
                  )}
                </select>
              </div>

              {/* Strategy Select (Conditional choices) */}
              {opType !== "trim_whitespace" && opType !== "standardize_dates" && opType !== "delete_rows" && opType !== "cap_outliers" && opType !== "delete_outliers" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Adjustment Strategy</label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {opType === "fill_text" && (
                      <>
                        <option value="common">Most Frequent Value</option>
                        <option value="custom">Custom Text Value</option>
                        {activeColType === "text" && (
                          <option value="ai_suggest">AI Copilot Recommendation</option>
                        )}
                      </>
                    )}
                    {opType === "fill_numeric" && (
                      <>
                        <option value="mean">Mean Average</option>
                        <option value="median">Median Average</option>
                        <option value="mode">Mode Common Value</option>
                        <option value="custom">Custom Numeric Value</option>
                      </>
                    )}
                    {opType === "normalize_case" && (
                      <>
                        <option value="title">Title Case (e.g. John Doe)</option>
                        <option value="upper">UPPERCASE</option>
                        <option value="lower">lowercase</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Custom Value Input */}
              {strategy === "custom" && opType !== "trim_whitespace" && opType !== "standardize_dates" && opType !== "delete_rows" && opType !== "cap_outliers" && opType !== "delete_outliers" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Custom Fill Value</label>
                  <input
                    type="text"
                    required
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    placeholder={activeColType === "numeric" ? "e.g. 25" : "e.g. Sales"}
                    className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* CLIENT-SIDE VALIDATION WARNING */}
              {clientValError && (
                <div className="md:col-span-2 text-rose-600 text-[10px] font-semibold bg-rose-50 border border-rose-100 p-2 rounded flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                  <span>{clientValError}</span>
                </div>
              )}

              {/* Submit button */}
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!!clientValError}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add Operation
                </button>
              </div>
            </form>
          </div>

          {/* Pending Roadmap checklist */}
          <div className="fluent-card bg-white p-5 flex flex-col gap-4 border border-slate-200 rounded-xl shadow-sm flex-1 min-h-[200px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Pending Execution Roadmap</h3>
              <span className="text-[10px] text-slate-400">Apply clean filters in sequential order</span>
            </div>

            {operations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center py-6">
                <Info className="h-6 w-6 text-slate-350 mb-2" />
                <p className="text-xs">No active cleaning operations queued yet.</p>
                <p className="text-[10px] text-slate-450 mt-0.5">Use the anomaly resolve buttons or forms above to clean columns.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {operations.map((op, index) => (
                  <div key={op.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-mono text-[10px] font-bold">
                        {index + 1}
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-bold text-slate-800 capitalize">
                          {op.type.replace("_", " ")} on <span className="font-mono text-[11px] text-blue-600">[{op.column}]</span>
                        </span>
                        {op.strategy && (
                          <span className="text-[10px] text-slate-500">
                            Strategy: <span className="font-medium text-slate-700">{op.strategy}</span>
                            {op.value && ` (${op.value})`}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeOperation(op.id)}
                      className="text-slate-450 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview and Apply Controls */}
            {operations.length > 0 && (
              <div className="border-t border-slate-100 pt-4 mt-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-[10px] text-slate-450 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
                  <span>Validation checks active. Preview edits before apply.</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePreview}
                    disabled={loadingPreview}
                    className="px-4 py-2 rounded-lg border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin text-slate-600" /> : <Play className="h-4 w-4" />}
                    Preview Diffs
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={loadingApply}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {loadingApply ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <CheckCircle className="h-4 w-4" />}
                    Apply Corrections
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ERROR FEEDBACK */}
      {backendError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
          <span>{backendError}</span>
        </div>
      )}

      {/* 4. RENDER CUSTOM DUPLICATE GROUPS (Key-column results override) */}
      {customDuplicates && (
        <div className="fluent-card bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Key-Column Match Groups ({customDuplicates.duplicate_count} records found)</h3>
              <p className="text-[10px] text-slate-400">Rows matching identical values on selected key columns</p>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold border border-blue-100 px-2 py-0.5 rounded">
              Keys: {customDuplicates.matching_columns_used.join(", ")}
            </span>
          </div>

          {customDuplicates.duplicate_count === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No duplicate groupings detected on these columns.</p>
          ) : (
            <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
              {customDuplicates.groups.map((group: any) => (
                <div key={group.group_id} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-700">Match Group #{group.group_id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                      Exact Key Match
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 mt-1">
                    {group.records.map((rec: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-500 font-mono pl-2 border-l border-blue-500/40">
                        <div className="truncate max-w-[550px]" title={JSON.stringify(rec.record)}>
                          <span className="text-slate-400 font-semibold">Row {rec.row_index}:</span> {JSON.stringify(rec.record)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. BOTTOM CARD: Before / After Diff Table Preview */}
      {previews.length > 0 && (
        <div className="fluent-card bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800">Cleansing Simulation Previews</h3>
            <p className="text-[10px] text-slate-400">Before & after cell state representations ({previews.length} cells changed)</p>
          </div>

          <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="p-3 select-none text-center border-r border-slate-200 w-16">Row #</th>
                  <th className="p-3">Target Column</th>
                  <th className="p-3">Original Value</th>
                  <th className="p-3">Corrected Value</th>
                </tr>
              </thead>
              <tbody>
                {previews.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 hover:bg-slate-50/50 text-slate-700 transition-colors"
                  >
                    <td className="p-3 text-center border-r border-slate-200 font-mono text-[10px] bg-slate-50 text-slate-400">
                      {item.row}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 max-w-[150px] truncate">
                      {item.column}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-red-650 bg-red-50/30 max-w-[250px] truncate">
                      {item.old_value === "NULL" ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold font-sans uppercase">
                          NULL
                        </span>
                      ) : (
                        item.old_value
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-emerald-600 bg-emerald-50/30 max-w-[250px] truncate font-semibold">
                      {item.new_value === "[DELETED_ROW]" ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-150 text-red-800 font-semibold font-sans uppercase">
                          ROW DELETED
                        </span>
                      ) : (
                        item.new_value
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
