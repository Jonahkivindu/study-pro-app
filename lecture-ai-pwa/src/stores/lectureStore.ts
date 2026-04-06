import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Lecture {
  id: string;
  title: string;
  date: string;
  audioUrl?: string; // Supabase storage URL
  transcript?: string;
  summary?: string[];
  keyConcepts?: string[];
  examQuestions?: string[];
  duration?: number;
}

interface LectureState {
  lectures: Lecture[];
  addLecture: (lecture: Lecture) => void;
  updateLecture: (id: string, data: Partial<Lecture>) => void;
  getLecture: (id: string) => Lecture | undefined;
  removeLecture: (id: string) => void;
}

export const useLectureStore = create<LectureState>()(
  persist(
    (set, get) => ({
      lectures: [],
      addLecture: (lecture) => set((state) => ({ lectures: [lecture, ...state.lectures] })),
      updateLecture: (id, data) => set((state) => ({
        lectures: state.lectures.map(l => l.id === id ? { ...l, ...data } : l)
      })),
      getLecture: (id) => get().lectures.find(l => l.id === id),
      removeLecture: (id) => set((state) => ({ lectures: state.lectures.filter(l => l.id !== id) }))
    }),
    {
      name: 'lecture-storage',
      // By default uses localStorage. For heavy data, we would implement IndexedDB adapter.
    }
  )
);
