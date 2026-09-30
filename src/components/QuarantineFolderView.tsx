import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  FolderOpen,
  Info,
  ExternalLink,
} from 'lucide-react';
import { DriveFile } from '../types/drive';
import { FileItemCard, formatFileSize } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface QuarantineFolderViewProps {
  quarantineFolder: DriveFile | null;
  files: DriveFile[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  inspectedFile: DriveFile | null;
  onInspectFile: (file: DriveFile) => void;
  onRestoreFiles: (files: DriveFile[]) => Promise<void>;
  onContextMenu: (e: React.MouseEvent, file: DriveFile) => void;
  onQuickRename: (file: DriveFile, newName: string) => void;
  density: 'comfort' | 'compact';
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  searchQuery?: string;
  onQuickPreview?: (file: DriveFile) => void;
}

export const QuarantineFolderView: React.FC<QuarantineFolderViewProps> = ({
  quarantineFolder,
  files,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  inspectedFile,
  onInspectFile,
  onRestoreFiles,
  onContextMenu,
  onQuickRename,
  density,
  hapticsEnabled,
  soundsEnabled,
  searchQuery = '',
  onQuickPreview,
}) => {
  const selectedFiles = files.filter((f) => selectedIds.has(f.id));

  // Compute total size of quarantined files
  const totalSizeBytes = files.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
  const totalSizeFormatted = formatFileSize(totalSizeBytes.toString());

  const handleRestoreSelected = async () => {
    if (selectedFiles.length === 0) return;
    triggerHaptic('doublePulse', hapticsEnabled);
    playSound('restore', soundsEnabled);
    await onRestoreFiles(selectedFiles);
  };

  return (
    <div className="space-y-4">
      {/* Safety Quarantine Banner */}
      <div className="p-4 md:p-6 rounded-3xl bg-[#222428] border border-[#2F3136] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-900/50 flex items-center justify-center text-[#E31B23] flex-shrink-0 shadow-md">
              <ShieldAlert className="w-6 h-6" strokeWidth={1.75} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-[#EAEBED]">
                  Cartella di Quarantena Protetta
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-900/40">
                  Protezione Attiva
                </span>
              </div>
              <p className="text-xs text-[#9A9DA5] mt-1 max-w-2xl leading-relaxed">
                I file in questa vista sono stati isolati per la pulizia del tuo Google Drive ma{' '}
                <strong className="text-[#EAEBED]">NON sono stati eliminati definitivamente</strong>.
                Rimangono intatti nel tuo spazio e puoi ripristinarli con un solo tocco.
              </p>
            </div>
          </div>

          {/* Quarantine Stats */}
          <div className="flex items-center gap-3 bg-[#18191B] p-2.5 rounded-2xl border border-[#2F3136] flex-shrink-0">
            <div className="px-3 border-r border-[#2F3136] text-right">
              <div className="text-[10px] text-[#9A9DA5] uppercase font-bold tracking-wider">
                File Isolati
              </div>
              <div className="text-base font-bold text-[#EAEBED] font-mono tabular-nums">
                {files.length}
              </div>
            </div>
            <div className="px-3 text-right">
              <div className="text-[10px] text-[#9A9DA5] uppercase font-bold tracking-wider">
                Spazio Occupato
              </div>
              <div className="text-base font-bold text-[#EAEBED] font-mono tabular-nums">
                {totalSizeFormatted}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Batch Actions */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#2F3136] flex items-center justify-between gap-3 animate-fadeIn">
            <span className="text-xs font-semibold text-[#EAEBED]">
              {selectedFiles.length} {selectedFiles.length === 1 ? 'file selezionato' : 'file selezionati'}
            </span>

            <button
              onClick={handleRestoreSelected}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs shadow-md transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Ripristina Selezionati ({selectedFiles.length})
            </button>
          </div>
        )}
      </div>

      {/* Files List Container */}
      <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden shadow-sm">
        {/* Table header / count */}
        <div className="h-11 px-4 bg-[#1E2024] border-b border-[#2F3136] flex items-center justify-between text-xs text-[#9A9DA5]">
          <div className="flex items-center gap-3">
            <button
              onClick={selectedIds.size === files.length && files.length > 0 ? onClearSelection : onSelectAll}
              className="text-xs font-semibold hover:text-[#EAEBED] transition-colors"
            >
              {selectedIds.size === files.length && files.length > 0
                ? 'Deseleziona tutti'
                : 'Seleziona tutti'}
            </button>
          </div>

          <span className="font-mono tabular-nums">
            {files.length} {files.length === 1 ? 'elemento in quarantena' : 'elementi in quarantena'}
          </span>
        </div>

        {files.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-3xl bg-[#2A2C31] flex items-center justify-center text-emerald-400 mb-3 border border-[#3A3D45]">
              <CheckCircle2 className="w-7 h-7" strokeWidth={1.75} />
            </div>
            <h3 className="text-sm font-bold text-[#EAEBED]">
              Nessun file in Quarantena
            </h3>
            <p className="text-xs text-[#9A9DA5] max-w-sm mt-1">
              Tutti i file sono al loro posto. Quando vorrai fare pulizia, spostali qui senza paura di perderli!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2F3136]/60">
            {files.map((file) => (
              <FileItemCard
                key={file.id}
                file={file}
                isSelected={selectedIds.has(file.id)}
                isInspected={inspectedFile?.id === file.id}
                onToggleSelect={onToggleSelect}
                onClick={onInspectFile}
                onContextMenu={onContextMenu}
                onQuickRename={onQuickRename}
                onQuickQuarantine={() => {}}
                onQuickRestore={(f) => onRestoreFiles([f])}
                isQuarantinedView={true}
                density={density}
                hapticsEnabled={hapticsEnabled}
                soundsEnabled={soundsEnabled}
                searchQuery={searchQuery}
                onQuickPreview={onQuickPreview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
