import json
from typing import Dict, Any, List
from app.core.azure_clients import query_llm

class RecommendationAgent:
    def analyze(self, profile: Dict[str, Any], root_causes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        cols = list(profile.get("columns", {}).keys())
        
        prompt = f"""
        Formulate actionable fixes based on these root causes:
        Root Causes: {root_causes}
        Columns: {cols}

        Provide 2 to 3 clear recommendations.
        Return EXACTLY a JSON array of objects with the keys:
        - "issue": The quality issue being addressed
        - "priority": "High", "Medium", or "Low"
        - "action": Specific technical solution or step to implement
        - "expected_improvement": Expected numeric point increase in Data Quality Score (e.g., "+8%")
        - "effort": "Easy", "Medium", or "Hard"

        Do not return any markdown formatting outside of the JSON block.
        """
        
        system_prompt = "You are a Solutions Architect and Data Governance Advisor. You advise organizations on best practices for cleansing and validating operational data."
        
        response = query_llm(prompt, system_prompt)
        if response:
            try:
                clean_response = response.strip()
                if "```json" in clean_response:
                    clean_response = clean_response.split("```json")[1].split("```")[0]
                elif "```" in clean_response:
                    clean_response = clean_response.split("```")[1].split("```")[0]
                return json.loads(clean_response.strip())
            except Exception:
                pass

        # Dynamic Fallback
        null_cols = [c for c, v in profile.get("columns", {}).items() if v.get("missing_count", 0) > 0]
        primary_null = null_cols[0] if null_cols else "important fields"
        
        recommendations = [
            {
                "issue": f"Missing values in '{primary_null}' field",
                "priority": "High",
                "action": f"Implement mandatory field validation at UI submission. Inject backend database NOT NULL constraints on '{primary_null}'.",
                "expected_improvement": "+9%",
                "effort": "Easy"
            }
        ]
        
        has_duplicates = any("duplicate" in c.get("issue", "").lower() for c in root_causes)
        if has_duplicates:
            recommendations.append({
                "issue": "Duplicate records in dataset",
                "priority": "High",
                "action": "Integrate database unique indexes and implement API debouncing on client submission forms. Run a deduplication script to merge fuzzy duplicates.",
                "expected_improvement": "+12%",
                "effort": "Medium"
            })
        else:
            recommendations.append({
                "issue": "Format mismatch in fields",
                "priority": "Medium",
                "action": "Introduce strict formatting regexes on email, phone, and postal inputs during ingest. Clean existing values with a regex converter script.",
                "expected_improvement": "+6%",
                "effort": "Easy"
            })
            
        return recommendations
