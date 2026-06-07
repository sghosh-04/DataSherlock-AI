from fastapi import APIRouter
from app.api.endpoints import datasets, copilot

api_router = APIRouter()
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["copilot"])
