import React, { useState, useEffect } from 'react';
import {
  FolderInput,
  Folder,
  ArrowUp,
  ShieldAlert,
  HardDrive,
  Search,
  Sparkles,
  Check,
  ChevronRight,
  Clock,
  Zap,
} from 'lucide-react';
import { DriveFile, DriveBreadcrumb } from '../types/drive';
import { listAllFolders } from '../services/driveApi';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface QuickMoveShelfProps {
  selectedFiles: DriveFile[];
  currentFolderId: string;
  breadcrumbs: DriveBreadcrumb[];
  subfoldersInView: DriveFile[];
  quarantineFolder: DriveFile | null;
  onExecuteMove: (files: DriveFile[], targetFolderId: string, targetFolderName: string) => Promise<void>;
  accessToken: string;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const QuickMoveShelf: React.FC<QuickMoveShelfProps> = ({
  selectedFiles,
  currentFolderId,
  breadcrumbs,
  subfoldersInView,
  quarantineFolder,
  onExecuteMove,
  accessToken,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const [recentFolders, setRecentFolders] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('drive_recent_target_folders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allDriveFolders, setAllDriveFolders] = useState<DriveFile[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Load all root folders for rapid hopping
  useEffect(() => {
    if (isSearchingAll && allDriveFolders.length === 0 && accessToken) {
      setIsLoadingAll(true);
      listAllFolders(accessToken, 'root')
        .then((f) => setAllDriveFolders(f))
        .catch((e) => console.error(e))
        .finally(() => setIsLoadingAll(false));
    }
  }, [isSearchingAll, allDriveFolders.length, accessToken]);

  const recordRecentFolder = (id: string, name: string) => {
    setRecentFolders((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      const next = [{ id, name }, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('drive_recent_target_folders', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleQuickMove = async (targetId: string, targetName: string) => {
    if (targetId === currentFolderId || selectedFiles.length === 0) return;
    triggerHaptic('snap', hapticsEnabled);
    playSound('pop', soundsEnabled);
    recordRecentFolder(targetId, targetName);
    await onExecuteMove(selectedFiles, targetId, targetName);
  };

  // Find parent folder from breadcrumbs
  const parentFolder =
    breadcrumbs.length >= 2 ? breadcrumbs[breadcrumbs.length - 2] : null;

  if (selectedFiles.length === 0) return null;

  return (
    <div className="mb-4 p-3 md:p-4 rounded-3xl bg-gradient-to-r from-[#222428] via-[#26282E] to-[#222428] border border-[#3A3D45] shadow-xl animate-fadeIn">
      {/* Shelf Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[#2F3136]/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-950/50 text-amber-400 border border-amber-900/40 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#EAEBED] flex items-center gap-1.5">
              <span>Spostamento Ultrarapido 1-Tap</span>
              <span className="text-[10px] font-bold text-white bg-[#E31B23] px-2 py-0.2 rounded-full tabular-nums">
                {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'file'}
              </span>
            </div>
            <div className="text-[10px] text-[#9A9DA5]">
              Tocca una destinazione per trasferire i file all'istante senza drag-and-drop lenti
            </div>
          </div>
        </div>

        {/* Search destination trigger */}
        <button
          onClick={() => setIsSearchingAll((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isSearchingAll
              ? 'bg-[#E31B23]/20 border-[#E31B23] text-[#E31B23]'
              : 'bg-[#18191B] border-[#2F3136] text-[#9A9DA5] hover:text-[#EAEBED]'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isSearchingAll ? 'Chiudi Ricerca' : 'Cerca altra cartella...'}</span>
        </button>
      </div>

      {/* Instant Search Bar if open */}
      {isSearchingAll && (
        <div className="pt-2.5 space-y-2 animate-fadeIn">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9A9DA5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digita il nome di qualsiasi cartella..."
              autoFocus
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#18191B] border border-[#3A3D45] text-xs text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
            {isLoadingAll ? (
              <span className="text-xs text-[#9A9DA5]">Caricamento cartelle...</span>
            ) : (
              allDriveFolders
                .filter((f) =>
                  f.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleQuickMove(folder.id, folder.name)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#18191B] hover:bg-[#2A2C31] text-xs text-[#EAEBED] border border-[#2F3136] transition-colors"
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span>{folder.name}</span>
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      {/* Quick 1-Click Destinations Bar */}
      <div className="pt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* 1. Parent Folder (Livello Superiore) */}
        {parentFolder && (
          <button
            onClick={() => handleQuickMove(parentFolder.id, parentFolder.name)}
            title={`Sposta nella cartella superiore: ${parentFolder.name}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#18191B] hover:bg-[#2A2C31] active:scale-95 text-xs font-semibold text-[#EAEBED] border border-[#3A3D45] flex-shrink-0 transition-all shadow-sm"
          >
            <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Su ({parentFolder.name})</span>
          </button>
        )}

        {/* 2. Root "Il mio Drive" */}
        {currentFolderId !== 'root' && (
          <button
            onClick={() => handleQuickMove('root', 'Il mio Drive')}
            title="Sposta nella Root principale del Drive"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#18191B] hover:bg-[#2A2C31] active:scale-95 text-xs font-semibold text-[#EAEBED] border border-[#3A3D45] flex-shrink-0 transition-all shadow-sm"
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span>Root (Il mio Drive)</span>
          </button>
        )}

        {/* 3. Safety Quarantine Folder */}
        {quarantineFolder && currentFolderId !== quarantineFolder.id && (
          <button
            onClick={() => handleQuickMove(quarantineFolder.id, quarantineFolder.name)}
            title="Sposta direttamente in Quarantena (_Da Cancellare)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-red-950/40 hover:bg-red-950/70 active:scale-95 text-xs font-bold text-[#E31B23] border border-red-900/50 flex-shrink-0 transition-all shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Quarantena (_Da Cancellare)</span>
          </button>
        )}

        {/* 4. Subfolders inside current view */}
        {subfoldersInView.map((subfolder) => (
          <button
            key={subfolder.id}
            onClick={() => handleQuickMove(subfolder.id, subfolder.name)}
            title={`Sposta dentro ${subfolder.name}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#2A2C31] hover:bg-[#32353B] active:scale-95 text-xs font-semibold text-[#EAEBED] border border-[#3A3D45] flex-shrink-0 transition-all shadow-sm"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[130px]">{subfolder.name}</span>
          </button>
        ))}

        {/* 5. Recent destination targets */}
        {recentFolders.map((rec) => {
          if (rec.id === currentFolderId) return null;
          return (
            <button
              key={rec.id}
              onClick={() => handleQuickMove(rec.id, rec.name)}
              title={`Recente: ${rec.name}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#18191B]/80 hover:bg-[#2A2C31] active:scale-95 text-xs font-medium text-[#9A9DA5] hover:text-[#EAEBED] border border-[#2F3136] flex-shrink-0 transition-all"
            >
              <Clock className="w-3 h-3 text-[#9A9DA5]" />
              <span className="truncate max-w-[120px]">{rec.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
