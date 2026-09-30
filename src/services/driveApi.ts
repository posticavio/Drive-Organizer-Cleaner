import { DriveFile, DriveBreadcrumb, DriveStorageQuota, FolderStats } from '../types/drive';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

// In-memory cache for folder size statistics
const folderStatsCache = new Map<string, { timestamp: number; stats: FolderStats }>();

export const clearFolderStatsCache = (folderId?: string) => {
  if (folderId) {
    folderStatsCache.delete(folderId);
  } else {
    folderStatsCache.clear();
  }
};

interface DriveApiResponse<T> {
  files?: T[];
  nextPageToken?: string;
  error?: {
    code: number;
    message: string;
  };
}

export const fetchDrive = async <T = any>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `${DRIVE_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMsg = `Errore Drive API (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson.error?.message) {
        errorMsg = errorJson.error.message;
      }
    } catch {
      // fallback to statusText
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

export const listFilesAndFolders = async (
  accessToken: string,
  folderId: string = 'root',
  searchQuery: string = '',
  orderBy: string = 'folder,modifiedTime desc'
): Promise<DriveFile[]> => {
  const queryParts: string[] = ['trashed = false'];

  if (searchQuery.trim()) {
    // Escape single quotes for drive query
    const escaped = searchQuery.replace(/'/g, "\\'");
    queryParts.push(`name contains '${escaped}'`);
  } else if (folderId) {
    queryParts.push(`'${folderId}' in parents`);
  }

  const q = encodeURIComponent(queryParts.join(' and '));
  const fields = encodeURIComponent(
    'files(id, name, mimeType, parents, size, quotaBytesUsed, md5Checksum, modifiedTime, createdTime, webViewLink, webContentLink, thumbnailLink, iconLink, shared, trashed, starred, description)'
  );
  const order = encodeURIComponent(orderBy);

  const endpoint = `/files?q=${q}&orderBy=${order}&pageSize=150&fields=${fields}&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const data = await fetchDrive<DriveApiResponse<DriveFile>>(endpoint, accessToken);

  return (data.files || []).map((file) => ({
    ...file,
    isFolder: file.mimeType === FOLDER_MIME_TYPE,
  }));
};

/**
 * Calculates folder size and counts all files & subfolders recursively up to maxDepth.
 * Uses 5-minute memory cache to avoid unnecessary repeated API requests.
 */
export const getFolderSizeInfo = async (
  accessToken: string,
  folderId: string,
  depth: number = 0,
  maxDepth: number = 2
): Promise<FolderStats> => {
  if (!folderId) {
    return { totalBytes: 0, itemCount: 0, fileCount: 0, subfolderCount: 0, loading: false };
  }

  const cacheKey = folderId;
  const cached = folderStatsCache.get(cacheKey);
  if (cached && depth === 0 && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.stats;
  }

  try {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id,mimeType,size,quotaBytesUsed)');
    const endpoint = `/files?q=${q}&pageSize=1000&fields=${fields}&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const data = await fetchDrive<DriveApiResponse<DriveFile>>(endpoint, accessToken);
    const items = data.files || [];

    let totalBytes = 0;
    let fileCount = 0;
    let subfolderCount = 0;
    const subfolderIds: string[] = [];

    for (const item of items) {
      if (item.mimeType === FOLDER_MIME_TYPE) {
        subfolderCount++;
        subfolderIds.push(item.id);
      } else {
        fileCount++;
        const s = Number(item.size) || Number(item.quotaBytesUsed) || 0;
        totalBytes += s;
      }
    }

    // Recursively scan subfolders if within depth limit (limit max 8 subfolders to avoid slow requests)
    if (depth < maxDepth && subfolderIds.length > 0) {
      const subPromises = subfolderIds.slice(0, 8).map((subId) =>
        getFolderSizeInfo(accessToken, subId, depth + 1, maxDepth).catch(() => ({
          totalBytes: 0,
          itemCount: 0,
          fileCount: 0,
          subfolderCount: 0,
          loading: false,
        }))
      );
      const subResults = await Promise.all(subPromises);
      for (const res of subResults) {
        totalBytes += res.totalBytes;
        fileCount += res.fileCount;
        subfolderCount += res.subfolderCount;
      }
    }

    const stats: FolderStats = {
      totalBytes,
      itemCount: fileCount + subfolderCount,
      fileCount,
      subfolderCount,
      loading: false,
      lastCalculated: Date.now(),
    };

    if (depth === 0) {
      folderStatsCache.set(cacheKey, { timestamp: Date.now(), stats });
    }

    return stats;
  } catch (err) {
    console.error(`Failed to calculate size for folder ${folderId}:`, err);
    return {
      totalBytes: 0,
      itemCount: 0,
      fileCount: 0,
      subfolderCount: 0,
      loading: false,
    };
  }
};

export const getFolderMetadata = async (
  accessToken: string,
  folderId: string
): Promise<DriveFile> => {
  const fields = encodeURIComponent(
    'id, name, mimeType, parents, size, modifiedTime, createdTime, webViewLink, description'
  );
  const data = await fetchDrive<DriveFile>(
    `/files/${folderId}?fields=${fields}&supportsAllDrives=true`,
    accessToken
  );
  return {
    ...data,
    isFolder: data.mimeType === FOLDER_MIME_TYPE,
  };
};

export const getBreadcrumbs = async (
  accessToken: string,
  currentFolderId: string
): Promise<DriveBreadcrumb[]> => {
  if (!currentFolderId || currentFolderId === 'root') {
    return [{ id: 'root', name: 'Il mio Drive' }];
  }

  const breadcrumbs: DriveBreadcrumb[] = [];
  let currId: string | undefined = currentFolderId;
  const visited = new Set<string>();

  while (currId && currId !== 'root' && !visited.has(currId) && breadcrumbs.length < 8) {
    visited.add(currId);
    try {
      const meta = await getFolderMetadata(accessToken, currId);
      breadcrumbs.unshift({ id: meta.id, name: meta.name });
      currId = meta.parents && meta.parents.length > 0 ? meta.parents[0] : undefined;
    } catch {
      break;
    }
  }

  breadcrumbs.unshift({ id: 'root', name: 'Il mio Drive' });
  return breadcrumbs;
};

export const getOrCreateQuarantineFolder = async (
  accessToken: string,
  folderName: string = '_Da Cancellare (Quarantena)'
): Promise<DriveFile> => {
  // Check if quarantine folder exists in root
  const escaped = folderName.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name = '${escaped}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false and 'root' in parents`
  );
  const fields = encodeURIComponent('files(id, name, mimeType, parents, webViewLink, description)');

  const searchRes = await fetchDrive<DriveApiResponse<DriveFile>>(
    `/files?q=${q}&fields=${fields}&pageSize=1`,
    accessToken
  );

  if (searchRes.files && searchRes.files.length > 0) {
    return {
      ...searchRes.files[0],
      isFolder: true,
      isQuarantined: true,
    };
  }

  // Create it in root
  const newFolder = await fetchDrive<DriveFile>('/files', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name: folderName,
      mimeType: FOLDER_MIME_TYPE,
      parents: ['root'],
      description:
        'Cartella di quarantena sicura creata da Drive Organizer & Cleaner. I file qui dentro NON vengono eliminati definitivamente.',
    }),
  });

  return {
    ...newFolder,
    isFolder: true,
    isQuarantined: true,
  };
};

