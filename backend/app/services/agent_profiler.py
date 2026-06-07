import pandas as pd
import numpy as np
import re
from typing import Dict, Any, List

class DataProfilingAgent:
    def __init__(self):
        # Basic patterns for validity checking
        self.email_regex = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        self.phone_regex = re.compile(r"^\+?1?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$") # US-like or standard formats

    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        total_rows = len(df)
        if total_rows == 0:
            return self._empty_profile()

        columns_profile = {}
        total_missing = 0
        total_invalid = 0
        total_elements = total_rows * len(df.columns)
        
        # 1. Profile each column
        for col in df.columns:
            series = df[col]
            missing_count = int(series.isna().sum())
            total_missing += missing_count
            
            # Infer data type
            non_null_series = series.dropna()
            inferred_type = str(non_null_series.dtype)
            if inferred_type.startswith('object'):
                # Try to refine object type
                sample = non_null_series.head(100).astype(str)
                if sample.str.match(r"^\d{4}-\d{2}-\d{2}").all():
                    inferred_type = "datetime"
                elif sample.str.match(r"^-?\d+(\.\d+)?$").all():
                    inferred_type = "numeric"
                else:
                    inferred_type = "string"

            # Check uniqueness
            unique_count = int(non_null_series.nunique())
            uniqueness_pct = (unique_count / len(non_null_series) * 100) if len(non_null_series) > 0 else 0
            
            # Check validity
            invalid_count = 0
            col_lower = col.lower()
            
            if "email" in col_lower:
                for val in non_null_series:
                    if not self.email_regex.match(str(val).strip()):
                        invalid_count += 1
            elif "phone" in col_lower or "mobile" in col_lower:
                for val in non_null_series:
                    if not self.phone_regex.match(str(val).strip()):
                        invalid_count += 1
            elif "zip" in col_lower or "postal" in col_lower:
                for val in non_null_series:
                    if not re.match(r"^\d{5}(-\d{4})?$", str(val).strip()):
                        invalid_count += 1
            
            total_invalid += invalid_count
            validity_pct = ((len(non_null_series) - invalid_count) / len(non_null_series) * 100) if len(non_null_series) > 0 else 100.0
            
            columns_profile[col] = {
                "inferred_type": inferred_type,
                "missing_count": missing_count,
                "missing_percentage": round((missing_count / total_rows) * 100, 2),
                "unique_count": unique_count,
                "uniqueness_percentage": round(uniqueness_pct, 2),
                "invalid_count": invalid_count,
                "validity_percentage": round(validity_pct, 2),
                "stats": self._get_col_stats(non_null_series, inferred_type)
            }

        # 2. Calculate dimension scores
        completeness_score = round(100 - (total_missing / total_elements * 100), 2) if total_elements > 0 else 100.0
        
        # Row level uniqueness
        duplicate_rows = int(df.duplicated().sum())
        uniqueness_score = round(((total_rows - duplicate_rows) / total_rows * 100), 2) if total_rows > 0 else 100.0
        
        # Validity score based on semantic column checks
        validity_score = round(100 - (total_invalid / total_elements * 100), 2) if total_elements > 0 else 100.0
        if validity_score < 0:
            validity_score = 0.0

        # Consistency score: how uniform are the column types and value representations
        # We can score this based on missing formats or mixed types in object columns
        consistency_score = self._calculate_consistency(df)
        
        # Data Quality Score (Average of completeness, uniqueness, validity, consistency)
        quality_score = round((completeness_score + uniqueness_score + validity_score + consistency_score) / 4, 2)
        
        # Trust Score: Quality score weighted by dataset age or duplicate rates (let's scale quality slightly by uniqueness/completeness)
        trust_score = round(quality_score * 0.9 + (uniqueness_score * 0.1), 2)

        return {
            "summary": {
                "total_rows": total_rows,
                "total_columns": len(df.columns),
                "duplicate_rows": duplicate_rows,
                "total_missing": total_missing,
                "missing_percentage": round((total_missing / total_elements * 100), 2) if total_elements > 0 else 0,
                "total_invalid": total_invalid,
                "invalid_percentage": round((total_invalid / total_elements * 100), 2) if total_elements > 0 else 0
            },
            "scores": {
                "quality": quality_score,
                "trust": trust_score,
                "completeness": completeness_score,
                "uniqueness": uniqueness_score,
                "validity": validity_score,
                "consistency": consistency_score
            },
            "columns": columns_profile
        }

    def _get_col_stats(self, series: pd.Series, col_type: str) -> Dict[str, Any]:
        if len(series) == 0:
            return {}
        
        stats = {}
        if col_type in ("numeric", "int64", "float64"):
            try:
                num_series = pd.to_numeric(series, errors='coerce').dropna()
                if len(num_series) > 0:
                    stats = {
                        "min": float(num_series.min()),
                        "max": float(num_series.max()),
                        "mean": float(num_series.mean()),
                        "median": float(num_series.median()),
                        "std": float(num_series.std()) if len(num_series) > 1 else 0.0
                    }
            except Exception:
                pass
        
        # Add value distribution (top 5 values)
        val_counts = series.value_counts().head(5)
        stats["top_values"] = [{"value": str(k), "count": int(v)} for k, v in val_counts.items()]
        return stats

    def _calculate_consistency(self, df: pd.DataFrame) -> float:
        # Penalize columns containing mixed types (e.g., a mix of numeric and string strings)
        score_deductions = 0
        total_cols = len(df.columns)
        
        for col in df.columns:
            series = df[col].dropna()
            if len(series) == 0:
                continue
            
            # Map type classes
            types = series.apply(lambda x: type(x).__name__).nunique()
            if types > 1:
                score_deductions += 15 # Deduct consistency score per mixed-type column
                
        consistency = 100.0 - (score_deductions / total_cols)
        return round(max(consistency, 40.0), 2)

    def _empty_profile(self) -> Dict[str, Any]:
        return {
            "summary": {"total_rows": 0, "total_columns": 0, "duplicate_rows": 0, "total_missing": 0, "missing_percentage": 0, "total_invalid": 0, "invalid_percentage": 0},
            "scores": {"quality": 0, "trust": 0, "completeness": 0, "uniqueness": 0, "validity": 0, "consistency": 0},
            "columns": {}
        }
