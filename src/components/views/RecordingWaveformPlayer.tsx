import React, { useMemo } from 'react';
import { Play, Pause, Mic, Radio } from 'lucide-react';
import { CdrRecord } from '../../types/pbx';

interface RecordingWaveformPlayerProps {
  cdr: CdrRecord;
  isPlaying: boolean;
  progress: number;
  onTogglePlay: (cdr: CdrRecord) => void;
}

export const RecordingWaveformPlayer: React.FC<RecordingWaveformPlayerProps> = ({
  cdr,
  isPlaying,
  progress,
  onTogglePlay,
}) => {
  // Generate random bars for a fake waveform based on the CDR ID so it stays consistent
  const bars = useMemo(() => {
    const arr = [];
    let seed = cdr.id.charCodeAt(0) + cdr.id.charCodeAt(cdr.id.length - 1);
    for (let i = 0; i < 60; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const val = seed / 233280;
      // create a shape that resembles speech (quieter at ends, louder in middle, with variance)
      const envelope = Math.sin((i / 60) * Math.PI); 
      const height = Math.max(10, Math.min(100, (val * 80 + 20) * envelope));
      arr.push(height);
    }
    return arr;
  }, [cdr.id]);

  const currentDurationSec = Math.round((progress / 100) * (cdr.duration || 10));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-full shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Mic className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200 leading-tight">Gravação de Chamada</h4>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1">
              <Radio className={`w-3 h-3 ${isPlaying ? 'animate-pulse text-emerald-500' : ''}`} />
              Opus Stereo / 24kHz
            </span>
          </div>
        </div>
        <div className="text-right font-mono text-xs text-slate-400 font-bold bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
          {Math.floor(currentDurationSec / 60)}:{(currentDurationSec % 60).toString().padStart(2, '0')} / {Math.floor((cdr.duration||10) / 60)}:{((cdr.duration||10) % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => onTogglePlay(cdr)}
          className="w-12 h-12 flex-shrink-0 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition shadow-lg shadow-blue-900/50"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-1" />
          )}
        </button>

        <div className="flex-1 h-12 flex items-center gap-[2px] cursor-pointer relative group">
          {/* Subtle background for the waveform area */}
          <div className="absolute inset-0 bg-slate-800/30 rounded-lg group-hover:bg-slate-800/50 transition pointer-events-none" />
          
          {bars.map((h, i) => {
            const barProgress = (i / bars.length) * 100;
            const isPlayed = progress > barProgress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ease-in-out ${
                  isPlayed ? 'bg-blue-500' : 'bg-slate-700'
                } ${isPlaying && !isPlayed && barProgress - progress < 5 ? 'bg-blue-400' : ''}`}
                style={{
                  height: `${h}%`,
                  minHeight: '4px',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
