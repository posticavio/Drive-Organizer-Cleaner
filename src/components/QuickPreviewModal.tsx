import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Eye,
  FileText,
  Download,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Copy,
  Maximize2,
  Calendar,
  HardDrive,
  Hash,
  Sparkles,
} from 'lucide-react';
import { DriveFile } from '../types/drive';
import { getFileIcon, formatFileSize, formatItalianDate } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface QuickPreviewModalProps {
  isOpen: boolean;
  file: DriveFile | null;
  filesList?: DriveFile[];
  accessToken?: string;
  onClose: () => void;
  onOpenFullInspector?: (file: DriveFile) => void;
  onQuickQuarantine?: (file: DriveFile) => void;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const QuickPreviewModal: React.FC<QuickPreviewModalProps> = ({
  isOpen,
  file,
  filesList = [],
  accessToken,
  onClose,
  onOpenFullInspector,
  onQuickQuarantine,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  // Keyboard navigation & Android Back gesture interception
  useEffect(() => {
    if (!isOpen || !file) return;

    // Push history state to intercept Android back button
    window.history.pushState({ modal: 'quick-preview' }, '');

    const handlePopState = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerHaptic('tick', hapticsEnabled);
        onClose();
      } else if (e.key === 'ArrowRight' && filesList.length > 1) {
        // Navigate to next file
        const currentIndex = filesList.findIndex((f) => f.id === file.id);
        if (currentIndex !== -1 && currentIndex < filesList.length - 1) {
          e.preventDefault();
          triggerHaptic('tick', hapticsEnabled);
          playSound('pop', soundsEnabled);
          const nextFile = filesList[currentIndex + 1];
          if (!nextFile.isFolder) {
            onOpenFullInspector?.(nextFile);
          }
        }
      } else if (e.key === 'ArrowLeft' && filesList.length > 1) {
        // Navigate to prev file
        const currentIndex = filesList.findIndex((f) => f.id === file.id);
        if (currentIndex > 0) {
          e.preventDefault();
          triggerHaptic('tick', hapticsEnabled);
          playSound('pop', soundsEnabled);
          const prevFile = filesList[currentIndex - 1];
          if (!prevFile.isFolder) {
            onOpenFullInspector?.(prevFile);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, file, filesList, hapticsEnabled, soundsEnabled, onClose, onOpenFullInspector]);

  // Load text file content if small text/code file
  useEffect(() => {
    if (!isOpen || !file || !accessToken) {
      setTextContent(null);
      setTextError(null);
      return;
    }

    const mime = (file.mimeType || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    const isTextFile =
      mime.startsWith('text/') ||
      mime.includes('json') ||
      mime.includes('javascript') ||
      mime.includes('xml') ||
      mime.includes('csv') ||
      name.match(/\.(txt|md|json|js|ts|tsx|jsx|html|css|csv|py|sql|sh|yml|yaml|log)$/i);

    const fileSize = Number(file.size) || 0;
    // Limit to under 1MB for fast inline rendering
    if (isTextFile && fileSize < 1024 * 1024 && !file.isFolder) {
      let isMounted = true;
      setIsLoadingText(true);
      setTextError(null);

      fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((text) => {
          if (isMounted) {
            setTextContent(text);
            setIsLoadingText(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setTextError('Impossibile caricare il contenuto testuale.');
            setIsLoadingText(false);
          }
        });

      return () => {
        isMounted = false;
      };
    } else {
      setTextContent(null);
      setIsLoadingText(false);
    }
  }, [isOpen, file, accessToken]);

  if (!isOpen || !file) return null;

  const mime = (file.mimeType || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  const isImage = mime.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i);
  const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
  const isAudio = mime.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a|aac)$/i);
  const isVideo = mime.startsWith('video/') || name.match(/\.(mp4|webm|mov|mkv)$/i);
  const isGoogleDoc = mime.startsWith('application/vnd.google-apps');

  // High-res preview URL for images from Drive
  const highResImage = file.thumbnailLink
    ? file.thumbnailLink.replace(/=s\d+/, '=s1400')
    : file.webViewLink;

  // Embedded preview for PDF or Google Workspace docs
  const embedPreviewUrl = `https://drive.google.com/file/d/${file.id}/preview`;

  return (
    <div
      onClick={() => {
        triggerHaptic('tick', hapticsEnabled);
        onClose();
      }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] rounded-3xl bg-[#1E2024] border border-[#2F3136] shadow-2xl flex flex-col overflow-hidden text-[#EAEBED]"
      >
        {/* Header (One UI 56px style) */}
        <div className="h-14 px-4 bg-[#222428] border-b border-[#2F3136] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
            <div className="w-8 h-8 rounded-xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/50 flex-shrink-0">
              {getFileIcon(file)}
            </div>

            <div className="min-w-0">
              <h2
                className="text-sm font-bold text-[#EAEBED] truncate leading-tight"
                title={file.name}
              >
                {file.name}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-[#9A9DA5] font-mono mt-0.5">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span className="truncate max-w-[140px]">
                  {file.mimeType.split('/').pop() || 'file'}
                </span>
                {file.duplicateInfo?.isDuplicate && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                      <Copy className="w-2.5 h-2.5" /> Duplicato
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action icons in header */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noreferrer"
                title="Apri in Google Drive (nuova scheda)"
                className="w-8 h-8 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-[#9A9DA5] hover:text-[#EAEBED] border border-[#3A3D45] flex items-center justify-center transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {onOpenFullInspector && (
              <button
                onClick={() => {
                  triggerHaptic('tick', hapticsEnabled);
                  onOpenFullInspector(file);
                  onClose();
                }}
                title="Apri nel pannello di ispezione completo"
                className="w-8 h-8 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-[#9A9DA5] hover:text-[#EAEBED] border border-[#3A3D45] flex items-center justify-center transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic('tick', hapticsEnabled);
                onClose();
              }}
              title="Chiudi anteprima (Esc)"
              className="w-8 h-8 rounded-xl bg-[#2A2C31] hover:bg-red-950/40 text-[#9A9DA5] hover:text-[#E31B23] border border-[#3A3D45] flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-y-auto bg-[#18191B] p-4 flex flex-col items-center justify-center min-h-[320px] max-h-[64vh]">
          {/* 1. Image Preview */}
          {isImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <img
                src={highResImage}
                alt={file.name}
                className="max-h-[56vh] max-w-full object-contain rounded-2xl border border-[#2F3136] shadow-lg"
                loading="lazy"
                onError={(e) => {
                  // Fallback to thumbnail link if high-res failed
                  (e.target as HTMLImageElement).src = file.thumbnailLink || '';
                }}
              />
            </div>
          ) : isPdf || isGoogleDoc ? (
            /* 2. PDF & Google Docs Interactive Preview Frame */
            <div className="w-full h-full min-h-[50vh] flex flex-col rounded-2xl overflow-hidden border border-[#2F3136]">
              <iframe
                src={embedPreviewUrl}
                title={file.name}
                className="w-full h-full flex-1 border-0 bg-white"
                allow="autoplay"
              />
            </div>
          ) : isVideo ? (
            /* 3. Video File */
            <div className="w-full h-full flex flex-col items-center justify-center">
              <iframe
                src={embedPreviewUrl}
                title={file.name}
                className="w-full h-[50vh] rounded-2xl border border-[#2F3136]"
                allow="autoplay"
              />
            </div>
          ) : isAudio ? (
            /* 4. Audio File */
            <div className="w-full max-w-md p-6 rounded-3xl bg-[#222428] border border-[#2F3136] text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-[#2A2C31] text-amber-400 flex items-center justify-center mb-4 border border-[#3A3D45]">
                {getFileIcon(file)}
              </div>
              <h4 className="text-sm font-bold text-[#EAEBED] truncate max-w-full mb-4">
                {file.name}
              </h4>
              <audio controls className="w-full">
                <source src={file.webContentLink || ''} />
                Il tuo browser non supporta la riproduzione audio diretta.
              </audio>
            </div>
          ) : textContent !== null ? (
            /* 5. Live Text / Code / CSV Viewer */
            <div className="w-full h-full min-h-[46vh] rounded-2xl bg-[#141517] border border-[#2F3136] p-4 overflow-auto font-mono text-xs text-[#EAEBED] leading-relaxed">
              <pre className="whitespace-pre-wrap break-words">{textContent}</pre>
            </div>
          ) : isLoadingText ? (
            /* Loading spinner for text */
            <div className="py-16 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#E31B23] border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs text-[#9A9DA5]">Caricamento contenuto del file...</p>
            </div>
          ) : (
            /* 6. Standard / Unsupported Binary Metadata View */
            <div className="w-full max-w-md p-6 rounded-3xl bg-[#222428] border border-[#2F3136] text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-[#2A2C31] text-[#9A9DA5] flex items-center justify-center mb-3 border border-[#3A3D45]/70 shadow-inner">
                {getFileIcon(file)}
              </div>

              <h4 className="text-sm font-bold text-[#EAEBED] break-all leading-snug mb-1">
                {file.name}
              </h4>
              <p className="text-xs text-[#9A9DA5] mb-4">
                Anteprima diretta non disponibile per questo formato di file.
              </p>

              {/* File Specs Grid */}
              <div className="w-full grid grid-cols-2 gap-2 text-left text-xs mb-5">
                <div className="p-2.5 rounded-xl bg-[#2A2C31]/70 border border-[#3A3D45]/40">
                  <div className="text-[10px] text-[#9A9DA5] flex items-center gap-1">
                    <HardDrive className="w-3 h-3" /> Dimensione
                  </div>
                  <div className="font-bold text-[#EAEBED] font-mono mt-0.5">
                    {formatFileSize(file.size)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#2A2C31]/70 border border-[#3A3D45]/40">
                  <div className="text-[10px] text-[#9A9DA5] flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Modificato
                  </div>
                  <div className="font-semibold text-[#EAEBED] mt-0.5 truncate">
                    {formatItalianDate(file.modifiedTime)}
                  </div>
                </div>

                {file.md5Checksum && (
                  <div className="col-span-2 p-2 rounded-xl bg-[#2A2C31]/40 border border-[#3A3D45]/30">
                    <div className="text-[10px] text-[#9A9DA5] flex items-center gap-1">
                      <Hash className="w-3 h-3" /> MD5 Checksum
                    </div>
                    <div className="font-mono text-[10px] text-[#9A9DA5] truncate mt-0.5">
                      {file.md5Checksum}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Open Button */}
              {file.webViewLink && (
                <a
                  href={file.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Apri file in Google Drive</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer (Quick Actions & Hints) */}
        <div className="h-14 px-4 bg-[#222428] border-t border-[#2F3136] flex items-center justify-between flex-shrink-0 text-xs text-[#9A9DA5]">
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            <span>
              Premi <kbd className="px-1.5 py-0.5 rounded bg-[#18191B] border border-[#2F3136] text-[#EAEBED] font-mono font-bold">Esc</kbd> per chiudere
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {onQuickQuarantine && !file.isFolder && (
              <button
                onClick={() => {
                  triggerHaptic('doublePulse', hapticsEnabled);
                  playSound('pop', soundsEnabled);
                  onQuickQuarantine(file);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-[#E31B23] text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-all"
                title="Sposta in Quarantena"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Quarantena</span>
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic('tick', hapticsEnabled);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-[#EAEBED] border border-[#3A3D45] text-xs font-bold transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
