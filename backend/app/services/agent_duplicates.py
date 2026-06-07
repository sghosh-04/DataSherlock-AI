import pandas as pd
from typing import Dict, Any, List

class DuplicateInvestigationAgent:
    def __init__(self, similarity_threshold: float = 100.0):
        self.similarity_threshold = similarity_threshold

    def analyze(self, df: pd.DataFrame, key_columns: List[str] = None) -> Dict[str, Any]:
        total_rows = len(df)
        if total_rows == 0:
            return {
                "duplicate_count": 0, 
                "duplicate_ratio_percentage": 0.0,
                "matching_columns_used": [],
                "groups": []
            }

        # If key_columns is provided and not empty, use those. Otherwise, check all columns (exact row duplicates).
        cols_to_check = [c for c in key_columns if c in df.columns] if key_columns else list(df.columns)
        
        # Identify duplicates mask
        duplicate_mask = df.duplicated(subset=cols_to_check, keep=False)
        duplicate_df = df[duplicate_mask]
        
        duplicate_count = 0
        duplicate_groups = []
        
        if len(duplicate_df) > 0:
            # Group rows that have identical values in the key columns
            # We convert to string keys or group by subset list
            grouped = duplicate_df.groupby(cols_to_check, dropna=False)
            group_id = 1
            for name, group in grouped:
                records = []
                for idx, row in group.iterrows():
                    records.append({
                        "row_index": int(idx) + 1, # 1-based row count for display
                        "record": {k: str(v) for k, v in row.to_dict().items()},
                        "similarity": 100.0
                    })
                
                # Check that we actually have a group of duplicates
                if len(records) >= 2:
                    duplicate_groups.append({
                        "group_id": group_id,
                        "records": records,
                        "average_similarity": 100.0
                    })
                    # Duplicate count is the number of extra rows (all rows in group minus the first anchor row)
                    duplicate_count += len(records) - 1
                    group_id += 1

        duplicate_ratio = round((duplicate_count / total_rows) * 100, 2) if total_rows > 0 else 0.0

        return {
            "duplicate_count": duplicate_count,
            "duplicate_ratio_percentage": duplicate_ratio,
            "matching_columns_used": cols_to_check,
            "groups": duplicate_groups[:50] # Limit to 50 groups to prevent UI lag
        }
