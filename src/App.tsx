import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './lib/firebase';
import {
  DriveFile,
  DriveBreadcrumb,
  DriveStorageQuota,
  UserSettings,
  AuditLogItem,
  FolderStats,
  NavigationTab,
} from './types/drive';
import {
  listFilesAndFolders,
  getBreadcrumbs,
  getOrCreateQuarantineFolder,
  moveFiles,
  renameFile,
  createFolder,
  getDriveAbout,
  getFolderSizeInfo,
} from './services/driveApi';
import { triggerHaptic } from './lib/haptics';
import { playSound } from './lib/sound';

// Components
import { DriveHeader } from './components/DriveHeader';
import { Sidebar } from './components/Sidebar';
import { FileItemCard } from './components/FileItemCard';
import { TableView } from './components/TableView';
import { GridView } from './components/GridView';
import { KanbanView } from './components/KanbanView';
import { MultiPaneView } from './components/MultiPaneView';
import { InspectorPanel } from './components/InspectorPanel';
import { BatchRenameModal } from './components/BatchRenameModal';
import { MoveFolderModal } from './components/MoveFolderModal';
import { QuarantineFolderView } from './components/QuarantineFolderView';
import { SettingsModal } from './components/SettingsModal';
import { CommandPalette } from './components/CommandPalette';
import { ContextMenu } from './components/ContextMenu';
import { FloatingUndoPill } from './components/FloatingUndoPill';
import { OneUIConfirmationModal } from './components/OneUIConfirmationModal';
import { MobileBottomBar } from './components/MobileBottomBar';
import { LoginScreen } from './components/LoginScreen';
import { DriveStatsBar } from './components/DriveStatsBar';
import { AuditHistoryModal } from './components/AuditHistoryModal';
import { QuickMoveShelf } from './components/QuickMoveShelf';
import { AICleanupView } from './components/AICleanupView';
import { DuplicateFilesBanner } from './components/DuplicateFilesBanner';
import { QuickPreviewModal } from './components/QuickPreviewModal';
import { detectDuplicates } from './lib/duplicates';
import { AICleanupResult } from './types/drive';
import { fetchAICleanupSuggestions } from './services/aiService';

import {
  ChevronRight,
  FolderPlus,
  RefreshCw,
  Folder,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Info,
  Columns,
} from 'lucide-react';

