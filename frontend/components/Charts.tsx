"use client";

import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar 
} from "recharts";
import { TrendingUp, BarChart2 } from "lucide-react";

interface ForecastData {
  score: number;
  explanation: string;
}

interface PredictorReport {
  forecast_30: ForecastData;
  forecast_60: ForecastData;
  forecast_90: ForecastData;
  duplicate_growth_trend: string;
}

interface ColumnProfile {
  missing_count: number;
  invalid_count: number;
}

interface ChartsProps {
  currentScore: number;
  forecasts: PredictorReport;
  columns: Record<string, ColumnProfile>;
}

export default function Charts({ currentScore, forecasts, columns }: ChartsProps) {
  // 1. Format forecast trend data
  const trendData = [
    { name: "Current", Score: currentScore },
    { name: "30 Days", Score: forecasts.forecast_30?.score || (currentScore - 2) },
    { name: "60 Days", Score: forecasts.forecast_60?.score || (currentScore - 5) },
    { name: "90 Days", Score: forecasts.forecast_90?.score || (currentScore - 10) },
  ];

  // 2. Format column missing data chart
  const columnsData = Object.entries(columns)
    .map(([name, profile]) => ({
      name,
      Missing: profile.missing_count,
      Invalid: profile.invalid_count,
    }))
    .filter(c => c.Missing > 0 || c.Invalid > 0)
    .slice(0, 6);

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-2.5 rounded shadow-sm">
          <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{payload[0].name}</p>
          <p className="text-xs font-bold text-blue-600">Score: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* 90-Day Forecast Trend */}
      <div className="fluent-card p-6 bg-white flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">90-Day Predictive Quality Forecast</h3>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
            Agent 6
          </span>
        </div>

        <div className="h-[250px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={9} domain={[0, 100]} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Score" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#scoreGlow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-slate-400 italic text-center">
          Quality decay projections assuming constant write volumes without input constraints.
        </p>
      </div>

      {/* Column Anomalies */}
      <div className="fluent-card p-6 bg-white flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Dataset Column Error Profile</h3>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
            Agent 1
          </span>
        </div>

        <div className="h-[250px] w-full mt-2">
          {columnsData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Zero errors detected in primary columns.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={columnsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                  labelStyle={{ fontSize: 9, color: "#475569" }}
                />
                <Bar dataKey="Missing" fill="#ef4444" radius={[3, 3, 0, 0]} name="Missing Values" />
                <Bar dataKey="Invalid" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Inconsistent Formats" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="text-[10px] text-slate-400 italic text-center">
          Total anomalies grouped by column. Focus cleansing on the highest bars first.
        </p>
      </div>
    </div>
  );
}
