import { Lecture } from '../stores/lectureStore';
import { Calendar, FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LectureCard({ lecture }: { lecture: Lecture }) {
  return (
    <Link to={`/chat/${lecture.id}`} className="block w-full">
      <div className="p-4 bg-secondary rounded-lg hover:border-primary border border-transparent transition-colors shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-foreground">{lecture.title}</h3>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex items-center text-sm text-muted-foreground space-x-4">
          <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {new Date(lecture.date).toLocaleDateString()}</span>
          <span className="flex items-center"><FileText className="w-4 h-4 mr-1" /> {lecture.summary?.length || 0} Key Points</span>
        </div>
      </div>
    </Link>
  );
}
