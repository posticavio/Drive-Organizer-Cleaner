import React, { useState } from 'react';
import {
  X,
  Sliders,
  Smartphone,
  Cloud,
  Info,
  ChevronDown,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Download,
} from 'lucide-react';
import { UserSettings } from '../types/drive';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportAuditJson: () => void;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportAuditJson,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const [openSection, setOpenSection] = useState<'visual' | 'ergonomics' | 'quarantine' | 'info'>('visual');

  if (!isOpen) return null;

  const toggleSection = (section: 'visual' | 'ergonomics' | 'quarantine' | 'info') => {
    triggerHaptic('tick', hapticsEnabled);
    playSound('click', soundsEnabled);
    setOpenSection((prev) => (prev === section ? 'visual' : section));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#1E2024] rounded-3xl border border-[#2F3136] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-[#2F3136] bg-[#18191B]/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/60 text-[#EAEBED]">
              <Sliders className="w-4 h-4 text-[#E31B23]" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-[#EAEBED]">
                Impostazioni & Personalizzazione
              </h2>
              <p className="text-[11px] text-[#9A9DA5]">
                Esperienza Samsung One UI & Regole Drive
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

        {/* Accordion Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
          {/* 1. Aspetto Visivo */}
          <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden">
            <button
              onClick={() => toggleSection('visual')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#2A2C31]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-[#E31B23]" />
                <span className="text-xs md:text-sm font-bold text-[#EAEBED]">
                  Aspetto Visivo & Densità
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#9A9DA5] transition-transform ${
                  openSection === 'visual' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openSection === 'visual' && (
              <div className="p-4 pt-1 border-t border-[#2F3136]/60 space-y-4 text-xs">
                {/* Density selector */}
                <div>
                  <label className="text-[11px] font-bold text-[#9A9DA5] uppercase tracking-wider block mb-2">
                    Densità Liste & Schede
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => onUpdateSettings({ density: 'comfort' })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        settings.density === 'comfort'
                          ? 'bg-[#E31B23]/15 border-[#E31B23] text-[#EAEBED]'
                          : 'bg-[#2A2C31] border-[#3A3D45] text-[#9A9DA5]'
                      }`}
                    >
                      <div className="font-bold">Comfort (Standard)</div>
                      <div className="text-[10px] text-[#9A9DA5] mt-0.5">
                        Schede alte 64px, spaziatura distesa
                      </div>
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ density: 'compact' })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        settings.density === 'compact'
                          ? 'bg-[#E31B23]/15 border-[#E31B23] text-[#EAEBED]'
                          : 'bg-[#2A2C31] border-[#3A3D45] text-[#9A9DA5]'
                      }`}
                    >
                      <div className="font-bold">Compatta (Dense)</div>
                      <div className="text-[10px] text-[#9A9DA5] mt-0.5">
                        Righe da 42px ad alta densità per molti file
                      </div>
                    </button>
                  </div>
                </div>

                {/* AMOLED Mode */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#2A2C31] border border-[#3A3D45]">
                  <div>
                    <div className="font-bold text-[#EAEBED]">Tema Warm Charcoal One UI</div>
                    <div className="text-[11px] text-[#9A9DA5]">
                      Tonalità antracite #18191B riposante per schermi OLED
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/60">
                    Attivo
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Ergonomia & Feedback */}
          <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden">
            <button
              onClick={() => toggleSection('ergonomics')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#2A2C31]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span className="text-xs md:text-sm font-bold text-[#EAEBED]">
                  Ergonomia, Aptica & Suoni
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#9A9DA5] transition-transform ${
                  openSection === 'ergonomics' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openSection === 'ergonomics' && (
              <div className="p-4 pt-1 border-t border-[#2F3136]/60 space-y-3 text-xs">
                {/* Haptics Toggle */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-[#2A2C31] border border-[#3A3D45] cursor-pointer">
                  <div>
                    <div className="font-bold text-[#EAEBED]">Feedback Aptico Samsung</div>
                    <div className="text-[11px] text-[#9A9DA5]">
                      Micro-vibrazioni differenziate su smartphone (8ms tick, 20ms snap)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.hapticsEnabled}
                    onChange={(e) => onUpdateSettings({ hapticsEnabled: e.target.checked })}
                    className="w-5 h-5 rounded text-[#E31B23] bg-[#18191B] border-[#3A3D45]"
                  />
                </label>

                {/* Sounds Toggle */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-[#2A2C31] border border-[#3A3D45] cursor-pointer">
                  <div>
                    <div className="font-bold text-[#EAEBED]">Micro-Suoni di Interfaccia</div>
                    <div className="text-[11px] text-[#9A9DA5]">
                      Click sintetici One UI a bassissima latenza via Web Audio
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundsEnabled}
                    onChange={(e) => onUpdateSettings({ soundsEnabled: e.target.checked })}
                    className="w-5 h-5 rounded text-[#E31B23] bg-[#18191B] border-[#3A3D45]"
                  />
                </label>

                {/* Confirm Dialog Toggle */}
                <label className="flex items-center justify-between p-3 rounded-2xl bg-[#2A2C31] border border-[#3A3D45] cursor-pointer">
                  <div>
                    <div className="font-bold text-[#EAEBED]">Richiedi Conferma Spostamenti</div>
                    <div className="text-[11px] text-[#9A9DA5]">
                      Mostra sempre la finestra di sicurezza prima di spostare file
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.confirmBeforeMoving}
                    onChange={(e) => onUpdateSettings({ confirmBeforeMoving: e.target.checked })}
                    className="w-5 h-5 rounded text-[#E31B23] bg-[#18191B] border-[#3A3D45]"
                  />
                </label>
              </div>
            )}
          </div>

          {/* 3. Regole Quarantena */}
          <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden">
            <button
              onClick={() => toggleSection('quarantine')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#2A2C31]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs md:text-sm font-bold text-[#EAEBED]">
                  Cartella Quarantena Sicura
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#9A9DA5] transition-transform ${
                  openSection === 'quarantine' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openSection === 'quarantine' && (
              <div className="p-4 pt-1 border-t border-[#2F3136]/60 space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-[#9A9DA5] block mb-1">
                    Nome della cartella di sicurezza su Google Drive
                  </label>
                  <input
                    type="text"
                    value={settings.quarantineFolderName}
                    onChange={(e) =>
                      onUpdateSettings({ quarantineFolderName: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-base md:text-sm text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
                  />
                  <p className="text-[11px] text-[#9A9DA5] mt-1.5 leading-relaxed">
                    I file eliminati tramite questa applicazione vengono sempre salvati in questa cartella specifica nella root del tuo Drive invece di essere eliminati in modo distruttivo.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={onExportAuditJson}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2A2C31] hover:bg-[#32353B] text-xs font-semibold text-[#EAEBED] border border-[#3A3D45]"
                  >
                    <Download className="w-4 h-4 text-[#E31B23]" />
                    Esporta Registro Operazioni (JSON)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Info & Specifiche */}
          <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden">
            <button
              onClick={() => toggleSection('info')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#2A2C31]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-amber-400" />
                <span className="text-xs md:text-sm font-bold text-[#EAEBED]">
                  Info Sistema & Google Drive API
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#9A9DA5] transition-transform ${
                  openSection === 'info' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openSection === 'info' && (
              <div className="p-4 pt-1 border-t border-[#2F3136]/60 space-y-2 text-xs divide-y divide-[#2F3136]/60">
                <div className="pt-2 flex justify-between">
                  <span className="text-[#9A9DA5]">Architettura</span>
                  <span className="text-[#EAEBED] font-semibold">Samsung One UI + Google Workspace</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-[#9A9DA5]">Google Drive Scope</span>
                  <span className="text-emerald-400 font-mono text-[11px]">https://www.googleapis.com/auth/drive</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-[#9A9DA5]">Tipografia Globale</span>
                  <span className="text-[#EAEBED]">Google Sans (400, 500, 600, 700)</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-[#9A9DA5]">PWA Standalone</span>
                  <span className="text-[#EAEBED]">Abilitata</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2F3136] bg-[#18191B]/95 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-[#E31B23] hover:bg-red-600 text-white font-bold text-xs shadow-md transition-colors"
          >
            Salva & Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
