import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  File,
  Check,
  ShieldAlert,
  Edit2,
  ExternalLink,
  RotateCcw,
  FolderInput,
  FolderOpen,
  ChevronRight,
  Info,
  RefreshCw,
  Copy,
  Eye,
} from 'lucide-react';
import { DriveFile, FolderStats } from '../types/drive';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';
import { HighlightedText } from './HighlightedText';

interface FileItemCardProps {
  file: DriveFile;
  isSelected: boolean;
  isInspected: boolean;
  onToggleSelect: (fileId: string) => void;
  onClick: (file: DriveFile) => void;
  onDoubleClickFolder?: (folder: DriveFile) => void;
  onOpenFolder?: (folder: DriveFile) => void;
  onContextMenu: (e: React.MouseEvent, file: DriveFile) => void;
  onQuickRename: (file: DriveFile, newName: string) => void;
  onQuickQuarantine: (file: DriveFile) => void;
  onQuickRestore?: (file: DriveFile) => void;
  onMoveSelectedHere?: (folder: DriveFile) => void;
  onCalculateFolderSize?: (folder: DriveFile) => void;
  onQuickPreview?: (file: DriveFile) => void;
  folderStats?: FolderStats;
  selectedCount?: number;
  isQuarantinedView?: boolean;
  density: 'comfort' | 'compact';
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  searchQuery?: string;
}

export const getFileIcon = (file: DriveFile) => {
  if (file.isFolder) {
    return <Folder className="w-5 h-5 text-amber-400" strokeWidth={1.75} />;
  }

  const mime = (file.mimeType || '').toLowerCase();
  const name = file.name.toLowerCase();

  if (mime.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-400" strokeWidth={1.75} />;
  }
  if (mime.includes('image') || name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
    return <FileImage className="w-5 h-5 text-purple-400" strokeWidth={1.75} />;
  }
  if (mime.includes('video') || name.match(/\.(mp4|mov|avi|mkv)$/)) {
    return <FileVideo className="w-5 h-5 text-rose-400" strokeWidth={1.75} />;
  }
  if (mime.includes('audio') || name.match(/\.(mp3|wav|ogg|flac)$/)) {
    return <FileAudio className="w-5 h-5 text-yellow-400" strokeWidth={1.75} />;
  }
  if (mime.includes('zip') || mime.includes('compressed') || name.match(/\.(zip|tar|gz|rar|7z)$/)) {
    return <FileArchive className="w-5 h-5 text-orange-400" strokeWidth={1.75} />;
  }
  if (mime.includes('javascript') || mime.includes('json') || name.match(/\.(ts|js|json|html|css|py)$/)) {
    return <FileCode className="w-5 h-5 text-cyan-400" strokeWidth={1.75} />;
  }
  if (mime.includes('pdf') || mime.includes('document') || name.match(/\.(pdf|doc|docx|txt)$/)) {
    return <FileText className="w-5 h-5 text-red-400" strokeWidth={1.75} />;
  }

  return <File className="w-5 h-5 text-[#9A9DA5]" strokeWidth={1.75} />;
};

