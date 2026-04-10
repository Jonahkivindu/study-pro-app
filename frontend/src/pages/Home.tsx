import { useState, useRef, useEffect } from "react";
import { Upload, Save, Mic, FileText, MessageSquare, DownloadCloud, Loader } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { RecordingInterface } from "../components/RecordingInterface";
import { Waveform } from "../components/Waveform";
import { ChatPanel } from "../components/ChatPanel";
import { ReportPanel } from "../components/ReportPanel";
import { apiClient } from "../services/api";

export function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lectureTitle, setLectureTitle] = useState("");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // State for managing lecture after saving
  const [currentLectureId, setCurrentLectureId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showReportPanel, setShowReportPanel] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number>();

  // Initialize audio context on first user interaction
  const initAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  };

  const handleRecord = async () => {
    try {
      await initAudioContext();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Setup audio analysis
      const audioContext = audioContextRef.current!;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Unable to access microphone. Please check permissions.");
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsRecording(false);
  };

  const handlePlay = () => {
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);

    audio.play();
  };

  const handleSave = async () => {
    if (!lectureTitle.trim()) {
      alert("Please enter a lecture title");
      return;
    }

    if (!audioBlob) {
      alert("No recording to save");
      return;
    }

    try {
      setLoading(true);
      setStatus("Creating lecture...");

      // Step 1: Create lecture entry
      const lectureRes = await apiClient.createLecture(lectureTitle);
      if (!lectureRes.success) {
        throw new Error(lectureRes.error || "Failed to create lecture");
      }

      const lectureId = lectureRes.lecture_id.toString();
      setCurrentLectureId(lectureId);
      
      // Step 2: Upload audio
      setStatus("Uploading audio...");
      const uploadRes = await apiClient.uploadAudio(lectureId, audioBlob);
      if (!uploadRes.success) {
        throw new Error(uploadRes.error || "Failed to upload audio");
      }

      setStatus("✅ Lecture saved! Ready for transcription.");
      setLectureTitle("");
      setDuration(0);
      setAudioBlob(null);
    } catch (error) {
      console.error("Error saving lecture:", error);
      setStatus(`❌ ${error instanceof Error ? error.message : "Failed to save"}`);
      alert(`Error: ${error instanceof Error ? error.message : "Failed to save"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!currentLectureId) {
      alert("Please save a lecture first");
      return;
    }

    try {
      setLoading(true);
      setStatus("🎤 Transcribing audio...");

      const result = await apiClient.transcribeLecture(currentLectureId);
      if (!result.success) {
        throw new Error(result.error || "Transcription failed");
      }

      setTranscript(result.transcript || "");
      setStatus("✅ Transcription complete!");
    } catch (error) {
      console.error("Error transcribing:", error);
      setStatus(`❌ Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!currentLectureId) {
      alert("Please save a lecture first");
      return;
    }

    if (!transcript) {
      alert("Please transcribe the lecture first");
      return;
    }

    try {
      setLoading(true);
      setStatus("📝 Generating summary...");

      const result = await apiClient.summarizeLecture(currentLectureId);
      if (!result.success) {
        throw new Error(result.error || "Summarization failed");
      }

      setSummary(result.summary || "");
      setStatus("✅ Summary generated!");
    } catch (error) {
      console.error("Error summarizing:", error);
      setStatus(`❌ Summarization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = () => {
    if (!transcript) {
      alert("Please transcribe the lecture first");
      return;
    }
    setShowChatPanel(true);
  };

  const handleOpenReport = () => {
    if (!summary) {
      alert("Please generate a summary first");
      return;
    }
    setShowReportPanel(true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col pb-24 md:pb-0 text-gray-900 tracking-tight">
      {/* Decorative background glow mimicking subtle WebGL blooms */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-100 blur-3xl rounded-full opacity-50 -z-10 pointer-events-none"></div>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12 z-10">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 tracking-tighter">
            Record Your Lecture
          </h1>
          <p className="text-xl font-medium text-gray-500 tracking-tight">
            Capture your thoughts, let AI transform them.
          </p>
        </div>

        {/* Lecture Title Input */}
        <div className="glass-card rounded-3xl p-8 mb-8">
          <label className="block text-sm font-bold tracking-wide uppercase text-gray-400 mb-3 ml-1">
            Lecture Title
          </label>
          <input
            type="text"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="e.g., Physics - Quantum Mechanics 101"
            className="w-full px-6 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white text-gray-900 transition-all font-medium"
          />
        </div>

        {/* Waveform Display */}
        {(isRecording || audioBlob) && (
          <div className="glass-card rounded-3xl p-8 mb-8 premium-shadow">
            <Waveform
              isRecording={isRecording}
              audioContext={audioContextRef.current || undefined}
              analyser={analyserRef.current || undefined}
            />
          </div>
        )}

        {/* Recording Controls */}
        <div className="glass-card rounded-3xl p-10 mb-8 premium-shadow">
          <RecordingInterface
            isRecording={isRecording}
            onRecord={handleRecord}
            onStop={handleStop}
            onPlay={handlePlay}
            onPause={() => setIsPlaying(false)}
            isPlaying={isPlaying}
            duration={duration}
          />
        </div>

        {/* Action Buttons */}
        {audioBlob && !currentLectureId && (
          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary w-full py-4 text-lg"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? "Saving..." : "Save Lecture"}
            </button>
          </div>
        )}

        {/* Post-Save Actions */}
        {currentLectureId && (
          <div className="glass-card rounded-3xl p-8 space-y-6 premium-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Lecture Actions</h3>
              <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">
                Saved
              </span>
            </div>

            {/* Status Display */}
            {status && (
              <div className="bg-gray-50 border border-gray-200 text-gray-700 font-medium tracking-tight p-4 rounded-2xl text-sm">
                {status}
              </div>
            )}

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleTranscribe}
                disabled={loading || !!transcript}
                className="btn-secondary flex-col py-6 h-auto disabled:bg-gray-50"
              >
                {loading && !transcript ? <Loader className="w-5 h-5 animate-spin mb-1" /> : <Mic className="w-5 h-5 mb-1" />}
                <span className="text-xs uppercase tracking-wider">{transcript ? "Transcribed" : "Transcribe"}</span>
              </button>

              <button
                onClick={handleSummarize}
                disabled={loading || !transcript || !!summary}
                className="btn-secondary flex-col py-6 h-auto disabled:bg-gray-50"
              >
                {loading && !summary ? <Loader className="w-5 h-5 animate-spin mb-1" /> : <FileText className="w-5 h-5 mb-1" />}
                <span className="text-xs uppercase tracking-wider">{summary ? "Summarized" : "Summarize"}</span>
              </button>

              <button
                onClick={handleOpenChat}
                disabled={!transcript}
                className="btn-secondary flex-col py-6 h-auto disabled:bg-gray-50"
              >
                <MessageSquare className="w-5 h-5 mb-1" />
                <span className="text-xs uppercase tracking-wider">{transcript ? "Open Chat" : "Chat Requires Transcript"}</span>
              </button>

              <button
                onClick={handleOpenReport}
                disabled={!summary}
                className="btn-secondary flex-col py-6 h-auto disabled:bg-gray-50"
              >
                <DownloadCloud className="w-5 h-5 mb-1" />
                <span className="text-xs uppercase tracking-wider">{summary ? "View Report" : "Report Requires Summary"}</span>
              </button>
            </div>

            {/* Transcript Display */}
            {transcript && (
              <div className="border-t border-gray-100 pt-6 mt-6">
                <h4 className="font-bold tracking-tight text-gray-900 mb-3">Transcript</h4>
                <div className="bg-gray-50/50 border border-gray-100 p-5 rounded-2xl max-h-40 overflow-y-auto text-sm text-gray-700 leading-relaxed font-medium">
                  {transcript.substring(0, 300)}...
                </div>
              </div>
            )}

            {/* Summary Display */}
            {summary && (
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold tracking-tight text-gray-900 mb-3">Summary</h4>
                <div className="bg-gray-50/50 border border-gray-100 p-5 rounded-2xl max-h-40 overflow-y-auto text-sm text-gray-700 leading-relaxed font-medium">
                  {summary.substring(0, 300)}...
                </div>
              </div>
            )}

            {/* Reset Button */}
            <button
              onClick={() => {
                setCurrentLectureId(null);
                setStatus("");
                setTranscript("");
                setSummary("");
              }}
              className="w-full mt-4 bg-transparent border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-3 rounded-full transition text-sm flex justify-center items-center gap-2"
            >
              New Lecture
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isRecording && !audioBlob && (
          <div className="glass-card rounded-3xl p-12 text-center mt-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium tracking-tight">
              Ready to start. Tap the record button above.
            </p>
          </div>
        )}
      </main>

      {/* Chat Panel Modal */}
      {showChatPanel && (
        <ChatPanel
          lectureTitle={lectureTitle}
          transcript={transcript}
          onClose={() => setShowChatPanel(false)}
        />
      )}

      {/* Report Panel Modal */}
      {showReportPanel && (
        <ReportPanel
          lectureTitle={lectureTitle}
          summary={summary}
          transcript={transcript}
          onClose={() => setShowReportPanel(false)}
        />
      )}
    </div>
  );
}
