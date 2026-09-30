import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  FolderTree,
  HardDrive,
  RefreshCw,
  FolderInput,
  ShieldAlert,
  Edit3,
  Columns,
  Check,
  ArrowRight,
  ArrowRightLeft,
  FolderPlus,
  Layers,
  Sparkles,
  MoveRight,
} from 'lucide-react';
import { DriveFile, DriveBreadcrumb, FolderStats } from '../types/drive';
import {
  listFilesAndFolders,
  getBreadcrumbs,
  listAllFolders,
} from '../services/driveApi';
import { getFileIcon, formatItalianDate, getFileOrFolderSizeLabel } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';
import { HighlightedText } from './HighlightedText';

export interface PaneState {
  id: string;
  folderId: string;
  folderName: string;
  breadcrumbs: DriveBreadcrumb[];
  files: DriveFile[];
  isLoading: boolean;
  searchQuery: string;
  selectedIds: Set<string>;
  showTree: boolean;
}

interface MultiPaneViewProps {
  accessToken: string;
  initialFolderId?: string;
  folderStatsMap: Record<string, FolderStats>;
  onCalculateFolderSize: (file: DriveFile) => void;
  onExecuteMove: (
    filesToMove: DriveFile[],
    targetFolderId: string,
    targetFolderName: string
  ) => Promise<void>;
  onInspectFile: (file: DriveFile) => void;
  onOpenBatchRename: (files: DriveFile[]) => void;
  onQuickQuarantine: (files: DriveFile[]) => void;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

/**
 * Interactive Tree Node component for browsing the Google Drive folder structure
 */
interface TreeNodeProps {
  id: string;
  name: string;
  level: number;
  activeFolderId: string;
  onSelect: (folderId: string) => void;
  accessToken: string;
  hapticsEnabled: boolean;
}

const FolderTreeNodeItem: React.FC<TreeNodeProps> = ({
  id,
  name,
  level,
  activeFolderId,
  onSelect,
  accessToken,
  hapticsEnabled,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const isActive = activeFolderId === id;

  const handleToggleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('tick', hapticsEnabled);
    if (!isExpanded && !hasLoaded) {
      setLoading(true);
      try {
        const subfolders = await listAllFolders(accessToken, id);
        setChildren(subfolders);
        setHasLoaded(true);
      } catch (err) {
        console.error('Error fetching subfolders in tree:', err);
      } finally {
        setLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const handleSelectFolder = () => {
    triggerHaptic('snap', hapticsEnabled);
    onSelect(id);
  };

  return (
    <div>
      <div
        onClick={handleSelectFolder}
        style={{ paddingLeft: `${Math.min(level * 16 + 8, 80)}px` }}
        className={`flex items-center gap-2 py-1.5 pr-2 rounded-xl text-xs transition-colors cursor-pointer select-none group ${
          isActive
            ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
            : 'text-[#9A9DA5] hover:text-[#EAEBED] hover:bg-[#2A2C31]'
        }`}
      >
        <button
          onClick={handleToggleExpand}
          className="w-5 h-5 rounded hover:bg-[#3A3D45]/60 flex items-center justify-center text-[#9A9DA5] hover:text-[#EAEBED] flex-shrink-0"
        >
          {loading ? (
            <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
          ) : isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        <FolderOpen
          className={`w-4 h-4 flex-shrink-0 ${
            isActive ? 'text-amber-400' : 'text-amber-400/70 group-hover:text-amber-400'
          }`}
        />

        <span className="truncate flex-1">{name}</span>
      </div>

      {/* Render children subfolders when expanded */}
      {isExpanded && (
        <div className="space-y-0.5">
          {children.length === 0 && !loading && (
            <div
              style={{ paddingLeft: `${level * 16 + 32}px` }}
              className="py-1 text-[11px] text-[#9A9DA5]/70 italic"
            >
              Nessuna sotto-cartella
            </div>
          )}
          {children.map((child) => (
            <FolderTreeNodeItem
              key={child.id}
              id={child.id}
              name={child.name}
              level={level + 1}
              activeFolderId={activeFolderId}
              onSelect={onSelect}
              accessToken={accessToken}
              hapticsEnabled={hapticsEnabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MultiPaneView: React.FC<MultiPaneViewProps> = ({
  accessToken,
  initialFolderId = 'root',
  folderStatsMap,
  onCalculateFolderSize,
  onExecuteMove,
  onInspectFile,
  onOpenBatchRename,
  onQuickQuarantine,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const [panes, setPanes] = useState<PaneState[]>([
    {
      id: 'pane-1',
      folderId: initialFolderId,
      folderName: 'Il mio Drive',
      breadcrumbs: [{ id: 'root', name: 'Il mio Drive' }],
      files: [],
      isLoading: true,
      searchQuery: '',
      selectedIds: new Set(),
      showTree: false,
    },
    {
      id: 'pane-2',
      folderId: initialFolderId,
      folderName: 'Il mio Drive',
      breadcrumbs: [{ id: 'root', name: 'Il mio Drive' }],
      files: [],
      isLoading: true,
      searchQuery: '',
      selectedIds: new Set(),
      showTree: false,
    },
  ]);

  const [activePaneId, setActivePaneId] = useState<string>('pane-1');
  const [dragOverTarget, setDragOverTarget] = useState<{
    paneId: string;
    folderId?: string;
  } | null>(null);

  // Load files for a specific pane
  const loadPaneFiles = async (paneId: string, folderId: string, query: string = '') => {
    setPanes((prev) =>
      prev.map((p) => (p.id === paneId ? { ...p, isLoading: true } : p))
    );

    try {
      const items = await listFilesAndFolders(accessToken, folderId, query, 'folder,modifiedTime desc');
      const crumbs = await getBreadcrumbs(accessToken, folderId);
      const currentCrumbName = crumbs[crumbs.length - 1]?.name || 'Cartella';

      setPanes((prev) =>
        prev.map((p) => {
          if (p.id !== paneId) return p;
          return {
            ...p,
            folderId,
            folderName: currentCrumbName,
            breadcrumbs: crumbs,
            files: items,
            isLoading: false,
            selectedIds: new Set(),
          };
        })
      );
    } catch (err) {
      console.error(`Error loading files for pane ${paneId}:`, err);
      setPanes((prev) =>
        prev.map((p) => (p.id === paneId ? { ...p, isLoading: false } : p))
      );
    }
  };

  // Initial load for all active panes
  useEffect(() => {
    panes.forEach((p) => {
      loadPaneFiles(p.id, p.folderId, p.searchQuery);
    });
  }, [accessToken]);

  // Add a new pane (up to 4 windows)
  const handleAddPane = (targetFolderId: string = initialFolderId, name: string = 'Il mio Drive') => {
    if (panes.length >= 4) return;
    triggerHaptic('tick', hapticsEnabled);
    playSound('pop', soundsEnabled);

    const newId = `pane-${Date.now()}`;
    const newPane: PaneState = {
      id: newId,
      folderId: targetFolderId,
      folderName: name,
      breadcrumbs: [{ id: targetFolderId, name }],
      files: [],
      isLoading: true,
      searchQuery: '',
      selectedIds: new Set(),
      showTree: false,
    };

    setPanes((prev) => [...prev, newPane]);
    setActivePaneId(newId);
    loadPaneFiles(newId, targetFolderId);
  };

  // Close a pane
  const handleClosePane = (paneId: string) => {
    if (panes.length <= 1) return;
    triggerHaptic('tick', hapticsEnabled);
    setPanes((prev) => prev.filter((p) => p.id !== paneId));
    if (activePaneId === paneId) {
      const remaining = panes.filter((p) => p.id !== paneId);
      if (remaining.length > 0) setActivePaneId(remaining[0].id);
    }
  };

  // Toggle folder tree in a pane
  const handleTogglePaneTree = (paneId: string) => {
    triggerHaptic('tick', hapticsEnabled);
    setPanes((prev) =>
      prev.map((p) => (p.id === paneId ? { ...p, showTree: !p.showTree } : p))
    );
  };

  // Navigate folder inside a pane
  const handleNavigatePane = (paneId: string, targetFolderId: string) => {
    triggerHaptic('tick', hapticsEnabled);
    playSound('click', soundsEnabled);
    loadPaneFiles(paneId, targetFolderId);
  };

  // Toggle selection in a pane
  const handleTogglePaneSelect = (paneId: string, fileId: string) => {
    triggerHaptic('snap', hapticsEnabled);
    setPanes((prev) =>
      prev.map((p) => {
        if (p.id !== paneId) return p;
        const nextSet = new Set(p.selectedIds);
        if (nextSet.has(fileId)) nextSet.delete(fileId);
        else nextSet.add(fileId);
        return { ...p, selectedIds: nextSet };
      })
    );
  };

  // Move items (single or multiple) to a target pane with 1 click
  const handleMoveItemsToPane = async (
    items: DriveFile[],
    sourcePane: PaneState,
    destPane: PaneState,
    destSubfolder?: DriveFile
  ) => {
    if (items.length === 0) return;
    const destFolderId = destSubfolder?.id || destPane.folderId;
    const destFolderName = destSubfolder?.name || destPane.folderName;

    // Prevent moving into the exact same folder
    if (sourcePane.folderId === destFolderId && !destSubfolder) {
      return;
    }

    triggerHaptic('doublePulse', hapticsEnabled);
    playSound('pop', soundsEnabled);

    await onExecuteMove(items, destFolderId, destFolderName);

    // Refresh both source and destination panes
    loadPaneFiles(sourcePane.id, sourcePane.folderId);
    loadPaneFiles(destPane.id, destPane.folderId);
  };

  // Drag and Drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    sourcePaneId: string,
    file: DriveFile
  ) => {
    triggerHaptic('tick', hapticsEnabled);
    const pane = panes.find((p) => p.id === sourcePaneId);
    let selectedFiles = pane?.files.filter((f) => pane.selectedIds.has(f.id)) || [];
    if (!pane?.selectedIds.has(file.id)) {
      selectedFiles = [file];
    }

    const payload = JSON.stringify({
      sourcePaneId,
      files: selectedFiles.map((f) => ({
        id: f.id,
        name: f.name,
        isFolder: f.isFolder,
        currentParentId: sourcePaneId ? pane?.folderId : f.parents?.[0],
      })),
    });

    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (
    e: React.DragEvent,
    targetPaneId: string,
    targetFolderId?: string
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (
      dragOverTarget?.paneId !== targetPaneId ||
      dragOverTarget?.folderId !== targetFolderId
    ) {
      setDragOverTarget({ paneId: targetPaneId, folderId: targetFolderId });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetPane: PaneState,
    targetFolderOverride?: DriveFile
  ) => {
    e.preventDefault();
    setDragOverTarget(null);

    const rawData =
      e.dataTransfer.getData('application/json') ||
      e.dataTransfer.getData('text/plain');

    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      const sourcePaneId = data.sourcePaneId;
      const draggedFilesData: { id: string; name: string; isFolder?: boolean; currentParentId?: string }[] =
        data.files || [];

      if (draggedFilesData.length === 0) return;

      const destFolderId = targetFolderOverride?.id || targetPane.folderId;
      const destFolderName = targetFolderOverride?.name || targetPane.folderName;

      const sourcePane = panes.find((p) => p.id === sourcePaneId);
      const actualFilesToMove: DriveFile[] = (sourcePane?.files || []).filter((f) =>
        draggedFilesData.some((df) => df.id === f.id)
      );

      // If dropped onto the same folder, ignore
      if (sourcePane?.folderId === destFolderId && !targetFolderOverride) {
        return;
      }

      triggerHaptic('doublePulse', hapticsEnabled);
      playSound('pop', soundsEnabled);

      await onExecuteMove(
        actualFilesToMove.length > 0
          ? actualFilesToMove
          : draggedFilesData.map((df) => ({
              id: df.id,
              name: df.name,
              mimeType: df.isFolder ? 'application/vnd.google-apps.folder' : '',
              isFolder: Boolean(df.isFolder),
            })),
        destFolderId,
        destFolderName
      );

      // Reload both source and target panes
      if (sourcePaneId) {
        const sp = panes.find((p) => p.id === sourcePaneId);
        if (sp) loadPaneFiles(sp.id, sp.folderId);
      }
      loadPaneFiles(targetPane.id, targetPane.folderId);
    } catch (err) {
      console.error('Error handling drag drop:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Multi-Pane Control Bar */}
      <div className="p-4 rounded-3xl bg-[#222428] border border-[#2F3136] shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Columns className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#EAEBED]">
                  Schermate Finestre Vicine (Struttura Drive)
                </h2>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-900/40 font-mono">
                  {panes.length} finestre attive
                </span>
              </div>
              <p className="text-xs text-[#9A9DA5] mt-0.5">
                Apri la struttura di cartelle diverse in schermate vicine per trascinare o spostare file e cartelle da una parte all'altra con un tocco.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {panes.length < 4 && (
              <button
                onClick={() => handleAddPane()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/50 text-xs font-bold transition-all shadow-sm active:scale-95"
                title="Aggiungi una finestra vicina affiancata"
              >
                <Plus className="w-4 h-4" />
                <span>+ Aggiungi Finestra Vicina</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-Side Windows Grid */}
      <div
        className={`grid gap-4 ${
          panes.length === 1
            ? 'grid-cols-1'
            : panes.length === 2
            ? 'grid-cols-1 lg:grid-cols-2'
            : panes.length === 3
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {panes.map((pane, index) => {
          const isActive = pane.id === activePaneId;
          const isDragTarget = dragOverTarget?.paneId === pane.id && !dragOverTarget?.folderId;
          const selectedFiles = pane.files.filter((f) => pane.selectedIds.has(f.id));

          // Find adjacent target panes to which items can be moved
          const otherPanes = panes.filter((p) => p.id !== pane.id);
          const primaryOtherPane = otherPanes[0];

          return (
            <div
              key={pane.id}
              onClick={() => setActivePaneId(pane.id)}
              onDragOver={(e) => handleDragOver(e, pane.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, pane)}
              className={`rounded-3xl border transition-all flex flex-col min-h-[560px] overflow-hidden ${
                isDragTarget
                  ? 'border-emerald-400 ring-4 ring-emerald-500/30 bg-emerald-950/20 shadow-2xl scale-[1.01]'
                  : isActive
                  ? 'bg-[#222428] border-amber-500/60 shadow-xl'
                  : 'bg-[#1E2024] border-[#2F3136] hover:border-[#3A3D45]'
              }`}
            >
              {/* Window Header */}
              <div className="p-3.5 border-b border-[#2F3136] bg-[#18191B]/90 space-y-2 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-6 h-6 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-bold font-mono flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                      {index + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#EAEBED] truncate flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate">{pane.folderName}</span>
                      </div>
                      <div className="text-[10px] text-[#9A9DA5]">
                        Finestra {index + 1} • {pane.files.length} elementi
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Toggle Folder Tree Structure Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePaneTree(pane.id);
                      }}
                      title="Sfoglia l'albero della struttura Drive"
                      className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                        pane.showTree
                          ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                          : 'bg-[#2A2C31] hover:bg-[#32353B] text-amber-300 border-[#3A3D45]'
                      }`}
                    >
                      <FolderTree className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Struttura</span>
                    </button>

                    {/* Refresh Window */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadPaneFiles(pane.id, pane.folderId);
                      }}
                      title="Ricarica questa finestra"
                      className="w-7 h-7 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-[#9A9DA5] hover:text-[#EAEBED] border border-[#3A3D45] flex items-center justify-center transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${pane.isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Close Window */}
                    {panes.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClosePane(pane.id);
                        }}
                        title="Chiudi questa finestra"
                        className="w-7 h-7 rounded-xl bg-[#2A2C31] hover:bg-red-950/40 text-[#9A9DA5] hover:text-[#E31B23] border border-[#3A3D45] flex items-center justify-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Breadcrumbs Navigation */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px] font-medium text-[#9A9DA5] py-0.5">
                  {pane.breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#3F4248]" />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigatePane(pane.id, crumb.id);
                        }}
                        className={`hover:text-[#EAEBED] truncate max-w-[130px] transition-colors ${
                          idx === pane.breadcrumbs.length - 1
                            ? 'text-amber-400 font-bold'
                            : 'text-[#9A9DA5]'
                        }`}
                        title={crumb.name}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Expandable Drive Folder Structure Tree Panel */}
              {pane.showTree && (
                <div className="p-3 bg-[#161719] border-b border-[#2F3136] max-h-56 overflow-y-auto space-y-1 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2F3136]/60 text-[10px] font-bold text-[#9A9DA5] uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-amber-400">
                      <FolderTree className="w-3.5 h-3.5" /> Albero Struttura Drive
                    </span>
                    <button
                      onClick={() => handleTogglePaneTree(pane.id)}
                      className="text-[#9A9DA5] hover:text-[#EAEBED]"
                    >
                      Chiudi
                    </button>
                  </div>

                  {/* Root and tree explorer */}
                  <FolderTreeNodeItem
                    id="root"
                    name="Il mio Drive (Radice)"
                    level={0}
                    activeFolderId={pane.folderId}
                    onSelect={(fId) => {
                      handleNavigatePane(pane.id, fId);
                    }}
                    accessToken={accessToken}
                    hapticsEnabled={hapticsEnabled}
                  />
                </div>
              )}

              {/* Multi-Selection Move Shelf to Adjacent Window */}
              {pane.selectedIds.size > 0 && otherPanes.length > 0 && (
                <div className="p-2.5 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-fadeIn">
                  <div className="font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>{pane.selectedIds.size} selezionati</span>
                  </div>

                  {/* 1-Click Move All Selected to other pane */}
                  <div className="flex items-center gap-1.5">
                    {otherPanes.map((targetP) => {
                      const tIndex = panes.findIndex((p) => p.id === targetP.id);
                      return (
                        <button
                          key={targetP.id}
                          onClick={() => handleMoveItemsToPane(selectedFiles, pane, targetP)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-transform active:scale-95"
                          title={`Sposta tutti i selezionati nella Finestra ${tIndex + 1} (${targetP.folderName})`}
                        >
                          <span>Sposta in Finestra {tIndex + 1}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drag Over Visual Indicator */}
              {isDragTarget && (
                <div className="p-3 bg-emerald-950/60 border-b border-emerald-500/50 flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold animate-pulse">
                  <MoveRight className="w-4 h-4 text-emerald-400" />
                  <span>Rilascia qui per spostare in "{pane.folderName}"</span>
                </div>
              )}

              {/* Items List (Files & Folders) */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 no-scrollbar">
                {pane.isLoading ? (
                  <div className="py-20 text-center text-xs text-[#9A9DA5] flex flex-col items-center justify-center">
                    <RefreshCw className="w-7 h-7 animate-spin text-amber-400 mb-2" />
                    <span>Caricamento cartella...</span>
                  </div>
                ) : pane.files.length === 0 ? (
                  <div className="py-20 text-center text-xs text-[#9A9DA5] flex flex-col items-center justify-center border-2 border-dashed border-[#2F3136] rounded-3xl m-2">
                    <FolderOpen className="w-10 h-10 text-[#3F4248] mb-2" />
                    <span className="font-bold text-[#EAEBED] text-sm">Cartella vuota</span>
                    <span className="text-xs mt-1 text-[#9A9DA5] max-w-xs">
                      Trascina qui file o cartelle da una finestra vicina, o usa il pulsante "Sposta" per trasferirli subito qui.
                    </span>
                  </div>
                ) : (
                  pane.files.map((file) => {
                    const isSelected = pane.selectedIds.has(file.id);
                    const sizeLabel = getFileOrFolderSizeLabel(file, folderStatsMap[file.id]);
                    const isFolderTarget =
                      dragOverTarget?.paneId === pane.id &&
                      dragOverTarget?.folderId === file.id;

                    return (
                      <div
                        key={file.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, pane.id, file)}
                        onDragOver={(e) => {
                          if (file.isFolder) {
                            e.stopPropagation();
                            handleDragOver(e, pane.id, file.id);
                          }
                        }}
                        onDrop={(e) => {
                          if (file.isFolder) {
                            e.stopPropagation();
                            handleDrop(e, pane, file);
                          }
                        }}
                        onClick={() => {
                          if (file.isFolder) {
                            handleNavigatePane(pane.id, file.id);
                          } else {
                            onInspectFile(file);
                          }
                        }}
                        className={`p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing flex items-center justify-between select-none ${
                          isFolderTarget
                            ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400 animate-pulse'
                            : isSelected
                            ? 'bg-[#E31B23]/15 border-[#E31B23] text-[#EAEBED]'
                            : 'bg-[#222428] hover:bg-[#2A2C31] border-[#2F3136]'
                        }`}
                      >
                        {/* Checkbox, Icon & Title */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePaneSelect(pane.id, file.id);
                            }}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? 'bg-[#E31B23] border-[#E31B23] text-white'
                                : 'border-[#3F4248] bg-transparent hover:border-amber-400'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" strokeWidth={2.5} />}
                          </button>

                          <div
                            onClick={(e) => {
                              if (file.isFolder) {
                                e.stopPropagation();
                                handleNavigatePane(pane.id, file.id);
                              }
                            }}
                            className={`w-9 h-9 rounded-xl bg-[#1E2024] flex items-center justify-center border border-[#3A3D45]/50 flex-shrink-0 ${
                              file.isFolder ? 'hover:border-amber-400 cursor-pointer' : ''
                            }`}
                          >
                            {getFileIcon(file)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-xs font-semibold truncate ${
                                file.isFolder ? 'text-[#EAEBED] hover:text-amber-300' : 'text-[#EAEBED]'
                              }`}
                              title={file.name}
                            >
                              <HighlightedText text={file.name} query={pane.searchQuery} />
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#9A9DA5] font-mono mt-0.5">
                              {file.isFolder ? (
                                <span className="text-amber-400 font-bold">
                                  {sizeLabel.label}
                                </span>
                              ) : (
                                <span>{sizeLabel.label}</span>
                              )}
                              <span>•</span>
                              <span>{formatItalianDate(file.modifiedTime)}</span>
                              {file.isFolder && (
                                <span className="px-1 py-0.2 rounded bg-amber-500/15 text-[8px] uppercase font-bold text-amber-400">
                                  Cartella
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick 1-Click Move Action to Adjacent Window */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {otherPanes.map((targetP) => {
                            const targetIdx = panes.findIndex((p) => p.id === targetP.id);
                            return (
                              <button
                                key={targetP.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveItemsToPane([file], pane, targetP);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#2A2C31] hover:bg-amber-500/25 hover:text-amber-300 text-[#9A9DA5] border border-[#3A3D45] hover:border-amber-500/50 text-[10px] font-bold transition-all shadow-sm active:scale-95"
                                title={`Sposta "${file.name}" nella Finestra ${targetIdx + 1} (${targetP.folderName})`}
                              >
                                <span>Finestra {targetIdx + 1}</span>
                                <ArrowRight className="w-3 h-3 text-amber-400" />
                              </button>
                            );
                          })}

                          {/* Open subfolder deeper in this window */}
                          {file.isFolder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigatePane(pane.id, file.id);
                              }}
                              className="px-2 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 ml-1"
                              title={`Entra nella cartella ${file.name}`}
                            >
                              <span>Entra</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
