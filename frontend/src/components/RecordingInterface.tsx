import { Mic, Square, Play, Pause } from "lucide-react";
import { useState, useEffect } from "react";

interface RecordingInterfaceProps {
  isRecording?: boolean;
  onRecord?: () => void;
  onStop?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  isPlaying?: boolean;
  duration?: number;
}

export function RecordingInterface({
  isRecording = false,
  onRecord,
  onStop,
  onPlay,
  onPause,
  isPlaying = false,
  duration = 0,
}: RecordingInterfaceProps) {
  const [displayTime, setDisplayTime] = useState("00:00:00");

  useEffect(() => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    setDisplayTime(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`
    );
  }, [duration]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Timer Display */}
      <div className="text-center">
        <div className="text-6xl tracking-tighter font-medium text-gray-900 mb-3">
          {displayTime}
        </div>
        <p className="text-sm font-medium tracking-wide uppercase text-gray-500">
          {isRecording ? "Recording..." : isPlaying ? "Playing..." : "Ready"}
        </p>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-6 mt-4">
        {/* Record Button */}
        {!isRecording ? (
          <button
            onClick={onRecord}
            className="flex items-center justify-center w-20 h-20 bg-gray-900 text-white rounded-full transition-all duration-500 transform hover:scale-105 hover:bg-black hover:shadow-xl active:scale-95"
          >
            <Mic className="w-8 h-8" />
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex items-center justify-center w-20 h-20 bg-white border border-gray-200 text-gray-900 rounded-full transition-all duration-500 transform hover:scale-105 hover:shadow-xl active:scale-95 relative overflow-hidden"
          >
            <span className="absolute inset-x-0 bottom-0 top-0 bg-red-50/50 animate-pulse"></span>
            <Square className="w-8 h-8 fill-gray-900 text-gray-900 relative z-10" />
          </button>
        )}

        {/* Play/Pause Button */}
        {!isRecording && (
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={!duration}
            className={`flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500 transform hover:scale-105 active:scale-95 ${
              duration
                ? "bg-white border border-gray-200 text-gray-900 hover:shadow-xl hover:border-gray-300"
                : "bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-gray-900 text-gray-900" />
            ) : (
              <Play className="w-8 h-8 ml-1 fill-current text-current" />
            )}
          </button>
        )}
      </div>

      {/* Status Indicator */}
      {isRecording && (
        <div className="flex items-center gap-3 mt-4">
          <div className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <span className="text-sm font-medium tracking-wide text-gray-600">Active</span>
        </div>
      )}
    </div>
  );
}
