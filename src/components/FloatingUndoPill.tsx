import React, { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface FloatingUndoPillProps {
  message: string;
  durationMs?: number; // default 4500ms
  onUndo: () => void;
  onDismiss: () => void;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const FloatingUndoPill: React.FC<FloatingUndoPillProps> = ({
  message,
  durationMs = 4500,
  onUndo,
  onDismiss,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (elapsed >= durationMs) {
        clearInterval(interval);
        onDismiss();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [durationMs, onDismiss]);

  const handleUndo = () => {
    triggerHaptic('snap', hapticsEnabled);
    playSound('pop', soundsEnabled);
    onUndo();
  };

  // Circular progress calculation (radius 9, circumference ~ 56.5)
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] animate-bounce-in">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#222428]/95 backdrop-blur-md border border-[#3A3D45] shadow-2xl shadow-black/60 text-[#EAEBED]">
        {/* Circular Countdown Progress */}
        <div className="relative w-5 h-5 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 -rotate-90">
            <circle
              cx="10"
              cy="10"
              r={radius}
              stroke="#2F3136"
              strokeWidth="2.5"
              fill="transparent"
            />
            <circle
              cx="10"
              cy="10"
              r={radius}
              stroke="#E31B23"
              strokeWidth="2.5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>
        </div>

        {/* Message */}
        <span className="text-xs font-semibold truncate max-w-[200px] sm:max-w-xs">
          {message}
        </span>

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E31B23] hover:bg-red-600 active:scale-95 text-white text-xs font-bold shadow-sm transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          Annulla
        </button>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="text-[#9A9DA5] hover:text-[#EAEBED] transition-colors p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
