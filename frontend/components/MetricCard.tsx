"use client";

import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: "indigo" | "cyan" | "emerald" | "rose" | "amber";
  description: string;
}

export default function MetricCard({ title, value, icon: Icon, color, description }: MetricCardProps) {
  // Color presets matching our light theme
  const colorMap = {
    indigo: {
      text: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      stroke: "stroke-blue-600",
      trail: "stroke-slate-100"
    },
    cyan: {
      text: "text-sky-600",
      bg: "bg-sky-50",
      border: "border-sky-100",
      stroke: "stroke-sky-600",
      trail: "stroke-slate-100"
    },
    emerald: {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      stroke: "stroke-emerald-600",
      trail: "stroke-slate-100"
    },
    rose: {
      text: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
      stroke: "stroke-red-600",
      trail: "stroke-slate-100"
    },
    amber: {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      stroke: "stroke-amber-500",
      trail: "stroke-slate-100"
    }
  };

  const activeColor = colorMap[color] || colorMap.indigo;

  // SVG parameters for circular gauge
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="fluent-card fluent-card-hover p-5 bg-white flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded ${activeColor.bg} ${activeColor.border} border`}>
            <Icon className={`h-4.5 w-4.5 ${activeColor.text}`} />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        </div>
        
        <div className="flex flex-col mt-1">
          <span className="text-2xl font-bold text-slate-900">{Math.round(value)}%</span>
          <p className="text-[11px] text-slate-500 mt-1 max-w-[180px] leading-normal">{description}</p>
        </div>
      </div>

      <div className="relative flex items-center justify-center shrink-0">
        {/* SVG Circle Gauge */}
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            className={`${activeColor.trail}`}
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            className={`${activeColor.stroke} transition-all duration-1000 ease-out`}
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[10px] font-bold text-slate-700">{Math.round(value)}%</span>
      </div>
    </div>
  );
}
