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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col pb-24 md:pb-0">
      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Record Your Lecture
          </h1>
          <p className="text-lg text-gray-600">
            Capture your thoughts, let AI transform them
          </p>
        </div>

        {/* Lecture Title Input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Lecture Title
          </label>
          <input
            type="text"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="e.g., Physics - Quantum Mechanics 101"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        {/* Waveform Display */}
        {(isRecording || audioBlob) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <Waveform
              isRecording={isRecording}
              audioContext={audioContextRef.current || undefined}
              analyser={analyserRef.current || undefined}
            />
          </div>
        )}

        {/* Recording Controls */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
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
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? "Saving..." : "Save Lecture"}
            </button>
          </div>
        )}

        {/* Post-Save Actions */}
        {currentLectureId && (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Lecture Actions</h3>
              <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">
                Saved
              </span>
            </div>

            {/* Status Display */}
            {status && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-sm">
                {status}
              </div>
            )}

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleTranscribe}
                disabled={loading || !!transcript}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition flex flex-col items-center justify-center gap-1 text-sm"
              >
                {loading && !transcript ? <Loader className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                {transcript ? "✓ Transcribed" : "Transcribe"}
              </button>

              <button
                onClick={handleSummarize}
                disabled={loading || !transcript || !!summary}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition flex flex-col items-center justify-center gap-1 text-sm"
              >
                {loading && !summary ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {summary ? "✓ Summarized" : "Summarize"}
              </button>

              <button
                onClick={handleOpenChat}
                disabled={!transcript}
                className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition flex flex-col items-center justify-center gap-1 text-sm disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-4 h-4" />
                {!transcript ? "Chat (Soon)" : "Chat"}
              </button>

              <button
                onClick={handleOpenReport}
                disabled={!summary}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition flex flex-col items-center justify-center gap-1 text-sm disabled:cursor-not-allowed"
              >
                <DownloadCloud className="w-4 h-4" />
                {!summary ? "Report (Soon)" : "Report"}
              </button>
            </div>

            {/* Transcript Display */}
            {transcript && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Transcript</h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-32 overflow-y-auto text-sm text-gray-700">
                  {transcript.substring(0, 300)}...
                </div>
              </div>
            )}

            {/* Summary Display */}
            {summary && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-32 overflow-y-auto text-sm text-gray-700">
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
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg transition text-sm"
            >
              New Lecture
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isRecording && !audioBlob && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">
              Start recording a new lecture or upload an existing one
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
