/**
 * Samsung One UI Smart Haptic Ramps.
 * Interacts with navigator.vibrate when supported.
 */

export const triggerHaptic = (
  type: 'tick' | 'snap' | 'doublePulse' | 'error' | 'success',
  enabled: boolean = true
) => {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'tick':
        // Tick leggero (8ms): Cambio tab, selezione filtri
        navigator.vibrate(8);
        break;
      case 'snap':
        // Snap medio (20ms): Superamento soglia, pressione tasto azione
        navigator.vibrate(20);
        break;
      case 'doublePulse':
        // Doppio impulso secco (15ms + pausa 30ms + 25ms): Spostamento in Quarantena / completamento
        navigator.vibrate([15, 30, 25]);
        break;
      case 'success':
        // Impulso successo
        navigator.vibrate([10, 20, 15]);
        break;
      case 'error':
        // Vibrazione sorda (45ms): Errori o azioni bloccate
        navigator.vibrate(45);
        break;
    }
  } catch {
    // Ignore environments where vibration is blocked
  }
};
