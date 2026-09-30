import React from 'react';
import { AlertCircle, ShieldAlert, Check, X, RotateCcw } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  affectedItemsCount?: number;
  itemNames?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const OneUIConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  affectedItemsCount,
  itemNames = [],
  confirmLabel,
  cancelLabel = 'Annulla',
  type = 'warning',
  onConfirm,
  onCancel,
  hapticsEnabled,
  soundsEnabled,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    triggerHaptic('snap', hapticsEnabled);
    playSound('pop', soundsEnabled);
    onConfirm();
  };

  const handleCancel = () => {
    triggerHaptic('tick', hapticsEnabled);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#1E2024] rounded-3xl border border-[#2F3136] shadow-2xl p-5 md:p-6 space-y-4">
        {/* Icon & Title */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
              type === 'danger'
                ? 'bg-red-950/60 text-[#E31B23] border border-red-900/60'
                : 'bg-amber-950/50 text-amber-400 border border-amber-800/60'
            }`}
          >
            {type === 'danger' ? (
              <ShieldAlert className="w-6 h-6" strokeWidth={1.75} />
            ) : (
              <AlertCircle className="w-6 h-6" strokeWidth={1.75} />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-base font-bold text-[#EAEBED] leading-tight">
              {title}
            </h3>
            <p className="text-xs text-[#9A9DA5] mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Affected Items preview */}
        {itemNames.length > 0 && (
          <div className="p-3 rounded-2xl bg-[#222428] border border-[#2F3136] max-h-36 overflow-y-auto space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A9DA5]">
              Elementi interessati ({affectedItemsCount || itemNames.length}):
            </div>
            {itemNames.slice(0, 6).map((name, i) => (
              <div key={i} className="text-xs text-[#EAEBED] truncate font-mono">
                • {name}
              </div>
            ))}
            {itemNames.length > 6 && (
              <div className="text-[11px] text-[#9A9DA5] italic">
                ...e altri {itemNames.length - 6} elementi
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2.5 rounded-2xl bg-[#222428] hover:bg-[#2A2C31] text-xs font-semibold text-[#9A9DA5] hover:text-[#EAEBED] border border-[#2F3136] transition-colors"
          >
            {cancelLabel}
          </button>

          <button
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-lg active:scale-98 transition-all ${
              type === 'danger'
                ? 'bg-[#E31B23] hover:bg-red-600 shadow-red-950/50'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