export const formatFileSize = (
  bytesInput?: string | number,
  fallbackIfZero: string = '0 B'
): string => {
  if (bytesInput === undefined || bytesInput === null || bytesInput === '') return '—';
  const bytes = Number(bytesInput);
  if (isNaN(bytes)) return '—';
  if (bytes === 0) return fallbackIfZero;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1).replace('.', ',');
    return `${kb} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    const mb = (bytes / (1024 * 1024)).toFixed(1).replace('.', ',');
    return `${mb} MB`;
  }
  const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',');
  return `${gb} GB`;
};

export const formatExactBytes = (bytesInput?: string | number): string => {
  if (bytesInput === undefined || bytesInput === null || bytesInput === '') return '0 byte';
  const bytes = Number(bytesInput);
  if (isNaN(bytes)) return '0 byte';
  return `${new Intl.NumberFormat('it-IT').format(bytes)} byte`;
};

export const getFileOrFolderSizeLabel = (
  file: DriveFile,
  folderStats?: FolderStats
): {
  label: string;
  sublabel?: string;
  isCalculating?: boolean;
  isCloudDoc?: boolean;
  rawBytes: number;
} => {
  if (file.isFolder) {
    const stats = folderStats || file.folderStats;
    if (stats?.loading) {
      return { label: 'Calcolo...', isCalculating: true, rawBytes: 0 };
    }
    if (stats) {
      const itemsText = `${stats.itemCount} ${stats.itemCount === 1 ? 'elem.' : 'elem.'}`;
      if (stats.totalBytes > 0) {
        return {
          label: formatFileSize(stats.totalBytes),
          sublabel: itemsText,
          rawBytes: stats.totalBytes,
        };
      }
      return {
        label: itemsText,
        sublabel: '0 B',
        rawBytes: 0,
      };
    }
    return {
      label: 'Cartella',
      sublabel: 'Calcola dim.',
      rawBytes: 0,
    };
  }

  // Google Workspace Cloud formats
  const mime = (file.mimeType || '').toLowerCase();
  if (mime.startsWith('application/vnd.google-apps.')) {
    const quotaBytes = Number(file.quotaBytesUsed) || 0;
    if (quotaBytes > 0) {
      return { label: formatFileSize(quotaBytes), rawBytes: quotaBytes };
    }
    if (mime.includes('document')) return { label: 'Google Doc', isCloudDoc: true, rawBytes: 0 };
    if (mime.includes('spreadsheet')) return { label: 'Google Foglio', isCloudDoc: true, rawBytes: 0 };
    if (mime.includes('presentation')) return { label: 'Google Slide', isCloudDoc: true, rawBytes: 0 };
    if (mime.includes('form')) return { label: 'Google Modulo', isCloudDoc: true, rawBytes: 0 };
    return { label: 'Doc Cloud', isCloudDoc: true, rawBytes: 0 };
  }

  const raw = Number(file.size) || Number(file.quotaBytesUsed) || 0;
  return {
    label: formatFileSize(raw),
    rawBytes: raw,
  };
};

export const formatItalianDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const FileItemCard: React.FC<FileItemCardProps> = ({
  file,
  isSelected,
  isInspected,
  onToggleSelect,
  onClick,
  onDoubleClickFolder,
  onOpenFolder,
  onContextMenu,
  onQuickRename,
  onQuickQuarantine,
  onQuickRestore,
  onMoveSelectedHere,
  onCalculateFolderSize,
  onQuickPreview,
  folderStats,
  selectedCount = 0,
  isQuarantinedView = false,
  density,
  hapticsEnabled,
  soundsEnabled,
  searchQuery = '',
}) => {
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [tempName, setTempName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Double click / tap tracking
  const lastTapRef = useRef<number>(0);

  // Swipe handling on mobile
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  useEffect(() => {
    setTempName(file.name);
  }, [file.name]);

  useEffect(() => {
    if (isEditingInline && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingInline]);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('snap', hapticsEnabled);
    playSound('toggle', soundsEnabled);
    onToggleSelect(file.id);
  };

  const executeOpenFolder = () => {
    triggerHaptic('snap', hapticsEnabled);
    playSound('pop', soundsEnabled);
    if (onOpenFolder) {
      onOpenFolder(file);
    } else if (onDoubleClickFolder) {
      onDoubleClickFolder(file);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If it's a folder: clicking it directly navigates into the subfolder!
    if (file.isFolder) {
      executeOpenFolder();
      return;
    }

    // Double tap on file enables inline rename!
    const now = Date.now();
    const isDouble = now - lastTapRef.current < 350;
    lastTapRef.current = now;

    if (isDouble) {
      triggerHaptic('tick', hapticsEnabled);
      setIsEditingInline(true);
      return;
    }

    triggerHaptic('tick', hapticsEnabled);
    onClick(file);
  };

  const handleSaveRename = () => {
    const trimmed = tempName.trim();
    if (trimmed && trimmed !== file.name) {
      triggerHaptic('success', hapticsEnabled);
      playSound('pop', soundsEnabled);
      onQuickRename(file, trimmed);
    }
    setIsEditingInline(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setTempName(file.name);
      setIsEditingInline(false);
    }
  };

  // Touch gesture swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Allow dragging left (to quarantine/action)
    if (diff < 0 && diff > -140) {
      setSwipeOffset(diff);
    } else if (diff > 0 && diff < 80) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;

    // Threshold check (approx 40% of standard swipe gesture)
    if (swipeOffset < -80) {
      triggerHaptic('doublePulse', hapticsEnabled);
      if (isQuarantinedView && onQuickRestore) {
        onQuickRestore(file);
      } else {
        onQuickQuarantine(file);
      }
    }
    setSwipeOffset(0);
  };

  const isCompact = density === 'compact';
  const sizeInfo = getFileOrFolderSizeLabel(file, folderStats);

  return (
    <div
      className="relative overflow-hidden group select-none transition-colors"
      onContextMenu={(e) => onContextMenu(e, file)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background action reveal behind swipe */}
      <div
        className={`absolute inset-0 flex items-center justify-between px-6 transition-colors ${
          swipeOffset < -50
            ? isQuarantinedView
              ? 'bg-emerald-950/80 text-emerald-400'
              : 'bg-red-950/80 text-[#E31B23]'
            : 'bg-transparent text-transparent'
        }`}
      >
        <div />
        <div className="flex items-center gap-2 font-bold text-xs">
          {isQuarantinedView ? (
            <>
              <RotateCcw className="w-5 h-5 animate-pulse" /> Ripristina
            </>
          ) : (
            <>
              <ShieldAlert className="w-5 h-5 animate-pulse" /> Quarantena
            </>
          )}
        </div>
      </div>

      {/* Main Interactive Card */}
      <div
        onClick={handleCardClick}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className={`relative z-10 flex items-center justify-between px-3 md:px-4 transition-transform duration-100 ease-out cursor-pointer ${
          isCompact ? 'py-1.5 min-h-[44px]' : 'py-2.5 min-h-[64px]'
        } ${
          isSelected
            ? 'bg-[#E31B23]/15 border-l-4 border-l-[#E31B23] text-[#EAEBED]'
            : isInspected
            ? 'bg-[#2A2C31] border-l-2 border-l-[#9A9DA5]'
            : 'hover:bg-[#2A2C31]/70'
        }`}
      >
        {/* Left Section: Checkbox, Icon & Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
          {/* Circular Animated Checkbox (Samsung Reminder Micro-burst) */}
          <button
            onClick={handleCheckboxClick}
            title={isSelected ? 'Deseleziona' : 'Seleziona'}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              isSelected
                ? 'bg-[#E31B23] border-[#E31B23] text-white scale-105 shadow-md shadow-red-950/50'
                : 'border-[#3F4248] hover:border-[#E31B23] bg-transparent'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
          </button>

          {/* Micro-squircle icon container */}
          <div
            onClick={(e) => {
              if (file.isFolder) {
                e.stopPropagation();
                executeOpenFolder();
              }
            }}
            className={`w-10 h-10 rounded-2xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/60 flex-shrink-0 transition-transform ${
              isSelected ? 'scale-105' : 'group-hover:scale-102'
            } ${file.isFolder ? 'hover:border-amber-400/60' : ''}`}
          >
            {getFileIcon(file)}
          </div>

          {/* Title & Metadata */}
          <div className="min-w-0 flex-1">
            {isEditingInline ? (
              <input
                ref={inputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[#18191B] text-[#EAEBED] px-2 py-1 rounded-lg border border-[#E31B23] text-base md:text-sm font-semibold outline-none shadow-inner"
              />
            ) : (
              <div className="truncate">
                <div
                  className={`text-xs md:text-sm font-semibold truncate flex items-center gap-2 ${
                    isSelected ? 'text-[#EAEBED]' : 'text-[#EAEBED]'
                  }`}
                  title={file.name}
                >
                  <HighlightedText text={file.name} query={searchQuery} className="truncate" />

                  {file.duplicateInfo?.isDuplicate && (
                    <span
                      title={`Duplicato di: ${file.duplicateInfo.matchedWithName || 'originale'} (${file.duplicateInfo.label})`}
                      className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 inline-flex items-center gap-1 flex-shrink-0 animate-pulse"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      Duplicato
                    </span>
                  )}

                  {file.duplicateInfo?.isOriginal && (
                    <span
                      title="File originale primario conservato"
                      className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[9px] font-semibold border border-emerald-500/30 inline-flex items-center gap-1 flex-shrink-0"
                    >
                      Originale
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] md:text-xs text-[#9A9DA5] mt-0.5 flex-wrap">
                  {/* Size Label / Badge */}
                  {file.isFolder ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCalculateFolderSize) onCalculateFolderSize(file);
                      }}
                      className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                      title="Dimensione cartella (clicca per ricalcolare)"
                    >
                      {sizeInfo.isCalculating ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 animate-pulse">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Calcolo...
                        </span>
                      ) : (
                        <>
                          <span>{sizeInfo.label}</span>
                          {sizeInfo.sublabel && (
                            <span className="text-[#9A9DA5] font-normal">
                              ({sizeInfo.sublabel})
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  ) : sizeInfo.isCloudDoc ? (
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[9px] font-semibold uppercase">
                      {sizeInfo.label}
                    </span>
                  ) : (
                    <span className="font-mono tabular-nums text-[#EAEBED] font-medium">
                      {sizeInfo.label}
                    </span>
                  )}

                  <span>•</span>
                  <span>{formatItalianDate(file.modifiedTime)}</span>

                  {file.isFolder && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-[9px] uppercase font-bold text-amber-400 border border-amber-500/30">
                      Cartella
                    </span>
                  )}

                  {file.shared && (
                    <span className="text-[10px] text-cyan-400">Condiviso</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 1-Tap Quick Move into this folder (Mobile & Desktop) */}
        {file.isFolder && selectedCount > 0 && !isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('snap', hapticsEnabled);
              playSound('pop', soundsEnabled);
              if (onMoveSelectedHere) onMoveSelectedHere(file);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0 mr-2"
            title={`Sposta i file selezionati qui dentro`}
          >
            <FolderInput className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sposta qui</span>
            <span className="text-[10px] bg-amber-400 text-black px-1.5 rounded-full font-mono">
              {selectedCount}
            </span>
          </button>
        )}

        {/* Folder Open Button (Clear, prominent and immediate on mobile & desktop) */}
        {file.isFolder && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              executeOpenFolder();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all active:scale-95 shadow-sm flex-shrink-0 mr-1"
            title="Apri sotto-cartella"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Apri</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
          </button>
        )}

        {/* Right Section: Desktop Hover Quick Actions & Details */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Quick Preview Mode Button */}
          {!file.isFolder && onQuickPreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('tick', hapticsEnabled);
                playSound('pop', soundsEnabled);
                onQuickPreview(file);
              }}
              title="Anteprima Rapida documento"
              className="w-8 h-8 rounded-xl bg-[#222428] hover:bg-amber-500/20 text-[#9A9DA5] hover:text-amber-300 border border-[#2F3136] hover:border-amber-500/40 flex items-center justify-center transition-colors"
            >
              <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}

          {/* Details / Inspector toggle icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('tick', hapticsEnabled);
              onClick(file);
            }}
            title="Dettagli e ispezione completa"
            className="w-8 h-8 rounded-xl bg-[#222428] hover:bg-[#2A2C31] text-[#9A9DA5] hover:text-[#EAEBED] border border-[#2F3136] flex items-center justify-center transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Quick Rename Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('tick', hapticsEnabled);
              setIsEditingInline(true);
            }}
            title="Rinomina veloce"
            className="hidden md:flex w-8 h-8 rounded-xl bg-[#222428] hover:bg-[#2A2C31] text-[#9A9DA5] hover:text-[#EAEBED] border border-[#2F3136] items-center justify-center transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Quick Quarantine / Restore */}
          {isQuarantinedView ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onQuickRestore) onQuickRestore(file);
              }}
              title="Ripristina file nella cartella originale"
              className="w-8 h-8 rounded-xl bg-[#222428] hover:bg-emerald-950/50 text-emerald-400 border border-[#2F3136] flex items-center justify-center transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickQuarantine(file);
              }}
              title="Sposta in Quarantena (_Da Cancellare)"
              className="hidden md:flex w-8 h-8 rounded-xl bg-[#222428] hover:bg-red-950/50 text-[#E31B23] border border-[#2F3136] items-center justify-center transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Open in Drive Link */}
          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Apri su Google Drive"
              className="hidden md:flex w-8 h-8 rounded-xl bg-[#222428] hover:bg-[#2A2C31] text-[#9A9DA5] hover:text-[#EAEBED] border border-[#2F3136] items-center justify-center transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
