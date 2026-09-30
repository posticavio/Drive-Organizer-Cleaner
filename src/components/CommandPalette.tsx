import React, { useState, useEffect } from 'react';
import {
  Search,
  HardDrive,
  ShieldAlert,
  Edit3,
  SlidersHorizontal,
  RefreshCw,
  Folder,
  Settings,
  Sparkles,
  Command,
} from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'drive' | 'quarantine' | 'rename' | 'audit' | 'ai-cleanup') => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  onApplyPreset: (presetId: string) => void;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenSettings,
  onRefresh,
  onApplyPreset,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose(); // toggle or open
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    {
      id: 'goto-drive',
      category: 'Navigazione',
      label: 'Vai a Il mio Drive',
      icon: HardDrive,
      action: () => onNavigateTab('drive'),
    },
    {
      id: 'goto-ai-cleanup',
      category: 'AI Gemini',
      label: 'Avvia Pulizia Intelligente (Gemini)',
      icon: Sparkles,
      action: () => onNavigateTab('ai-cleanup'),
    },
    {
      id: 'goto-quarantine',
      category: 'Sicurezza',
      label: 'Apri Cartella di Quarantena (_Da Cancellare)',
      icon: ShieldAlert,
      action: () => onNavigateTab('quarantine'),
    },
    {
      id: 'goto-rename',
      category: 'Strumenti',
      label: 'Apri Ridenominazione Intelligente Batch',
      icon: Edit3,
      action: () => onNavigateTab('rename'),
    },
    {
      id: 'preset-kebab',
      category: 'Preset',
      label: 'Applica Preset: Data + Kebab-Case',
      icon: Sparkles,
      action: () => {
        onApplyPreset('date-prefix-kebab');
        onNavigateTab('rename');
      },
    },
    {
      id: 'preset-title',
      category: 'Preset',
      label: 'Applica Preset: Standard Title Case',
      icon: Sparkles,
      action: () => {
        onApplyPreset('clean-title-case');
        onNavigateTab('rename');
      },
    },
    {
      id: 'preset-archive',
      category: 'Preset',
      label: 'Applica Preset: Timbro Archivio Data',
      icon: Sparkles,
      action: () => {
        onApplyPreset('archive-stamp');
        onNavigateTab('rename');
      },
    },
    {
      id: 'refresh-drive',
      category: 'Azioni',
      label: 'Sincronizza e ricarica file da Google Drive',
      icon: RefreshCw,
      action: () => onRefresh(),
    },
    {
      id: 'open-settings',
      category: 'Sistema',
      label: 'Apri Impostazioni & Regole',
      icon: Settings,
      action: () => onOpenSettings(),
    },
  ];

  const filtered = commands.filter((c) =>
    `${c.label} ${c.category}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-[#1E2024] rounded-3xl border border-[#2F3136] shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-[#2F3136] bg-[#18191B]/80">
          <Search className="w-5 h-5 text-[#9A9DA5]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digita un comando o cerca (es. quarantena, kebab, drive)..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-[#EAEBED] placeholder-[#9A9DA5] focus:outline-none"
          />
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[#2A2C31] text-[#9A9DA5] border border-[#3A3D45]">
            ESC
          </span>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9A9DA5]">
              Nessun comando corrispondente trovato.
            </div>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    triggerHaptic('tick', hapticsEnabled);
                    playSound('click', soundsEnabled);
                    cmd.action();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#2A2C31] text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#222428] group-hover:bg-[#E31B23]/20 group-hover:text-[#E31B23] text-[#9A9DA5] flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#EAEBED]">
                        {cmd.label}
                      </div>
                      <div className="text-[10px] text-[#9A9DA5]">
                        {cmd.category}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
