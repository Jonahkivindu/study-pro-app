from typing import List
from sqlalchemy.orm import Session
from app.models.database import Lecture
from datetime import datetime

class AnalyticsService:
    """Calculates and aggregates analytics"""
    
    async def get_overview(self, db: Session) -> dict:
        """Get high-level analytics dashboard data"""
        lectures = db.query(Lecture).all()
        total_lectures = len(lectures)
        total_time_seconds = sum(l.duration for l in lectures if l.duration)
        total_time_hours = total_time_seconds / 3600
        
        # Streak (days with recordings)
        dates = {l.created_at.date() for l in lectures if l.created_at}
        streak = len(dates)
        
        # Coverage: percent of lectures with summaries
        summarized = sum(1 for l in lectures if l.summary)
        coverage = (summarized / total_lectures * 100) if total_lectures > 0 else 0
        
        # Topic distribution
        disciplines = {}
        for l in lectures:
            d = l.discipline or "General"
            disciplines[d] = disciplines.get(d, 0) + 1
        
        topic_distribution = [
            {"name": d, "percent": round((count / total_lectures * 100), 1), "color": self._get_color(i)}
            for i, (d, count) in enumerate(disciplines.items())
        ] if total_lectures > 0 else []

        return {
            "total_study_time": round(total_time_hours, 1),
            "lectures_recorded": total_lectures,
            "avg_note_coverage": round(coverage, 0),
            "learning_streak": streak,
            "topic_distribution": topic_distribution,
            "study_sessions": [
                {"day": "Mon", "hours": 1.2},
                {"day": "Tue", "hours": 2.5},
                {"day": "Wed", "hours": 0.5},
                {"day": "Thu", "hours": 3.1},
                {"day": "Fri", "hours": 1.8},
                {"day": "Sat", "hours": 0.4},
                {"day": "Sun", "hours": 0},
            ]
        }
    
    def _get_color(self, index):
        colors = ["bg-blue-600", "bg-purple-600", "bg-green-600", "bg-orange-600", "bg-pink-600"]
        return colors[index % len(colors)]

    async def calculate_lecture_metrics(self, lecture_id: str) -> dict:
        """Calculate metrics for a lecture"""
        pass
    
    async def calculate_study_timeline(self, user_id: str) -> List[dict]:
        """Get activity timeline"""
        pass
    
    async def predict_exam_readiness(self, lecture_ids: List[str]) -> dict:
        """Predict exam readiness for lectures"""
        pass
    
    async def get_discipline_insights(self, user_id: str, discipline: str) -> dict:
        """Get subject-specific analytics"""
        pass
    
    async def track_retention(self, lecture_id: str) -> dict:
        """Estimate knowledge retention over time"""
        pass

analytics_service = AnalyticsService()
