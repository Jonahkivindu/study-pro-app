import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformProps {
  audioUrl?: string;
  stream?: MediaStream;
  isRecording?: boolean;
}

export function Waveform({ audioUrl, stream, isRecording }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#ff4d4d',
      progressColor: '#b30000',
      barWidth: 3,
      barRadius: 3,
      height: 80,
      cursorWidth: 0,
    });

    if (audioUrl) {
      wavesurferRef.current.load(audioUrl);
    }

    return () => {
      wavesurferRef.current?.destroy();
    };
  }, [audioUrl]);

  // Handle active recording visualization (simplified mock for now)
  useEffect(() => {
    if (!wavesurferRef.current || !isRecording) return;
    
    // WebAudio API integration would go here for live waveform.
    // For now, wavesurfer is mainly used for playback.
  }, [isRecording, stream]);

  return <div ref={containerRef} className="w-full" />;
}
