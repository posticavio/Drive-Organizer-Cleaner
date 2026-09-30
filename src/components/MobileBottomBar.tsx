import React, { useRef } from 'react';
import {
  HardDrive,
  ShieldAlert,
  Edit3,
  Plus,
  RotateCcw,
  CheckSquare,
  FolderInput,
  X,
  Sparkles,
  Columns,
} from 'lucide-react';
import { NavigationTab } from '../types/drive';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface MobileBottomBarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onOpenBatchRename: () => void;
  onMoveSelected: () => void;
  onQuarantineSelected: () => void;
  onRestoreSelected?: () => void;
  isQuarantinedView?: boolean;
  onCenterPlusTap: () => void;
  onCenterPlusLongPress: () => void;
  quarantineCount: number;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  currentTab,
  onSelectTab,
  selectedCount,
  onClearSelection,
  onSelectAll,
  onOpenBatchRename,
  onMoveSelected,
  onQuarantineSelected,
  onRestoreSelected,
  isQuarantinedView = false,
  onCenterPlusTap,
  onCenterPlusLongPress,
  quarantineCount,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  const handleTouchStart = () => {
    isLongPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      triggerHaptic('snap', hapticsEnabled);
      playSound('pop', soundsEnabled);
      onCenterPlusLongPress();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    if (!isLongPressTriggered.current) {
      triggerHaptic('snap', hapticsEnabled);
      playSound('click', soundsEnabled);
      onCenterPlusTap();
    }
  };

  // If 2 or more items are selected, show Floating Batch Action Bar!
  if (selectedCount >= 1) {
    return (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-md animate-slideUp">
        <div className="flex items-center justify-between px-4 py-2.5 rounded-full bg-[#222428]/95 backdrop-blur-md border border-[#3A3D45] shadow-2xl text-[#EAEBED]">
          {/* Selected count pill */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#E31B23] text-white text-xs font-bold flex items-center justify-center font-mono">
              {selectedCount}
            </span>
            <span className="text-xs font-bold hidden sm:inline">Selezionati</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Rename */}
            <button
              onClick={() => {
                triggerHaptic('tick', hapticsEnabled);
                onOpenBatchRename();
              }}
              title="Rinomina selezionati"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#2A2C31] hover:bg-[#32353B] text-xs font-semibold text-[#EAEBED] transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#E31B23]" />
              <span className="hidden sm:inline">Rinomina</span>
            </button>

            {/* Move */}
            <button
              onClick={() => {
                triggerHaptic('tick', hapticsEnabled);
                onMoveSelected();
              }}
              title="Sposta in altra cartella"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#2A2C31] hover:bg-[#32353B] text-xs font-semibold text-[#EAEBED] transition-colors"
            >
              <FolderInput className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Sposta</span>
            </button>

            {/* Quarantine or Restore */}
            {isQuarantinedView ? (
              <button
                onClick={() => {
                  triggerHaptic('doublePulse', hapticsEnabled);
                  if (onRestoreSelected) onRestoreSelected();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ripristina</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  triggerHaptic('doublePulse', hapticsEnabled);
                  onQuarantineSelected();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#E31B23] hover:bg-red-600 text-xs font-bold text-white transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Quarantena</span>
              </button>
            )}

            {/* Clear Selection */}
            <button
              onClick={onClearSelection}
              className="w-7 h-7 rounded-full bg-[#2A2C31] text-[#9A9DA5] hover:text-[#EAEBED] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard Edge-to-Edge One UI Mobile Navigation Bar
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#18191B]/95 backdrop-blur-md border-t border-[#2F3136] pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="h-14 px-4 flex items-center justify-around relative">
        {/* Drive tab */}
        <button
          onClick={() => {
            triggerHaptic('tick', hapticsEnabled);
            onSelectTab('drive');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'drive' ? 'text-[#E31B23]' : 'text-[#9A9DA5]'
          }`}
        >
          <HardDrive className="w-5 h-5" strokeWidth={currentTab === 'drive' ? 2.2 : 1.75} />
          <span className="text-[10px] font-semibold mt-0.5">Drive</span>
        </button>

        {/* Split / Multi-Window tab */}
        <button
          onClick={() => {
            triggerHaptic('tick', hapticsEnabled);
            onSelectTab('split');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'split' ? 'text-amber-400' : 'text-[#9A9DA5]'
          }`}
        >
          <Columns className="w-5 h-5" strokeWidth={currentTab === 'split' ? 2.2 : 1.75} />
          <span className="text-[10px] font-semibold mt-0.5">Finestre</span>
        </button>

        {/* Central Prominent '+' Button */}
        <div className="relative -top-3 flex items-center justify-center px-2">
          <button
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
              // Mouse click fallback for desktop preview
              triggerHaptic('snap', hapticsEnabled);
              onCenterPlusTap();
            }}
            title="Azione Rapida (+)"
            className="w-12 h-12 rounded-2xl bg-[#E31B23] hover:bg-red-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-950/60 border border-red-500/40 transition-transform"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* AI Cleanup tab */}
        <button
          onClick={() => {
            triggerHaptic('tick', hapticsEnabled);
            onSelectTab('ai-cleanup');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'ai-cleanup' ? 'text-purple-400' : 'text-[#9A9DA5]'
          }`}
        >
          <Sparkles className="w-5 h-5" strokeWidth={currentTab === 'ai-cleanup' ? 2.2 : 1.75} />
          <span className="text-[10px] font-semibold mt-0.5">Pulizia AI</span>
        </button>

        {/* Rename Studio tab */}
        <button
          onClick={() => {
            triggerHaptic('tick', hapticsEnabled);
            onSelectTab('rename');
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'rename' ? 'text-[#E31B23]' : 'text-[#9A9DA5]'
          }`}
        >
          <Edit3 className="w-5 h-5" strokeWidth={currentTab === 'rename' ? 2.2 : 1.75} />
          <span className="text-[10px] font-semibold mt-0.5">Rinomina</span>
        </button>
      </div>
    </nav>
  );
};
