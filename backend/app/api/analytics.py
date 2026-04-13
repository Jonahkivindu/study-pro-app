from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.services.analytics import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/overview", response_model=dict)
async def get_analytics_overview(db: Session = Depends(get_db)):
    """Get high-level analytics dashboard data"""
    data = await analytics_service.get_overview(db)
    return {"success": True, "data": data}

@router.get("/analytics/lectures")
async def get_lecture_analytics():
    """Analytics per lecture (completion, retention, mastery)"""
    pass

@router.get("/analytics/timeline")
async def get_study_timeline():
    """Study activity timeline"""
    pass

@router.get("/analytics/predictions")
async def get_exam_predictions():
    """Exam readiness predictions per lecture"""
    pass

@router.get("/analytics/discipline/{discipline}")
async def get_discipline_analytics(discipline: str):
    """Analytics specific to academic discipline"""
    pass