const DEFAULT_SETTINGS: UserSettings = {
  density: 'comfort',
  viewMode: 'list',
  quarantineFolderName: '_Da Cancellare (Quarantena)',
  hapticsEnabled: true,
  soundsEnabled: true,
  amoledMode: true,
  confirmBeforeMoving: true,
};

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('drive_organizer_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('drive_organizer_settings', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Drive Navigation & Files
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([
    { id: 'root', name: 'Il mio Drive' },
  ]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [quarantineFolder, setQuarantineFolder] = useState<DriveFile | null>(null);
  const [quarantineFiles, setQuarantineFiles] = useState<DriveFile[]>([]);
  const [storageQuota, setStorageQuota] = useState<DriveStorageQuota | undefined>();
  const [folderStatsMap, setFolderStatsMap] = useState<Record<string, FolderStats>>({});

  // UI Selection & Views
  const [currentTab, setCurrentTab] = useState<NavigationTab>('drive');
  const [viewMode, setViewMode] = useState<'list' | 'table' | 'grid' | 'kanban' | 'split'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inspectedFile, setInspectedFile] = useState<DriveFile | null>(null);

  // AI Cleanup State
  const [aiResult, setAiResult] = useState<AICleanupResult | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDuplicateFilterActive, setIsDuplicateFilterActive] = useState(false);

  // Desktop Rail vs Full Sidebar & Mobile Drawer
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals
  const [isBatchRenameOpen, setIsBatchRenameOpen] = useState(false);
  const [batchRenameTargetFiles, setBatchRenameTargetFiles] = useState<DriveFile[]>([]);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTargetFiles, setMoveTargetFiles] = useState<DriveFile[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [quickPreviewFile, setQuickPreviewFile] = useState<DriveFile | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('drive_organizer_audit');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const addAuditLog = (
    action: AuditLogItem['action'],
    file: DriveFile,
    oldValue?: string,
    newValue?: string,
    details?: string
  ) => {
    const item: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      action,
      fileId: file.id,
      fileName: file.name,
      oldValue,
      newValue,
      details,
    };
    setAuditLogs((prev) => {
      const updated = [item, ...prev].slice(0, 100);
      try {
        localStorage.setItem('drive_organizer_audit', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Undo System
  const [undoPill, setUndoPill] = useState<{
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  // Confirmation Dialog
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    affectedItemsCount?: number;
    itemNames?: string[];
    confirmLabel: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Conferma',
    onConfirm: () => {},
  });

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    file: DriveFile | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    file: null,
  });

  // Scroll to top ref
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, accessToken) => {
        setUser(authedUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Accesso non riuscito.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
  };

  // 2. Fetch Drive Data on folder or token change
  const loadDriveData = async (folderId: string = currentFolderId) => {
    if (!token) return;
    try {
      setIsLoadingFiles(true);

      // Load or find Quarantine Folder in root
      const qFolder = await getOrCreateQuarantineFolder(
        token,
        settings.quarantineFolderName
      );
      setQuarantineFolder(qFolder);

      // Load files for current folder
      const currentItems = await listFilesAndFolders(
        token,
        folderId,
        searchQuery,
        'folder,modifiedTime desc'
      );
      setFiles(currentItems);

      // Load files currently parked in quarantine folder
      if (qFolder) {
        const qItems = await listFilesAndFolders(token, qFolder.id, '', 'modifiedTime desc');
        setQuarantineFiles(qItems);
      }

      // Load breadcrumbs
      const crumbs = await getBreadcrumbs(token, folderId);
      setBreadcrumbs(crumbs);

      // Load quota
      const about = await getDriveAbout(token);
      if (about.storageQuota) {
        setStorageQuota(about.storageQuota);
      }
    } catch (err: any) {
      console.error('Error loading Drive data:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDriveData(currentFolderId);
    }
  }, [token, currentFolderId, searchQuery]);

  // Calculate Folder Size on demand
  const handleCalculateFolderSize = async (folder: DriveFile) => {
    if (!token) return;
    setFolderStatsMap((prev) => ({
      ...prev,
      [folder.id]: {
        ...(prev[folder.id] || { totalBytes: 0, itemCount: 0, fileCount: 0, subfolderCount: 0 }),
        loading: true,
      },
    }));

    try {
      const stats = await getFolderSizeInfo(token, folder.id);
      setFolderStatsMap((prev) => ({
        ...prev,
        [folder.id]: stats,
      }));
    } catch (err) {
      console.error(`Error calculating size for folder ${folder.name}:`, err);
      setFolderStatsMap((prev) => ({
        ...prev,
        [folder.id]: {
          ...(prev[folder.id] || { totalBytes: 0, itemCount: 0, fileCount: 0, subfolderCount: 0 }),
          loading: false,
        },
      }));
    }
  };

  // Background scanner for visible folder sizes
  useEffect(() => {
    if (!token) return;
    const folderList = [...files, ...quarantineFiles].filter((f) => f.isFolder);
    if (folderList.length === 0) return;

    let isMounted = true;
    const scanFolders = async () => {
      for (const folder of folderList) {
        if (!isMounted) break;
        if (folderStatsMap[folder.id] && !folderStatsMap[folder.id].loading) {
          continue;
        }
        try {
          const stats = await getFolderSizeInfo(token, folder.id);
          if (isMounted) {
            setFolderStatsMap((prev) => ({ ...prev, [folder.id]: stats }));
          }
        } catch {}
      }
    };

    scanFolders();
    return () => {
      isMounted = false;
    };
  }, [files, quarantineFiles, token]);

  // Quick Preview modal opener
  const handleOpenQuickPreview = (file: DriveFile) => {
    triggerHaptic('tick', settings.hapticsEnabled);
    playSound('pop', settings.soundsEnabled);
    setQuickPreviewFile(file);
  };

  // Navigate into folder
  const handleEnterFolder = (folder: DriveFile) => {
    triggerHaptic('tick', settings.hapticsEnabled);
    playSound('click', settings.soundsEnabled);
    setCurrentFolderId(folder.id);
    setSelectedIds(new Set());
    setInspectedFile(null);
    setQuickPreviewFile(null);
    setIsDuplicateFilterActive(false);
  };

  // Breadcrumb navigation
  const handleBreadcrumbClick = (folderId: string) => {
    triggerHaptic('tick', settings.hapticsEnabled);
    playSound('click', settings.soundsEnabled);
    setCurrentFolderId(folderId);
    setSelectedIds(new Set());
    setInspectedFile(null);
    setQuickPreviewFile(null);
    setIsDuplicateFilterActive(false);
  };

  // Selection toggle
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    triggerHaptic('tick', settings.hapticsEnabled);
    setSelectedIds(new Set(displayFiles.map((f) => f.id)));
  };

  const handleClearSelection = () => {
    triggerHaptic('tick', settings.hapticsEnabled);
    setSelectedIds(new Set());
  };

  // Context Menu trigger
  const handleContextMenu = (e: React.MouseEvent, file: DriveFile) => {
    e.preventDefault();
    triggerHaptic('tick', settings.hapticsEnabled);
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      file,
    });
  };

  // CORE OPERATION: Move to Quarantine (Never delete!)
  const executeMoveToQuarantine = async (filesToMove: DriveFile[]) => {
    if (!token || !quarantineFolder || filesToMove.length === 0) return;

    try {
      setIsLoadingFiles(true);
      const itemsToPatch = filesToMove.map((f) => ({
        id: f.id,
        currentParentId: currentFolderId,
      }));

      await moveFiles(token, itemsToPatch, quarantineFolder.id);

      filesToMove.forEach((f) => {
        addAuditLog(
          'quarantine',
          f,
          undefined,
          undefined,
          `Spostato in sicurezza nella cartella ${quarantineFolder.name}`
        );
      });

      triggerHaptic('doublePulse', settings.hapticsEnabled);
      playSound('quarantine', settings.soundsEnabled);

      // Register Undo Pill
      setUndoPill({
        message: `${filesToMove.length} file spostati in Quarantena`,
        action: async () => {
          if (!token) return;
          const undoItems = filesToMove.map((f) => ({
            id: f.id,
            currentParentId: quarantineFolder.id,
          }));
          await moveFiles(token, undoItems, currentFolderId);
          await loadDriveData(currentFolderId);
        },
      });

      setSelectedIds(new Set());
      setInspectedFile(null);
      await loadDriveData(currentFolderId);
    } catch (err: any) {
      triggerHaptic('error', settings.hapticsEnabled);
      console.error('Error moving to quarantine:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Quarantine with optional confirmation modal
  const handlePromptQuarantine = (filesToMove: DriveFile[]) => {
    if (filesToMove.length === 0) return;

    if (settings.confirmBeforeMoving) {
      setConfirmationModal({
        isOpen: true,
        title: 'Sposta nella cartella da cancellare (Quarantena)?',
        description:
          'I file NON verranno distrutti o cancellati definitivamente: saranno isolati in modo protetto nella cartella _Da Cancellare per fare ordine nel tuo Drive.',
        affectedItemsCount: filesToMove.length,
        itemNames: filesToMove.map((f) => f.name),
        confirmLabel: `Sposta ${filesToMove.length} file in Quarantena`,
        type: 'danger',
        onConfirm: () => {
          setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
          executeMoveToQuarantine(filesToMove);
        },
      });
    } else {
      executeMoveToQuarantine(filesToMove);
    }
  };

  // CORE OPERATION: Restore from Quarantine
  const executeRestoreFiles = async (filesToRestore: DriveFile[]) => {
    if (!token || !quarantineFolder || filesToRestore.length === 0) return;

    try {
      setIsLoadingFiles(true);
      const itemsToPatch = filesToRestore.map((f) => ({
        id: f.id,
        currentParentId: quarantineFolder.id,
      }));

      // Restore to Root if original parent is not available
      const targetId = 'root';
      await moveFiles(token, itemsToPatch, targetId);

      filesToRestore.forEach((f) => {
        addAuditLog(
          'restore',
          f,
          undefined,
          undefined,
          'Ripristinato dalla Quarantena in Il mio Drive'
        );
      });

      triggerHaptic('doublePulse', settings.hapticsEnabled);
      playSound('restore', settings.soundsEnabled);

      setSelectedIds(new Set());
      setInspectedFile(null);
      await loadDriveData(currentFolderId);
    } catch (err: any) {
      triggerHaptic('error', settings.hapticsEnabled);
      console.error('Restore error:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // CORE OPERATION: Move to another folder
  const handleConfirmMoveToFolder = async (targetFolderId: string, targetFolderName: string) => {
    if (!token || moveTargetFiles.length === 0) return;

    try {
      setIsLoadingFiles(true);
      const itemsToPatch = moveTargetFiles.map((f) => ({
        id: f.id,
        currentParentId: currentFolderId,
      }));

      await moveFiles(token, itemsToPatch, targetFolderId);

      moveTargetFiles.forEach((f) => {
        addAuditLog(
          'move',
          f,
          undefined,
          undefined,
          `Spostato nella cartella ${targetFolderName}`
        );
      });

      triggerHaptic('snap', settings.hapticsEnabled);
      playSound('pop', settings.soundsEnabled);

      // Undo option
      setUndoPill({
        message: `${moveTargetFiles.length} file spostati in ${targetFolderName}`,
        action: async () => {
          if (!token) return;
          const undoItems = moveTargetFiles.map((f) => ({
            id: f.id,
            currentParentId: targetFolderId,
          }));
          await moveFiles(token, undoItems, currentFolderId);
          await loadDriveData(currentFolderId);
        },
      });

      setSelectedIds(new Set());
      setInspectedFile(null);
      setIsMoveModalOpen(false);
      await loadDriveData(currentFolderId);
    } catch (err) {
      triggerHaptic('error', settings.hapticsEnabled);
      console.error('Move error:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // AI Cleanup Analysis with Gemini
  const handleRunAICleanup = async (sensitivity: 'cautious' | 'balanced' | 'aggressive') => {
    try {
      setIsLoadingAI(true);
      triggerHaptic('snap', settings.hapticsEnabled);
      playSound('pop', settings.soundsEnabled);
      const result = await fetchAICleanupSuggestions(files, sensitivity);
      setAiResult(result);
      triggerHaptic('success', settings.hapticsEnabled);
    } catch (err) {
      triggerHaptic('error', settings.hapticsEnabled);
      console.error('AI Cleanup error:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // AI Folder Structure Organization
  const handleExecuteFolderOrganize = async (targetFolderName: string, filesToMove: DriveFile[]) => {
    if (!token || filesToMove.length === 0) return;

    try {
      setIsLoadingFiles(true);

      // Check if target folder already exists in current folder
      let existingFolder = files.find(
        (f) => f.isFolder && f.name.toLowerCase() === targetFolderName.toLowerCase()
      );

      let targetFolderId = existingFolder?.id;

      // If folder doesn't exist, create it in currentFolderId
      if (!targetFolderId) {
        const newFolder = await createFolder(token, targetFolderName, currentFolderId);
        targetFolderId = newFolder.id;
        addAuditLog('create_folder', newFolder, '', newFolder.name);
      }

      // Move files into targetFolder
      const fileMoveRequests = filesToMove.map((f) => ({
        id: f.id,
        currentParentId: currentFolderId,
      }));

      await moveFiles(token, fileMoveRequests, targetFolderId);

      for (const f of filesToMove) {
        addAuditLog('move', f, currentFolderId, targetFolderId, `Organizzazione AI in "${targetFolderName}"`);
      }

      triggerHaptic('success', settings.hapticsEnabled);
      playSound('pop', settings.soundsEnabled);

      // Floating undo pill
      setUndoPill({
        message: `${filesToMove.length} file spostati nella cartella "${targetFolderName}"`,
        action: async () => {
          if (!token) return;
          const undoRequests = filesToMove.map((f) => ({
            id: f.id,
            currentParentId: targetFolderId!,
          }));
          await moveFiles(token, undoRequests, currentFolderId);
          await loadDriveData(currentFolderId);
        },
      });

      await loadDriveData(currentFolderId);
    } catch (err) {
      triggerHaptic('error', settings.hapticsEnabled);
      console.error('Folder organize error:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // CORE OPERATION: Batch Rename & Quick Rename
  const handleApplyBatchRename = async (renames: { id: string; newName: string }[]) => {
    if (!token || renames.length === 0) return;

    try {
      setIsLoadingFiles(true);
      const previousNames = new Map<string, string>();

      for (const item of renames) {
        const fileObj = files.find((f) => f.id === item.id) || quarantineFiles.find((f) => f.id === item.id);
        if (fileObj) {
          previousNames.set(item.id, fileObj.name);
          await renameFile(token, item.id, item.newName);
          addAuditLog('rename', fileObj, fileObj.name, item.newName);
        }
      }

      triggerHaptic('success', settings.hapticsEnabled);
      playSound('pop', settings.soundsEnabled);

      // Undo rename pill
      setUndoPill({
        message: `${renames.length} file ridenominati`,
        action: async () => {
          if (!token) return;
          for (const item of renames) {
            const oldName = previousNames.get(item.id);
            if (oldName) {
              await renameFile(token, item.id, oldName);
            }
          }
          await loadDriveData(currentFolderId);
        },
      });

      await loadDriveData(currentFolderId);
    } catch (err) {
      triggerHaptic('error', settings.hapticsEnabled);
      console.error('Rename error:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Quick Rename single file
  const handleQuickRename = async (file: DriveFile, newName: string) => {
    if (!token) return;
    try {
      await renameFile(token, file.id, newName);
      addAuditLog('rename', file, file.name, newName);
      triggerHaptic('success', settings.hapticsEnabled);
      playSound('pop', settings.soundsEnabled);
      await loadDriveData(currentFolderId);
    } catch (err) {
      triggerHaptic('error', settings.hapticsEnabled);
      console.error('Quick rename error:', err);
    }
  };

  // Create new folder
  const handleCreateNewFolder = async () => {
    const folderName = window.prompt ? window.prompt('Nome nuova cartella:', 'Nuova Cartella') : 'Nuova Cartella';
    if (!token || !folderName || !folderName.trim()) return;

    try {
      setIsLoadingFiles(true);
      const newF = await createFolder(token, folderName.trim(), currentFolderId);
      addAuditLog('create_folder', newF);
      triggerHaptic('snap', settings.hapticsEnabled);
      playSound('pop', settings.soundsEnabled);
      await loadDriveData(currentFolderId);
    } catch (err) {
      triggerHaptic('error', settings.hapticsEnabled);
      console.error('Folder creation error:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Keyboard Shortcuts (Master System Instructions: Cmd+K, Cmd+B, N, Esc, J/K, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in text fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        setInspectedFile(null);
        setIsSearchOpen(false);
        setIsBatchRenameOpen(false);
        setIsMoveModalOpen(false);
        setIsSettingsOpen(false);
        setIsAuditModalOpen(false);
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateNewFolder();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [token, currentFolderId]);

  // Export Audit logs
  const handleExportAuditJson = () => {
    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-drive-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Scroll to top
  const handleScrollToTop = () => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // If user is not authenticated or token unavailable, display Login Screen
  if (needsAuth || !token) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        isLoading={isLoggingIn}
        error={authError}
      />
    );
  }

  // Analyze and tag duplicate files in current folder
  const duplicateAnalysis = useMemo(() => {
    return detectDuplicates(files);
  }, [files]);

  // Active files according to tab and duplicate filter
  const baseFiles = currentTab === 'quarantine' ? quarantineFiles : duplicateAnalysis.filesWithDuplicates;
  const displayFiles = useMemo(() => {
    if (isDuplicateFilterActive && currentTab === 'drive') {
      return baseFiles.filter(
        (f) => f.duplicateInfo?.isDuplicate || f.duplicateInfo?.isOriginal
      );
    }
    return baseFiles;
  }, [baseFiles, isDuplicateFilterActive, currentTab]);

  const handleSelectDuplicates = (duplicates: DriveFile[]) => {
    const dupIds = duplicates.map((d) => d.id);
    const allSelected = dupIds.length > 0 && dupIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        dupIds.forEach((id) => next.delete(id));
      } else {
        dupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const currentFolderName =
    currentTab === 'ai-cleanup'
      ? 'Pulizia Intelligente AI (Gemini)'
      : currentTab === 'quarantine'
      ? 'Quarantena (_Da Cancellare)'
      : breadcrumbs[breadcrumbs.length - 1]?.name || 'Il mio Drive';

  return (
    <div className="flex h-screen bg-[#18191B] text-[#EAEBED] overflow-hidden select-none">
      {/* 1. Desktop Persistent Sidebar & Mobile Drawer */}
      <Sidebar
        isOpen={isSidebarOpenMobile}
        isCollapsed={isSidebarCollapsed}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedIds(new Set());
          setInspectedFile(null);
          if (tab === 'audit') setIsAuditModalOpen(true);
          if (tab === 'rename') {
            setBatchRenameTargetFiles(files.length > 0 ? files : []);
            setIsBatchRenameOpen(true);
          }
          if (tab === 'ai-cleanup' && !aiResult) {
            handleRunAICleanup('balanced');
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={user}
        onLogout={handleLogout}
        storageQuota={storageQuota}
        quarantineCount={quarantineFiles.length}
        hapticsEnabled={settings.hapticsEnabled}
        soundsEnabled={settings.soundsEnabled}
      />

      {/* 2. Main Content Center View */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Ultra-Compact 56px Header (Rule 80/20) */}
        <DriveHeader
          title={currentFolderName}
          itemCount={displayFiles.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onToggleSidebar={() => setIsSidebarOpenMobile((prev) => !prev)}
          onRefresh={() => loadDriveData(currentFolderId)}
          onNewFolder={handleCreateNewFolder}
          isRefreshing={isLoadingFiles}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          onScrollToTop={handleScrollToTop}
          hapticsEnabled={settings.hapticsEnabled}
          soundsEnabled={settings.soundsEnabled}
          isQuarantineView={currentTab === 'quarantine'}
        />

        {/* Scrollable Viewport (Single Baseline Padding px-4 md:px-8) */}
        <main
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 py-4 pb-28 md:pb-8 no-scrollbar"
        >
          {/* Breadcrumbs Navigation (When in Drive tab) */}
          {currentTab === 'drive' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 text-xs text-[#9A9DA5]">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#9A9DA5] flex-shrink-0" />}
                  <button
                    onClick={() => handleBreadcrumbClick(crumb.id)}
                    className={`px-2.5 py-1 rounded-xl transition-colors truncate max-w-[150px] ${
                      idx === breadcrumbs.length - 1
                        ? 'font-bold text-[#EAEBED] bg-[#222428] border border-[#2F3136]'
                        : 'hover:text-[#EAEBED] hover:bg-[#222428]'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Samsung Health Styled Accordion KPI Stats Bar */}
          <DriveStatsBar
            files={files}
            quarantineCount={quarantineFiles.length}
            storageQuota={storageQuota}
            renamedCount={auditLogs.filter((l) => l.action === 'rename').length}
            folderStatsMap={folderStatsMap}
            duplicateCount={duplicateAnalysis.totalDuplicateCount}
            hapticsEnabled={settings.hapticsEnabled}
            soundsEnabled={settings.soundsEnabled}
          />

          {/* Content Display based on Tab */}
          {currentTab === 'ai-cleanup' ? (
            <AICleanupView
              files={files}
              aiResult={aiResult}
              isLoading={isLoadingAI}
              onRunAnalysis={handleRunAICleanup}
              onMoveToQuarantine={(fs) => handlePromptQuarantine(fs)}
              onExecuteFolderOrganize={handleExecuteFolderOrganize}
              hapticsEnabled={settings.hapticsEnabled}
              soundsEnabled={settings.soundsEnabled}
            />
          ) : currentTab === 'quarantine' ? (
            <QuarantineFolderView
              quarantineFolder={quarantineFolder}
              files={quarantineFiles}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              inspectedFile={inspectedFile}
              onInspectFile={setInspectedFile}
              onRestoreFiles={executeRestoreFiles}
              onContextMenu={handleContextMenu}
              onQuickRename={handleQuickRename}
              density={settings.density}
              hapticsEnabled={settings.hapticsEnabled}
              soundsEnabled={settings.soundsEnabled}
              searchQuery={searchQuery}
              onQuickPreview={handleOpenQuickPreview}
            />
          ) : currentTab === 'split' || viewMode === 'split' ? (
            token && (
              <MultiPaneView
                accessToken={token}
                initialFolderId={currentFolderId}
                folderStatsMap={folderStatsMap}
                onCalculateFolderSize={handleCalculateFolderSize}
                onExecuteMove={async (fs, targetId, targetName) => {
                  setMoveTargetFiles(fs);
                  await handleConfirmMoveToFolder(targetId, targetName);
                }}
                onInspectFile={setInspectedFile}
                onOpenBatchRename={(fs) => {
                  setBatchRenameTargetFiles(fs);
                  setIsBatchRenameOpen(true);
                }}
                onQuickQuarantine={(fs) => handlePromptQuarantine(fs)}
                hapticsEnabled={settings.hapticsEnabled}
                soundsEnabled={settings.soundsEnabled}
              />
            )
          ) : (
            <>
              {/* Quick Multi-Pane / Adjacent Windows Banner */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs mb-3 shadow-sm">
                <div className="flex items-center gap-2.5 text-amber-300 font-semibold truncate">
                  <Columns className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="truncate">
                    Sposta file e cartelle aprendo <strong>Finestre e Schermate Vicine</strong> della struttura Drive.
                  </span>
                </div>
                <button
                  onClick={() => {
                    triggerHaptic('snap', settings.hapticsEnabled);
                    playSound('pop', settings.soundsEnabled);
                    setCurrentTab('split');
                    setViewMode('split');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all active:scale-95 flex-shrink-0 ml-2"
                >
                  <span>Affianca Finestre</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Duplicate Files Identification & Quick Quarantine Banner */}
              <DuplicateFilesBanner
                duplicateFiles={duplicateAnalysis.duplicateFiles}
                duplicateGroups={duplicateAnalysis.duplicateGroups}
                totalWastedBytes={duplicateAnalysis.totalWastedBytes}
                selectedIds={selectedIds}
                onSelectDuplicates={handleSelectDuplicates}
                onQuarantineDuplicates={(dups) => handlePromptQuarantine(dups)}
                isFilterActive={isDuplicateFilterActive}
                onToggleFilterDuplicates={() => setIsDuplicateFilterActive((prev) => !prev)}
                hapticsEnabled={settings.hapticsEnabled}
                soundsEnabled={settings.soundsEnabled}
              />

              {/* Quick Move Shelf (When items are selected in Drive) */}
              {selectedIds.size > 0 && token && (
                <QuickMoveShelf
                  selectedFiles={files.filter((f) => selectedIds.has(f.id))}
                  currentFolderId={currentFolderId}
                  breadcrumbs={breadcrumbs}
                  subfoldersInView={files.filter((f) => f.isFolder)}
                  quarantineFolder={quarantineFolder}
                  onExecuteMove={async (fs, targetId, targetName) => {
                    setMoveTargetFiles(fs);
                    await handleConfirmMoveToFolder(targetId, targetName);
                  }}
                  accessToken={token}
                  hapticsEnabled={settings.hapticsEnabled}
                  soundsEnabled={settings.soundsEnabled}
                />
              )}

              {/* If files list is empty */}
              {displayFiles.length === 0 && !isLoadingFiles ? (
                <div className="py-20 text-center flex flex-col items-center justify-center p-4">
                  <div className="w-14 h-14 rounded-3xl bg-[#222428] flex items-center justify-center text-[#9A9DA5] mb-3 border border-[#2F3136]">
                    <Folder className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-bold text-[#EAEBED]">
                    Questa cartella è vuota
                  </h3>
                  <p className="text-xs text-[#9A9DA5] mt-1 max-w-xs">
                    Puoi creare nuove cartelle o trascinare file dal tuo Google Drive.
                  </p>
                </div>
              ) : (
                <>
                  {/* View Mode Switching */}
                  {viewMode === 'list' && (
                    <div className="rounded-3xl bg-[#222428] border border-[#2F3136] divide-y divide-[#2F3136]/60 overflow-hidden shadow-sm">
                      {displayFiles.map((file) => (
                        <FileItemCard
                          key={file.id}
                          file={file}
                          isSelected={selectedIds.has(file.id)}
                          isInspected={inspectedFile?.id === file.id}
                          onToggleSelect={handleToggleSelect}
                          onClick={setInspectedFile}
                          onDoubleClickFolder={handleEnterFolder}
                          onOpenFolder={handleEnterFolder}
                          onContextMenu={handleContextMenu}
                          onQuickRename={handleQuickRename}
                          onQuickQuarantine={(f) => handlePromptQuarantine([f])}
                          onMoveSelectedHere={(targetFolder) => {
                            const selected = files.filter((f) => selectedIds.has(f.id));
                            if (selected.length > 0) {
                              setMoveTargetFiles(selected);
                              handleConfirmMoveToFolder(targetFolder.id, targetFolder.name);
                            }
                          }}
                          onCalculateFolderSize={handleCalculateFolderSize}
                          folderStats={folderStatsMap[file.id]}
                          selectedCount={selectedIds.size}
                          density={settings.density}
                          hapticsEnabled={settings.hapticsEnabled}
                          soundsEnabled={settings.soundsEnabled}
                          searchQuery={searchQuery}
                          onQuickPreview={handleOpenQuickPreview}
                        />
                      ))}
                    </div>
                  )}

                  {viewMode === 'table' && (
                    <TableView
                      files={displayFiles}
                      selectedIds={selectedIds}
                      onToggleSelect={handleToggleSelect}
                      onSelectAll={handleSelectAll}
                      onClearSelection={handleClearSelection}
                      inspectedFile={inspectedFile}
                      onInspectFile={setInspectedFile}
                      onDoubleClickFolder={handleEnterFolder}
                      onOpenFolder={handleEnterFolder}
                      onContextMenu={handleContextMenu}
                      onQuickRename={handleQuickRename}
                      onQuickQuarantine={(f) => handlePromptQuarantine([f])}
                      onCalculateFolderSize={handleCalculateFolderSize}
                      onQuickPreview={handleOpenQuickPreview}
                      folderStatsMap={folderStatsMap}
                      density={settings.density}
                      hapticsEnabled={settings.hapticsEnabled}
                      soundsEnabled={settings.soundsEnabled}
                      searchQuery={searchQuery}
                    />
                  )}

                  {viewMode === 'grid' && (
                    <GridView
                      files={displayFiles}
                      selectedIds={selectedIds}
                      onToggleSelect={handleToggleSelect}
                      inspectedFile={inspectedFile}
                      onInspectFile={setInspectedFile}
                      onDoubleClickFolder={handleEnterFolder}
                      onOpenFolder={handleEnterFolder}
                      onContextMenu={handleContextMenu}
                      onQuickQuarantine={(f) => handlePromptQuarantine([f])}
                      onCalculateFolderSize={handleCalculateFolderSize}
                      onQuickPreview={handleOpenQuickPreview}
                      folderStatsMap={folderStatsMap}
                      hapticsEnabled={settings.hapticsEnabled}
                      soundsEnabled={settings.soundsEnabled}
                      searchQuery={searchQuery}
                    />
                  )}

                  {viewMode === 'kanban' && (
                    <KanbanView
                      files={files}
                      quarantineFiles={quarantineFiles}
                      onInspectFile={setInspectedFile}
                      onDoubleClickFolder={handleEnterFolder}
                      onQuickQuarantine={(f) => handlePromptQuarantine([f])}
                      onBatchRenameTrigger={(fs) => {
                        setBatchRenameTargetFiles(fs);
                        setIsBatchRenameOpen(true);
                      }}
                      hapticsEnabled={settings.hapticsEnabled}
                      soundsEnabled={settings.soundsEnabled}
                      searchQuery={searchQuery}
                    />
                  )}
                </>
              )}
            </>
          )}
        </main>

        {/* 3. Mobile Navigation Bottom Bar with prominent '+' & Floating Action Bar */}
        <MobileBottomBar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSelectedIds(new Set());
            setInspectedFile(null);
            if (tab === 'audit') setIsAuditModalOpen(true);
            if (tab === 'rename') {
              setBatchRenameTargetFiles(files.length > 0 ? files : []);
              setIsBatchRenameOpen(true);
            }
            if (tab === 'ai-cleanup' && !aiResult) {
              handleRunAICleanup('balanced');
            }
          }}
          selectedCount={selectedIds.size}
          onClearSelection={handleClearSelection}
          onSelectAll={handleSelectAll}
          onOpenBatchRename={() => {
            const targets = displayFiles.filter((f) => selectedIds.has(f.id));
            setBatchRenameTargetFiles(targets);
            setIsBatchRenameOpen(true);
          }}
          onMoveSelected={() => {
            const targets = displayFiles.filter((f) => selectedIds.has(f.id));
            setMoveTargetFiles(targets);
            setIsMoveModalOpen(true);
          }}
          onQuarantineSelected={() => {
            const targets = displayFiles.filter((f) => selectedIds.has(f.id));
            handlePromptQuarantine(targets);
          }}
          onRestoreSelected={() => {
            const targets = quarantineFiles.filter((f) => selectedIds.has(f.id));
            executeRestoreFiles(targets);
          }}
          isQuarantinedView={currentTab === 'quarantine'}
          onCenterPlusTap={handleCreateNewFolder}
          onCenterPlusLongPress={() => {
            setBatchRenameTargetFiles(files);
            setIsBatchRenameOpen(true);
          }}
          quarantineCount={quarantineFiles.length}
          hapticsEnabled={settings.hapticsEnabled}
          soundsEnabled={settings.soundsEnabled}
        />
      </div>

      {/* 4. Split-View Master-Detail Inspector Panel (w-96 / 420px Right Side) */}
      {inspectedFile && (
        <InspectorPanel
          file={inspectedFile}
          onClose={() => setInspectedFile(null)}
          onOpenBatchRename={(fs) => {
            setBatchRenameTargetFiles(fs);
            setIsBatchRenameOpen(true);
          }}
          onMoveToQuarantine={(fs) => handlePromptQuarantine(fs)}
          onOpenMoveModal={(fs) => {
            setMoveTargetFiles(fs);
            setIsMoveModalOpen(true);
          }}
          onRestoreFromQuarantine={(fs) => executeRestoreFiles(fs)}
          onOpenFolder={handleEnterFolder}
          onCalculateFolderSize={handleCalculateFolderSize}
          folderStats={folderStatsMap[inspectedFile.id]}
          isQuarantinedView={currentTab === 'quarantine'}
          hapticsEnabled={settings.hapticsEnabled}
          soundsEnabled={settings.soundsEnabled}
        />
      )}

      {/* 5. Batch Rename Modal */}
      <BatchRenameModal
        files={batchRenameTargetFiles}
        isOpen={isBatchRenameOpen}
        onClose={() => setIsBatchRenameOpen(false)}
        onApplyRename={handleApplyBatchRename}
        hapticsEnabled={settings.hapticsEnabled}
        soundsEnabled={settings.soundsEnabled}
      />

      {/* 6. Move Folder Modal */}
      {token && (
        <MoveFolderModal
          filesToMove={moveTargetFiles}
          currentFolderId={currentFolderId}
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          onConfirmMove={handleConfirmMoveToFolder}
          accessToken={token}
          quarantineFolderId={quarantineFolder?.id}
          hapticsEnabled={settings.hapticsEnabled}
          soundsEnabled={settings.soundsEnabled}
        />
      )}

      {/* 7. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onExportAuditJson={handleExportAuditJson}
        hapticsEnabled={settings.hapticsEnabled}
        soundsEnabled={settings.soundsEnabled}
      />

      {/* 8. Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'audit') setIsAuditModalOpen(true);
          if (tab === 'rename') {
            setBatchRenameTargetFiles(files);
            setIsBatchRenameOpen(true);
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={() => loadDriveData(currentFolderId)}
        onApplyPreset={(presetId) => {
          setBatchRenameTargetFiles(files);
          setIsBatchRenameOpen(true);
        }}
        hapticsEnabled={settings.hapticsEnabled}
        soundsEnabled={settings.soundsEnabled}
      />

      {/* 9. Context Menu Desktop */}
      {contextMenu.isOpen && contextMenu.file && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          isOpen={contextMenu.isOpen}
          onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
          onRename={(f) => {
            setBatchRenameTargetFiles([f]);
            setIsBatchRenameOpen(true);
          }}
          onMove={(f) => {
            setMoveTargetFiles([f]);
            setIsMoveModalOpen(true);
          }}
          onQuarantine={(f) => handlePromptQuarantine([f])}
          onRestore={(f) => executeRestoreFiles([f])}
          isQuarantinedView={currentTab === 'quarantine'}
          hapticsEnabled={settings.hapticsEnabled}
          soundsEnabled={settings.soundsEnabled}
        />
      )}

      {/* 10. Audit History Modal */}
      <AuditHistoryModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLogs={auditLogs}
        onClearLogs={() => {
          setAuditLogs([]);
          localStorage.removeItem('drive_organizer_audit');
        }}
        hapticsEnabled={settings.hapticsEnabled}
      />

      {/* 11. Custom Confirmation Dialog (Workspace Integration Safety) */}
      <OneUIConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        description={confirmationModal.description}
        affectedItemsCount={confirmationModal.affectedItemsCount}
        itemNames={confirmationModal.itemNames}
        confirmLabel={confirmationModal.confirmLabel}
        type={confirmationModal.type}
        onConfirm={confirmationModal.onConfirm}
        onCancel={() => setConfirmationModal((prev) => ({ ...prev, isOpen: false }))}
        hapticsEnabled={settings.hapticsEnabled}
        soundsEnabled={settings.soundsEnabled}
      />

      {/* 12. Floating Undo Pill (4.5s countdown with circular progress) */}
      {undoPill && (
        <FloatingUndoPill
          message={undoPill.message}
          onUndo={async () => {
            const action = undoPill.action;
            setUndoPill(null);
            await action();
          }}
          onDismiss={() => setUndoPill(null)}
          hapticsEnabled={settings.hapticsEnabled}
          soundsEnabled={settings.soundsEnabled}
        />
      )}

      {/* 13. Quick Preview Modal (Anteprima Rapida documento) */}
      <QuickPreviewModal
        isOpen={!!quickPreviewFile}
        file={quickPreviewFile}
        filesList={displayFiles}
        accessToken={token || undefined}
        onClose={() => setQuickPreviewFile(null)}
        onOpenFullInspector={(f) => {
          setInspectedFile(f);
          setQuickPreviewFile(null);
        }}
        onQuickQuarantine={(f) => handlePromptQuarantine([f])}
        hapticsEnabled={settings.hapticsEnabled}
        soundsEnabled={settings.soundsEnabled}
      />
    </div>
  );
}
