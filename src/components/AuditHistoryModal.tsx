import React from 'react';
import { X, History, Trash2, RotateCcw, ShieldAlert, Edit3, FolderInput, FolderPlus } from 'lucide-react';
import { AuditLogItem } from '../types/drive';
import { formatItalianDate } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLogItem[];
  onClearLogs: () => void;
  hapticsEnabled: boolean;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  onClearLogs,
  hapticsEnabled,
}) => {
  if (!isOpen) return null;

  const getActionBadge = (action: AuditLogItem['action']) => {
    switch (action) {
      case 'quarantine':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#E31B23] px-2 py-0.5 rounded-full bg-red-950/40 border border-red-900/30">
            <ShieldAlert className="w-3 h-3" /> Quarantena
          </span>
        );
      case 'restore':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-900/30">
            <RotateCcw className="w-3 h-3" /> Ripristinato
          </span>
        );
      case 'rename':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-900/30">
            <Edit3 className="w-3 h-3" /> Ridenominato
          </span>
        );
      case 'move':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/30">
            <FolderInput className="w-3 h-3" /> Spostato
          </span>
        );
      case 'create_folder':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-purple-400 px-2 py-0.5 rounded-full bg-purple-950/40 border border-purple-900/30">
            <FolderPlus className="w-3 h-3" /> Nuova Cartella
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#1E2024] rounded-3xl border border-[#2F3136] shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-[#2F3136] bg-[#18191B]/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/60 text-[#9A9DA5]">
              <History className="w-4 h-4 text-[#E31B23]" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-[#EAEBED]">
                Registro Operazioni & Audit Trail
              </h2>
              <p className="text-[11px] text-[#9A9DA5]">
                {auditLogs.length} azioni registrate in questa sessione
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#222428] hover:bg-[#2A2C31] border border-[#2F3136] flex items-center justify-center text-[#9A9DA5] hover:text-[#EAEBED]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {auditLogs.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#9A9DA5]">
              Nessuna operazione registrata finora.
            </div>
          ) : (
            <div className="rounded-3xl bg-[#222428] border border-[#2F3136] divide-y divide-[#2F3136]/60 overflow-hidden">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getActionBadge(log.action)}
                      <span className="font-semibold text-[#EAEBED] truncate">
                        {log.fileName}
                      </span>
                    </div>

                    {log.action === 'rename' && log.oldValue && log.newValue && (
                      <div className="text-[11px] font-mono text-[#9A9DA5] flex items-center gap-1.5 truncate">
                        <span className="line-through">{log.oldValue}</span>
                        <span>→</span>
                        <span className="text-emerald-400 font-semibold">{log.newValue}</span>
                      </div>
                    )}

                    {log.details && (
                      <div className="text-[11px] text-[#9A9DA5]">
                        {log.details}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-[#9A9DA5] font-mono whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2F3136] bg-[#18191B]/95 flex items-center justify-between">
          <button
            onClick={() => {
              triggerHaptic('tick', hapticsEnabled);
              onClearLogs();
            }}
            disabled={auditLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Svuota registro
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-[#222428] hover:bg-[#2A2C31] text-xs font-semibold text-[#EAEBED] border border-[#2F3136]"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
