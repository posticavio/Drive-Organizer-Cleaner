import React from 'react';
import {
  HardDrive,
  ShieldAlert,
  Edit3,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Sparkles,
  Cloud,
  CheckCircle2,
  X,
  Columns,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { DriveStorageQuota, NavigationTab } from '../types/drive';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface SidebarProps {
  isOpen: boolean; // Mobile open state
  isCollapsed: boolean; // Desktop rail mode (w-16 vs w-64)
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenSettings: () => void;
  user: User | null;
  onLogout: () => void;
  storageQuota?: DriveStorageQuota;
  quarantineCount: number;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onCloseMobile,
  onToggleCollapse,
  currentTab,
  onSelectTab,
  onOpenSettings,
  user,
  onLogout,
  storageQuota,
  quarantineCount,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const handleTabClick = (tab: NavigationTab) => {
    triggerHaptic('tick', hapticsEnabled);
    playSound('click', soundsEnabled);
    onSelectTab(tab);
    onCloseMobile();
  };

  // Calculate storage percentage
  let quotaPercent = 0;
  let quotaLabel = '0 GB / 15 GB';
  if (storageQuota?.limit && storageQuota?.usage) {
    const limitBytes = Number(storageQuota.limit);
    const usageBytes = Number(storageQuota.usage);
    if (limitBytes > 0) {
      quotaPercent = Math.min(100, Math.round((usageBytes / limitBytes) * 100));
      const usageGB = (usageBytes / (1024 * 1024 * 1024)).toFixed(1);
      const limitGB = (limitBytes / (1024 * 1024 * 1024)).toFixed(0);
      quotaLabel = `${usageGB} GB di ${limitGB} GB`;
    }
  }

  const navItems = [
    {
      id: 'drive' as const,
      label: 'Il mio Drive',
      description: 'Sfoglia cartelle e file',
      icon: HardDrive,
      badge: null,
    },
    {
      id: 'split' as const,
      label: 'Finestre Affiancate',
      description: 'Sposta tra schermate vicine',
      icon: Columns,
      badge: 'Multi-Pane',
      badgeColor: 'bg-amber-600',
    },
    {
      id: 'ai-cleanup' as const,
      label: 'Pulizia AI (Gemini)',
      description: 'Suggerimenti intelligenti',
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-purple-600',
    },
    {
      id: 'quarantine' as const,
      label: 'Quarantena Sicura',
      description: 'Cartella _Da Cancellare',
      icon: ShieldAlert,
      badge: quarantineCount > 0 ? quarantineCount : null,
      badgeColor: 'bg-[#E31B23]',
    },
    {
      id: 'rename' as const,
      label: 'Rinomina Intelligente',
      description: 'Regole, date e pulizia',
      icon: Edit3,
      badge: null,
    },
    {
      id: 'audit' as const,
      label: 'Storico Spostamenti',
      description: 'Registro e azioni effettuate',
      icon: History,
      badge: null,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#2F3136] flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/60 text-[#E31B23] flex-shrink-0 shadow-sm">
            <FolderTree className="w-5 h-5" strokeWidth={1.75} />
          </div>
          {(!isCollapsed || isOpen) && (
            <div className="truncate">
              <div className="text-sm font-bold text-[#EAEBED] leading-tight truncate">
                Drive Organizer
              </div>
              <div className="text-[10px] font-semibold text-[#9A9DA5] uppercase tracking-wider">
                Pulizia & Ordine
              </div>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex items-center">
          <button
            onClick={() => {
              triggerHaptic('tick', hapticsEnabled);
              onToggleCollapse();
            }}
            title={isCollapsed ? 'Espandi Sidebar (Cmd+B)' : 'Riduci a Slim Rail (Cmd+B)'}
            className="w-8 h-8 rounded-xl bg-[#222428] hover:bg-[#2A2C31] border border-[#2F3136] flex items-center justify-center text-[#9A9DA5] hover:text-[#EAEBED] transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Mobile Close Button */}
        <div className="md:hidden">
          <button
            onClick={onCloseMobile}
            className="w-8 h-8 rounded-xl bg-[#222428] border border-[#2F3136] flex items-center justify-center text-[#9A9DA5]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-2 overflow-y-auto no-scrollbar space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              title={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left relative ${
                isActive
                  ? 'bg-[#E31B23]/15 text-[#EAEBED] font-semibold border border-[#E31B23]/30 shadow-sm'
                  : 'text-[#9A9DA5] hover:text-[#EAEBED] hover:bg-[#222428] border border-transparent'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive
                    ? 'bg-[#E31B23] text-white shadow-md shadow-red-950/40'
                    : 'bg-[#222428] text-[#9A9DA5] border border-[#2F3136]'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </div>

              {(!isCollapsed || isOpen) && (
                <div className="flex-1 truncate">
                  <div className="text-xs md:text-sm font-semibold truncate">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-[#9A9DA5] truncate">
                    {item.description}
                  </div>
                </div>
              )}

              {item.badge !== null && (!isCollapsed || isOpen) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#E31B23] tabular-nums">
                  {item.badge}
                </span>
              )}

              {item.badge !== null && isCollapsed && !isOpen && (
                <span className="w-2 h-2 rounded-full bg-[#E31B23] absolute top-2 right-2 ring-2 ring-[#161719]" />
              )}
            </button>
          );
        })}

        {/* Safety Rule Card */}
        {(!isCollapsed || isOpen) && (
          <div className="mt-6 mx-2 p-3.5 rounded-2xl bg-[#222428] border border-[#2F3136] shadow-sm">
            <div className="flex items-center gap-2 text-[#9A9DA5] mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#EAEBED]">
                Regola Zero Distruzione
              </span>
            </div>
            <p className="text-[11px] text-[#9A9DA5] leading-relaxed">
              I file non vengono mai cancellati definitivamente: vengono spostati nella cartella sicura{' '}
              <strong className="text-[#EAEBED]">_Da Cancellare</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Storage Quota Card (Samsung Health styled progress) */}
      {(!isCollapsed || isOpen) && (
        <div className="p-3 mx-2 mb-2 rounded-2xl bg-[#222428] border border-[#2F3136]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#9A9DA5] mb-1.5">
            <span className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-[#9A9DA5]" /> Spazio Drive
            </span>
            <span className="text-[#EAEBED] font-mono tabular-nums">{quotaLabel}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#2A2C31] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                quotaPercent > 90 ? 'bg-[#E31B23]' : 'bg-red-500/80'
              }`}
              style={{ width: `${Math.max(5, quotaPercent)}%` }}
            />
          </div>
        </div>
      )}

      {/* User & Settings Footer */}
      <div className="p-3 border-t border-[#2F3136] bg-[#18191B]/60 flex flex-col gap-2 flex-shrink-0">
        {/* Settings button */}
        <button
          onClick={() => {
            triggerHaptic('tick', hapticsEnabled);
            playSound('click', soundsEnabled);
            onOpenSettings();
            onCloseMobile();
          }}
          title="Impostazioni"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#9A9DA5] hover:text-[#EAEBED] hover:bg-[#222428] border border-transparent hover:border-[#2F3136] transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-[#222428] flex items-center justify-center flex-shrink-0 text-[#9A9DA5]">
            <Settings className="w-4 h-4" strokeWidth={1.75} />
          </div>
          {(!isCollapsed || isOpen) && (
            <span className="text-xs font-semibold">Impostazioni</span>
          )}
        </button>

        {/* User Card */}
        {user && (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#222428] border border-[#2F3136]">
            <div className="flex items-center gap-2 overflow-hidden">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Utente'}
                  className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-[#3A3D45]"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#2A2C31] text-xs font-bold text-[#EAEBED] flex items-center justify-center flex-shrink-0">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              {(!isCollapsed || isOpen) && (
                <div className="truncate">
                  <div className="text-xs font-semibold text-[#EAEBED] truncate">
                    {user.displayName || 'Utente Drive'}
                  </div>
                  <div className="text-[10px] text-[#9A9DA5] truncate">
                    {user.email}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                triggerHaptic('snap', hapticsEnabled);
                onLogout();
              }}
              title="Esci dall'account"
              className="w-7 h-7 rounded-lg bg-[#2A2C31] hover:bg-[#E31B23]/20 hover:text-[#E31B23] text-[#9A9DA5] flex items-center justify-center transition-colors flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block h-screen bg-[#161719] border-r border-[#2F3136] transition-all duration-300 ease-out z-20 flex-shrink-0 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer with Backdrop */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop blur */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#161719] border-r border-[#2F3136] shadow-2xl z-10 animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
