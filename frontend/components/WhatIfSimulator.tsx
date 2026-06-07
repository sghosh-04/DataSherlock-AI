"use client";

import { useState } from "react";
import { Sliders, CheckSquare, Square, Sparkles } from "lucide-react";

interface Recommendation {
  issue: string;
  priority: string;
  action: string;
  expected_improvement: string; // e.g. "+9%"
  effort: string;
}

interface WhatIfSimulatorProps {
  currentScore: number;
  recommendations: Recommendation[];
}

export default function WhatIfSimulator({ currentScore, recommendations }: WhatIfSimulatorProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const toggleRecommendation = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== idx));
    } else {
      setSelectedIndices([...selectedIndices, idx]);
    }
  };

  // Calculate projected score based on selected improvements
  let projectedScore = currentScore;
  selectedIndices.forEach((idx) => {
    const impStr = recommendations[idx].expected_improvement;
    const num = parseInt(impStr.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num)) {
      projectedScore += num;
    }
  });
  
  // Cap score at 100%
  projectedScore = Math.min(projectedScore, 100);

  return (
    <div className="fluent-card p-6 bg-white flex flex-col gap-5 w-full">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">What-If Quality Improvement Simulator</h3>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
          Agent 5
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Score comparison display */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-lg bg-slate-50 border border-slate-200 text-center relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Projected Quality Score</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-5xl font-bold text-blue-600">
              {Math.round(projectedScore)}
            </span>
            <span className="text-sm text-slate-400 font-bold">%</span>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2 mt-4 relative overflow-hidden">
            <div 
              className="bg-slate-400 h-full absolute left-0" 
              style={{ width: `${currentScore}%` }}
            ></div>
            <div 
              className="bg-blue-600 h-full absolute transition-all duration-300" 
              style={{ width: `${projectedScore}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between w-full text-[10px] text-slate-400 mt-2 font-mono">
            <span>Base: {Math.round(currentScore)}%</span>
            {projectedScore > currentScore && (
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <Sparkles className="h-3 w-3" /> +{Math.round(projectedScore - currentScore)}% Gain
              </span>
            )}
          </div>
        </div>

        {/* Action item checklists */}
        <div className="md:col-span-8 flex flex-col gap-2.5">
          <p className="text-xs text-slate-500 font-medium">Select corrective interventions to forecast data quality adjustments:</p>
          
          <div className="flex flex-col gap-2">
            {recommendations.map((rec, idx) => {
              const isSelected = selectedIndices.includes(idx);
              return (
                <div 
                  key={idx}
                  onClick={() => toggleRecommendation(idx)}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected 
                      ? "bg-blue-50/50 border-blue-300 shadow-sm" 
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={isSelected ? "text-blue-600" : "text-slate-400"}>
                      {isSelected ? <CheckSquare className="h-4.5 w-4.5" /> : <Square className="h-4.5 w-4.5" />}
                    </div>
                    <div className="flex flex-col gap-0.5 text-left text-xs">
                      <span className="font-bold text-slate-800">{rec.issue}</span>
                      <span className="text-slate-500 max-w-[340px] truncate">{rec.action}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-blue-600 border border-slate-200/50">
                      {rec.expected_improvement}
                    </span>
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                      rec.priority === "High" 
                        ? "bg-red-50 text-red-600 border border-red-100" 
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {rec.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
