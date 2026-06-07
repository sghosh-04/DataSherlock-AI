import json
import pandas as pd
from datetime import datetime
from typing import Dict, Any
from app.core.database import get_db_connection
from app.services.agent_profiler import DataProfilingAgent
from app.services.agent_duplicates import DuplicateInvestigationAgent
from app.services.agent_insights import InsightGenerationAgent
from app.services.agent_rootcause import RootCauseAnalysisAgent
from app.services.agent_recommendations import RecommendationAgent
from app.services.agent_predictor import PredictionAgent

from app.services.agent_dashboard import DashboardArchitectAgent
from app.services.agent_storytelling import DataStorytellingAgent

class PipelineManager:
    def __init__(self):
        self.profiler = DataProfilingAgent()
        self.duplicates_detector = DuplicateInvestigationAgent()
        self.insight_gen = InsightGenerationAgent()
        self.rootcause = RootCauseAnalysisAgent()
        self.recommendations = RecommendationAgent()
        self.predictor = PredictionAgent()
        self.dashboard_architect = DashboardArchitectAgent()
        self.storyteller = DataStorytellingAgent()

    def run_pipeline(self, dataset_id: str, file_path: str) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # 1. Load dataset using appropriate Pandas engine
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(file_path)
            elif file_path.endswith('.json'):
                df = pd.read_json(file_path)
            else:
                raise ValueError("Unsupported file format. Please upload CSV, Excel, or JSON.")
            
            row_count, col_count = df.shape
            
            # Update dataset dimensions and processing state
            cursor.execute(
                "UPDATE datasets SET status = 'processing', row_count = ?, column_count = ? WHERE id = ?",
                (row_count, col_count, dataset_id)
            )
            conn.commit()

            # 2. Run Agent 1 (Profiling)
            profile_report = self.profiler.analyze(df)
            
            # 3. Run Agent 2 (Duplicates)
            duplicates_report = self.duplicates_detector.analyze(df)
            
            # 4. Run Agent 3 (Insights)
            insights = self.insight_gen.analyze(profile_report, duplicates_report)
            
            # 5. Run Agent 4 (Root Cause)
            root_causes = self.rootcause.analyze(profile_report, duplicates_report)
            
            # 6. Run Agent 5 (Recommendations)
            recommendations = self.recommendations.analyze(profile_report, root_causes)
            
            # 7. Run Agent 6 (Prediction)
            forecasts = self.predictor.analyze(profile_report, duplicates_report)

            # 8. Run Agent 7 (Dashboard Architect)
            dashboard_config = self.dashboard_architect.generate_dashboard(df)

            # 9. Run Agent 10 (Storytelling Agent)
            storytelling = self.storyteller.generate_stories(profile_report, duplicates_report)
            
            # 10. Save all findings to the DB
            report_id = f"report-{dataset_id}"
            created_at = datetime.utcnow().isoformat()
            
            cursor.execute("""
            INSERT OR REPLACE INTO analysis_reports 
            (id, dataset_id, profiling_data, duplicate_groups, insights, root_causes, recommendations, forecasts, dashboard_config, storytelling_narrative, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                report_id,
                dataset_id,
                json.dumps(profile_report),
                json.dumps(duplicates_report),
                json.dumps(insights),
                json.dumps(root_causes),
                json.dumps(recommendations),
                json.dumps(forecasts),
                json.dumps(dashboard_config),
                json.dumps(storytelling),
                created_at
            ))
            
            # Update dataset to completed and save top-level metrics for quick display
            cursor.execute(
                "UPDATE datasets SET status = 'completed', metrics = ? WHERE id = ?",
                (json.dumps(profile_report["scores"]), dataset_id)
            )
            conn.commit()
            
            return {
                "dataset_id": dataset_id,
                "scores": profile_report["scores"],
                "status": "completed"
            }
            
        except Exception as e:
            conn.rollback()
            cursor.execute(
                "UPDATE datasets SET status = 'failed' WHERE id = ?",
                (dataset_id,)
            )
            conn.commit()
            raise e
        finally:
            conn.close()
