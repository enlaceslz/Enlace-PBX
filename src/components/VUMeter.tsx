import React, { useEffect, useRef, useState } from 'react';

interface VUMeterProps {
  isActive: boolean;
  color?: string; // Tailwind color class prefix like 'rose', 'sky', 'emerald'
}

export const VUMeter: React.FC<VUMeterProps> = ({ isActive, color = 'emerald' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const reqRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isActive) {
      setError(false);
      // Request microphone
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;

          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);
          sourceRef.current = source;

          draw();
        })
        .catch((err) => {
          console.warn('Microphone access denied or error:', err);
          setError(true);
        });
    } else {
      cleanup();
      // Draw flat line when inactive
      drawFlat();
    }

    return () => {
      cleanup();
    };
  }, [isActive]);

  const cleanup = () => {
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    if (sourceRef.current) sourceRef.current.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const drawFlat = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isActive ? 'rgb(200, 200, 200)' : 'rgb(226, 232, 240)'; // slate-200
    
    const barWidth = (canvas.width / 16) - 1;
    for (let i = 0; i < 16; i++) {
      const height = 4;
      ctx.fillRect(i * (barWidth + 1), (canvas.height - height) / 2, barWidth, height);
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      reqRef.current = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Determine colors based on prop
      let fillStyle = 'rgb(16, 185, 129)'; // emerald-500
      if (color === 'rose') fillStyle = 'rgb(244, 63, 94)'; // rose-500
      if (color === 'sky') fillStyle = 'rgb(14, 165, 233)'; // sky-500
      if (color === 'blue') fillStyle = 'rgb(59, 130, 246)'; // blue-500
      if (color === 'amber') fillStyle = 'rgb(245, 158, 11)'; // amber-500

      ctx.fillStyle = fillStyle;

      const barCount = 16;
      const step = Math.floor(bufferLength / barCount);
      const barWidth = (canvas.width / barCount) - 1;

      for (let i = 0; i < barCount; i++) {
        // Average the frequencies in this step
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j];
        }
        const avg = sum / step;
        
        // Map 0-255 to 4-canvasHeight
        let height = (avg / 255) * canvas.height;
        if (height < 4) height = 4;

        ctx.fillRect(i * (barWidth + 1), (canvas.height - height) / 2, barWidth, height);
      }
    };

    renderFrame();
  };

  return (
    <div className="flex flex-col items-center">
      <canvas 
        ref={canvasRef} 
        width={100} 
        height={32} 
        className="block"
      />
      {error && (
        <span className="text-[9px] text-rose-500 mt-1 font-medium">Mic indisponível</span>
      )}
    </div>
  );
};
