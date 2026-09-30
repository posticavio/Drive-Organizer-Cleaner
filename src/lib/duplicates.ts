import { DriveFile, DuplicateGroup, DuplicateInfo } from '../types/drive';

export interface DuplicateDetectionResult {
  filesWithDuplicates: DriveFile[];
  duplicateFiles: DriveFile[]; // Only the extra duplicate copies (ready for quarantine)
  originalFiles: DriveFile[]; // The primary original versions to keep
  duplicateGroups: DuplicateGroup[];
  totalDuplicateCount: number;
  totalWastedBytes: number;
}

/**
 * Normalizes a filename to identify base names and copy suffixes.
 * Recognizes common patterns like "name (1).pdf", "name - Copia.docx", "name copy.png", etc.
 */
export const normalizeFilename = (
  filename: string
): { cleanBase: string; ext: string; hasCopySuffix: boolean } => {
  const lastDot = filename.lastIndexOf('.');
  const base = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';

  // Patterns for copies:
  // - " (1)", " (2)"
  // - " - Copia", " - Copia (1)", " - Copy"
  // - " copia", " copy"
  // - "_copy", "_copia"
  const copyRegex = /(\s*\(\d+\)|\s*-\s*(copia|copy)(\s*\(\d+\))?|\s+(copia|copy)(\s*\(\d+\))?|_(copia|copy))$/i;

  const hasCopySuffix = copyRegex.test(base);
  const cleanBase = base.replace(copyRegex, '').trim().toLowerCase();

  return {
    cleanBase,
    ext,
    hasCopySuffix,
  };
};

/**
 * Analyzes files in the current folder to detect and group duplicates.
 * Returns enriched files with `duplicateInfo`, duplicate files ready for selection/quarantine,
 * and waste calculation.
 */
