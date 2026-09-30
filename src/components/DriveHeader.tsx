import React from 'react';
import {
  Menu,
  Search,
  LayoutGrid,
  List,
  Columns,
  RefreshCw,
  FolderPlus,
  ShieldCheck,
  X,
  SlidersHorizontal,
  ArrowRightLeft,
  Kanban,
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface DriveHeaderProps {
  title: string;
  itemCount: number;
  viewMode: 'list' | 'table' | 'grid' | 'kanban' | 'split';
  onViewModeChange: (mode: 'list' | 'table' | 'grid' | 'kanban' | 'split') => void;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  onNewFolder: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onScrollToTop?: () => void;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  isQuarantineView?: boolean;
}

export const DriveHeader: React.FC<DriveHeaderProps> = ({
  title,
  itemCount,
  viewMode,
  onViewModeChange,
  onToggleSidebar,
  onRefresh,
  onNewFolder,
  isRefreshing,
  searchQuery,
  onSearchChange,
  isSearchOpen,
  onToggleSearch,
  onScrollToTop,
  hapticsEnabled,
  soundsEnabled,
  isQuarantineView = false,
}) => {
  const handleTapTitle = () => {
    triggerHaptic('tick', hapticsEnabled);
    if (onScrollToTop) onScrollToTop();
  };

  const handleModeChange = (mode: 'list' | 'table' | 'grid' | 'kanban' | 'split') => {
    triggerHaptic('tick', hapticsEnabled);
    playSound('toggle', soundsEnabled);
    onViewModeChange(mode);
  };

  return (
    <header className="sticky top-0 z-30 flex flex-col bg-[#18191B]/95 backdrop-blur-md border-b border-[#2F3136]">
      {/* 56px (h-14) Ultra-Compact Header */}
      <div className="h-14 px-4 md:px-8 flex items-center justify-between gap-3">
        {/* Left: Hamburger / Toggle & View Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              triggerHaptic('tick', hapticsEnabled);
              playSound('click', soundsEnabled);
              onToggleSidebar();
            }}
            title="Menu di navigazione"
            className="w-9 h-9 rounded-2xl bg-[#222428] hover:bg-[#2A2C31] active:scale-95 border border-[#2F3136] flex items-center justify-center text-[#9A9DA5] hover:text-[#EAEBED] transition-all flex-shrink-0"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </button>

          <button
            onClick={handleTapTitle}
            className="flex items-center gap-2 text-left truncate active:opacity-75 transition-opacity"
            title="Tocca per tornare in cima"
          >
            {isQuarantineView && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#E31B23] animate-pulse flex-shrink-0" />
            )}
            <h1 className="text-base md:text-lg font-bold text-[#EAEBED] truncate">
              {title}
            </h1>
            <span className="hidden sm:inline-block text-xs font-semibold text-[#9A9DA5] tabular-nums bg-[#222428] px-2 py-0.5 rounded-full border border-[#2F3136]">
              {itemCount} {itemCount === 1 ? 'elemento' : 'elementi'}
            </span>
          </button>
        </div>

        {/* Right: Dynamic Compact Action Icons (w-9 h-9) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Search Toggle */}
          <button
            onClick={() => {
              triggerHaptic('tick', hapticsEnabled);
              playSound('click', soundsEnabled);
              onToggleSearch();
            }}
            title="Cerca file o cartelle"
            className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all ${
              isSearchOpen || searchQuery
                ? 'bg-[#E31B23]/20 border-[#E31B23] text-[#E31B23]'
                : 'bg-[#222428] hover:bg-[#2A2C31] border-[#2F3136] text-[#9A9DA5] hover:text-[#EAEBED]'
            }`}
          >
            <Search className="w-4 h-4" strokeWidth={2} />
          </button>

          {/* View Mode Switcher */}
          <div className="hidden sm:flex items-center bg-[#222428] p-0.5 rounded-2xl border border-[#2F3136]">
            <button
              onClick={() => handleModeChange('list')}
              title="Vista Elenco Compatto"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                viewMode === 'list'
                  ? 'bg-[#2A2C31] text-[#E31B23] shadow-sm'
                  : 'text-[#9A9DA5] hover:text-[#EAEBED]'
              }`}
            >
              <List className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => handleModeChange('table')}
              title="Vista Tabella Dati"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                viewMode === 'table'
                  ? 'bg-[#2A2C31] text-[#E31B23] shadow-sm'
                  : 'text-[#9A9DA5] hover:text-[#EAEBED]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => handleModeChange('grid')}
              title="Vista Griglia Schede"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#2A2C31] text-[#E31B23] shadow-sm'
                  : 'text-[#9A9DA5] hover:text-[#EAEBED]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => handleModeChange('kanban')}
              title="Vista Organizzazione Kanban"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                viewMode === 'kanban'
                  ? 'bg-[#2A2C31] text-[#E31B23] shadow-sm'
                  : 'text-[#9A9DA5] hover:text-[#EAEBED]'
              }`}
            >
              <Kanban className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => handleModeChange('split')}
              title="Vista Multi-Finestra Side-by-Side (Drag & Drop)"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                viewMode === 'split'
                  ? 'bg-[#2A2C31] text-amber-400 shadow-sm'
                  : 'text-[#9A9DA5] hover:text-[#EAEBED]'
              }`}
            >
              <Columns className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* New Folder Action */}
          <button
            onClick={() => {
              triggerHaptic('snap', hapticsEnabled);
              playSound('click', soundsEnabled);
              onNewFolder();
            }}
            title="Nuova Cartella"
            className="w-9 h-9 rounded-2xl bg-[#222428] hover:bg-[#2A2C31] active:scale-95 border border-[#2F3136] flex items-center justify-center text-[#9A9DA5] hover:text-[#EAEBED] transition-all"
          >
            <FolderPlus className="w-4 h-4" strokeWidth={1.75} />
          </button>

          {/* Refresh Action */}
          <button
            onClick={() => {
              triggerHaptic('tick', hapticsEnabled);
              playSound('click', soundsEnabled);
              onRefresh();
            }}
            disabled={isRefreshing}
            title="Ricarica da Google Drive"
            className="w-9 h-9 rounded-2xl bg-[#222428] hover:bg-[#2A2C31] active:scale-95 border border-[#2F3136] flex items-center justify-center text-[#9A9DA5] hover:text-[#EAEBED] transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#E31B23]' : ''}`}
              strokeWidth={1.75}
            />
          </button>
        </div>
      </div>

      {/* On-Demand Expandable Search Bar */}
      {isSearchOpen && (
        <div className="px-4 md:px-8 py-2.5 bg-[#1E2024] border-t border-[#2F3136] flex items-center gap-2 animate-fadeIn">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9A9DA5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cerca per nome file o estensione (es: .pdf, bilancio)..."
              autoFocus
              className="w-full h-10 pl-9 pr-9 bg-[#2A2C31] border border-[#2F3136] rounded-xl text-base md:text-sm text-[#EAEBED] placeholder-[#9A9DA5] focus:outline-none focus:border-[#E31B23] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9A9DA5] hover:text-[#EAEBED]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={onToggleSearch}
            className="px-3 h-10 rounded-xl bg-[#222428] hover:bg-[#2A2C31] text-xs font-semibold text-[#9A9DA5] hover:text-[#EAEBED] border border-[#2F3136] transition-colors"
          >
            Chiudi
          </button>
        </div>
      )}
    </header>
  );
};
