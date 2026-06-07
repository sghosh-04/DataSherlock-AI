import json
from typing import Dict, Any

class ReportWriterAgent:
    def write_report(self, report_data: Dict[str, Any]) -> str:
        # Extracts data from the structured backend document
        dataset = report_data.get("dataset", {})
        scores = dataset.get("scores", {})
        insights = report_data.get("insights", [])
        root_causes = report_data.get("root_causes", [])
        recommendations = report_data.get("recommendations", [])
        forecasts = report_data.get("forecasts", {})
        storytelling = report_data.get("storytelling", {})
        
        md = []
        md.append(f"# Executive Intelligence Report: {dataset.get('filename')}")
        md.append(f"**Generated At**: {report_data.get('created_at', 'Just Now')}")
        md.append(f"**Dimensions**: {dataset.get('row_count')} rows × {dataset.get('column_count')} columns")
        md.append("\n---\n")
        
        # 1. Executive Summary
        md.append("## 1. Executive Summary")
        if storytelling and "executive_narrative" in storytelling:
            md.append(storytelling["executive_narrative"])
        else:
            md.append(f"This intelligence report provides a comprehensive review of the dataset **{dataset.get('filename')}**. The data quality pipeline measured an overall quality index of **{scores.get('quality')}%** and an overall trust index of **{scores.get('trust')}%** based on dimensional completeness, uniqueness, consistency, and format validity rules.")
        md.append("")
        
        # 2. Score Summary
        md.append("### Score Summary Dashboard")
        md.append("| Dimension | Value | Threshold Check |")
        md.append("| :--- | :--- | :--- |")
        md.append(f"| Data Quality Score | {scores.get('quality')}% | {'Pass' if scores.get('quality', 0) >= 80 else 'Review Required'} |")
        md.append(f"| Trust Score | {scores.get('trust')}% | {'Pass' if scores.get('trust', 0) >= 80 else 'Review Required'} |")
        md.append(f"| Completeness Rate | {scores.get('completeness')}% | {'Optimal' if scores.get('completeness', 0) >= 95 else 'Incomplete'} |")
        md.append(f"| Uniqueness Rate | {scores.get('uniqueness')}% | {'Optimal' if scores.get('uniqueness', 0) >= 90 else 'High Duplicate Rate'} |")
        md.append(f"| Validity Score | {scores.get('validity')}% | {'Optimal' if scores.get('validity', 0) >= 90 else 'Format Inconsistencies'} |")
        md.append(f"| Consistency Score | {scores.get('consistency')}% | {'Uniform Types' if scores.get('consistency', 0) >= 90 else 'Mixed Types'} |")
        md.append("")

        # 3. Key Findings & Risks
        md.append("## 2. Key Risks & Opportunities")
        for idx, insight in enumerate(insights):
            category_icon = "🔴" if insight.get("category") == "critical" else "🟡" if insight.get("category") == "warning" else "🔵"
            md.append(f"### {category_icon} Risk {idx+1}: {insight.get('title')}")
            md.append(f"- **Impact Rating**: {insight.get('impact_score')}/100")
            md.append(f"- **Description**: {insight.get('description')}")
            md.append("")
            
        # 4. Root Causes
        md.append("## 3. Forensic Root Cause Investigations")
        for idx, cause in enumerate(root_causes):
            md.append(f"### Diagnostic {idx+1}: {cause.get('issue')}")
            md.append(f"- **Root Cause**: {cause.get('root_cause')}")
            md.append(f"- **Evidence**: {cause.get('evidence')}")
            md.append(f"- **Downstream System Impact**: {cause.get('system_impact')}")
            md.append(f"- **Confidence Level**: {int(cause.get('confidence', 0) * 100)}%")
            md.append("")

        # 5. Forecasts
        md.append("## 4. 90-Day Predictive Quality Forecast")
        md.append("Assuming database integrations continue without active field validation input boundaries, we forecast:")
        md.append(f"- **30-Day Forecast**: Quality Score drops to **{forecasts.get('forecast_30', {}).get('score')}%** - *{forecasts.get('forecast_30', {}).get('explanation')}*")
        md.append(f"- **60-Day Forecast**: Quality Score drops to **{forecasts.get('forecast_60', {}).get('score')}%** - *{forecasts.get('forecast_60', {}).get('explanation')}*")
        md.append(f"- **90-Day Forecast**: Quality Score drops to **{forecasts.get('forecast_90', {}).get('score')}%** - *{forecasts.get('forecast_90', {}).get('explanation')}*")
        md.append(f"- **Duplicate Accumulation rate**: {forecasts.get('duplicate_growth_trend', 'stable').upper()}")
        md.append("")

        # 6. Recommendations
        md.append("## 5. Recommended Actions")
        md.append("| Issue | Recommended Cleanse Action | Priority | Expected Score Bump | Effort |")
        md.append("| :--- | :--- | :--- | :--- | :--- |")
        for rec in recommendations:
            md.append(f"| {rec.get('issue')} | {rec.get('action')} | {rec.get('priority')} | {rec.get('expected_improvement')} | {rec.get('effort')} |")
        md.append("")
        
        # 7. Boardroom narratives
        if storytelling and "boardroom_summary" in storytelling:
            md.append("## 6. Strategic Boardroom Summary")
            md.append(storytelling["boardroom_summary"])
            md.append("")

        return "\n".join(md)