export const moveFiles = async (
  accessToken: string,
  files: { id: string; currentParentId?: string }[],
  targetParentId: string
): Promise<void> => {
  for (const file of files) {
    const removeParents = file.currentParentId ? `&removeParents=${file.currentParentId}` : '';
    await fetchDrive(
      `/files/${file.id}?addParents=${targetParentId}${removeParents}&supportsAllDrives=true`,
      accessToken,
      {
        method: 'PATCH',
        body: JSON.stringify({}),
      }
    );
  }
};

export const renameFile = async (
  accessToken: string,
  fileId: string,
  newName: string
): Promise<DriveFile> => {
  return await fetchDrive<DriveFile>(
    `/files/${fileId}?supportsAllDrives=true`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ name: newName }),
    }
  );
};

export const createFolder = async (
  accessToken: string,
  name: string,
  parentFolderId: string = 'root'
): Promise<DriveFile> => {
  const result = await fetchDrive<DriveFile>('/files?supportsAllDrives=true', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentFolderId],
    }),
  });
  return {
    ...result,
    isFolder: true,
  };
};

export const getDriveAbout = async (
  accessToken: string
): Promise<{ user: any; storageQuota: DriveStorageQuota }> => {
  const data = await fetchDrive<{ user: any; storageQuota: DriveStorageQuota }>(
    '/about?fields=user,storageQuota',
    accessToken
  );
  return data;
};

export const listAllFolders = async (
  accessToken: string,
  parentFolderId: string = 'root'
): Promise<DriveFile[]> => {
  const q = encodeURIComponent(
    `mimeType = '${FOLDER_MIME_TYPE}' and trashed = false and '${parentFolderId}' in parents`
  );
  const fields = encodeURIComponent('files(id, name, mimeType, parents)');
  const res = await fetchDrive<DriveApiResponse<DriveFile>>(
    `/files?q=${q}&fields=${fields}&pageSize=100&orderBy=name`,
    accessToken
  );
  return (res.files || []).map((f) => ({ ...f, isFolder: true }));
};
