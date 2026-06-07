import json
import pandas as pd
import logging
import traceback
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
        logger = logging.getLogger("datasherlock.pipeline")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            logger.info(f"Starting analysis pipeline for dataset ID: {dataset_id}")
            
            # 1. Load dataset using appropriate Pandas engine
            logger.info(f"[{dataset_id}] Step 1: Loading dataset from {file_path}")
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(file_path)
            elif file_path.endswith('.json'):
                df = pd.read_json(file_path)
            else:
                raise ValueError("Unsupported file format. Please upload CSV, Excel, or JSON.")
            
            row_count, col_count = df.shape
            logger.info(f"[{dataset_id}] Step 1 Success: Loaded dataset ({row_count} rows, {col_count} cols)")
            
            # Update dataset dimensions and processing state
            cursor.execute(
                "UPDATE datasets SET status = 'processing', row_count = ?, column_count = ? WHERE id = ?",
                (row_count, col_count, dataset_id)
            )
            conn.commit()

            # 2. Run Agent 1 (Profiling)
            logger.info(f"[{dataset_id}] Step 2: Running Data Profiling Agent")
            try:
                profile_report = self.profiler.analyze(df)
                logger.info(f"[{dataset_id}] Step 2 Success: Data Profiling Agent completed")
            except Exception as e:
                logger.error(f"[{dataset_id}] Step 2 Failed: Data Profiling Agent error")
                raise e
            
            # 3. Run Agent 2 (Duplicates)
            logger.info(f"[{dataset_id}] Step 3: Running Duplicate Investigation Agent")
            try:
                duplicates_report = self.duplicates_detector.analyze(df)
                logger.info(f"[{dataset_id}] Step 3 Success: Duplicate Investigation Agent completed")
            except Exception as e:
                logger.error(f"[{dataset_id}] Step 3 Failed: Duplicate Investigation Agent error")
                raise e
            
            # 4. Run Agent 3 (Insights)
            logger.info(f"[{dataset_id}] Step 4: Running Insight Generation Agent")
            try:
                insights = self.insight_gen.analyze(profile_report, duplicates_report)
                logger.info(f"[{dataset_id}] Step 4 Success: Insight Generation Agent completed")
            except Exception as e:
                logger.error(f"[{dataset_id}] Step 4 Failed: Insight Generation Agent error")
                raise e
            
            # 5. Run Agent 4 (Root Cause)
            logger.info(f"[{dataset_id}] Step 5: Running Root Cause Analysis Agent")
            try:
                root_causes = self.rootcause.analyze(profile_report, duplicates_report)
                logger.info(f"[{dataset_id}] Step 5 Success: Root Cause Analysis Agent completed")
            except Exception as e:
                logger.error(f"[{dataset_id}] Step 5 Failed: Root Cause Analysis Agent error")
                raise e
            
            # 6. Run Agent 5 (Recommendations)
            logger.info(f"[{dataset_id}] Step 6: Running Recommendation Agent")
            try:
                recommendations = self.recommendations.analyze(profile_report, root_causes)
                logger.info(f"[{dataset_id}] Step 6 Success: Recommendation Agent completed")
            except Exception as e:
                logger.error(f"[{dataset_id}] Step 6 Failed: Recommendation Agent error")
                raise e
            
            # 7. Run Agent 6 (Prediction)
            logger.info(f"[{dataset_id}] Step 7: Running Prediction Agent")
            try:
                forecasts = self.predictor.analyze(profile_report, duplicates_report)
                logger.info(f"[{dataset_id}] Step 7 Success: Prediction Agent completed")
            except Exception as e:
                logger.error(f"[{dataset_id}] Step 7 Failed: Prediction Agent error")
                raise e

            # 8. Run Agent 7 (Dashboard Architect)
            logger.info(f"[{dataset_id}] Step 8: Running Dashboard Architect Agent")
            try:
                dashboard_config = self.dashboard_architect.generate_dashboard(df)
                logger.info(f"[{dataset_id}] Step 8 Success: Dashboard Architect Agent completed")
            except Exception as e:
                logger.error(f"[{dataset_id}] Step 8 Failed: Dashboard Architect Agent error")
                raise e

            # 9. Run Agent 10 (Storytelling Agent)
            logger.info(f"[{dataset_id}] Step 9: Running Data Storytelling Agent")
            try:
                storytelling = self.storyteller.generate_stories(profile_report, duplicates_report)
                logger.info(f"[{dataset_id}] Step 9 Success: Data Storytelling Agent completed")
            except Exception as e:
                logger.error(f"[{dataset_id}] Step 9 Failed: Data Storytelling Agent error")
                raise e
            
            # 10. Save all findings to the DB
            logger.info(f"[{dataset_id}] Step 10: Saving analysis findings to DB")
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
            logger.info(f"[{dataset_id}] Step 10 Success: Saved report & completed pipeline")
            
            return {
                "dataset_id": dataset_id,
                "scores": profile_report["scores"],
                "status": "completed"
            }
            
        except Exception as e:
            logger.error(f"Pipeline execution FAILED for dataset ID: {dataset_id}")
            logger.error(f"Traceback:\n{traceback.format_exc()}")
            conn.rollback()
            try:
                cursor.execute(
                    "UPDATE datasets SET status = 'failed' WHERE id = ?",
                    (dataset_id,)
                )
                conn.commit()
                logger.info(f"[{dataset_id}] Successfully set dataset status to failed in database.")
            except Exception as db_err:
                logger.error(f"[{dataset_id}] Failed to set dataset status to failed: {db_err}")
            raise e
        finally:
            conn.close()
