import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useLectureStore } from '../stores/lectureStore';
import { transcribeAudio } from '../services/whisperService';
import { generateSummary } from '../services/geminiService';
import { uploadAudioToSupabase } from '../services/audioService';
import { Waveform } from '../components/Waveform';

export function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Ready to Capture");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const navigate = useNavigate();
  const addLecture = useLectureStore(s => s.addLecture);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      
      mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
      mediaRecorder.current.onstop = processAudio;
      
      mediaRecorder.current.start();
      setIsRecording(true);
      setStatus("Recording Lecture...");
    } catch (err) {
      console.error(err);
      setStatus("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    mediaRecorder.current?.stream.getTracks().forEach(t => t.stop());
  };

  const processAudio = async () => {
    setIsProcessing(true);
    setStatus("Transcribing via Whisper...");
    const blob = new Blob(chunks.current, { type: 'audio/webm' });
    chunks.current = [];
    
    try {
      const id = crypto.randomUUID();
      const title = `Lecture ${new Date().toLocaleDateString()}`;
      
      // Upload audio using mock logic or actual
      const audioUrl = await uploadAudioToSupabase(blob, `${id}.webm`).catch(() => undefined);
      
      const { text: transcript } = await transcribeAudio(blob);
      
      setStatus("Extracting AI Insights...");
      const insights = await generateSummary(transcript);
      
      addLecture({
        id,
        title,
        date: new Date().toISOString(),
        audioUrl,
        transcript,
        summary: insights.summary,
        keyConcepts: insights.keyConcepts,
        examQuestions: insights.potentialExamQuestions
      });

      navigate('/library');
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
      <h1 className="text-3xl font-bold mb-8">New Session</h1>
      
      <div className="w-full max-w-md bg-card p-6 rounded-2xl shadow-sm border mb-8 flex flex-col items-center">
        {isRecording && <Waveform isRecording={true} />}
        
        <p className="text-muted-foreground mt-4 mb-8 h-6 text-sm">{status}</p>
        
        {!isRecording && !isProcessing && (
          <button 
            onClick={startRecording}
            className="w-24 h-24 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-105 active:scale-95"
          >
            <Mic className="w-10 h-10" />
          </button>
        )}
        
        {isRecording && (
          <button 
            onClick={stopRecording}
            className="w-24 h-24 rounded-full bg-secondary text-secondary-foreground border-4 border-destructive flex items-center justify-center animate-pulse"
          >
            <Square className="w-8 h-8 fill-foreground" />
          </button>
        )}

        {isProcessing && (
          <Loader2 className="w-12 h-12 animate-spin text-primary mt-6" />
        )}
      </div>
    </div>
  );
}
