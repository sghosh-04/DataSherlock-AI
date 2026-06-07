"use client";

import { useEffect, useState } from "react";
import { Loader2, Table } from "lucide-react";

interface DataPreviewProps {
  datasetId: string;
}

export default function DataPreview({ datasetId }: DataPreviewProps) {
  const [data, setData] = useState<{ columns: string[]; rows: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPreview() {
      try {
        const res = await fetch(`http://localhost:8000/api/datasets/${datasetId}/preview`);
        if (!res.ok) throw new Error("Could not load dataset preview");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to retrieve preview.");
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, [datasetId]);

  if (loading) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mb-2 text-blue-600" />
        <p className="text-xs">Loading data table preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-48 flex items-center justify-center text-red-500 text-xs">
        {error}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
        No records available for preview.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <Table className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-800">Dataset Preview (Top 15 Rows)</h3>
      </div>
      <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
              <th className="p-3 select-none text-center border-r border-slate-200">#</th>
              {data.columns.map((col) => (
                <th key={col} className="p-3 font-semibold select-all">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-100 hover:bg-slate-50/50 text-slate-700 transition-colors"
              >
                <td className="p-3 text-center border-r border-slate-200 font-mono text-[10px] bg-slate-50 text-slate-400">
                  {idx + 1}
                </td>
                {data.columns.map((col) => (
                  <td key={col} className="p-3 max-w-[200px] truncate select-text">
                    {row[col] === null || row[col] === undefined ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold uppercase tracking-wider">
                        NULL
                      </span>
                    ) : (
                      String(row[col])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
