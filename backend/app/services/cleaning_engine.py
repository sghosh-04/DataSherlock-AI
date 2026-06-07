import pandas as pd
import numpy as np
import re
from typing import Dict, Any, List

class CleaningEngine:
    def __init__(self):
        self.email_regex = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        self.phone_regex = re.compile(r"^\+?1?\s*\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$")

    def detect_column_types(self, df: pd.DataFrame) -> Dict[str, str]:
        schema = {}
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            col_lower = col.lower()
            is_date_name = any(k in col_lower for k in ["date", "time", "timestamp", "created", "updated"])
            
            if "datetime" in dtype_str or "datetimetz" in dtype_str:
                schema[col] = "date"
            elif "int" in dtype_str or "float" in dtype_str:
                schema[col] = "numeric"
            elif is_date_name:
                schema[col] = "date"
            else:
                non_null = df[col].dropna()
                unique_count = non_null.nunique()
                total_count = len(non_null)
                
                # Low cardinality string values represent categorical data
                if total_count > 0 and (unique_count <= 15 or (unique_count / total_count) < 0.15):
                    schema[col] = "categorical"
                else:
                    schema[col] = "text"
        return schema

    def get_health_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        total_rows = len(df)
        total_cols = len(df.columns)
        total_cells = total_rows * total_cols
        
        # 1. Missing values
        missing_count = int(df.isna().sum().sum())
        
        # 2. Duplicate rows (exact complete rows)
        duplicate_count = int(df.duplicated().sum())
        
        # 3. Invalid formats (emails/phones)
        invalid_count = 0
        for col in df.columns:
            col_lower = col.lower()
            non_null = df[col].dropna()
            if "email" in col_lower:
                for val in non_null:
                    if not self.email_regex.match(str(val).strip()):
                        invalid_count += 1
            elif "phone" in col_lower or "mobile" in col_lower:
                for val in non_null:
                    if not self.phone_regex.match(str(val).strip()):
                        invalid_count += 1
                        
        # 4. Outliers count (IQR rule for numeric columns)
        outlier_count = 0
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            if "int" in dtype_str or "float" in dtype_str:
                non_null = df[col].dropna()
                if len(non_null) > 0:
                    q1 = non_null.quantile(0.25)
                    q3 = non_null.quantile(0.75)
                    iqr = q3 - q1
                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    outliers = non_null[(non_null < lower_bound) | (non_null > upper_bound)]
                    outlier_count += len(outliers)
                    
        total_anomalies = missing_count + duplicate_count + invalid_count + outlier_count
        health_score = 100.0
        if total_cells > 0:
            health_score = max(0, round((1 - (total_anomalies / total_cells)) * 100, 1))
            
        return {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "missing_count": missing_count,
            "duplicate_count": duplicate_count,
            "invalid_count": invalid_count,
            "outlier_count": outlier_count,
            "health_score": health_score
        }

    def audit_dataset(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        issues = []
        
        # 1. Detect Missing Values
        for col in df.columns:
            null_rows = df[df[col].isna()].index
            for r in null_rows:
                issues.append({
                    "row": int(r) + 1,
                    "column": col,
                    "value": "NULL",
                    "type": "missing",
                    "message": f"Missing value in column '{col}'"
                })

        # 2. Detect Format Inconsistencies
        for col in df.columns:
            col_lower = col.lower()
            non_null = df[col].dropna()
            
            if "email" in col_lower:
                for idx, val in non_null.items():
                    if not self.email_regex.match(str(val).strip()):
                        issues.append({
                            "row": int(idx) + 1,
                            "column": col,
                            "value": str(val),
                            "type": "invalid",
                            "message": "Invalid Email Format"
                        })
            elif "phone" in col_lower or "mobile" in col_lower:
                for idx, val in non_null.items():
                    if not self.phone_regex.match(str(val).strip()):
                        issues.append({
                            "row": int(idx) + 1,
                            "column": col,
                            "value": str(val),
                            "type": "invalid",
                            "message": "Invalid Phone Format"
                        })

        # 3. Detect Exact Duplicates (entire rows)
        duplicate_mask = df.duplicated(keep=False)
        duplicate_indices = df[duplicate_mask].index
        seen_duplicates = set()
        for r in duplicate_indices:
            if r in seen_duplicates:
                continue
            row_vals = df.loc[r]
            matches = df[df.eq(row_vals).all(axis=1)].index
            for match_r in matches:
                if match_r != r:
                    issues.append({
                        "row": int(match_r) + 1,
                        "column": "All Columns",
                        "value": "Identical Row",
                        "type": "duplicate",
                        "match_row": int(r) + 1,
                        "confidence": 100,
                        "message": f"Exact duplicate of Row {int(r) + 1}"
                    })
                    seen_duplicates.add(match_r)
            seen_duplicates.add(r)

        # 4. Detect Outliers (IQR boundaries)
        for col in df.columns:
            dtype_str = str(df[col].dtype)
            if "int" in dtype_str or "float" in dtype_str:
                non_null = df[col].dropna()
                if len(non_null) > 0:
                    q1 = non_null.quantile(0.25)
                    q3 = non_null.quantile(0.75)
                    iqr = q3 - q1
                    lower = q1 - 1.5 * iqr
                    upper = q3 + 1.5 * iqr
                    outliers_idx = non_null[(non_null < lower) | (non_null > upper)].index
                    for r in outliers_idx:
                        val = df.loc[r, col]
                        issues.append({
                            "row": int(r) + 1,
                            "column": col,
                            "value": str(val),
                            "type": "outlier",
                            "message": f"Outlier detected: value {val} lies outside IQR boundaries [{lower:.2f}, {upper:.2f}]"
                        })

        return issues

    def validate_operations(self, df: pd.DataFrame, operations: List[Dict[str, Any]]) -> List[str]:
        errors = []
        for idx, op in enumerate(operations):
            col = op.get("column")
            op_type = op.get("type")
            strategy = op.get("strategy")
            custom_val = op.get("value")

            if not col:
                errors.append(f"Operation #{idx+1} is missing a target column name.")
                continue

            if col not in df.columns:
                errors.append(f"Column '{col}' does not exist in dataset.")
                continue

            dtype_str = str(df[col].dtype)
            is_numeric = "int" in dtype_str or "float" in dtype_str

            if op_type == "fill_numeric":
                if not is_numeric:
                    errors.append(f"Column '{col}' is not numeric. Cannot apply numerical null replacement.")
                if strategy == "custom":
                    try:
                        float(custom_val)
                    except (ValueError, TypeError):
                        errors.append(f"Custom numeric value '{custom_val}' for column '{col}' is not a valid number.")

            elif op_type in ["cap_outliers", "delete_outliers"]:
                if not is_numeric:
                    errors.append(f"Column '{col}' is not numeric. Outlier adjustments require numeric types.")

            elif op_type == "fill_text":
                if strategy == "custom" and custom_val is None:
                    errors.append(f"Custom replacement text for column '{col}' cannot be null.")
                    
        return errors

    def preview_clean(self, df: pd.DataFrame, operations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        temp_df = df.copy()
        previews = []

        for op in operations:
            op_type = op.get("type")
            col = op.get("column")
            strategy = op.get("strategy")
            custom_val = op.get("value")

            if col not in temp_df.columns:
                continue

            # A. Numeric operations
            if op_type == "fill_numeric":
                null_mask = temp_df[col].isna()
                if not null_mask.any():
                    continue

                if strategy == "mean":
                    fill_val = temp_df[col].mean()
                elif strategy == "median":
                    fill_val = temp_df[col].median()
                elif strategy == "mode":
                    mode_series = temp_df[col].mode()
                    fill_val = mode_series.iloc[0] if len(mode_series) > 0 else 0
                elif strategy == "custom":
                    fill_val = pd.to_numeric(custom_val, errors='coerce')
                else:
                    continue

                for idx in temp_df[null_mask].index:
                    previews.append({
                        "row": int(idx) + 1,
                        "column": col,
                        "old_value": "NULL",
                        "new_value": str(fill_val)
                    })
                    
            # B. Text operations
            elif op_type == "fill_text":
                null_mask = temp_df[col].isna()
                if not null_mask.any():
                    continue

                if strategy == "common":
                    mode_series = temp_df[col].mode()
                    fill_val = str(mode_series.iloc[0]) if len(mode_series) > 0 else ""
                elif strategy == "custom":
                    fill_val = str(custom_val)
                elif strategy == "ai_suggest":
                    fill_val = "AI_Cleansed_Value"
                else:
                    continue

                for idx in temp_df[null_mask].index:
                    previews.append({
                        "row": int(idx) + 1,
                        "column": col,
                        "old_value": "NULL",
                        "new_value": fill_val
                    })

            # C. Deletions
            elif op_type == "delete_rows":
                null_mask = temp_df[col].isna()
                for idx in temp_df[null_mask].index:
                    previews.append({
                        "row": int(idx) + 1,
                        "column": col,
                        "old_value": "NULL",
                        "new_value": "[DELETED_ROW]"
                    })

            # D. Format standardizations
            elif op_type == "standardize_dates":
                for idx, val in temp_df[col].dropna().items():
                    try:
                        parsed = pd.to_datetime(val)
                        new_val = parsed.strftime("%Y-%m-%d")
                        if str(val) != new_val:
                            previews.append({
                                "row": int(idx) + 1,
                                "column": col,
                                "old_value": str(val),
                                "new_value": new_val
                            })
                    except Exception:
                        pass
                        
            elif op_type == "trim_whitespace":
                for idx, val in temp_df[col].dropna().items():
                    new_val = str(val).strip()
                    if str(val) != new_val:
                        previews.append({
                            "row": int(idx) + 1,
                            "column": col,
                            "old_value": str(val),
                            "new_value": new_val
                        })

            elif op_type == "normalize_case":
                case_style = strategy
                for idx, val in temp_df[col].dropna().items():
                    if case_style == "upper":
                        new_val = str(val).upper()
                    elif case_style == "lower":
                        new_val = str(val).lower()
                    else:
                        new_val = str(val).title()
                    if str(val) != new_val:
                        previews.append({
                            "row": int(idx) + 1,
                            "column": col,
                            "old_value": str(val),
                            "new_value": new_val
                        })

            # E. Outliers operations
            elif op_type == "cap_outliers":
                non_null = temp_df[col].dropna()
                if len(non_null) > 0:
                    q1 = non_null.quantile(0.25)
                    q3 = non_null.quantile(0.75)
                    iqr = q3 - q1
                    lower = q1 - 1.5 * iqr
                    upper = q3 + 1.5 * iqr
                    
                    outliers_mask = (temp_df[col] < lower) | (temp_df[col] > upper)
                    for idx, val in temp_df[outliers_mask][col].items():
                        new_val = np.clip(val, lower, upper)
                        previews.append({
                            "row": int(idx) + 1,
                            "column": col,
                            "old_value": str(val),
                            "new_value": f"{float(new_val):.2f} (Capped)"
                        })

            elif op_type == "delete_outliers":
                non_null = temp_df[col].dropna()
                if len(non_null) > 0:
                    q1 = non_null.quantile(0.25)
                    q3 = non_null.quantile(0.75)
                    iqr = q3 - q1
                    lower = q1 - 1.5 * iqr
                    upper = q3 + 1.5 * iqr
                    
                    outliers_mask = (temp_df[col] < lower) | (temp_df[col] > upper)
                    for idx, val in temp_df[outliers_mask][col].items():
                        previews.append({
                            "row": int(idx) + 1,
                            "column": col,
                            "old_value": str(val),
                            "new_value": "[DELETED_ROW]"
                        })

        return previews

    def apply_clean(self, df: pd.DataFrame, operations: List[Dict[str, Any]]) -> tuple[pd.DataFrame, List[str]]:
        cleaned_df = df.copy()
        summary_report = []

        for op in operations:
            op_type = op.get("type")
            col = op.get("column")
            strategy = op.get("strategy")
            custom_val = op.get("value")

            if col not in cleaned_df.columns:
                continue

            if op_type == "fill_numeric":
                null_mask = cleaned_df[col].isna()
                change_count = int(null_mask.sum())
                
                if strategy == "mean":
                    fill_val = cleaned_df[col].mean()
                elif strategy == "median":
                    fill_val = cleaned_df[col].median()
                elif strategy == "mode":
                    mode_series = cleaned_df[col].mode()
                    fill_val = mode_series.iloc[0] if len(mode_series) > 0 else 0
                elif strategy == "custom":
                    fill_val = pd.to_numeric(custom_val, errors='coerce')
                else:
                    continue
                cleaned_df[col] = cleaned_df[col].fillna(fill_val)
                summary_report.append(f"Filled {change_count} nulls in numeric column '{col}' with strategy '{strategy}' ({fill_val}).")

            elif op_type == "fill_text":
                null_mask = cleaned_df[col].isna()
                change_count = int(null_mask.sum())
                
                if strategy == "common":
                    mode_series = cleaned_df[col].mode()
                    fill_val = str(mode_series.iloc[0]) if len(mode_series) > 0 else ""
                elif strategy == "custom":
                    fill_val = str(custom_val)
                elif strategy == "ai_suggest":
                    fill_val = "Cleansed_Data"
                else:
                    continue
                cleaned_df[col] = cleaned_df[col].fillna(fill_val)
                summary_report.append(f"Filled {change_count} nulls in text column '{col}' with strategy '{strategy}' ('{fill_val}').")

            elif op_type == "delete_rows":
                null_mask = cleaned_df[col].isna()
                change_count = int(null_mask.sum())
                cleaned_df = cleaned_df.dropna(subset=[col])
                summary_report.append(f"Deleted {change_count} rows due to null constraints on column '{col}'.")

            elif op_type == "standardize_dates":
                parsed_dates = pd.to_datetime(cleaned_df[col], errors='coerce').dt.strftime('%Y-%m-%d')
                change_count = int((cleaned_df[col].astype(str) != parsed_dates.astype(str)).sum())
                cleaned_df[col] = parsed_dates
                summary_report.append(f"Standardized {change_count} dates in column '{col}' to format YYYY-MM-DD.")

            elif op_type == "trim_whitespace":
                trimmed = cleaned_df[col].astype(str).str.strip()
                change_count = int((cleaned_df[col].astype(str) != trimmed).sum())
                cleaned_df[col] = trimmed
                summary_report.append(f"Trimmed leading/trailing whitespaces in {change_count} cells of column '{col}'.")

            elif op_type == "normalize_case":
                case_style = strategy
                original = cleaned_df[col].astype(str)
                if case_style == "upper":
                    new_series = original.str.upper()
                elif case_style == "lower":
                    new_series = original.str.lower()
                else:
                    new_series = original.str.title()
                
                change_count = int((original != new_series).sum())
                cleaned_df[col] = new_series
                summary_report.append(f"Standardized case format of {change_count} string cells in column '{col}' to '{case_style}'.")

            elif op_type == "cap_outliers":
                non_null = cleaned_df[col].dropna()
                if len(non_null) > 0:
                    q1 = non_null.quantile(0.25)
                    q3 = non_null.quantile(0.75)
                    iqr = q3 - q1
                    lower = q1 - 1.5 * iqr
                    upper = q3 + 1.5 * iqr
                    
                    outliers_mask = (cleaned_df[col] < lower) | (cleaned_df[col] > upper)
                    change_count = int(outliers_mask.sum())
                    cleaned_df[col] = np.clip(cleaned_df[col], lower, upper)
                    summary_report.append(f"Capped {change_count} numeric outliers in column '{col}' within bounds [{lower:.2f}, {upper:.2f}].")

            elif op_type == "delete_outliers":
                non_null = cleaned_df[col].dropna()
                if len(non_null) > 0:
                    q1 = non_null.quantile(0.25)
                    q3 = non_null.quantile(0.75)
                    iqr = q3 - q1
                    lower = q1 - 1.5 * iqr
                    upper = q3 + 1.5 * iqr
                    
                    outliers_mask = (cleaned_df[col] < lower) | (cleaned_df[col] > upper)
                    change_count = int(outliers_mask.sum())
                    cleaned_df = cleaned_df[~outliers_mask]
                    summary_report.append(f"Deleted {change_count} rows containing numeric outliers in column '{col}'.")

        return cleaned_df, summary_report
