import React, { useEffect, useRef } from 'react';
import {
  Edit3,
  ShieldAlert,
  FolderInput,
  Copy,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { DriveFile } from '../types/drive';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface ContextMenuProps {
  x: number;
  y: number;
  file: DriveFile;
  isOpen: boolean;
  onClose: () => void;
  onRename: (file: DriveFile) => void;
  onMove: (file: DriveFile) => void;
  onQuarantine: (file: DriveFile) => void;
  onRestore?: (file: DriveFile) => void;
  isQuarantinedView?: boolean;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  file,
  isOpen,
  onClose,
  onRename,
  onMove,
  onQuarantine,
  onRestore,
  isQuarantinedView = false,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Keep menu within viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  const handleCopyId = () => {
    triggerHaptic('tick', hapticsEnabled);
    playSound('pop', soundsEnabled);
    navigator.clipboard.writeText(file.id);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-56 bg-[#222428] border border-[#2F3136] rounded-2xl shadow-2xl py-1.5 animate-fadeIn select-none overflow-hidden"
    >
      <div className="px-3 py-1.5 border-b border-[#2F3136] mb-1">
        <div className="text-[11px] font-bold text-[#EAEBED] truncate">
          {file.name}
        </div>
        <div className="text-[10px] text-[#9A9DA5]">Azioni veloci One UI</div>
      </div>

      <button
        onClick={() => {
          triggerHaptic('tick', hapticsEnabled);
          onRename(file);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#EAEBED] hover:bg-[#2A2C31] transition-colors text-left"
      >
        <Edit3 className="w-4 h-4 text-[#E31B23]" />
        Rinomina con Regole
      </button>

      <button
        onClick={() => {
          triggerHaptic('tick', hapticsEnabled);
          onMove(file);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#EAEBED] hover:bg-[#2A2C31] transition-colors text-left"
      >
        <FolderInput className="w-4 h-4 text-amber-400" />
        Sposta in altra cartella
      </button>

      <button
        onClick={handleCopyId}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#9A9DA5] hover:text-[#EAEBED] hover:bg-[#2A2C31] transition-colors text-left"
      >
        <Copy className="w-4 h-4" />
        Copia ID file Google
      </button>

      {file.webViewLink && (
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#9A9DA5] hover:text-[#EAEBED] hover:bg-[#2A2C31] transition-colors text-left"
        >
          <ExternalLink className="w-4 h-4" />
          Apri su Google Drive
        </a>
      )}

      <div className="h-[1px] bg-[#2F3136] my-1" />

      {isQuarantinedView ? (
        <button
          onClick={() => {
            triggerHaptic('doublePulse', hapticsEnabled);
            if (onRestore) onRestore(file);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-950/40 transition-colors text-left"
        >
          <RotateCcw className="w-4 h-4" />
          Ripristina File
        </button>
      ) : (
        <button
          onClick={() => {
            triggerHaptic('doublePulse', hapticsEnabled);
            onQuarantine(file);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#E31B23] hover:bg-red-950/40 transition-colors text-left"
        >
          <ShieldAlert className="w-4 h-4" />
          Sposta in Quarantena
        </button>
      )}
    </div>
  );
};
