import {
  DriveFile,
  AICleanupResult,
  AICleanupRecommendation,
  FolderStructureSuggestion,
  SuggestedFileItem,
} from '../types/drive';

/**
 * Calls server-side Gemini endpoint /api/ai/cleanup-suggestions to analyze files.
 * Provides fallback algorithmic heuristics if network or API key issues occur.
 */
export const fetchAICleanupSuggestions = async (
  files: DriveFile[],
  sensitivity: 'cautious' | 'balanced' | 'aggressive' = 'balanced'
): Promise<AICleanupResult> => {
  try {
    const payload = files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      createdTime: f.createdTime,
      size: f.size,
      isFolder: f.isFolder,
    }));

    const res = await fetch('/api/ai/cleanup-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: payload, sensitivity }),
    });

    if (res.ok) {
      const data: AICleanupResult = await res.json();
      return data;
    } else {
      console.warn('Server AI endpoint returned status', res.status);
    }
  } catch (err) {
    console.warn('Could not reach AI endpoint, falling back to local heuristic analysis:', err);
  }

  // Graceful local fallback heuristics
  return computeLocalCleanupRecommendations(files, sensitivity);
};

export const computeLocalCleanupRecommendations = (
  files: DriveFile[],
  sensitivity: 'cautious' | 'balanced' | 'aggressive' = 'balanced'
): AICleanupResult => {
  const recommendations: AICleanupRecommendation[] = [];
  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const twoYearsMs = 2 * oneYearMs;

  for (const file of files) {
    if (file.isFolder) continue; // Don't quarantine folders automatically

    const nameLower = file.name.toLowerCase();
    const modifiedTime = file.modifiedTime ? new Date(file.modifiedTime).getTime() : now;
    const ageMs = now - modifiedTime;

    // 1. Temporary & clutter files
    if (
      nameLower.endsWith('.tmp') ||
      nameLower.endsWith('.crdownload') ||
      nameLower.endsWith('.log') ||
      nameLower.startsWith('screenshot') ||
      nameLower.startsWith('schermata')
    ) {
      recommendations.push({
        fileId: file.id,
        fileName: file.name,
        confidence: 'high',
        category: 'temporaneo_screenshot',
        reason: 'File temporaneo o cattura schermo che crea disordine nella cartella.',
      });
      continue;
    }

    // 2. Obsolete draft / copies
    if (
      nameLower.includes('copia di') ||
      nameLower.includes('copy of') ||
      nameLower.includes('bozza') ||
      nameLower.includes('draft') ||
      nameLower.includes('_old') ||
      nameLower.includes('vecchio') ||
      nameLower.includes('backup_')
    ) {
      recommendations.push({
        fileId: file.id,
        fileName: file.name,
        confidence: 'high',
        category: 'bozza_obsoleta',
        reason: 'Contiene indicatori di bozza o copia non definitiva nel nome del file.',
      });
      continue;
    }

    // 3. Duplicates with (1), (2)
    if (/\(\d+\)\.[a-z0-9]+$/i.test(file.name)) {
      recommendations.push({
        fileId: file.id,
        fileName: file.name,
        confidence: 'medium',
        category: 'duplicato',
        reason: 'Possibile copia duplicata generata da download ripetuto.',
      });
      continue;
    }

    // 4. Stale untouched files (if balanced or aggressive)
    if (sensitivity !== 'cautious' && ageMs > twoYearsMs) {
      recommendations.push({
        fileId: file.id,
        fileName: file.name,
        confidence: sensitivity === 'aggressive' ? 'medium' : 'low',
        category: 'file_stale_vecchio',
        reason: `Nessuna modifica da oltre 2 anni (${new Date(modifiedTime).getFullYear()}).`,
      });
    }
  }

  const highConf = recommendations.filter((r) => r.confidence === 'high').length;

  // Folder Structure Suggestion Heuristics based on file naming patterns
  const folderSuggestionsMap = new Map<string, { description: string; files: SuggestedFileItem[] }>();

  for (const file of files) {
    if (file.isFolder) continue;
    const nameLower = file.name.toLowerCase();

    // 1. Accounting & Invoices
    if (
      nameLower.includes('fattura') ||
      nameLower.includes('invoice') ||
      nameLower.includes('ricevuta') ||
      nameLower.includes('scontrino') ||
      nameLower.includes('bolla') ||
      nameLower.includes('f24')
    ) {
      const key = 'Fatture & Amministrazione';
      if (!folderSuggestionsMap.has(key)) {
        folderSuggestionsMap.set(key, {
          description: 'Rilevato pattern di documenti contabili, ricevute o fatture fiscali.',
          files: [],
        });
      }
      folderSuggestionsMap.get(key)!.files.push({
        fileId: file.id,
        fileName: file.name,
        patternMatched: 'Documento Contabile / Fattura',
      });
      continue;
    }

    // 2. Media & Design
    if (nameLower.match(/\.(png|jpg|jpeg|svg|gif|psd|ai|fig|webp|bmp)$/i)) {
      const key = 'Media & Risorse Grafiche';
      if (!folderSuggestionsMap.has(key)) {
        folderSuggestionsMap.set(key, {
          description: 'Rilevato pattern di risorse grafiche, immagini, loghi o asset visuali.',
          files: [],
        });
      }
      folderSuggestionsMap.get(key)!.files.push({
        fileId: file.id,
        fileName: file.name,
        patternMatched: `Estensione '${file.name.split('.').pop()}'`,
      });
      continue;
    }

    // 3. Year-based archiving (e.g., 2023_, 2024_)
    const yearMatch = file.name.match(/(202[0-9])/);
    if (yearMatch) {
      const year = yearMatch[1];
      const key = `Archivio ${year}`;
      if (!folderSuggestionsMap.has(key)) {
        folderSuggestionsMap.set(key, {
          description: `Rilevato marcatore temporale dell'anno ${year} nel nome del file.`,
          files: [],
        });
      }
      folderSuggestionsMap.get(key)!.files.push({
        fileId: file.id,
        fileName: file.name,
        patternMatched: `Anno '${year}' nel titolo`,
      });
      continue;
    }

    // 4. Development & Code
    if (nameLower.match(/\.(ts|tsx|js|jsx|py|sql|json|css|html|sh|yml|yaml)$/i)) {
      const key = 'Sviluppo & Codice';
      if (!folderSuggestionsMap.has(key)) {
        folderSuggestionsMap.set(key, {
          description: 'Rilevato pattern di script di programmazione, configurazione o codice sorgente.',
          files: [],
        });
      }
      folderSuggestionsMap.get(key)!.files.push({
        fileId: file.id,
        fileName: file.name,
        patternMatched: `Sorgente ${file.name.split('.').pop()?.toUpperCase()}`,
      });
      continue;
    }

    // 5. Legal & Contracts
    if (
      nameLower.includes('contratto') ||
      nameLower.includes('accordo') ||
      nameLower.includes('nda') ||
      nameLower.includes('privacy')
    ) {
      const key = 'Contratti & Documenti Legali';
      if (!folderSuggestionsMap.has(key)) {
        folderSuggestionsMap.set(key, {
          description: 'Rilevato pattern di accordi contrattuali, NDA o informativa privacy.',
          files: [],
        });
      }
      folderSuggestionsMap.get(key)!.files.push({
        fileId: file.id,
        fileName: file.name,
        patternMatched: 'Documento Legale / Contratto',
      });
    }
  }

  const folderStructureSuggestions: FolderStructureSuggestion[] = Array.from(
    folderSuggestionsMap.entries()
  )
    .filter(([_, value]) => value.files.length >= 1) // Suggest folders even if 1 or more files match pattern
    .map(([folderName, value], idx) => ({
      id: `folder-sug-${idx}-${folderName}`,
      targetFolderName: folderName,
      description: value.description,
      suggestedFiles: value.files,
    }));

  return {
    recommendations,
    folderStructureSuggestions,
    summary: {
      totalEvaluated: files.length,
      recommendedCount: recommendations.length,
      highConfidenceCount: highConf,
      folderSuggestionsCount: folderStructureSuggestions.length,
      insights:
        recommendations.length > 0 || folderStructureSuggestions.length > 0
          ? `Rilevati ${recommendations.length} file per la Quarantena e ${folderStructureSuggestions.length} strutture di cartelle tematiche per riorganizzare i file isolati.`
          : 'La cartella è in ottimo stato di ordine e non presenta disordine o pattern isolati evidenti.',
    },
  };
};