export const detectDuplicates = (files: DriveFile[]): DuplicateDetectionResult => {
  // We only check files, folders are not flagged as file duplicates
  const candidateFiles = files.filter((f) => !f.isFolder);

  if (candidateFiles.length <= 1) {
    return {
      filesWithDuplicates: files,
      duplicateFiles: [],
      originalFiles: [],
      duplicateGroups: [],
      totalDuplicateCount: 0,
      totalWastedBytes: 0,
    };
  }

  // Map to cluster files into potential duplicate groups
  const groupsMap = new Map<
    string,
    {
      reason: 'md5' | 'exact-name' | 'copy-pattern';
      reasonLabel: string;
      items: DriveFile[];
    }
  >();

  // 1. Group by MD5 Checksum (Exact binary match)
  candidateFiles.forEach((file) => {
    const sizeNum = Number(file.size) || 0;
    if (file.md5Checksum && sizeNum > 0) {
      const key = `md5:${file.md5Checksum}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          reason: 'md5',
          reasonLabel: 'Contenuto identico (MD5)',
          items: [],
        });
      }
      groupsMap.get(key)!.items.push(file);
    }
  });

  // 2. Group by Exact Name and same size (or exact name if no size info)
  const exactNameMap = new Map<string, DriveFile[]>();
  candidateFiles.forEach((file) => {
    const lowerName = file.name.trim().toLowerCase();
    const size = file.size || '0';
    const key = `exact:${lowerName}:${size}`;
    if (!exactNameMap.has(key)) {
      exactNameMap.set(key, []);
    }
    exactNameMap.get(key)!.push(file);
  });

  exactNameMap.forEach((items, key) => {
    if (items.length > 1) {
      // Check if not already grouped by MD5
      const alreadyMd5 = items.some((f) => f.md5Checksum && groupsMap.has(`md5:${f.md5Checksum}`));
      if (!alreadyMd5 && !groupsMap.has(key)) {
        groupsMap.set(key, {
          reason: 'exact-name',
          reasonLabel: 'Nome e dimensione identici',
          items,
        });
      }
    }
  });

  // 3. Group by Normalized Base Name + Extension (Copy pattern e.g. "Report (1).pdf" vs "Report.pdf")
  const copyPatternMap = new Map<string, DriveFile[]>();
  candidateFiles.forEach((file) => {
    const { cleanBase, ext, hasCopySuffix } = normalizeFilename(file.name);
    // Group key by clean base + extension + mimeType (or size if present)
    const key = `pattern:${cleanBase}${ext}:${file.mimeType}`;
    if (!copyPatternMap.has(key)) {
      copyPatternMap.set(key, []);
    }
    copyPatternMap.get(key)!.push(file);
  });

  copyPatternMap.forEach((items, key) => {
    if (items.length > 1) {
      // At least one file should have a copy suffix or same size
      const hasSuffixVariant = items.some((f) => normalizeFilename(f.name).hasCopySuffix);
      if (hasSuffixVariant) {
        // Only add if items aren't already captured in MD5 or exact name
        const alreadyGrouped = items.some((item) =>
          Array.from(groupsMap.values()).some((g) => g.items.some((gi) => gi.id === item.id))
        );
        if (!alreadyGrouped && !groupsMap.has(key)) {
          groupsMap.set(key, {
            reason: 'copy-pattern',
            reasonLabel: 'Copia o versione duplicata',
            items,
          });
        }
      }
    }
  });

  // Filter only groups that actually have 2 or more files
  const duplicateInfoMap = new Map<string, DuplicateInfo>();
  const duplicateGroups: DuplicateGroup[] = [];
  const duplicateFilesList: DriveFile[] = [];
  const originalFilesList: DriveFile[] = [];
  let totalWastedBytes = 0;

  let groupCounter = 1;
  groupsMap.forEach((groupData, key) => {
    const items = groupData.items;
    if (items.length <= 1) return;

    // Pick the "Original" file:
    // 1. A file WITHOUT a copy suffix (e.g. "file.pdf" over "file (1).pdf")
    // 2. Earliest createdTime or modifiedTime
    // 3. Shortest filename
    const sorted = [...items].sort((a, b) => {
      const aNorm = normalizeFilename(a.name);
      const bNorm = normalizeFilename(b.name);

      if (!aNorm.hasCopySuffix && bNorm.hasCopySuffix) return -1;
      if (aNorm.hasCopySuffix && !bNorm.hasCopySuffix) return 1;

      const aTime = new Date(a.createdTime || a.modifiedTime || 0).getTime();
      const bTime = new Date(b.createdTime || b.modifiedTime || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;

      return a.name.length - b.name.length;
    });

    const original = sorted[0];
    const duplicates = sorted.slice(1);
    const groupId = `dup-group-${groupCounter++}`;

    originalFilesList.push(original);

    // Tag the original
    duplicateInfoMap.set(original.id, {
      isDuplicate: false,
      isOriginal: true,
      groupId,
      reason: groupData.reason,
      label: 'Originale',
    });

    // Tag each duplicate
    duplicates.forEach((dup) => {
      const bytes = Number(dup.size) || 0;
      totalWastedBytes += bytes;

      const dupInfo: DuplicateInfo = {
        isDuplicate: true,
        isOriginal: false,
        groupId,
        reason: groupData.reason,
        label: groupData.reasonLabel,
        matchedWithName: original.name,
        wastedBytes: bytes,
      };

      duplicateInfoMap.set(dup.id, dupInfo);
      duplicateFilesList.push({
        ...dup,
        duplicateInfo: dupInfo,
      });
    });

    duplicateGroups.push({
      groupId,
      originalFile: original,
      duplicateFiles: duplicates,
      totalWastedBytes: duplicates.reduce((acc, cur) => acc + (Number(cur.size) || 0), 0),
      reason: groupData.reason,
      reasonLabel: groupData.reasonLabel,
    });
  });

  // Map duplicate info back onto the original array of files
  const filesWithDuplicates = files.map((file) => {
    const info = duplicateInfoMap.get(file.id);
    if (info) {
      return {
        ...file,
        duplicateInfo: info,
      };
    }
    return file;
  });

  return {
    filesWithDuplicates,
    duplicateFiles: duplicateFilesList,
    originalFiles: originalFilesList,
    duplicateGroups,
    totalDuplicateCount: duplicateFilesList.length,
    totalWastedBytes,
  };
};
