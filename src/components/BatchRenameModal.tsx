import React, { useState, useMemo } from 'react';
import {
  X,
  Edit3,
  Calendar,
  Type,
  Replace,
  Sparkles,
  Check,
  AlertTriangle,
  ArrowRight,
  Plus,
  Trash2,
  Sliders,
  Hash,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import {
  DriveFile,
  RenameRule,
  RenameRuleType,
  DateFormat,
  CaseFormat,
  RenamePreviewItem,
} from '../types/drive';
import {
  previewBatchRename,
  PRESET_RULES,
} from '../lib/renamingEngine';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface BatchRenameModalProps {
  files: DriveFile[];
  isOpen: boolean;
  onClose: () => void;
  onApplyRename: (renames: { id: string; newName: string }[]) => Promise<void>;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({
  files,
  isOpen,
  onClose,
  onApplyRename,
  hapticsEnabled,
  soundsEnabled,
}) => {
  if (!isOpen || files.length === 0) return null;

  // Scope target: separate files and folders
  const [scopeTarget, setScopeTarget] = useState<'files-only' | 'folders-only' | 'both'>('files-only');

  // Active rules list
  const [rules, setRules] = useState<RenameRule[]>([
    {
      id: 'rule-date',
      type: 'date-stamp',
      enabled: true,
      targetScope: 'files-only',
      datePlacement: 'prefix',
      dateFormat: 'YYYY-MM-DD',
      dateSource: 'modified',
      dateSeparator: '-',
    },
    {
      id: 'rule-case',
      type: 'case-transform',
      enabled: true,
      targetScope: 'files-only',
      caseFormat: 'kebab-case',
    },
  ]);

  // Which tab / section is active for configuration
  const [activeTab, setActiveTab] = useState<'presets' | 'date' | 'case' | 'prefix' | 'replace' | 'clean' | 'sequence'>('presets');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When scopeTarget changes, update rules targetScope
  const handleScopeChange = (newScope: 'files-only' | 'folders-only' | 'both') => {
    triggerHaptic('tick', hapticsEnabled);
    setScopeTarget(newScope);
    setRules((prev) => prev.map((r) => ({ ...r, targetScope: newScope })));
  };

  // Active files to rename
  const activeFiles = useMemo(
    () => files.filter((f) => !excludedIds.has(f.id)),
    [files, excludedIds]
  );

  // Calculate live preview with scope enforcement
  const previewItems: RenamePreviewItem[] = useMemo(() => {
    const scopedRules = rules.map((r) => ({ ...r, targetScope: scopeTarget }));
    return previewBatchRename(activeFiles, scopedRules);
  }, [activeFiles, rules, scopeTarget]);

  // Check if any changes
  const changedCount = previewItems.filter((p) => p.hasChanged).length;
  const hasConflicts = previewItems.some((p) => p.conflict);

  // Toggle rule enabled state
  const handleToggleRule = (type: RenameRuleType) => {
    triggerHaptic('tick', hapticsEnabled);
    setRules((prev) => {
      const exists = prev.find((r) => r.type === type);
      if (exists) {
        return prev.map((r) => (r.type === type ? { ...r, enabled: !r.enabled } : r));
      } else {
        // Add new default rule of that type
        return [...prev, getDefaultRule(type)];
      }
    });
  };

  const getDefaultRule = (type: RenameRuleType): RenameRule => {
    switch (type) {
      case 'date-stamp':
        return {
          id: `r-${Date.now()}`,
          type: 'date-stamp',
          enabled: true,
          datePlacement: 'prefix',
          dateFormat: 'YYYY-MM-DD',
          dateSource: 'modified',
          dateSeparator: '-',
        };
      case 'case-transform':
        return {
          id: `r-${Date.now()}`,
          type: 'case-transform',
          enabled: true,
          caseFormat: 'kebab-case',
        };
      case 'prefix-suffix':
        return {
          id: `r-${Date.now()}`,
          type: 'prefix-suffix',
          enabled: true,
          prefixText: '',
          suffixText: '',
        };
      case 'search-replace':
        return {
          id: `r-${Date.now()}`,
          type: 'search-replace',
          enabled: true,
          searchPattern: '',
          replaceText: '',
          matchCase: false,
          isRegex: false,
        };
      case 'clean-sanitize':
        return {
          id: `r-${Date.now()}`,
          type: 'clean-sanitize',
          enabled: true,
          cleanOptions: {
            removeSpecialChars: true,
            spacesToHyphens: true,
            spacesToUnderscores: false,
            normalizeSeparators: true,
          },
        };
      case 'sequence-number':
        return {
          id: `r-${Date.now()}`,
          type: 'sequence-number',
          enabled: true,
          sequenceStart: 1,
          sequenceDigits: 3,
          sequenceSuffix: '_',
        };
      default:
        return {
          id: `r-${Date.now()}`,
          type: 'prefix-suffix',
          enabled: true,
        };
    }
  };

  const updateRule = (type: RenameRuleType, updates: Partial<RenameRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.type === type ? { ...r, ...updates } : r))
    );
  };

  // Apply a preset
  const handleApplyPreset = (presetId: string) => {
    triggerHaptic('snap', hapticsEnabled);
    playSound('pop', soundsEnabled);
    const preset = PRESET_RULES.find((p) => p.id === presetId);
    if (preset) {
      setRules(preset.rules);
    }
  };

  // Toggle item inclusion
  const handleToggleInclude = (id: string) => {
    triggerHaptic('tick', hapticsEnabled);
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmSubmit = async () => {
    const renames = previewItems
      .filter((p) => p.hasChanged)
      .map((p) => ({ id: p.id, newName: p.newName }));

    if (renames.length === 0) return;

    try {
      setIsSubmitting(true);
      triggerHaptic('snap', hapticsEnabled);
      playSound('pop', soundsEnabled);
      await onApplyRename(renames);
      onClose();
    } catch (err) {
      triggerHaptic('error', hapticsEnabled);
      console.error('Rename error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find active rules
  const dateRule = rules.find((r) => r.type === 'date-stamp');
  const caseRule = rules.find((r) => r.type === 'case-transform');
  const prefixRule = rules.find((r) => r.type === 'prefix-suffix');
  const replaceRule = rules.find((r) => r.type === 'search-replace');
  const cleanRule = rules.find((r) => r.type === 'clean-sanitize');
  const sequenceRule = rules.find((r) => r.type === 'sequence-number');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] bg-[#1E2024] rounded-3xl border border-[#2F3136] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-[#2F3136] bg-[#18191B]/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/60 text-[#E31B23]">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-[#EAEBED]">
                Rinomina Intelligente File
              </h2>
              <p className="text-[11px] text-[#9A9DA5]">
                {activeFiles.length} file selezionati per la ridenominazione
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#222428] hover:bg-[#2A2C31] border border-[#2F3136] flex items-center justify-center text-[#9A9DA5] hover:text-[#EAEBED] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Rules Tabs + Config + Live Diff Preview */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Target Scope Selector (Files vs Folders Separation) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#18191B] border border-[#2F3136]">
            <div>
              <div className="text-xs font-bold text-[#EAEBED] flex items-center gap-1.5">
                <span>Applica regole a:</span>
                <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.2 rounded-full border border-amber-900/30">
                  Separazione Regole Attiva
                </span>
              </div>
              <div className="text-[11px] text-[#9A9DA5] mt-0.5">
                Le regole per i file non alterano i nomi delle cartelle
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#222428] p-1 rounded-xl border border-[#2F3136] self-start sm:self-auto">
              <button
                onClick={() => handleScopeChange('files-only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scopeTarget === 'files-only'
                    ? 'bg-[#E31B23] text-white shadow-sm'
                    : 'text-[#9A9DA5] hover:text-[#EAEBED]'
                }`}
              >
                📄 Solo File ({files.filter((f) => !f.isFolder).length})
              </button>
              <button
                onClick={() => handleScopeChange('folders-only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scopeTarget === 'folders-only'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-[#9A9DA5] hover:text-[#EAEBED]'
                }`}
              >
                📁 Solo Cartelle ({files.filter((f) => f.isFolder).length})
              </button>
              <button
                onClick={() => handleScopeChange('both')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scopeTarget === 'both'
                    ? 'bg-[#2A2C31] text-[#EAEBED] shadow-sm'
                    : 'text-[#9A9DA5] hover:text-[#EAEBED]'
                }`}
              >
                Entrambi ({files.length})
              </button>
            </div>
          </div>

          {/* Rules Navigation Bar (Pill selector) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'presets', label: 'Preset Rapidi', icon: Sparkles },
              { id: 'date', label: 'Timbro Data', icon: Calendar },
              { id: 'case', label: 'Casing & Testo', icon: Type },
              { id: 'prefix', label: 'Prefisso/Suffisso', icon: Plus },
              { id: 'replace', label: 'Cerca & Sostituisci', icon: Replace },
              { id: 'clean', label: 'Pulizia Simboli', icon: Sliders },
              { id: 'sequence', label: 'Numerazione', icon: Hash },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    triggerHaptic('tick', hapticsEnabled);
                    setActiveTab(tab.id as any);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-[#E31B23]/15 text-[#EAEBED] border-[#E31B23]/40 shadow-sm'
                      : 'bg-[#222428] text-[#9A9DA5] hover:text-[#EAEBED] border-[#2F3136]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Configuration Panel according to active Tab */}
          <div className="p-4 md:p-5 rounded-3xl bg-[#222428] border border-[#2F3136]">
            {/* Presets */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#9A9DA5]">
                  <span>
                    Preset per {scopeTarget === 'files-only' ? 'File per Tipologia' : scopeTarget === 'folders-only' ? 'Cartelle' : 'File & Cartelle'}
                  </span>
                  <span className="text-[10px] text-[#9A9DA5] font-normal lowercase">
                    {PRESET_RULES.filter((p) => p.targetScope === scopeTarget || p.targetScope === 'both').length} disponibili
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PRESET_RULES.filter(
                    (p) => scopeTarget === 'both' || p.targetScope === scopeTarget || p.targetScope === 'both'
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.id)}
                      className="p-3.5 rounded-2xl bg-[#2A2C31] hover:bg-[#32353B] border border-[#3A3D45]/60 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#EAEBED] group-hover:text-[#E31B23] transition-colors">
                          {preset.name}
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-[#9A9DA5] group-hover:text-[#E31B23]" />
                      </div>
                      <p className="text-[11px] text-[#9A9DA5] leading-relaxed">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Stamp */}
            {activeTab === 'date' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#EAEBED]">
                      Timbro Data Cronologico
                    </h3>
                    <p className="text-[11px] text-[#9A9DA5]">
                      Inserisci data di oggi o data originale del file
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleRule('date-stamp')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      dateRule?.enabled
                        ? 'bg-[#E31B23] text-white border-[#E31B23]'
                        : 'bg-[#2A2C31] text-[#9A9DA5] border-[#3A3D45]'
                    }`}
                  >
                    {dateRule?.enabled ? 'Abilitato' : 'Disabilitato'}
                  </button>
                </div>

                {dateRule && dateRule.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#9A9DA5] block mb-1">
                        Posizione
                      </label>
                      <select
                        value={dateRule.datePlacement || 'prefix'}
                        onChange={(e) =>
                          updateRule('date-stamp', {
                            datePlacement: e.target.value as 'prefix' | 'suffix',
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-xs text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
                      >
                        <option value="prefix">Inizio (Prefisso)</option>
                        <option value="suffix">Fine (Suffisso)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#9A9DA5] block mb-1">
                        Formato Data
                      </label>
                      <select
                        value={dateRule.dateFormat || 'YYYY-MM-DD'}
                        onChange={(e) =>
                          updateRule('date-stamp', {
                            dateFormat: e.target.value as DateFormat,
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-xs text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
                      >
                        <option value="YYYY-MM-DD">2026-09-29 (ISO Standard)</option>
                        <option value="DD-MM-YYYY">29-09-2026 (Italiano)</option>
                        <option value="YYYYMMDD">20260929 (Compatto)</option>
                        <option value="YYYY_MM_DD">2026_09_29 (Underscore)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#9A9DA5] block mb-1">
                        Origine Data
                      </label>
                      <select
                        value={dateRule.dateSource || 'modified'}
                        onChange={(e) =>
                          updateRule('date-stamp', {
                            dateSource: e.target.value as any,
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-xs text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
                      >
                        <option value="modified">Data Ultima Modifica</option>
                        <option value="created">Data Creazione</option>
                        <option value="today">Data di Oggi</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Case Transform */}
            {activeTab === 'case' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#EAEBED]">
                      Casing e Standardizzazione
                    </h3>
                    <p className="text-[11px] text-[#9A9DA5]">
                      Uniforma maiuscole, minuscole, trattini o underscore
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleRule('case-transform')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      caseRule?.enabled
                        ? 'bg-[#E31B23] text-white border-[#E31B23]'
                        : 'bg-[#2A2C31] text-[#9A9DA5] border-[#3A3D45]'
                    }`}
                  >
                    {caseRule?.enabled ? 'Abilitato' : 'Disabilitato'}
                  </button>
                </div>

                {caseRule && caseRule.enabled && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    {[
                      { id: 'kebab-case', label: 'kebab-case', example: 'mio-documento-lavoro.pdf' },
                      { id: 'snake_case', label: 'snake_case', example: 'mio_documento_lavoro.pdf' },
                      { id: 'Title Case', label: 'Title Case', example: 'Mio Documento Lavoro.pdf' },
                      { id: 'lowercase', label: 'lowercase', example: 'mio documento lavoro.pdf' },
                      { id: 'UPPERCASE', label: 'UPPERCASE', example: 'MIO DOCUMENTO LAVORO.PDF' },
                    ].map((c) => {
                      const isSelected = caseRule.caseFormat === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() =>
                            updateRule('case-transform', {
                              caseFormat: c.id as CaseFormat,
                            })
                          }
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-[#E31B23]/15 border-[#E31B23] text-[#EAEBED]'
                              : 'bg-[#2A2C31] border-[#3A3D45] text-[#9A9DA5] hover:text-[#EAEBED]'
                          }`}
                        >
                          <div className="text-xs font-bold mb-0.5">{c.label}</div>
                          <div className="text-[10px] text-[#9A9DA5] truncate font-mono">
                            {c.example}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Prefix / Suffix */}
            {activeTab === 'prefix' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#EAEBED]">
                      Prefisso e Suffisso Personalizzati
                    </h3>
                    <p className="text-[11px] text-[#9A9DA5]">
                      Aggiungi testi fissi come reparti o codici commessa
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleRule('prefix-suffix')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      prefixRule?.enabled
                        ? 'bg-[#E31B23] text-white border-[#E31B23]'
                        : 'bg-[#2A2C31] text-[#9A9DA5] border-[#3A3D45]'
                    }`}
                  >
                    {prefixRule?.enabled ? 'Abilitato' : 'Disabilitato'}
                  </button>
                </div>

                {prefixRule && prefixRule.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#9A9DA5] block mb-1">
                        Prefisso (es. [FATTURE]_)
                      </label>
                      <input
                        type="text"
                        value={prefixRule.prefixText || ''}
                        onChange={(e) =>
                          updateRule('prefix-suffix', { prefixText: e.target.value })
                        }
                        placeholder="Inserisci prefisso..."
                        className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-base md:text-sm text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#9A9DA5] block mb-1">
                        Suffisso (es. _v1.0)
                      </label>
                      <input
                        type="text"
                        value={prefixRule.suffixText || ''}
                        onChange={(e) =>
                          updateRule('prefix-suffix', { suffixText: e.target.value })
                        }
                        placeholder="Inserisci suffisso..."
                        className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-base md:text-sm text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search & Replace */}
            {activeTab === 'replace' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#EAEBED]">
                      Cerca e Sostituisci
                    </h3>
                    <p className="text-[11px] text-[#9A9DA5]">
                      Sostituisci parole, caratteri o applica espressioni regolari
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleRule('search-replace')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      replaceRule?.enabled
                        ? 'bg-[#E31B23] text-white border-[#E31B23]'
                        : 'bg-[#2A2C31] text-[#9A9DA5] border-[#3A3D45]'
                    }`}
                  >
                    {replaceRule?.enabled ? 'Abilitato' : 'Disabilitato'}
                  </button>
                </div>

                {replaceRule && replaceRule.enabled && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#9A9DA5] block mb-1">
                          Testo o Regex da cercare
                        </label>
                        <input
                          type="text"
                          value={replaceRule.searchPattern || ''}
                          onChange={(e) =>
                            updateRule('search-replace', { searchPattern: e.target.value })
                          }
                          placeholder="es. copia di, _draft"
                          className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-base md:text-sm text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#9A9DA5] block mb-1">
                          Sostituisci con
                        </label>
                        <input
                          type="text"
                          value={replaceRule.replaceText || ''}
                          onChange={(e) =>
                            updateRule('search-replace', { replaceText: e.target.value })
                          }
                          placeholder="es. [lascia vuoto per rimuovere]"
                          className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-base md:text-sm text-[#EAEBED] focus:outline-none focus:border-[#E31B23]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#9A9DA5]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={replaceRule.matchCase || false}
                          onChange={(e) =>
                            updateRule('search-replace', { matchCase: e.target.checked })
                          }
                          className="w-4 h-4 rounded text-[#E31B23] bg-[#2A2C31] border-[#3A3D45]"
                        />
                        Distingui maiuscole/minuscole
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={replaceRule.isRegex || false}
                          onChange={(e) =>
                            updateRule('search-replace', { isRegex: e.target.checked })
                          }
                          className="w-4 h-4 rounded text-[#E31B23] bg-[#2A2C31] border-[#3A3D45]"
                        />
                        Espressione Regolare (Regex)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clean & Sanitize */}
            {activeTab === 'clean' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#EAEBED]">
                      Pulizia Simboli e Separatori
                    </h3>
                    <p className="text-[11px] text-[#9A9DA5]">
                      Rimuove caratteri problematici o doppi spazi
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleRule('clean-sanitize')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      cleanRule?.enabled
                        ? 'bg-[#E31B23] text-white border-[#E31B23]'
                        : 'bg-[#2A2C31] text-[#9A9DA5] border-[#3A3D45]'
                    }`}
                  >
                    {cleanRule?.enabled ? 'Abilitato' : 'Disabilitato'}
                  </button>
                </div>

                {cleanRule && cleanRule.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center gap-2 p-3 rounded-2xl bg-[#2A2C31] border border-[#3A3D45] text-xs text-[#EAEBED] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cleanRule.cleanOptions?.removeSpecialChars}
                        onChange={(e) =>
                          updateRule('clean-sanitize', {
                            cleanOptions: {
                              ...cleanRule.cleanOptions,
                              removeSpecialChars: e.target.checked,
                            } as any,
                          })
                        }
                        className="w-4 h-4 text-[#E31B23] rounded bg-[#18191B]"
                      />
                      Rimuovi simboli speciali (#, %, $, ?, !)
                    </label>

                    <label className="flex items-center gap-2 p-3 rounded-2xl bg-[#2A2C31] border border-[#3A3D45] text-xs text-[#EAEBED] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cleanRule.cleanOptions?.normalizeSeparators}
                        onChange={(e) =>
                          updateRule('clean-sanitize', {
                            cleanOptions: {
                              ...cleanRule.cleanOptions,
                              normalizeSeparators: e.target.checked,
                            } as any,
                          })
                        }
                        className="w-4 h-4 text-[#E31B23] rounded bg-[#18191B]"
                      />
                      Comprimi doppi trattini e doppi spazi
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Sequence */}
            {activeTab === 'sequence' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#EAEBED]">
                      Numerazione Progressiva
                    </h3>
                    <p className="text-[11px] text-[#9A9DA5]">
                      Numera in ordine i file selezionati (es: 001, 002, 003...)
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleRule('sequence-number')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      sequenceRule?.enabled
                        ? 'bg-[#E31B23] text-white border-[#E31B23]'
                        : 'bg-[#2A2C31] text-[#9A9DA5] border-[#3A3D45]'
                    }`}
                  >
                    {sequenceRule?.enabled ? 'Abilitato' : 'Disabilitato'}
                  </button>
                </div>

                {sequenceRule && sequenceRule.enabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-[#9A9DA5] block mb-1">
                        Inizia da
                      </label>
                      <input
                        type="number"
                        value={sequenceRule.sequenceStart ?? 1}
                        onChange={(e) =>
                          updateRule('sequence-number', {
                            sequenceStart: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-base md:text-sm text-[#EAEBED]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#9A9DA5] block mb-1">
                        Cifre minime (zero padding)
                      </label>
                      <select
                        value={sequenceRule.sequenceDigits ?? 3}
                        onChange={(e) =>
                          updateRule('sequence-number', {
                            sequenceDigits: Number(e.target.value),
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#2A2C31] border border-[#3A3D45] text-xs text-[#EAEBED]"
                      >
                        <option value={1}>1 cifra (1, 2, 3...)</option>
                        <option value={2}>2 cifre (01, 02, 03...)</option>
                        <option value={3}>3 cifre (001, 002, 003...)</option>
                        <option value={4}>4 cifre (0001, 0002...)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conflict Alert if any */}
          {hasConflicts && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center gap-3 text-amber-300 text-xs">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>
                Attenzione: due o più file genererebbero lo stesso identico nome. Regola le impostazioni per evitare conflitti.
              </span>
            </div>
          )}

          {/* Live Before / After Diff Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#9A9DA5]">
              <span>Anteprima in tempo reale ({changedCount} modificati)</span>
              <span className="text-[11px] font-normal">
                Deseleziona la casella per escludere un singolo file
              </span>
            </div>

            <div className="rounded-3xl bg-[#222428] border border-[#2F3136] divide-y divide-[#2F3136]/60 overflow-hidden max-h-72 overflow-y-auto">
              {previewItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 flex items-center justify-between gap-3 text-xs ${
                    item.conflict ? 'bg-amber-950/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleInclude(item.id)}
                      className="w-5 h-5 rounded-md border border-[#3A3D45] bg-[#2A2C31] flex items-center justify-center flex-shrink-0"
                    >
                      {!excludedIds.has(item.id) && (
                        <Check className="w-3.5 h-3.5 text-[#E31B23]" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                      <div className="flex items-center gap-2 truncate">
                        {item.isFolder ? (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-900/40 flex-shrink-0">
                            Cartella
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#2A2C31] text-[#9A9DA5] border border-[#3A3D45]/50 flex-shrink-0">
                            File
                          </span>
                        )}
                        <span className="truncate text-[#9A9DA5]" title={item.originalName}>
                          {item.originalName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <ArrowRight className="w-3.5 h-3.5 text-[#9A9DA5] flex-shrink-0" />
                        <span
                          className={`font-semibold truncate ${
                            item.hasChanged
                              ? 'text-emerald-400'
                              : 'text-[#9A9DA5]'
                          }`}
                          title={item.newName}
                        >
                          {item.newName}
                        </span>
                        {!item.hasChanged && item.isFolder && scopeTarget === 'files-only' && (
                          <span className="text-[9px] text-[#9A9DA5] italic ml-1 flex-shrink-0">
                            (cartella protetta)
                          </span>
                        )}
                        {!item.hasChanged && !item.isFolder && scopeTarget === 'folders-only' && (
                          <span className="text-[9px] text-[#9A9DA5] italic ml-1 flex-shrink-0">
                            (file protetto)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.conflict && (
                    <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-950/60 flex-shrink-0">
                      Conflitto nome
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 p-4 border-t border-[#2F3136] bg-[#18191B]/95 backdrop-blur flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-2xl bg-[#222428] hover:bg-[#2A2C31] border border-[#2F3136] text-xs font-semibold text-[#9A9DA5] hover:text-[#EAEBED] transition-colors"
          >
            Annulla
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#9A9DA5] tabular-nums font-mono hidden sm:inline">
              {changedCount} modifiche pronte
            </span>

            <button
              onClick={handleConfirmSubmit}
              disabled={isSubmitting || changedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#E31B23] hover:bg-red-600 active:scale-98 text-white font-bold text-xs shadow-lg shadow-red-950/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ridenominazione in corso...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Applica Ridenominazione ({changedCount})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
