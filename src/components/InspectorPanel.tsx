import React from 'react';
import {
  X,
  ShieldAlert,
  Edit3,
  FolderInput,
  ExternalLink,
  RotateCcw,
  Calendar,
  HardDrive,
  Tag,
  Info,
  Clock,
  FolderOpen,
  RefreshCw,
  FolderTree,
  FileCheck,
} from 'lucide-react';
import { DriveFile, FolderStats } from '../types/drive';
import {
  getFileIcon,
  formatFileSize,
  formatExactBytes,
  formatItalianDate,
  getFileOrFolderSizeLabel,
} from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface InspectorPanelProps {
  file: DriveFile | null;
  onClose: () => void;
  onOpenBatchRename: (files: DriveFile[]) => void;
  onMoveToQuarantine: (files: DriveFile[]) => void;
  onOpenMoveModal: (files: DriveFile[]) => void;
  onRestoreFromQuarantine?: (files: DriveFile[]) => void;
  onOpenFolder?: (folder: DriveFile) => void;
  onCalculateFolderSize?: (folder: DriveFile) => void;
  folderStats?: FolderStats;
  isQuarantinedView?: boolean;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  file,
  onClose,
  onOpenBatchRename,
  onMoveToQuarantine,
  onOpenMoveModal,
  onRestoreFromQuarantine,
  onOpenFolder,
  onCalculateFolderSize,
  folderStats,
  isQuarantinedView = false,
  hapticsEnabled,
  soundsEnabled,
}) => {
  if (!file) return null;

  const sizeInfo = getFileOrFolderSizeLabel(file, folderStats);

  const handleOpenThisFolder = () => {
    triggerHaptic('snap', hapticsEnabled);
    playSound('pop', soundsEnabled);
    if (onOpenFolder) {
      onOpenFolder(file);
    }
  };

  return (
    <aside className="w-full md:w-96 lg:w-[400px] h-full bg-[#1E2024] border-l border-[#2F3136] flex flex-col z-30 shadow-2xl flex-shrink-0 animate-slideLeft">
      {/* Sticky Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#2F3136] bg-[#1E2024]/95 backdrop-blur flex-shrink-0">
        <div className="flex items-center gap-2 truncate">
          <Info className="w-4 h-4 text-[#9A9DA5]" />
          <h2 className="text-sm font-bold text-[#EAEBED] truncate">
            {file.isFolder ? 'Dettagli Cartella' : 'Dettagli File'}
          </h2>
        </div>
        <button
          onClick={() => {
            triggerHaptic('tick', hapticsEnabled);
            onClose();
          }}
          title="Chiudi pannello (Esc)"
          className="w-8 h-8 rounded-xl bg-[#222428] hover:bg-[#2A2C31] border border-[#2F3136] flex items-center justify-center text-[#9A9DA5] hover:text-[#EAEBED] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Preview / Large Card */}
        <div className="p-4 rounded-3xl bg-[#222428] border border-[#2F3136] flex flex-col items-center text-center">
          <div
            onClick={() => file.isFolder && handleOpenThisFolder()}
            className={`w-16 h-16 rounded-3xl bg-[#2A2C31] border border-[#3A3D45]/80 flex items-center justify-center mb-3 shadow-lg ${
              file.isFolder ? 'cursor-pointer hover:border-amber-400 hover:scale-105 transition-transform' : ''
            }`}
          >
            {getFileIcon(file)}
          </div>

          <h3 className="text-sm font-bold text-[#EAEBED] break-all leading-snug">
            {file.name}
          </h3>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#2A2C31] text-[#9A9DA5] border border-[#3A3D45]/40">
              {file.isFolder ? 'Cartella Google Drive' : file.mimeType.split('/').pop() || 'File'}
            </span>
            {isQuarantinedView && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-950/60 text-[#E31B23] border border-red-900/40">
                In Quarantena
              </span>
            )}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2">
          {/* Prominent Open Folder Action */}
          {file.isFolder && (
            <button
              onClick={handleOpenThisFolder}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-sm font-bold transition-all shadow-md active:scale-98"
            >
              <FolderOpen className="w-5 h-5 text-amber-400" />
              <span>Apri questa Cartella</span>
            </button>
          )}

          {/* Rename Button */}
          <button
            onClick={() => {
              triggerHaptic('snap', hapticsEnabled);
              playSound('click', soundsEnabled);
              onOpenBatchRename([file]);
            }}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl bg-[#2A2C31] hover:bg-[#32353B] text-[#EAEBED] border border-[#3A3D45] text-xs font-bold transition-all shadow-sm active:scale-98"
          >
            <Edit3 className="w-4 h-4 text-[#E31B23]" />
            Rinomina con Regole
          </button>

          {/* Move to another folder */}
          <button
            onClick={() => {
              triggerHaptic('snap', hapticsEnabled);
              playSound('click', soundsEnabled);
              onOpenMoveModal([file]);
            }}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl bg-[#222428] hover:bg-[#2A2C31] text-[#EAEBED] border border-[#2F3136] text-xs font-semibold transition-all active:scale-98"
          >
            <FolderInput className="w-4 h-4 text-amber-400" />
            Sposta in un'altra Cartella
          </button>

          {/* Quarantine or Restore */}
          {isQuarantinedView ? (
            <button
              onClick={() => {
                triggerHaptic('doublePulse', hapticsEnabled);
                playSound('restore', soundsEnabled);
                if (onRestoreFromQuarantine) onRestoreFromQuarantine([file]);
              }}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-400 border border-emerald-900/60 text-xs font-bold transition-all active:scale-98"
            >
              <RotateCcw className="w-4 h-4" />
              Ripristina dalla Quarantena
            </button>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('doublePulse', hapticsEnabled);
                playSound('quarantine', soundsEnabled);
                onMoveToQuarantine([file]);
              }}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl bg-red-950/30 hover:bg-red-950/60 text-[#E31B23] border border-red-900/50 text-xs font-bold transition-all active:scale-98"
            >
              <ShieldAlert className="w-4 h-4" />
              Sposta in "_Da Cancellare" (Quarantena)
            </button>
          )}

          {/* Open in Google Drive Link */}
          {file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-2xl text-[#9A9DA5] hover:text-[#EAEBED] hover:bg-[#222428] text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Apri su Google Drive
            </a>
          )}
        </div>

        {/* Dedicated Folder Size Breakdown Card */}
        {file.isFolder && (
          <div className="p-4 rounded-3xl bg-[#222428] border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <FolderTree className="w-4 h-4" /> Statistiche Cartella
              </span>
              <button
                onClick={() => {
                  triggerHaptic('tick', hapticsEnabled);
                  if (onCalculateFolderSize) onCalculateFolderSize(file);
                }}
                disabled={folderStats?.loading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-xs text-[#EAEBED] border border-[#3A3D45] transition-all disabled:opacity-50"
                title="Ricalcola dimensione esatta"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${folderStats?.loading ? 'animate-spin text-amber-400' : ''}`}
                />
                <span>{folderStats?.loading ? 'Calcolo...' : 'Ricalcola'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-[#1E2024] border border-[#2F3136]">
                <div className="text-[10px] text-[#9A9DA5] uppercase font-bold">
                  Dimensione Totale
                </div>
                <div className="text-sm font-bold text-amber-300 font-mono tabular-nums mt-0.5">
                  {folderStats?.loading
                    ? 'In corso...'
                    : folderStats
                    ? formatFileSize(folderStats.totalBytes)
                    : sizeInfo.label}
                </div>
                {folderStats && folderStats.totalBytes > 0 && (
                  <div className="text-[9px] text-[#9A9DA5] font-mono mt-0.5 truncate">
                    {formatExactBytes(folderStats.totalBytes)}
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-2xl bg-[#1E2024] border border-[#2F3136]">
                <div className="text-[10px] text-[#9A9DA5] uppercase font-bold">
                  Elementi Rilevati
                </div>
                <div className="text-sm font-bold text-[#EAEBED] font-mono tabular-nums mt-0.5">
                  {folderStats?.loading
                    ? '...'
                    : folderStats
                    ? `${folderStats.itemCount}`
                    : '—'}
                </div>
                {folderStats && (
                  <div className="text-[9px] text-[#9A9DA5] mt-0.5">
                    {folderStats.fileCount} file, {folderStats.subfolderCount} cartelle
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metadata Details Accordion-like Card */}
        <div className="rounded-3xl bg-[#222428] border border-[#2F3136] divide-y divide-[#2F3136]/60 text-xs">
          {/* Dimensione */}
          <div className="p-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[#9A9DA5]">
              <HardDrive className="w-3.5 h-3.5" /> Dimensione
            </span>
            <div className="text-right">
              <span className="font-mono text-[#EAEBED] tabular-nums font-semibold">
                {file.isFolder
                  ? folderStats
                    ? formatFileSize(folderStats.totalBytes)
                    : sizeInfo.label
                  : sizeInfo.label}
              </span>
              {!file.isFolder && file.size && Number(file.size) > 0 && (
                <div className="text-[10px] text-[#9A9DA5] font-mono">
                  {formatExactBytes(file.size)}
                </div>
              )}
              {!file.isFolder && sizeInfo.isCloudDoc && (
                <div className="text-[10px] text-blue-400">
                  Cloud Google (0 B su disco)
                </div>
              )}
            </div>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[#9A9DA5]">
              <Clock className="w-3.5 h-3.5" /> Ultima Modifica
            </span>
            <span className="font-mono text-[#EAEBED] tabular-nums">
              {formatItalianDate(file.modifiedTime)}
            </span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[#9A9DA5]">
              <Calendar className="w-3.5 h-3.5" /> Data Creazione
            </span>
            <span className="font-mono text-[#EAEBED] tabular-nums">
              {formatItalianDate(file.createdTime)}
            </span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[#9A9DA5]">
              <Tag className="w-3.5 h-3.5" /> ID Elemento
            </span>
            <span className="font-mono text-[#9A9DA5] text-[10px] truncate max-w-[160px]" title={file.id}>
              {file.id}
            </span>
          </div>
        </div>

        {/* Safety Note */}
        <div className="p-3.5 rounded-2xl bg-[#18191B] border border-[#2F3136]/80 text-[11px] text-[#9A9DA5] space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#EAEBED]">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            Politica di Sicurezza Drive
          </div>
          <p>
            Questo organizzatore non elimina mai definitivamente i tuoi file o cartelle. Gli elementi vengono spostati nella cartella protetta di quarantena per una revisione sicura.
          </p>
        </div>
      </div>
    </aside>
  );
};
