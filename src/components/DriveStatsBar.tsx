import React, { useState } from 'react';
import {
  HardDrive,
  ShieldCheck,
  FolderTree,
  Edit3,
  ChevronDown,
  TrendingUp,
  FileCheck2,
  FileWarning,
} from 'lucide-react';
import { DriveFile, DriveStorageQuota, FolderStats } from '../types/drive';
import { formatFileSize } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface DriveStatsBarProps {
  files: DriveFile[];
  quarantineCount: number;
  storageQuota?: DriveStorageQuota;
  renamedCount: number;
  folderStatsMap?: Record<string, FolderStats>;
  duplicateCount?: number;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const DriveStatsBar: React.FC<DriveStatsBarProps> = ({
  files,
  quarantineCount,
  storageQuota,
  renamedCount,
  folderStatsMap,
  duplicateCount = 0,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);

  const toggleKpi = (id: string) => {
    triggerHaptic('tick', hapticsEnabled);
    playSound('toggle', soundsEnabled);
    setExpandedKpi((prev) => (prev === id ? null : id));
  };

  const folderCount = files.filter((f) => f.isFolder).length;
  const fileCount = files.filter((f) => !f.isFolder).length;

  const totalCurrentFolderSize = files.reduce((acc, f) => {
    if (f.isFolder) {
      const s = folderStatsMap?.[f.id]?.totalBytes || 0;
      return acc + s;
    }
    const s = Number(f.size) || Number(f.quotaBytesUsed) || 0;
    return acc + s;
  }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {/* KPI 1: File & Struttura Cartelle */}
      <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden transition-all duration-300">
        <button
          onClick={() => toggleKpi('structure')}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#2A2C31]/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2A2C31] border border-[#3A3D45]/60 flex items-center justify-center text-amber-400 flex-shrink-0">
              <FolderTree className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#9A9DA5]">
                Struttura Vista
              </div>
              <div className="text-base font-bold text-[#EAEBED] font-mono tabular-nums">
                {files.length} elementi
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {duplicateCount > 0 && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-900/40 font-mono">
                {duplicateCount} dup
              </span>
            )}
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-900/30">
              {folderCount} cartelle
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#9A9DA5] transition-transform ${
                expandedKpi === 'structure' ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {expandedKpi === 'structure' && (
          <div className="p-3.5 pt-1 border-t border-[#2F3136]/60 bg-[#1E2024]/50 animate-fadeIn text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-xl bg-[#2A2C31]">
                <div className="text-[10px] text-[#9A9DA5]">File singoli</div>
                <div className="font-bold text-[#EAEBED] font-mono tabular-nums">
                  {fileCount}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#2A2C31]">
                <div className="text-[10px] text-[#9A9DA5]">Spazio cartella</div>
                <div className="font-bold text-[#EAEBED] font-mono tabular-nums">
                  {formatFileSize(totalCurrentFolderSize.toString())}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI 2: Quarantena Sicura (_Da Cancellare) */}
      <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden transition-all duration-300">
        <button
          onClick={() => toggleKpi('quarantine')}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#2A2C31]/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2A2C31] border border-[#3A3D45]/60 flex items-center justify-center text-[#E31B23] flex-shrink-0">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#9A9DA5]">
                Quarantena Sicura
              </div>
              <div className="text-base font-bold text-[#EAEBED] font-mono tabular-nums">
                {quarantineCount} isolati
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-900/30">
              0 persi
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#9A9DA5] transition-transform ${
                expandedKpi === 'quarantine' ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {expandedKpi === 'quarantine' && (
          <div className="p-3.5 pt-1 border-t border-[#2F3136]/60 bg-[#1E2024]/50 animate-fadeIn text-xs space-y-2">
            <p className="text-[11px] text-[#9A9DA5] leading-relaxed">
              I file da eliminare risiedono in sicurezza dentro <strong>_Da Cancellare</strong>. Nessun dato viene mai distrutto dal server.
            </p>
          </div>
        )}
      </div>

      {/* KPI 3: Ridenominazioni Effettuate */}
      <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden transition-all duration-300">
        <button
          onClick={() => toggleKpi('renames')}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#2A2C31]/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2A2C31] border border-[#3A3D45]/60 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Edit3 className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#9A9DA5]">
                File Normalizzati
              </div>
              <div className="text-base font-bold text-[#EAEBED] font-mono tabular-nums">
                {renamedCount} ridenominati
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-900/30">
              Standard IT
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#9A9DA5] transition-transform ${
                expandedKpi === 'renames' ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {expandedKpi === 'renames' && (
          <div className="p-3.5 pt-1 border-t border-[#2F3136]/60 bg-[#1E2024]/50 animate-fadeIn text-xs space-y-2">
            <p className="text-[11px] text-[#9A9DA5] leading-relaxed">
              Tutte le ridenominazioni preservano rigorosamente l'estensione del file e supportano preset avanzati.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
