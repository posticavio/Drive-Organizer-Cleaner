import React, { useState } from 'react';
import {
  Folder,
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { DriveFile } from '../types/drive';
import { getFileIcon, formatFileSize } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';
import { HighlightedText } from './HighlightedText';

interface KanbanViewProps {
  files: DriveFile[];
  quarantineFiles: DriveFile[];
  onInspectFile: (file: DriveFile) => void;
  onDoubleClickFolder?: (file: DriveFile) => void;
  onQuickQuarantine: (file: DriveFile) => void;
  onBatchRenameTrigger: (files: DriveFile[]) => void;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  searchQuery?: string;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  files,
  quarantineFiles,
  onInspectFile,
  onDoubleClickFolder,
  onQuickQuarantine,
  onBatchRenameTrigger,
  hapticsEnabled,
  soundsEnabled,
  searchQuery = '',
}) => {
  // Mobile single column view selector
  const [mobileColumn, setMobileColumn] = useState<'folders' | 'messy' | 'clean' | 'quarantine'>('messy');

  // Categorize files
  const folders = files.filter((f) => f.isFolder);

  // Simple heuristic for messy vs clean
  // Clean: starts with date YYYY-MM-DD or is kebab-case or Title Case with no spaces/special chars
  const nonFolders = files.filter((f) => !f.isFolder);
  const cleanFiles = nonFolders.filter(
    (f) =>
      f.name.match(/^\d{4}[-_]\d{2}[-_]\d{2}/) ||
      f.name.match(/^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+$/i)
  );
  const messyFiles = nonFolders.filter((f) => !cleanFiles.includes(f));

  const columns = [
    {
      id: 'folders' as const,
      title: 'Cartelle & Percorsi',
      badgeColor: 'bg-amber-950/40 text-amber-400 border-amber-900/30',
      icon: Folder,
      items: folders,
      emptyMessage: 'Nessuna cartella interna presente',
    },
    {
      id: 'messy' as const,
      title: 'Da Normalizzare',
      badgeColor: 'bg-rose-950/40 text-rose-400 border-rose-900/30',
      icon: AlertCircle,
      items: messyFiles,
      emptyMessage: 'Tutti i file hanno un nome conforme!',
    },
    {
      id: 'clean' as const,
      title: 'Standardizzati & Ordinati',
      badgeColor: 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30',
      icon: CheckCircle2,
      items: cleanFiles,
      emptyMessage: 'Nessun file con data o casing conforme',
    },
    {
      id: 'quarantine' as const,
      title: 'In Quarantena Sicura',
      badgeColor: 'bg-red-950/50 text-[#E31B23] border-red-900/40',
      icon: ShieldAlert,
      items: quarantineFiles,
      emptyMessage: 'Nessun file isolato',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Mobile Column Selector Pills */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {columns.map((col) => {
          const isActive = mobileColumn === col.id;
          return (
            <button
              key={col.id}
              onClick={() => {
                triggerHaptic('tick', hapticsEnabled);
                setMobileColumn(col.id);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-[#E31B23]/15 text-[#EAEBED] border-[#E31B23]'
                  : 'bg-[#222428] text-[#9A9DA5] border-[#2F3136]'
              }`}
            >
              <span>{col.title}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#18191B] font-mono tabular-nums">
                {col.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid: 4 columns on desktop, single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const isMobileVisible = mobileColumn === col.id;
          const Icon = col.icon;

          return (
            <div
              key={col.id}
              className={`rounded-3xl bg-[#222428] border border-[#2F3136] flex flex-col max-h-[75vh] overflow-hidden ${
                isMobileVisible ? 'flex' : 'hidden md:flex'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#2F3136] bg-[#1E2024]/80 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <Icon className="w-4 h-4 text-[#9A9DA5]" />
                  <h3 className="text-xs font-bold text-[#EAEBED] truncate">
                    {col.title}
                  </h3>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono tabular-nums ${col.badgeColor}`}
                >
                  {col.items.length}
                </span>
              </div>

              {/* Quick action button inside column */}
              {col.id === 'messy' && col.items.length > 0 && (
                <div className="p-2 border-b border-[#2F3136] bg-[#18191B]/40">
                  <button
                    onClick={() => {
                      triggerHaptic('snap', hapticsEnabled);
                      playSound('click', soundsEnabled);
                      onBatchRenameTrigger(col.items);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-[11px] font-bold text-[#EAEBED] border border-[#3A3D45] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#E31B23]" />
                    Rinomina Tutti ({col.items.length})
                  </button>
                </div>
              )}

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {col.items.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#9A9DA5]">
                    {col.emptyMessage}
                  </div>
                ) : (
                  col.items.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => onInspectFile(file)}
                      onDoubleClick={() =>
                        file.isFolder && onDoubleClickFolder && onDoubleClickFolder(file)
                      }
                      className="p-3 rounded-2xl bg-[#1E2024] hover:bg-[#2A2C31] border border-[#2F3136] transition-all cursor-pointer shadow-sm active:scale-98"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/60 flex-shrink-0 mt-0.5">
                          {getFileIcon(file)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[#EAEBED] truncate" title={file.name}>
                            <HighlightedText text={file.name} query={searchQuery} />
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#9A9DA5] mt-1 font-mono">
                            <span>{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
