import React, { useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  ShieldAlert,
  ExternalLink,
  RotateCcw,
  FolderOpen,
  RefreshCw,
  Copy,
  Eye,
} from 'lucide-react';
import { DriveFile, FolderStats } from '../types/drive';
import { getFileIcon, formatItalianDate, getFileOrFolderSizeLabel } from './FileItemCard';
import { triggerHaptic } from '../lib/haptics';
import { playSound } from '../lib/sound';
import { HighlightedText } from './HighlightedText';

interface TableViewProps {
  files: DriveFile[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  inspectedFile: DriveFile | null;
  onInspectFile: (file: DriveFile) => void;
  onDoubleClickFolder?: (file: DriveFile) => void;
  onOpenFolder?: (file: DriveFile) => void;
  onContextMenu: (e: React.MouseEvent, file: DriveFile) => void;
  onQuickRename: (file: DriveFile, newName: string) => void;
  onQuickQuarantine: (file: DriveFile) => void;
  onQuickRestore?: (file: DriveFile) => void;
  onCalculateFolderSize?: (file: DriveFile) => void;
  onQuickPreview?: (file: DriveFile) => void;
  folderStatsMap?: Record<string, FolderStats>;
  isQuarantinedView?: boolean;
  density?: 'comfort' | 'compact';
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  searchQuery?: string;
}

type SortField = 'name' | 'size' | 'modifiedTime' | 'type';

export const TableView: React.FC<TableViewProps> = ({
  files,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  inspectedFile,
  onInspectFile,
  onDoubleClickFolder,
  onOpenFolder,
  onContextMenu,
  onQuickRename,
  onQuickQuarantine,
  onQuickRestore,
  onCalculateFolderSize,
  onQuickPreview,
  folderStatsMap,
  isQuarantinedView = false,
  density = 'comfort',
  hapticsEnabled,
  soundsEnabled,
  searchQuery = '',
}) => {
  const [sortField, setSortField] = useState<SortField>('modifiedTime');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    triggerHaptic('tick', hapticsEnabled);
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending
    }
  };

  const handleExecuteOpenFolder = (folder: DriveFile) => {
    triggerHaptic('snap', hapticsEnabled);
    playSound('pop', soundsEnabled);
    if (onOpenFolder) {
      onOpenFolder(folder);
    } else if (onDoubleClickFolder) {
      onDoubleClickFolder(folder);
    }
  };

  const sortedFiles = [...files].sort((a, b) => {
    // Folders always first unless sorting explicitly
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;

    let res = 0;
    if (sortField === 'name') {
      res = a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });
    } else if (sortField === 'size') {
      const sizeA = a.isFolder
        ? (folderStatsMap?.[a.id]?.totalBytes || 0)
        : (Number(a.size) || Number(a.quotaBytesUsed) || 0);
      const sizeB = b.isFolder
        ? (folderStatsMap?.[b.id]?.totalBytes || 0)
        : (Number(b.size) || Number(b.quotaBytesUsed) || 0);
      res = sizeA - sizeB;
    } else if (sortField === 'modifiedTime') {
      const timeA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
      const timeB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
      res = timeA - timeB;
    } else if (sortField === 'type') {
      res = (a.mimeType || '').localeCompare(b.mimeType || '');
    }
    return sortAsc ? res : -res;
  });

  const allSelected = selectedIds.size === files.length && files.length > 0;

  return (
    <div className="rounded-3xl bg-[#222428] border border-[#2F3136] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#EAEBED] border-collapse">
          {/* Table Header */}
          <thead className="bg-[#1E2024] border-b border-[#2F3136] text-[11px] font-bold text-[#9A9DA5] uppercase tracking-wider select-none">
            <tr>
              <th className="w-12 px-4 py-3 text-center">
                <button
                  onClick={allSelected ? onClearSelection : onSelectAll}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    allSelected
                      ? 'bg-[#E31B23] border-[#E31B23] text-white'
                      : 'border-[#3F4248] bg-transparent'
                  }`}
                >
                  {allSelected && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                </button>
              </th>

              <th
                onClick={() => handleSort('name')}
                className="px-4 py-3 cursor-pointer hover:text-[#EAEBED] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Nome Elemento</span>
                  {sortField === 'name' ? (
                    sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#E31B23]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#E31B23]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-[#9A9DA5]/50" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('size')}
                className="px-4 py-3 text-right cursor-pointer hover:text-[#EAEBED] transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Dimensione</span>
                  {sortField === 'size' ? (
                    sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#E31B23]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#E31B23]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-[#9A9DA5]/50" />
                  )}
                </div>
              </th>

              <th
                onClick={() => handleSort('modifiedTime')}
                className="hidden md:table-cell px-4 py-3 cursor-pointer hover:text-[#EAEBED] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Modificato il</span>
                  {sortField === 'modifiedTime' ? (
                    sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#E31B23]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#E31B23]" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-[#9A9DA5]/50" />
                  )}
                </div>
              </th>

              <th className="hidden lg:table-cell px-4 py-3">Tipo File</th>

              <th className="w-32 px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#2F3136]/60">
            {sortedFiles.map((file) => {
              const isSelected = selectedIds.has(file.id);
              const isInspected = inspectedFile?.id === file.id;
              const cellPadding = density === 'compact' ? 'py-1.5' : 'py-2.5';
              const sizeInfo = getFileOrFolderSizeLabel(file, folderStatsMap?.[file.id]);

              return (
                <tr
                  key={file.id}
                  onClick={() => {
                    if (file.isFolder) {
                      handleExecuteOpenFolder(file);
                    } else {
                      onInspectFile(file);
                    }
                  }}
                  onDoubleClick={() => file.isFolder && handleExecuteOpenFolder(file)}
                  onContextMenu={(e) => onContextMenu(e, file)}
                  className={`transition-colors cursor-pointer group ${
                    isSelected
                      ? 'bg-[#E31B23]/15'
                      : isInspected
                      ? 'bg-[#2A2C31]'
                      : 'hover:bg-[#2A2C31]/50'
                  }`}
                >
                  <td
                    className={`px-4 ${cellPadding} text-center`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onToggleSelect(file.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#E31B23] border-[#E31B23] text-white'
                          : 'border-[#3F4248] bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    </button>
                  </td>

                  <td className={`px-4 ${cellPadding} min-w-[200px]`}>
                    <div className="flex items-center gap-2.5">
                      <div
                        onClick={(e) => {
                          if (file.isFolder) {
                            e.stopPropagation();
                            handleExecuteOpenFolder(file);
                          }
                        }}
                        className={`w-7 h-7 rounded-xl bg-[#2A2C31] flex items-center justify-center border border-[#3A3D45]/50 flex-shrink-0 ${
                          file.isFolder ? 'hover:border-amber-400' : ''
                        }`}
                      >
                        {getFileIcon(file)}
                      </div>
                      <span
                        className={`font-semibold text-xs truncate max-w-xs md:max-w-md flex items-center gap-1.5 ${
                          file.isFolder ? 'text-[#EAEBED] hover:text-amber-300' : 'text-[#EAEBED]'
                        }`}
                        title={file.name}
                      >
                        <HighlightedText text={file.name} query={searchQuery} />
                        {file.duplicateInfo?.isDuplicate && (
                          <span
                            title={`Duplicato di: ${file.duplicateInfo.matchedWithName || 'originale'}`}
                            className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40 inline-flex items-center gap-0.5 flex-shrink-0"
                          >
                            <Copy className="w-2.5 h-2.5" /> Duplicato
                          </span>
                        )}
                        {file.duplicateInfo?.isOriginal && (
                          <span
                            title="File originale primario"
                            className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 text-[9px] font-semibold border border-emerald-500/30 flex-shrink-0"
                          >
                            Originale
                          </span>
                        )}
                      </span>
                    </div>
                  </td>

                  {/* Size Column */}
                  <td className={`px-4 ${cellPadding} text-right font-mono tabular-nums`}>
                    {file.isFolder ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCalculateFolderSize) onCalculateFolderSize(file);
                        }}
                        className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors font-semibold"
                        title="Calcola dimensione cartella"
                      >
                        {sizeInfo.isCalculating ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Calcolo...
                          </span>
                        ) : (
                          <span>
                            {sizeInfo.label}
                            {sizeInfo.sublabel && (
                              <span className="text-[#9A9DA5] font-normal ml-1">
                                ({sizeInfo.sublabel})
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    ) : sizeInfo.isCloudDoc ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-semibold uppercase">
                        {sizeInfo.label}
                      </span>
                    ) : (
                      <span className="text-[#EAEBED] font-medium">
                        {sizeInfo.label}
                      </span>
                    )}
                  </td>

                  <td className={`hidden md:table-cell px-4 ${cellPadding} font-mono tabular-nums text-[#9A9DA5]`}>
                    {formatItalianDate(file.modifiedTime)}
                  </td>

                  <td className={`hidden lg:table-cell px-4 ${cellPadding} text-[#9A9DA5] text-[11px] truncate max-w-[140px]`}>
                    {file.isFolder ? (
                      <span className="text-amber-400/90 font-medium">Cartella</span>
                    ) : (
                      file.mimeType.split('/').pop()
                    )}
                  </td>

                  <td
                    className={`px-4 ${cellPadding} text-right`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {/* Prominent Open button for folder */}
                      {file.isFolder && (
                        <button
                          onClick={() => handleExecuteOpenFolder(file)}
                          title="Apri cartella"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>Apri</span>
                        </button>
                      )}

                      {/* Quick Preview button */}
                      {!file.isFolder && onQuickPreview && (
                        <button
                          onClick={() => {
                            triggerHaptic('tick', hapticsEnabled);
                            playSound('pop', soundsEnabled);
                            onQuickPreview(file);
                          }}
                          title="Anteprima Rapida documento"
                          className="w-7 h-7 rounded-lg bg-[#222428] hover:bg-amber-500/20 text-[#9A9DA5] hover:text-amber-300 border border-[#2F3136] hover:border-amber-500/40 flex items-center justify-center transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isQuarantinedView ? (
                        <button
                          onClick={() => onQuickRestore && onQuickRestore(file)}
                          title="Ripristina file"
                          className="w-7 h-7 rounded-lg bg-[#222428] hover:bg-emerald-950/40 text-emerald-400 border border-[#2F3136] flex items-center justify-center transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onQuickQuarantine(file)}
                          title="Sposta in Quarantena"
                          className="w-7 h-7 rounded-lg bg-[#222428] hover:bg-red-950/40 text-[#E31B23] border border-[#2F3136] flex items-center justify-center transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          title="Apri in Drive"
                          className="w-7 h-7 rounded-lg bg-[#222428] hover:bg-[#2A2C31] text-[#9A9DA5] hover:text-[#EAEBED] border border-[#2F3136] flex items-center justify-center transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
