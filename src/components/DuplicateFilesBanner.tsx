import React, { useState } from 'react';
import {
  Copy,
  ShieldAlert,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  X,
  FileWarning,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { DriveFile, DuplicateGroup } from '../types/drive';
import { formatFileSize } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface DuplicateFilesBannerProps {
  duplicateFiles: DriveFile[];
  duplicateGroups: DuplicateGroup[];
  totalWastedBytes: number;
  selectedIds: Set<string>;
  onSelectDuplicates: (duplicates: DriveFile[]) => void;
  onQuarantineDuplicates: (duplicates: DriveFile[]) => void;
  isFilterActive: boolean;
  onToggleFilterDuplicates: () => void;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const DuplicateFilesBanner: React.FC<DuplicateFilesBannerProps> = ({
  duplicateFiles,
  duplicateGroups,
  totalWastedBytes,
  selectedIds,
  onSelectDuplicates,
  onQuarantineDuplicates,
  isFilterActive,
  onToggleFilterDuplicates,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (duplicateFiles.length === 0 || isDismissed) {
    return null;
  }

  const allDuplicatesSelected =
    duplicateFiles.length > 0 &&
    duplicateFiles.every((f) => selectedIds.has(f.id));

  const handleSelectDuplicatesClick = () => {
    triggerHaptic('snap', hapticsEnabled);
    playSound('click', soundsEnabled);
    onSelectDuplicates(duplicateFiles);
  };

  const handleQuarantineClick = () => {
    triggerHaptic('doublePulse', hapticsEnabled);
    playSound('pop', soundsEnabled);
    onQuarantineDuplicates(duplicateFiles);
  };

  const handleFilterClick = () => {
    triggerHaptic('tick', hapticsEnabled);
    playSound('click', soundsEnabled);
    onToggleFilterDuplicates();
  };

  const formattedWasted = formatFileSize(String(totalWastedBytes));

  return (
    <div className="mb-4 rounded-3xl bg-[#222428] border border-amber-500/35 overflow-hidden shadow-md transition-all animate-fadeIn">
      {/* Banner Main Row */}
      <div className="p-3.5 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start md:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5 md:mt-0">
            <Copy className="w-5 h-5" strokeWidth={1.75} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[#EAEBED] flex items-center gap-1.5">
                <span>Rilevati {duplicateFiles.length} file duplicati</span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-900/40 font-mono">
                  {duplicateGroups.length} {duplicateGroups.length === 1 ? 'gruppo' : 'gruppi'}
                </span>
              </h3>
              {totalWastedBytes > 0 && (
                <span className="text-xs text-amber-400 font-mono font-semibold">
                  (~{formattedWasted} di copie superflue)
                </span>
              )}
            </div>
            <p className="text-xs text-[#9A9DA5] mt-0.5">
              Trovate copie con suffisso (1), stesso nome o contenuto identico. Gli originali vengono sempre protetti.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* Filter toggle */}
          <button
            onClick={handleFilterClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isFilterActive
                ? 'bg-amber-500/30 text-amber-300 border-amber-500/60'
                : 'bg-[#2A2C31] hover:bg-[#32353B] text-[#9A9DA5] hover:text-[#EAEBED] border-[#3A3D45]'
            }`}
            title="Mostra solo i file duplicati in questa cartella"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isFilterActive ? 'Mostra tutti' : 'Filtra duplicati'}</span>
          </button>

          {/* Select all duplicates */}
          <button
            onClick={handleSelectDuplicatesClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-amber-300 border border-amber-500/40 text-xs font-bold transition-all active:scale-95 shadow-sm"
            title="Seleziona solo le copie duplicate lasciando gli originali intatti"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>
              {allDuplicatesSelected ? 'Deseleziona copie' : 'Seleziona copie'}
            </span>
          </button>

          {/* Quick Quarantine Duplicates Button */}
          <button
            onClick={handleQuarantineClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E31B23] hover:bg-red-600 text-white text-xs font-bold transition-all active:scale-95 shadow-lg shadow-red-950/50 border border-red-500/40"
            title="Sposta subito tutti i file duplicati nella cartella sicura di Quarantena"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Sposta in Quarantena</span>
          </button>

          {/* Expand details toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-[#9A9DA5] hover:text-[#EAEBED] border border-[#3A3D45] flex items-center justify-center transition-colors"
            title={isExpanded ? 'Comprimi dettagli' : 'Espandi gruppi duplicati'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Close/Dismiss banner */}
          <button
            onClick={() => setIsDismissed(true)}
            className="w-8 h-8 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-[#9A9DA5] hover:text-[#EAEBED] border border-[#3A3D45] flex items-center justify-center transition-colors"
            title="Chiudi avviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Details - Duplicate Groups Breakdown */}
      {isExpanded && (
        <div className="border-t border-[#2F3136] bg-[#1E2024]/70 p-3.5 space-y-3 text-xs">
          <div className="text-[11px] font-bold text-[#9A9DA5] uppercase tracking-wider">
            Riepilogo gruppi duplicati ({duplicateGroups.length})
          </div>

          <div className="grid gap-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
            {duplicateGroups.map((group) => (
              <div
                key={group.groupId}
                className="p-2.5 rounded-2xl bg-[#222428] border border-[#2F3136] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] uppercase border border-amber-500/30">
                      {group.reasonLabel}
                    </span>
                    <span className="font-semibold text-[#EAEBED] truncate" title={group.originalFile.name}>
                      Originale: {group.originalFile.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#9A9DA5] mt-1 flex items-center gap-2">
                    <span>
                      {group.duplicateFiles.length} {group.duplicateFiles.length === 1 ? 'copia duplicata' : 'copie duplicate'}:{' '}
                      <strong className="text-amber-400 font-mono">
                        {group.duplicateFiles.map((d) => d.name).join(', ')}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                  <button
                    onClick={() => {
                      triggerHaptic('doublePulse', hapticsEnabled);
                      playSound('pop', soundsEnabled);
                      onQuarantineDuplicates(group.duplicateFiles);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-950/40 hover:bg-[#E31B23] text-red-300 hover:text-white border border-red-500/30 text-[10px] font-bold transition-all shadow-sm active:scale-95"
                    title={`Metti in quarantena solo le copie di "${group.originalFile.name}"`}
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>Quarantena copie</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
