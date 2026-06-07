import pandas as pd
import numpy as np
from typing import Dict, Any, List
from pandas.api.types import is_numeric_dtype

class DashboardArchitectAgent:
    def generate_dashboard(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        if df.empty or len(df.columns) == 0:
            return []

        # 1. Classify columns
        metrics = []      # numeric fields
        dimensions = []   # categorical fields
        dates = []        # date fields
        
        for col in df.columns:
            col_lower = col.lower()
            non_null_series = df[col].dropna()
            
            if len(non_null_series) == 0:
                continue

            # Detect Date
            if any(k in col_lower for k in ["date", "year", "month", "timestamp", "time", "day"]):
                dates.append(col)
                continue
                
            # Check if numeric (metric)
            if is_numeric_dtype(non_null_series):
                # If unique counts are very low, it might be a categorical ID, else it's a metric
                if non_null_series.nunique() > 10 or col_lower in ["revenue", "sales", "price", "amount", "profit", "cost", "quantity", "rating"]:
                    metrics.append(col)
                    continue

            # Categorical dimensions
            if str(non_null_series.dtype) == "object" or non_null_series.nunique() <= 15:
                dimensions.append(col)

        # Fallbacks if classification yields empty arrays
        if not metrics:
            # Pick first float/int column
            num_cols = [c for c in df.columns if is_numeric_dtype(df[c])]
            metrics = num_cols[:2] if num_cols else [df.columns[0]]
            
        if not dimensions:
            # Pick first object column
            obj_cols = [c for c in df.columns if not is_numeric_dtype(df[c])]
            dimensions = obj_cols[:2] if obj_cols else [df.columns[-1]]

        widgets = []
        widget_id_counter = 1

        # A. Generate KPI widgets for top 2 metrics
        for metric in metrics[:2]:
            if metric not in df.columns:
                continue
            try:
                avg_val = df[metric].mean()
                sum_val = df[metric].sum()
                
                # Check formatting
                is_integer = float(sum_val).is_integer()
                formatted_val = f"{int(sum_val):,}" if is_integer else f"{float(sum_val):,.2f}"
                
                widgets.append({
                    "id": f"widget-{widget_id_counter}",
                    "type": "kpi",
                    "title": f"Total {metric}",
                    "metric": metric,
                    "value": formatted_val,
                    "detail": f"Average: {avg_val:,.2f}" if not is_integer else f"Average: {int(avg_val):,}"
                })
                widget_id_counter += 1
            except Exception:
                pass

        # B. Temporal Line/Area Chart widget (if date column exists)
        primary_date = dates[0] if dates else None
        primary_metric = metrics[0] if metrics else None

        if primary_date and primary_metric:
            try:
                # Group by date and calculate metric sum
                # Limit to top 25 values for visualization neatness
                df_grouped = df.groupby(primary_date)[primary_metric].sum().reset_index()
                df_grouped = df_grouped.sort_values(by=primary_date).head(30)
                
                chart_data = []
                for _, row in df_grouped.iterrows():
                    chart_data.append({
                        "name": str(row[primary_date]),
                        "value": float(row[primary_metric])
                    })

                widgets.append({
                    "id": f"widget-{widget_id_counter}",
                    "type": "area",
                    "title": f"{primary_metric} Trend over {primary_date}",
                    "xKey": "name",
                    "yKey": "value",
                    "data": chart_data
                })
                widget_id_counter += 1
            except Exception:
                pass

        # C. Categorical Bar Chart widget
        primary_dim = dimensions[0] if dimensions else None
        if primary_dim and primary_metric:
            try:
                df_grouped = df.groupby(primary_dim)[primary_metric].sum().reset_index()
                df_grouped = df_grouped.sort_values(by=primary_metric, ascending=False).head(10)
                
                chart_data = []
                for _, row in df_grouped.iterrows():
                    chart_data.append({
                        "name": str(row[primary_dim]),
                        "value": float(row[primary_metric])
                    })

                widgets.append({
                    "id": f"widget-{widget_id_counter}",
                    "type": "bar",
                    "title": f"{primary_metric} by {primary_dim}",
                    "xKey": "name",
                    "yKey": "value",
                    "data": chart_data
                })
                widget_id_counter += 1
            except Exception:
                pass

        # D. Categorical Pie Chart widget
        secondary_dim = dimensions[1] if len(dimensions) > 1 else (dimensions[0] if dimensions else None)
        secondary_metric = metrics[1] if len(metrics) > 1 else (metrics[0] if metrics else None)
        
        if secondary_dim and secondary_metric and widget_id_counter < 6:
            try:
                df_grouped = df.groupby(secondary_dim)[secondary_metric].sum().reset_index()
                df_grouped = df_grouped.sort_values(by=secondary_metric, ascending=False).head(5)
                
                chart_data = []
                for _, row in df_grouped.iterrows():
                    chart_data.append({
                        "name": str(row[secondary_dim]),
                        "value": float(row[secondary_metric])
                    })

                widgets.append({
                    "id": f"widget-{widget_id_counter}",
                    "type": "pie",
                    "title": f"{secondary_metric} Distribution across {secondary_dim}",
                    "xKey": "name",
                    "yKey": "value",
                    "data": chart_data
                })
                widget_id_counter += 1
            except Exception:
                pass

        # E. Simple Tabular summary widget
        widgets.append({
            "id": f"widget-{widget_id_counter}",
            "type": "table",
            "title": "Data Overview Table",
            "columns": list(df.columns[:5]),
            "data": df.head(10).replace({pd.NA: None, float('nan'): None}).to_dict(orient="records")
        })

        return widgets
