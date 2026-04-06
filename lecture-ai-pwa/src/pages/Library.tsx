import { useLectureStore } from '../stores/lectureStore';
import { LectureCard } from '../components/LectureCard';
import { BookOpen } from 'lucide-react';

export function Library() {
  const lectures = useLectureStore(s => s.lectures);

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <div className="flex items-center mb-6">
        <BookOpen className="w-6 h-6 mr-2 text-primary" />
        <h1 className="text-2xl font-bold">Lecture Library</h1>
      </div>
      
      {lectures.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 bg-secondary/50 rounded-xl border border-dashed">
          <p>No lectures recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lectures.map(lecture => (
            <LectureCard key={lecture.id} lecture={lecture} />
          ))}
        </div>
      )}
    </div>
  );
}
