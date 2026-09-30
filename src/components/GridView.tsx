import React from 'react';
import { Check, ShieldAlert, RotateCcw, FolderOpen, ChevronRight, RefreshCw, Copy, Eye } from 'lucide-react';
import { DriveFile, FolderStats } from '../types/drive';
import { getFileIcon, formatItalianDate, getFileOrFolderSizeLabel } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';
import { HighlightedText } from './HighlightedText';

interface GridViewProps {
  files: DriveFile[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  inspectedFile: DriveFile | null;
  onInspectFile: (file: DriveFile) => void;
  onDoubleClickFolder?: (file: DriveFile) => void;
  onOpenFolder?: (file: DriveFile) => void;
  onContextMenu: (e: React.MouseEvent, file: DriveFile) => void;
  onQuickQuarantine: (file: DriveFile) => void;
  onQuickRestore?: (file: DriveFile) => void;
  onCalculateFolderSize?: (file: DriveFile) => void;
  onQuickPreview?: (file: DriveFile) => void;
  folderStatsMap?: Record<string, FolderStats>;
  isQuarantinedView?: boolean;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  searchQuery?: string;
}

export const GridView: React.FC<GridViewProps> = ({
  files,
  selectedIds,
  onToggleSelect,
  inspectedFile,
  onInspectFile,
  onDoubleClickFolder,
  onOpenFolder,
  onContextMenu,
  onQuickQuarantine,
  onQuickRestore,
  onCalculateFolderSize,
  onQuickPreview,
  folderStatsMap,
  isQuarantinedView = false,
  hapticsEnabled,
  soundsEnabled,
  searchQuery = '',
}) => {
  const handleExecuteOpenFolder = (folder: DriveFile) => {
    triggerHaptic('snap', hapticsEnabled);
    playSound('pop', soundsEnabled);
    if (onOpenFolder) {
      onOpenFolder(folder);
    } else if (onDoubleClickFolder) {
      onDoubleClickFolder(folder);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {files.map((file) => {
        const isSelected = selectedIds.has(file.id);
        const isInspected = inspectedFile?.id === file.id;
        const sizeInfo = getFileOrFolderSizeLabel(file, folderStatsMap?.[file.id]);

        return (
          <div
            key={file.id}
            onClick={() => {
              if (file.isFolder) {
                handleExecuteOpenFolder(file);
              } else {
                onInspectFile(file);
              }
            }}
            onDoubleClick={() => file.isFolder && handleExecuteOpenFolder(file)}
            onContextMenu={(e) => onContextMenu(e, file)}
            className={`p-3.5 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between select-none group min-h-[155px] ${
              isSelected
                ? 'bg-[#E31B23]/15 border-[#E31B23] shadow-md shadow-red-950/30'
                : isInspected
                ? 'bg-[#2A2C31] border-[#9A9DA5]'
                : 'bg-[#222428] hover:bg-[#2A2C31] border-[#2F3136]'
            }`}
          >
            {/* Top row: Checkbox & Quick action */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('snap', hapticsEnabled);
                  playSound('toggle', soundsEnabled);
                  onToggleSelect(file.id);
                }}
                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#E31B23] border-[#E31B23] text-white'
                    : 'border-[#3F4248] bg-transparent'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" strokeWidth={2.5} />}
              </button>

              <div className="flex items-center gap-1">
                {file.isFolder && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteOpenFolder(file);
                    }}
                    title="Apri cartella"
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold hover:bg-amber-500/30"
                  >
                    <span>Apri</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  {!file.isFolder && onQuickPreview && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('tick', hapticsEnabled);
                        playSound('pop', soundsEnabled);
                        onQuickPreview(file);
                      }}
                      title="Anteprima Rapida documento"
                      className="w-6 h-6 rounded-lg bg-[#18191B] hover:bg-amber-500/20 text-[#9A9DA5] hover:text-amber-300 border border-[#2F3136] hover:border-amber-500/40 flex items-center justify-center transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  )}

                  {isQuarantinedView ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onQuickRestore) onQuickRestore(file);
                      }}
                      title="Ripristina file"
                      className="w-6 h-6 rounded-lg bg-[#18191B] hover:bg-emerald-950/40 text-emerald-400 border border-[#2F3136] flex items-center justify-center transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickQuarantine(file);
                      }}
                      title="Sposta in Quarantena"
                      className="w-6 h-6 rounded-lg bg-[#18191B] hover:bg-red-950/40 text-[#E31B23] border border-[#2F3136] flex items-center justify-center transition-colors"
                    >
                      <ShieldAlert className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Center Icon */}
            <div className="flex flex-col items-center text-center my-1">
              <div
                onClick={(e) => {
                  if (file.isFolder) {
                    e.stopPropagation();
                    handleExecuteOpenFolder(file);
                  }
                }}
                className={`w-12 h-12 rounded-2xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/60 mb-2 shadow-sm ${
                  file.isFolder ? 'hover:border-amber-400' : ''
                }`}
              >
                {getFileIcon(file)}
              </div>

              <div
                className={`text-xs font-semibold line-clamp-2 break-all leading-snug ${
                  file.isFolder ? 'text-[#EAEBED] hover:text-amber-300' : 'text-[#EAEBED]'
                }`}
                title={file.name}
              >
                <HighlightedText text={file.name} query={searchQuery} />
              </div>

              {file.duplicateInfo?.isDuplicate && (
                <div className="mt-1">
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40 inline-flex items-center gap-0.5 animate-pulse">
                    <Copy className="w-2.5 h-2.5" /> Duplicato
                  </span>
                </div>
              )}
              {file.duplicateInfo?.isOriginal && (
                <div className="mt-1">
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-semibold border border-emerald-500/30">
                    Originale
                  </span>
                </div>
              )}
            </div>

            {/* Bottom meta */}
            <div className="flex items-center justify-between text-[10px] text-[#9A9DA5] pt-2 border-t border-[#2F3136]/50 font-mono mt-auto">
              {file.isFolder ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCalculateFolderSize) onCalculateFolderSize(file);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold truncate max-w-[90px] text-left"
                  title="Calcola dimensione cartella"
                >
                  {sizeInfo.isCalculating ? (
                    <span className="inline-flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Calcolo
                    </span>
                  ) : (
                    sizeInfo.label
                  )}
                </button>
              ) : sizeInfo.isCloudDoc ? (
                <span className="text-blue-300 uppercase text-[9px] font-semibold">{sizeInfo.label}</span>
              ) : (
                <span className="text-[#EAEBED] font-medium">{sizeInfo.label}</span>
              )}

              <span>{formatItalianDate(file.modifiedTime)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
