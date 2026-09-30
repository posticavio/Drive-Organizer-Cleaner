import React, { useState, useEffect } from 'react';
import {
  X,
  Folder,
  FolderPlus,
  FolderInput,
  Check,
  ChevronRight,
  ShieldAlert,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { DriveFile } from '../types/drive';
import { listAllFolders, createFolder } from '../services/driveApi';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface MoveFolderModalProps {
  filesToMove: DriveFile[];
  currentFolderId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmMove: (targetFolderId: string, targetFolderName: string) => Promise<void>;
  accessToken: string;
  quarantineFolderId?: string;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const MoveFolderModal: React.FC<MoveFolderModalProps> = ({
  filesToMove,
  currentFolderId,
  isOpen,
  onClose,
  onConfirmMove,
  accessToken,
  quarantineFolderId,
  hapticsEnabled,
  soundsEnabled,
}) => {
  if (!isOpen || filesToMove.length === 0) return null;

  const [activeFolderId, setActiveFolderId] = useState<string>('root');
  const [activeFolderName, setActiveFolderName] = useState<string>('Il mio Drive');
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'Il mio Drive' },
  ]);
  const [subFolders, setSubFolders] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New folder inline form
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Load subfolders when activeFolderId changes
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const folders = await listAllFolders(accessToken, activeFolderId);
        if (isMounted) {
          // Exclude files that are currently being moved if they are folders
          const movingIds = new Set(filesToMove.map((f) => f.id));
          setSubFolders(folders.filter((f) => !movingIds.has(f.id)));
        }
      } catch (err) {
        console.error('Error listing folders:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [activeFolderId, accessToken, filesToMove]);

  const handleEnterSubfolder = (folder: DriveFile) => {
    triggerHaptic('tick', hapticsEnabled);
    playSound('click', soundsEnabled);
    setActiveFolderId(folder.id);
    setActiveFolderName(folder.name);
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleJumpToHistory = (index: number) => {
    triggerHaptic('tick', hapticsEnabled);
    const target = folderHistory[index];
    setActiveFolderId(target.id);
    setActiveFolderName(target.name);
    setFolderHistory((prev) => prev.slice(0, index + 1));
  };

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    try {
      setIsLoading(true);
      triggerHaptic('snap', hapticsEnabled);
      playSound('pop', soundsEnabled);
      const newFolder = await createFolder(accessToken, trimmed, activeFolderId);
      setNewFolderName('');
      setIsCreatingFolder(false);
      setSubFolders((prev) => [newFolder, ...prev]);
    } catch (err) {
      triggerHaptic('error', hapticsEnabled);
      console.error('Failed to create folder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (activeFolderId === currentFolderId) return;
    try {
      setIsSubmitting(true);
      triggerHaptic('snap', hapticsEnabled);
      playSound('pop', soundsEnabled);
      await onConfirmMove(activeFolderId, activeFolderName);
      onClose();
    } catch (err) {
      triggerHaptic('error', hapticsEnabled);
      console.error('Move error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentLocation = activeFolderId === currentFolderId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#1E2024] rounded-3xl border border-[#2F3136] shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-[#2F3136] bg-[#18191B]/80 flex-shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <FolderInput className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <h2 className="text-sm md:text-base font-bold text-[#EAEBED] truncate">
              Sposta {filesToMove.length} {filesToMove.length === 1 ? 'elemento' : 'elementi'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#222428] hover:bg-[#2A2C31] border border-[#2F3136] flex items-center justify-center text-[#9A9DA5] hover:text-[#EAEBED]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Breadcrumb Path */}
        <div className="px-4 py-2 bg-[#18191B]/40 border-b border-[#2F3136] flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          {folderHistory.map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#9A9DA5] flex-shrink-0" />}
              <button
                onClick={() => handleJumpToHistory(idx)}
                className={`px-2 py-1 rounded-lg truncate max-w-[120px] transition-colors ${
                  idx === folderHistory.length - 1
                    ? 'font-bold text-[#EAEBED] bg-[#2A2C31]'
                    : 'text-[#9A9DA5] hover:text-[#EAEBED]'
                }`}
              >
                {item.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Content: List of subfolders + New Folder action */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Quick Destination: Quarantine Folder shortcut */}
          {quarantineFolderId && activeFolderId !== quarantineFolderId && (
            <button
              onClick={() => {
                triggerHaptic('tick', hapticsEnabled);
                setActiveFolderId(quarantineFolderId);
                setActiveFolderName('_Da Cancellare (Quarantena)');
                setFolderHistory((prev) => [
                  ...prev,
                  { id: quarantineFolderId, name: '_Da Cancellare (Quarantena)' },
                ]);
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-left transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#E31B23]" />
                <div>
                  <div className="text-xs font-bold text-[#EAEBED]">
                    Cartella di Quarantena
                  </div>
                  <div className="text-[10px] text-[#9A9DA5]">
                    _Da Cancellare (Quarantena)
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9A9DA5]" />
            </button>
          )}

          {/* New folder button or inline input */}
          {isCreatingFolder ? (
            <div className="p-3 rounded-2xl bg-[#222428] border border-[#3A3D45] flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nome nuova cartella..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setIsCreatingFolder(false);
                }}
                className="flex-1 bg-[#18191B] border border-[#2F3136] px-3 py-1.5 rounded-xl text-xs text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
              />
              <button
                onClick={handleCreateFolder}
                className="px-3 py-1.5 bg-[#E31B23] text-white rounded-xl text-xs font-bold"
              >
                Crea
              </button>
              <button
                onClick={() => setIsCreatingFolder(false)}
                className="px-2 py-1.5 text-[#9A9DA5] hover:text-[#EAEBED] text-xs"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#222428] hover:bg-[#2A2C31] border border-dashed border-[#3A3D45] text-xs font-semibold text-[#9A9DA5] hover:text-[#EAEBED] transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-amber-400" />
              Crea Nuova Cartella qui dentro
            </button>
          )}

          {/* Subfolders list */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9DA5] px-1">
              Sottocartelle disponibili
            </div>

            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-[#9A9DA5] gap-2 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-[#E31B23]" />
                Caricamento cartelle...
              </div>
            ) : subFolders.length === 0 ? (
              <div className="py-6 text-center text-[#9A9DA5] text-xs">
                Nessuna sottocartella trovata in questa posizione.
              </div>
            ) : (
              <div className="rounded-2xl bg-[#222428] border border-[#2F3136] divide-y divide-[#2F3136]/60 overflow-hidden">
                {subFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleEnterSubfolder(folder)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-[#2A2C31] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-semibold text-[#EAEBED] truncate">
                        {folder.name}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9A9DA5] flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2F3136] bg-[#18191B]/95 flex items-center justify-between gap-3">
          <div className="text-xs text-[#9A9DA5] truncate">
            Destinazione: <strong className="text-[#EAEBED]">{activeFolderName}</strong>
          </div>

          <button
            onClick={handleConfirm}
            disabled={isSubmitting || isCurrentLocation}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#E31B23] hover:bg-red-600 active:scale-98 text-white font-bold text-xs shadow-lg shadow-red-950/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isCurrentLocation ? 'Già in questa cartella' : 'Sposta qui'}
          </button>
        </div>
      </div>
    </div>
  );
};
