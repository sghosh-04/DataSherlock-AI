# DataSherlock AI

## AI-Powered Data Quality, Analytics & Business Intelligence Platform

DataSherlock AI is an intelligent analytics platform that helps organizations clean, analyze, understand, and act on their data using a multi-agent AI pipeline.

The platform automatically profiles datasets, detects duplicates, generates insights, identifies root causes of data quality issues, provides recommendations, forecasts trends, builds dashboards, and creates business-friendly narratives from raw data.

---

## Problem Statement

Organizations spend significant time cleaning, validating, and understanding datasets before deriving business value.

Common challenges include:

* Duplicate records
* Missing or inconsistent data
* Poor data quality visibility
* Slow manual reporting
* Lack of automated business insights
* Limited accessibility for non-technical users

DataSherlock AI addresses these challenges through intelligent automation.

---

## Key Features

### Dataset Management

* CSV Upload
* Excel Upload
* JSON Upload
* Dataset Repository
* Dataset Status Tracking

### AI Data Profiling

* Data Quality Assessment
* Missing Value Analysis
* Column Profiling
* Dataset Health Scoring

### Duplicate Investigation

* Exact Duplicate Detection
* Fuzzy Duplicate Detection
* Duplicate Group Identification

### Insight Generation

* Automated Business Insights
* Trend Identification
* Pattern Discovery

### Root Cause Analysis

* Data Quality Issue Diagnosis
* Problem Source Identification

### AI Recommendations

* Data Cleaning Suggestions
* Quality Improvement Recommendations
* Business Action Recommendations

### Predictive Analytics

* Forecast Generation
* Trend Projection

### Dashboard Architect

* Automatic KPI Generation
* Dynamic Charts
* Data Summaries

### Storytelling Engine

* Business-Friendly Narratives
* Executive Summaries
* Insight Explanations

### Business Intelligence Copilot

* Natural Language Analytics
* AI-Powered Data Exploration

### Export Capabilities

* Cleaned Dataset Export
* Markdown Reports
* PowerPoint Report Export

---

## Multi-Agent Architecture

The platform uses specialized AI agents working together:

### Agent 1: Data Profiling Agent

Analyzes dataset structure, quality, completeness, and statistics.

### Agent 2: Duplicate Investigation Agent

Detects duplicate records and similarity patterns.

### Agent 3: Insight Generation Agent

Generates actionable insights from profiling and duplicate analysis.

### Agent 4: Root Cause Analysis Agent

Identifies causes behind quality issues and anomalies.

### Agent 5: Recommendation Agent

Provides corrective actions and optimization suggestions.

### Agent 6: Prediction Agent

Produces forecasting and predictive analytics.

### Agent 7: Dashboard Architect Agent

Creates dashboard configurations and KPI widgets.

### Agent 8: Storytelling Agent

Converts analytical findings into business narratives.

---

## Technology Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Recharts

### Backend

* FastAPI
* Python 3.11
* Pandas
* NumPy
* RapidFuzz

### Database

* SQLite

### AI & Analytics

* OpenAI API
* Custom Agent Pipeline

### Deployment

* Vercel (Frontend)
* Microsoft Azure App Service (Backend)

---

## Project Structure

```text
DataSherlock-AI/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── uploads/
│   ├── datasherlock.db
│   └── requirements.txt
│
└── README.md
```

---

## Local Installation

### Clone Repository

```bash
git clone https://github.com/sghosh-04/DataSherlock-AI.git

cd DataSherlock-AI
```

### Backend Setup

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

Backend runs on:

```text
http://localhost:8000
```

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

---

## Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.azurewebsites.net
```

### Backend (.env)

```env
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=sqlite:///datasherlock.db
```

---

## Deployment

### Frontend

Hosted on Vercel.

### Backend

Hosted on Microsoft Azure App Service using:

* FastAPI
* Gunicorn
* Uvicorn Workers

Startup Command:

```bash
gunicorn -k uvicorn.workers.UvicornWorker app.main:app
```

---

## Future Enhancements

* Azure SQL Integration
* PostgreSQL Support
* Role-Based Access Control
* Real-Time Data Pipelines
* Advanced Forecasting Models
* Multi-Tenant Architecture
* Automated Data Governance
* Enterprise Data Catalog

---

## Impact

DataSherlock AI reduces the time required for:

* Data Cleaning
* Data Validation
* Insight Discovery
* Dashboard Creation
* Business Reporting

while improving decision-making through AI-driven intelligence.

---

## Team

### DRAGON DEVS

Microsoft Build AI Hackathon Submission


This project is developed for educational and hackathon purposes.
