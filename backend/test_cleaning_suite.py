import pandas as pd
import numpy as np
from app.services.cleaning_engine import CleaningEngine
from app.services.agent_duplicates import DuplicateInvestigationAgent

def test_cleaning_suite():
    print("--------------------------------------------------")
    print("RUNNING DATASHERLOCK ADVANCED CLEANING TEST SUITE")
    print("--------------------------------------------------")
    
    engine = CleaningEngine()
    duplicates_agent = DuplicateInvestigationAgent()
    
    # 1. Prepare Mock Data with missing, invalid formats, duplicates, and outliers
    data = {
        "Age": [25, 30, 25, 200, None, 35],  # 200 is an outlier; None is missing
        "Email": ["john@example.com", "not-an-email", "john@example.com", "alice@example.com", "bob@example.com", None], # Duplicate email, invalid email, missing
        "Name": ["John", "Bob", "John", "Alice", "Bob", "Charlie"], # John & Bob have identical values
        "RegistrationDate": ["2026-01-01", "2026-05-12", "2026-01-01", "InvalidDate", "2026-03-15", "2026-04-10"] # Date format validation
    }
    df = pd.DataFrame(data)
    
    # 2. Verify Schema detection
    schema = engine.detect_column_types(df)
    print("Detected Schema Types:")
    for col, t in schema.items():
        print(f"  - {col}: {t}")
    assert schema["Age"] == "numeric"
    assert schema["Email"] in ["text", "categorical"]
    assert schema["RegistrationDate"] == "date"
    
    # 3. Verify Health Overview
    health = engine.get_health_summary(df)
    print(f"Health Summary Score: {health['health_score']}%")
    print(f"  - Missing cells: {health['missing_count']}")
    print(f"  - Invalid formats: {health['invalid_count']}")
    print(f"  - Exact duplicates: {health['duplicate_count']}")
    print(f"  - Outliers count: {health['outlier_count']}")
    assert health["missing_count"] == 2
    assert health["invalid_count"] == 1 # "not-an-email" is invalid, RegistrationDate is not checked for regex formats in health summary
    
    # 4. Verify Duplicate Investigation Agent (Exact rows vs Key Columns)
    # Exact row duplicates
    exact_report = duplicates_agent.analyze(df)
    print(f"Exact row duplicates count: {exact_report['duplicate_count']}")
    
    # Key-columns duplicates (e.g. key: "Email")
    key_report = duplicates_agent.analyze(df, key_columns=["Email"])
    print(f"Key-column 'Email' duplicates count: {key_report['duplicate_count']}")
    assert key_report["duplicate_count"] == 1 # "john@example.com" row index matches
    
    # 5. Verify Operations Validation
    valid_ops = [
        {"column": "Age", "type": "fill_numeric", "strategy": "mean", "value": ""},
        {"column": "Age", "type": "cap_outliers", "strategy": "", "value": ""}
    ]
    invalid_ops = [
        {"column": "Email", "type": "fill_numeric", "strategy": "mean", "value": ""}, # Not numeric column
        {"column": "Age", "type": "fill_numeric", "strategy": "custom", "value": "not-a-number"} # invalid custom number
    ]
    
    valid_errors = engine.validate_operations(df, valid_ops)
    invalid_errors = engine.validate_operations(df, invalid_ops)
    print("Validation Errors for valid operations:", valid_errors)
    print("Validation Errors for invalid operations:", invalid_errors)
    assert len(valid_errors) == 0
    assert len(invalid_errors) == 2
    
    # 6. Verify Outliers capping & reporting
    cap_ops = [
        {"column": "Age", "type": "cap_outliers", "strategy": "", "value": ""},
        {"column": "Age", "type": "fill_numeric", "strategy": "median", "value": ""}
    ]
    cleaned_df, report = engine.apply_clean(df, cap_ops)
    print("Clean applied summary report:")
    for log in report:
        print(f"  * {log}")
        
    # Check that outliers were capped (Age 200 is capped down to Q3 + 1.5 * IQR)
    capped_val = cleaned_df.loc[3, "Age"]
    print(f"Capped Age value at row 4: {capped_val}")
    assert capped_val < 200
    
    print("\nALL DATASHERLOCK ADVANCED CLEANING SUITE CHECKS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    test_cleaning_suite()
