import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  Check,
  RefreshCw,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  HelpCircle,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Folder,
  FolderPlus,
  FolderOutput,
  Tag,
} from 'lucide-react';
import {
  DriveFile,
  AICleanupRecommendation,
  AICleanupResult,
  FolderStructureSuggestion,
} from '../types/drive';
import { getFileIcon, formatFileSize, formatItalianDate } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';

interface AICleanupViewProps {
  files: DriveFile[];
  aiResult: AICleanupResult | null;
  isLoading: boolean;
  onRunAnalysis: (sensitivity: 'cautious' | 'balanced' | 'aggressive') => Promise<void>;
  onMoveToQuarantine: (files: DriveFile[]) => void;
  onExecuteFolderOrganize?: (targetFolderName: string, filesToMove: DriveFile[]) => Promise<void>;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
}

export const AICleanupView: React.FC<AICleanupViewProps> = ({
  files,
  aiResult,
  isLoading,
  onRunAnalysis,
  onMoveToQuarantine,
  onExecuteFolderOrganize,
  hapticsEnabled,
  soundsEnabled,
}) => {
  const [sensitivity, setSensitivity] = useState<'cautious' | 'balanced' | 'aggressive'>('balanced');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<'quarantine' | 'structure'>('quarantine');
  const [movingFolders, setMovingFolders] = useState<Record<string, boolean>>({});

  // Match recommendation to full DriveFile object
  const fileMap = new Map(files.map((f) => [f.id, f]));

  const recommendations = aiResult?.recommendations || [];
  const validRecommendations = recommendations.filter((r) => fileMap.has(r.fileId));
  const folderSuggestions = aiResult?.folderStructureSuggestions || [];

  const handleToggleSelect = (id: string) => {
    triggerHaptic('snap', hapticsEnabled);
    playSound('toggle', soundsEnabled);
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    triggerHaptic('tick', hapticsEnabled);
    setSelectedFileIds(new Set(validRecommendations.map((r) => r.fileId)));
  };

  const handleSelectHighConfidenceOnly = () => {
    triggerHaptic('tick', hapticsEnabled);
    const highConf = validRecommendations
      .filter((r) => r.confidence === 'high')
      .map((r) => r.fileId);
    setSelectedFileIds(new Set(highConf));
  };

  const handleClearSelection = () => {
    triggerHaptic('tick', hapticsEnabled);
    setSelectedFileIds(new Set());
  };

  const handleQuarantineSelected = () => {
    const targets = Array.from(selectedFileIds)
      .map((id) => fileMap.get(id))
      .filter(Boolean) as DriveFile[];
    if (targets.length === 0) return;

    triggerHaptic('doublePulse', hapticsEnabled);
    playSound('quarantine', soundsEnabled);
    onMoveToQuarantine(targets);
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-900/40">
            Alta Affidabilità
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-900/40">
            Media
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2A2C31] text-[#9A9DA5] border border-[#3A3D45]">
            Consiglio Cauto
          </span>
        );
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'bozza_obsoleta':
        return 'Bozza o Copia Obsoleta';
      case 'temporaneo_screenshot':
        return 'File Temporaneo o Screenshot';
      case 'duplicato':
        return 'Possibile Duplicato';
      case 'file_stale_vecchio':
        return 'File Inattivo da Anni';
      default:
        return 'Disordine Strutturale';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Analysis Trigger */}
      <div className="p-4 md:p-6 rounded-3xl bg-[#222428] border border-[#2F3136] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-950/60 to-purple-950/60 border border-red-900/40 flex items-center justify-center text-[#E31B23] flex-shrink-0 shadow-md">
              <Sparkles className="w-6 h-6 animate-pulse" strokeWidth={1.75} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-[#EAEBED]">
                  Pulizia Intelligente AI (Gemini 3.8 Flash)
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E31B23]/20 text-[#E31B23] border border-[#E31B23]/30">
                  AI Assistant
                </span>
              </div>
              <p className="text-xs text-[#9A9DA5] mt-1 max-w-2xl leading-relaxed">
                Gemini analizza i nomi dei file, le estensioni e le date di ultima modifica della cartella corrente per consigliarti in modo intelligente i file candidati per la cartella di sicurezza <strong className="text-[#EAEBED]">_Da Cancellare</strong>.
              </p>
            </div>
          </div>

          {/* Action Trigger & Sensitivity */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <div className="flex items-center bg-[#18191B] p-1 rounded-2xl border border-[#2F3136]">
              {(['cautious', 'balanced', 'aggressive'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setSensitivity(level)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                    sensitivity === level
                      ? 'bg-[#2A2C31] text-[#E31B23] shadow-sm'
                      : 'text-[#9A9DA5] hover:text-[#EAEBED]'
                  }`}
                >
                  {level === 'cautious' ? 'Prudente' : level === 'balanced' ? 'Bilanciata' : 'Decisa'}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                triggerHaptic('snap', hapticsEnabled);
                playSound('pop', soundsEnabled);
                onRunAnalysis(sensitivity);
              }}
              disabled={isLoading || files.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#E31B23] hover:bg-red-600 active:scale-98 text-white font-bold text-xs shadow-lg shadow-red-950/50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Analisi in corso...' : 'Avvia Analisi Gemini'}
            </button>
          </div>
        </div>

        {/* AI Insight Summary Card if available */}
        {aiResult && (
          <div className="mt-4 pt-4 border-t border-[#2F3136] grid grid-cols-1 sm:grid-cols-4 gap-3 animate-fadeIn">
            <div className="p-3 rounded-2xl bg-[#18191B] border border-[#2F3136] flex items-center justify-between">
              <span className="text-xs text-[#9A9DA5]">File Valutati</span>
              <span className="font-mono text-sm font-bold text-[#EAEBED] tabular-nums">
                {aiResult.summary.totalEvaluated}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#18191B] border border-[#2F3136] flex items-center justify-between">
              <span className="text-xs text-[#9A9DA5]">In Quarantena</span>
              <span className="font-mono text-sm font-bold text-[#E31B23] tabular-nums">
                {aiResult.summary.recommendedCount}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#18191B] border border-[#2F3136] flex items-center justify-between">
              <span className="text-xs text-[#9A9DA5]">Cartelle Suggerite</span>
              <span className="font-mono text-sm font-bold text-amber-400 tabular-nums">
                {folderSuggestions.length}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#18191B] border border-[#2F3136] flex items-center justify-between">
              <span className="text-xs text-[#9A9DA5]">Alta Affidabilità</span>
              <span className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
                {aiResult.summary.highConfidenceCount}
              </span>
            </div>

            {aiResult.summary.insights && (
              <div className="sm:col-span-4 p-3 rounded-2xl bg-[#1E2024] border border-[#2F3136] text-xs text-[#EAEBED] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{aiResult.summary.insights}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs: Quarantena vs Struttura Cartelle */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#222428] border border-[#2F3136] w-fit">
        <button
          onClick={() => {
            triggerHaptic('tick', hapticsEnabled);
            setActiveSection('quarantine');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'quarantine'
              ? 'bg-[#E31B23] text-white shadow-md'
              : 'text-[#9A9DA5] hover:text-[#EAEBED]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Quarantena File Obsoleti ({validRecommendations.length})</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('tick', hapticsEnabled);
            setActiveSection('structure');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'structure'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-[#9A9DA5] hover:text-[#EAEBED]'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          <span>Organizzazione Cartelle ({folderSuggestions.length})</span>
        </button>
      </div>

      {/* Content Container */}
      {activeSection === 'quarantine' ? (
        <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden shadow-sm">
          {/* Table/List Header */}
          <div className="h-12 px-4 bg-[#1E2024] border-b border-[#2F3136] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={selectedFileIds.size === validRecommendations.length && validRecommendations.length > 0 ? handleClearSelection : handleSelectAll}
                className="text-xs font-semibold text-[#9A9DA5] hover:text-[#EAEBED] transition-colors"
              >
                {selectedFileIds.size === validRecommendations.length && validRecommendations.length > 0
                  ? 'Deseleziona tutti'
                  : 'Seleziona tutti'}
              </button>
              <span className="text-[#9A9DA5]">•</span>
              <button
                onClick={handleSelectHighConfidenceOnly}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Seleziona solo Alta Affidabilità
              </button>
            </div>

            {selectedFileIds.size > 0 && (
              <button
                onClick={handleQuarantineSelected}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#E31B23] hover:bg-red-600 active:scale-98 text-white font-bold text-xs shadow-md transition-all animate-fadeIn"
              >
                <ShieldAlert className="w-4 h-4" />
                Sposta in Quarantena ({selectedFileIds.size})
              </button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center p-4">
              <div className="w-14 h-14 rounded-3xl bg-[#2A2C31] flex items-center justify-center text-[#E31B23] mb-3 border border-[#3A3D45] animate-spin">
                <RefreshCw className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-[#EAEBED]">
                Gemini sta analizzando la tua cartella...
              </h3>
              <p className="text-xs text-[#9A9DA5] mt-1 max-w-xs">
                Valutazione dei pattern di naming, duplicati, screenshot e file non aggiornati.
              </p>
            </div>
          ) : validRecommendations.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center p-4">
              <div className="w-14 h-14 rounded-3xl bg-[#2A2C31] flex items-center justify-center text-emerald-400 mb-3 border border-[#3A3D45]">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-[#EAEBED]">
                {aiResult ? 'Nessun file problematico rilevato' : 'Pronto per l\'analisi'}
              </h3>
              <p className="text-xs text-[#9A9DA5] mt-1 max-w-sm">
                {aiResult
                  ? 'Tutti i file in questa cartella sembrano rilevanti e in ordine. Ottimo lavoro!'
                  : 'Tocca il pulsante "Avvia Analisi Gemini" in alto per esaminare i file della cartella corrente.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#2F3136]/60">
              {validRecommendations.map((rec) => {
                const fileObj = fileMap.get(rec.fileId);
                if (!fileObj) return null;
                const isSelected = selectedFileIds.has(rec.fileId);

                return (
                  <div
                    key={rec.fileId}
                    className={`p-3.5 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-[#E31B23]/15' : 'hover:bg-[#2A2C31]/50'
                    }`}
                  >
                    {/* Left: Checkbox, Icon, Title and AI Reason */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => handleToggleSelect(rec.fileId)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-[#E31B23] border-[#E31B23] text-white'
                            : 'border-[#3F4248] bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                      </button>

                      <div className="w-10 h-10 rounded-2xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/60 flex-shrink-0 mt-0.5">
                        {getFileIcon(fileObj)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs md:text-sm text-[#EAEBED] truncate max-w-md" title={fileObj.name}>
                            {fileObj.name}
                          </span>
                          {getConfidenceBadge(rec.confidence)}
                          <span className="text-[10px] text-[#9A9DA5] px-2 py-0.5 rounded-full bg-[#18191B] border border-[#2F3136]">
                            {getCategoryLabel(rec.category)}
                          </span>
                        </div>

                        {/* AI Reason in plain Italian */}
                        <p className="text-xs text-[#9A9DA5] mt-1.5 leading-relaxed bg-[#18191B]/60 p-2 rounded-xl border border-[#2F3136]/50">
                          <strong className="text-amber-400 font-semibold">Motivo AI: </strong>
                          {rec.reason}
                        </p>

                        {/* File meta */}
                        <div className="flex items-center gap-3 text-[10px] text-[#9A9DA5] mt-1.5 font-mono">
                          <span>Dimensione: {formatFileSize(fileObj.size)}</span>
                          <span>•</span>
                          <span>Modificato: {formatItalianDate(fileObj.modifiedTime)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Quarantine Action */}
                    <div className="flex items-center justify-end sm:flex-shrink-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => {
                          triggerHaptic('doublePulse', hapticsEnabled);
                          playSound('quarantine', soundsEnabled);
                          onMoveToQuarantine([fileObj]);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-950/70 text-[#E31B23] border border-red-900/40 text-xs font-bold transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Sposta in Quarantena
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Folder Structure Suggestions Section */
        <div className="space-y-4">
          {folderSuggestions.length === 0 ? (
            <div className="rounded-3xl bg-[#222428] border border-[#2F3136] p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-3xl bg-[#2A2C31] flex items-center justify-center text-amber-400 mb-3 border border-[#3A3D45]">
                <FolderPlus className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-[#EAEBED]">
                {aiResult ? 'Nessuna struttura di cartelle aggiuntiva suggerita' : 'Esegui l\'analisi AI'}
              </h3>
              <p className="text-xs text-[#9A9DA5] mt-1 max-w-sm">
                {aiResult
                  ? 'I file della cartella corrente non presentano prefissi o pattern di nomenclatura distinti da spostare in nuove cartelle.'
                  : 'Avvia l\'analisi Gemini per individuare pattern di naming e strutture di cartelle tematiche suggerite.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {folderSuggestions.map((sug) => {
                const targetFiles = sug.suggestedFiles
                  .map((item) => fileMap.get(item.fileId))
                  .filter(Boolean) as DriveFile[];

                if (targetFiles.length === 0) return null;

                const isMoving = movingFolders[sug.id] || false;

                return (
                  <div
                    key={sug.id}
                    className="rounded-3xl bg-[#222428] border border-[#2F3136] p-4 md:p-5 shadow-sm space-y-3 animate-fadeIn"
                  >
                    {/* Header: Folder Name, Rationale, and Create & Move Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2F3136]">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                          <Folder className="w-6 h-6" strokeWidth={1.75} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-base font-bold text-[#EAEBED]">
                              Proposta Cartella: "{sug.targetFolderName}"
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {targetFiles.length} file
                            </span>
                          </div>
                          <p className="text-xs text-[#9A9DA5] mt-0.5">
                            {sug.description}
                          </p>
                        </div>
                      </div>

                      {/* Move Action Button */}
                      {onExecuteFolderOrganize && (
                        <button
                          onClick={async () => {
                            triggerHaptic('doublePulse', hapticsEnabled);
                            playSound('pop', soundsEnabled);
                            setMovingFolders((prev) => ({ ...prev, [sug.id]: true }));
                            try {
                              await onExecuteFolderOrganize(sug.targetFolderName, targetFiles);
                            } finally {
                              setMovingFolders((prev) => ({ ...prev, [sug.id]: false }));
                            }
                          }}
                          disabled={isMoving}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 self-start sm:self-auto"
                        >
                          <FolderOutput className={`w-4 h-4 ${isMoving ? 'animate-spin' : ''}`} />
                          <span>{isMoving ? 'Spostamento in corso...' : 'Sposta File in questa Cartella'}</span>
                        </button>
                      )}
                    </div>

                    {/* File Items Grid */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-[#9A9DA5] uppercase tracking-wider mb-1">
                        File Corrispondenti al Pattern:
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sug.suggestedFiles.map((item) => {
                          const fileObj = fileMap.get(item.fileId);
                          if (!fileObj) return null;

                          return (
                            <div
                              key={item.fileId}
                              className="p-2.5 rounded-2xl bg-[#18191B] border border-[#2F3136] flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/50 flex-shrink-0">
                                  {getFileIcon(fileObj)}
                                </div>
                                <span className="text-xs font-semibold text-[#EAEBED] truncate" title={fileObj.name}>
                                  {fileObj.name}
                                </span>
                              </div>

                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2A2C31] text-amber-300 border border-amber-500/20 flex-shrink-0 flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5 text-amber-400" />
                                {item.patternMatched}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
