import { DriveFile, RenameRule, RenamePreviewItem } from '../types/drive';

/**
 * Splits a file name into base name and extension.
 * Folders do not have file extensions.
 */
export const splitFileName = (
  name: string,
  isFolder: boolean
): { base: string; ext: string } => {
  if (isFolder) {
    return { base: name, ext: '' };
  }
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === name.length - 1) {
    return { base: name, ext: '' };
  }
  return {
    base: name.substring(0, lastDot),
    ext: name.substring(lastDot), // includes the dot, e.g. '.pdf'
  };
};

/**
 * Formats a Date object according to desired format and separator.
 */
export const formatDate = (
  date: Date,
  format: 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'YYYYMMDD' | 'YYYY_MM_DD',
  separator: string = '-'
): string => {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${yyyy}${separator}${mm}${separator}${dd}`;
    case 'DD-MM-YYYY':
      return `${dd}${separator}${mm}${separator}${yyyy}`;
    case 'YYYYMMDD':
      return `${yyyy}${mm}${dd}`;
    case 'YYYY_MM_DD':
      return `${yyyy}_${mm}_${dd}`;
    default:
      return `${yyyy}${separator}${mm}${separator}${dd}`;
  }
};

/**
 * Transforms string into different casing formats.
 */
export const transformCase = (
  str: string,
  casing: 'kebab-case' | 'snake_case' | 'Title Case' | 'UPPERCASE' | 'lowercase'
): string => {
  // Normalize and split by words (spaces, dashes, underscores)
  const words = str
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase split
    .split(/[\s\-_]+/)
    .filter(Boolean);

  if (words.length === 0) return str;

  switch (casing) {
    case 'kebab-case':
      return words.map((w) => w.toLowerCase()).join('-');
    case 'snake_case':
      return words.map((w) => w.toLowerCase()).join('_');
    case 'Title Case':
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    case 'UPPERCASE':
      return str.toUpperCase();
    case 'lowercase':
      return str.toLowerCase();
    default:
      return str;
  }
};

/**
 * Cleans and sanitizes names: removes illegal symbols, double spaces, trailing chars.
 */
export const sanitizeName = (
  str: string,
  options?: {
    removeSpecialChars?: boolean;
    spacesToHyphens?: boolean;
    spacesToUnderscores?: boolean;
    normalizeSeparators?: boolean;
  }
): string => {
  let res = str;

  // Replace URL encoded entities if any (like %20)
  try {
    res = decodeURIComponent(res);
  } catch {
    // ignore
  }

  if (options?.removeSpecialChars) {
    // Keep letters, numbers, spaces, dots, dashes, underscores
    res = res.replace(/[^\w\s.\-_àèéìòùÀÈÉÌÒÙ]/g, '');
  }

  if (options?.spacesToHyphens) {
    res = res.replace(/\s+/g, '-');
  } else if (options?.spacesToUnderscores) {
    res = res.replace(/\s+/g, '_');
  }

  if (options?.normalizeSeparators) {
    // Compress multiple hyphens or underscores
    res = res.replace(/[-_]{2,}/g, '-').replace(/\s{2,}/g, ' ');
  }

  return res.trim();
};

/**
 * Applies a single rename rule to a base filename.
 */
export const applyRule = (
  baseName: string,
  file: DriveFile,
  rule: RenameRule,
  index: number = 0
): string => {
  if (!rule.enabled) return baseName;

  // Separation between files and folders:
  // If rule targets only files and item is a folder -> do NOT apply!
  if (rule.targetScope === 'files-only' && file.isFolder) {
    return baseName;
  }
  // If rule targets only folders and item is a file -> do NOT apply!
  if (rule.targetScope === 'folders-only' && !file.isFolder) {
    return baseName;
  }

  let current = baseName;

  switch (rule.type) {
    case 'date-stamp': {
      let targetDate = new Date();
      if (rule.dateSource === 'modified' && file.modifiedTime) {
        targetDate = new Date(file.modifiedTime);
      } else if (rule.dateSource === 'created' && file.createdTime) {
        targetDate = new Date(file.createdTime);
      }
      const sep = rule.dateSeparator ?? '_';
      const dateStr = formatDate(targetDate, rule.dateFormat || 'YYYY-MM-DD', sep);

      if (rule.datePlacement === 'suffix') {
        current = `${current}${sep}${dateStr}`;
      } else {
        current = `${dateStr}${sep}${current}`;
      }
      break;
    }

    case 'case-transform': {
      if (rule.caseFormat) {
        current = transformCase(current, rule.caseFormat);
      }
      break;
    }

    case 'prefix-suffix': {
      const p = rule.prefixText || '';
      const s = rule.suffixText || '';
      current = `${p}${current}${s}`;
      break;
    }

    case 'search-replace': {
      if (rule.searchPattern) {
        try {
          if (rule.isRegex) {
            const flags = rule.matchCase ? 'g' : 'gi';
            const rx = new RegExp(rule.searchPattern, flags);
            current = current.replace(rx, rule.replaceText || '');
          } else {
            const flags = rule.matchCase ? 'g' : 'gi';
            const escaped = rule.searchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const rx = new RegExp(escaped, flags);
            current = current.replace(rx, rule.replaceText || '');
          }
        } catch {
          // If invalid regex, retain current
        }
      }
      break;
    }

    case 'clean-sanitize': {
      current = sanitizeName(current, rule.cleanOptions);
      break;
    }

    case 'sequence-number': {
      const start = rule.sequenceStart ?? 1;
      const digits = rule.sequenceDigits ?? 3;
      const numStr = (start + index).toString().padStart(digits, '0');
      const pref = rule.sequencePrefix ?? '';
      const suff = rule.sequenceSuffix ?? '_';
      current = `${pref}${numStr}${suff}${current}`;
      break;
    }
  }

  return current;
};

/**
 * Computes preview items for a list of Drive files given an ordered set of rules.
 */
export const previewBatchRename = (
  files: DriveFile[],
  rules: RenameRule[]
): RenamePreviewItem[] => {
  const seenNewNames = new Map<string, number>();

  return files.map((file, idx) => {
    const { base, ext } = splitFileName(file.name, file.isFolder);
    let newBase = base;

    for (const rule of rules) {
      if (rule.enabled) {
        newBase = applyRule(newBase, file, rule, idx);
      }
    }

    // Clean up empty edge spaces
    newBase = newBase.trim();
    if (!newBase) {
      newBase = base; // Don't allow empty filename
    }

    const newFullName = `${newBase}${ext}`;
    const count = (seenNewNames.get(newFullName) || 0) + 1;
    seenNewNames.set(newFullName, count);

    return {
      id: file.id,
      originalName: file.name,
      newName: newFullName,
      extension: ext,
      mimeType: file.mimeType,
      hasChanged: newFullName !== file.name,
      isFolder: file.isFolder,
      conflict: count > 1,
    };
  });
};

/**
 * Built-in Quick Presets for fast 1-tap renaming.
 */
export const PRESET_RULES: {
  id: string;
  name: string;
  description: string;
  targetScope: 'files-only' | 'folders-only' | 'both';
  typology: string;
  icon?: string;
  rules: RenameRule[];
}[] = [
  // --- PRESET FILE PER TIPOLOGIA ---
  {
    id: 'file-fattura',
    name: '💶 Fattura & Ricevuta Fiscale',
    description: 'FATTURA_YYYY-MM-DD_NomeFile (per file di acquisto o vendita)',
    targetScope: 'files-only',
    typology: 'fatture',
    rules: [
      {
        id: 'r-fat-1',
        type: 'date-stamp',
        enabled: true,
        targetScope: 'files-only',
        datePlacement: 'prefix',
        dateFormat: 'YYYY-MM-DD',
        dateSource: 'modified',
        dateSeparator: '_',
      },
      {
        id: 'r-fat-2',
        type: 'prefix-suffix',
        enabled: true,
        targetScope: 'files-only',
        prefixText: 'FATTURA_',
      },
    ],
  },
  {
    id: 'file-scontrino',
    name: '🧾 Scontrino & Spesa',
    description: 'SCONTRINO_YYYY-MM-DD_NomeFile (spese, rimborsi, ricevute bar/ristorante)',
    targetScope: 'files-only',
    typology: 'scontrini',
    rules: [
      {
        id: 'r-sco-1',
        type: 'date-stamp',
        enabled: true,
        targetScope: 'files-only',
        datePlacement: 'prefix',
        dateFormat: 'YYYY-MM-DD',
        dateSource: 'modified',
        dateSeparator: '_',
      },
      {
        id: 'r-sco-2',
        type: 'prefix-suffix',
        enabled: true,
        targetScope: 'files-only',
        prefixText: 'SCONTRINO_',
      },
    ],
  },
  {
    id: 'file-identita',
    name: '🪪 Documento di Identità',
    description: 'DOC_IDENTITA_NomeFile (carta identità, passaporto, patente, codice fiscale)',
    targetScope: 'files-only',
    typology: 'identita',
    rules: [
      {
        id: 'r-id-1',
        type: 'prefix-suffix',
        enabled: true,
        targetScope: 'files-only',
        prefixText: 'DOC_IDENTITA_',
      },
      {
        id: 'r-id-2',
        type: 'case-transform',
        enabled: true,
        targetScope: 'files-only',
        caseFormat: 'Title Case',
      },
    ],
  },
  {
    id: 'file-contratto',
    name: '📑 Contratto & Accordo',
    description: 'CONTRATTO_YYYY_NomeFile (locazione, lavoro, NDA, fornitura)',
    targetScope: 'files-only',
    typology: 'contratti',
    rules: [
      {
        id: 'r-con-1',
        type: 'prefix-suffix',
        enabled: true,
        targetScope: 'files-only',
        prefixText: 'CONTRATTO_',
      },
      {
        id: 'r-con-2',
        type: 'clean-sanitize',
        enabled: true,
        targetScope: 'files-only',
        cleanOptions: {
          removeSpecialChars: true,
          spacesToHyphens: false,
          spacesToUnderscores: true,
          normalizeSeparators: true,
        },
      },
    ],
  },
  {
    id: 'file-bustapaga',
    name: '💼 Busta Paga & Cedolino',
    description: 'BUSTA_PAGA_YYYY-MM_NomeFile (cedolini stipendio e certificazioni)',
    targetScope: 'files-only',
    typology: 'bustepaga',
    rules: [
      {
        id: 'r-bp-1',
        type: 'date-stamp',
        enabled: true,
        targetScope: 'files-only',
        datePlacement: 'prefix',
        dateFormat: 'YYYY-MM-DD',
        dateSource: 'modified',
        dateSeparator: '_',
      },
      {
        id: 'r-bp-2',
        type: 'prefix-suffix',
        enabled: true,
        targetScope: 'files-only',
        prefixText: 'BUSTA_PAGA_',
      },
    ],
  },

  // --- PRESET CARTELLE DEDICATI ---
  {
    id: 'folder-anno',
    name: '📁 Cartella Anno / Mese',
    description: 'YYYY-MM_NomeCartella (es. 2026-09_Fatture)',
    targetScope: 'folders-only',
    typology: 'cartella-anno',
    rules: [
      {
        id: 'r-fa-1',
        type: 'date-stamp',
        enabled: true,
        targetScope: 'folders-only',
        datePlacement: 'prefix',
        dateFormat: 'YYYY-MM-DD',
        dateSource: 'today',
        dateSeparator: '_',
      },
    ],
  },
  {
    id: 'folder-tag',
    name: '📁 Cartella con Tag Reparto [TAG]',
    description: '[CATEGORIA] NomeCartella (es. [FATTURE] 2026)',
    targetScope: 'folders-only',
    typology: 'cartella-reparto',
    rules: [
      {
        id: 'r-ft-1',
        type: 'prefix-suffix',
        enabled: true,
        targetScope: 'folders-only',
        prefixText: '[ARCHIVIO] ',
      },
      {
        id: 'r-ft-2',
        type: 'case-transform',
        enabled: true,
        targetScope: 'folders-only',
        caseFormat: 'Title Case',
      },
    ],
  },
  {
    id: 'folder-title',
    name: '📁 Cartella Standard Title Case',
    description: 'Nomi cartelle puliti e formattati (es. Documenti Personali e Casa)',
    targetScope: 'folders-only',
    typology: 'cartella-titolo',
    rules: [
      {
        id: 'r-fcl-1',
        type: 'clean-sanitize',
        enabled: true,
        targetScope: 'folders-only',
        cleanOptions: {
          removeSpecialChars: true,
          spacesToHyphens: false,
          spacesToUnderscores: false,
          normalizeSeparators: true,
        },
      },
      {
        id: 'r-fcl-2',
        type: 'case-transform',
        enabled: true,
        targetScope: 'folders-only',
        caseFormat: 'Title Case',
      },
    ],
  },

  // --- PRESET GENERALI ---
  {
    id: 'date-prefix-kebab',
    name: 'Data + Kebab Case',
    description: '2026-09-29-nome-documento.pdf (standard web)',
    targetScope: 'both',
    typology: 'generale',
    rules: [
      {
        id: 'r1',
        type: 'date-stamp',
        enabled: true,
        targetScope: 'both',
        datePlacement: 'prefix',
        dateFormat: 'YYYY-MM-DD',
        dateSource: 'modified',
        dateSeparator: '-',
      },
      {
        id: 'r2',
        type: 'case-transform',
        enabled: true,
        targetScope: 'both',
        caseFormat: 'kebab-case',
      },
    ],
  },
  {
    id: 'snake-case-clean',
    name: 'Snake Case Tecnico',
    description: 'Tutto minuscolo con underscore (es. report_mensile.pdf)',
    targetScope: 'both',
    typology: 'generale',
    rules: [
      {
        id: 'r1',
        type: 'case-transform',
        enabled: true,
        targetScope: 'both',
        caseFormat: 'snake_case',
      },
    ],
  },
  {
    id: 'numbered-sequence',
    name: 'Sequenza Ordinata (001, 002...)',
    description: 'Numera progressivamente i file (es. 001_foto.jpg)',
    targetScope: 'both',
    typology: 'generale',
    rules: [
      {
        id: 'r1',
        type: 'sequence-number',
        enabled: true,
        targetScope: 'both',
        sequenceStart: 1,
        sequenceDigits: 3,
        sequenceSuffix: '_',
      },
    ],
  },
];
