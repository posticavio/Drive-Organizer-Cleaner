export type NavigationTab = 'drive' | 'split' | 'quarantine' | 'rename' | 'audit' | 'ai-cleanup';

export interface DuplicateInfo {
  isDuplicate: boolean;
  isOriginal?: boolean;
  groupId: string;
  reason: 'md5' | 'exact-name' | 'copy-pattern';
  label: string;
  matchedWithName?: string;
  wastedBytes?: number;
}

export interface DuplicateGroup {
  groupId: string;
  originalFile: DriveFile;
  duplicateFiles: DriveFile[];
  totalWastedBytes: number;
  reason: 'md5' | 'exact-name' | 'copy-pattern';
  reasonLabel: string;
}

export interface FolderStats {
  totalBytes: number;
  itemCount: number;
  fileCount: number;
  subfolderCount: number;
  loading?: boolean;
  lastCalculated?: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  size?: string;
  quotaBytesUsed?: string;
  md5Checksum?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  shared?: boolean;
  trashed?: boolean;
  starred?: boolean;
  isFolder: boolean;
  isQuarantined?: boolean;
  originalParentId?: string;
  description?: string;
  folderStats?: FolderStats;
  duplicateInfo?: DuplicateInfo;
}

export interface DriveBreadcrumb {
  id: string;
  name: string;
}

export interface DriveStorageQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
}

export type RenameRuleType =
  | 'date-stamp'
  | 'case-transform'
  | 'prefix-suffix'
  | 'search-replace'
  | 'clean-sanitize'
  | 'sequence-number'
  | 'ai-smart';

export type CaseFormat =
  | 'kebab-case'
  | 'snake_case'
  | 'Title Case'
  | 'UPPERCASE'
  | 'lowercase';

export type DateFormat =
  | 'YYYY-MM-DD'
  | 'DD-MM-YYYY'
  | 'YYYYMMDD'
  | 'YYYY_MM_DD';

export type RenameTargetScope = 'files-only' | 'folders-only' | 'both';

export type FileDocumentTypology =
  | 'identita'
  | 'scontrini'
  | 'fatture'
  | 'contratti'
  | 'bustepaga'
  | 'report'
  | 'cartella-anno'
  | 'cartella-reparto'
  | 'cartella-titolo'
  | 'generale';

export interface RenameRule {
  id: string;
  type: RenameRuleType;
  enabled: boolean;
  targetScope?: RenameTargetScope; // whether to apply to files, folders, or both
  typology?: FileDocumentTypology;
  // Date Stamp
  datePlacement?: 'prefix' | 'suffix';
  dateFormat?: DateFormat;
  dateSource?: 'today' | 'modified' | 'created';
  dateSeparator?: '_' | '-' | '.' | ' ';
  // Case transform
  caseFormat?: CaseFormat;
  // Prefix / Suffix
  prefixText?: string;
  suffixText?: string;
  // Search & Replace
  searchPattern?: string;
  replaceText?: string;
  isRegex?: boolean;
  matchCase?: boolean;
  // Clean & Sanitize
  cleanOptions?: {
    removeSpecialChars: boolean;
    spacesToHyphens: boolean;
    spacesToUnderscores: boolean;
    normalizeSeparators: boolean;
  };
  // Sequence
  sequenceStart?: number;
  sequenceDigits?: number;
  sequencePrefix?: string;
  sequenceSuffix?: string;
}

export interface RenamePreviewItem {
  id: string;
  originalName: string;
  newName: string;
  extension: string;
  mimeType: string;
  hasChanged: boolean;
  isFolder: boolean;
  conflict?: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: number;
  action: 'rename' | 'move' | 'quarantine' | 'restore' | 'create_folder';
  fileId: string;
  fileName: string;
  oldValue?: string;
  newValue?: string;
  sourceParentId?: string;
  targetParentId?: string;
  details?: string;
}

export interface UserSettings {
  density: 'comfort' | 'compact';
  viewMode: 'list' | 'table' | 'grid' | 'kanban';
  quarantineFolderName: string;
  hapticsEnabled: boolean;
  soundsEnabled: boolean;
  amoledMode: boolean;
  confirmBeforeMoving: boolean;
}

export interface AICleanupRecommendation {
  fileId: string;
  fileName: string;
  confidence: 'high' | 'medium' | 'low';
  category: string;
  reason: string;
}

export interface SuggestedFileItem {
  fileId: string;
  fileName: string;
  patternMatched: string;
}

export interface FolderStructureSuggestion {
  id: string;
  targetFolderName: string;
  description: string;
  suggestedFiles: SuggestedFileItem[];
}

export interface AICleanupSummary {
  totalEvaluated: number;
  recommendedCount: number;
  highConfidenceCount: number;
  folderSuggestionsCount?: number;
  insights: string;
}

export interface AICleanupResult {
  recommendations: AICleanupRecommendation[];
  folderStructureSuggestions?: FolderStructureSuggestion[];
  summary: AICleanupSummary;
}
