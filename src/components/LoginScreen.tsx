import React from 'react';
import {
  FolderTree,
  ShieldCheck,
  Edit3,
  HardDrive,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  isLoading,
  error,
}) => {
  return (
    <div className="min-h-screen bg-[#18191B] text-[#EAEBED] flex flex-col items-center justify-center p-4 md:p-8 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-[#222428] border border-[#2F3136] shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#2A2C31] border border-[#3A3D45]/70 flex items-center justify-center text-[#E31B23] mx-auto shadow-lg shadow-black/40">
            <FolderTree className="w-8 h-8" strokeWidth={1.75} />
          </div>

          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#EAEBED] tracking-tight">
              Drive Organizer & Cleaner
            </h1>
            <p className="text-xs text-[#9A9DA5] mt-1 leading-relaxed">
              Organizza, sposta e rinomina i file del tuo Google Drive con la massima sicurezza e zero rischio di perdita dati.
            </p>
          </div>

          {/* Key Feature Pillars (Samsung One UI Islands) */}
          <div className="space-y-2.5 pt-2 text-left">
            <div className="p-3 rounded-2xl bg-[#1E2024] border border-[#2F3136] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/40 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-900/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#EAEBED]">
                  Quarantena Protetta
                </div>
                <div className="text-[11px] text-[#9A9DA5]">
                  I file da eliminare vengono solo spostati in "_Da Cancellare", mai distrutti.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#1E2024] border border-[#2F3136] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-950/40 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-900/30">
                <Edit3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#EAEBED]">
                  Ridenominazione Intelligente
                </div>
                <div className="text-[11px] text-[#9A9DA5]">
                  Date automatiche, kebab-case, snake_case, prefissi, sequenze e pulizia simboli.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#1E2024] border border-[#2F3136] flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-950/40 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-900/30">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#EAEBED]">
                  Navigazione Veloce One UI
                </div>
                <div className="text-[11px] text-[#9A9DA5]">
                  Viste Lista, Tabella, Kanban, scorciatoie da tastiera e supporto mobile touch.
                </div>
              </div>
            </div>
          </div>

          {/* Error alert if any */}
          {error && (
            <div className="p-3 rounded-2xl bg-red-950/40 border border-red-900/50 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Official Google Workspace Sign-In Button */}
          <div className="pt-3">
            <button
              onClick={onLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-2xl bg-white hover:bg-neutral-100 active:scale-98 text-neutral-900 font-bold text-xs md:text-sm shadow-xl transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-neutral-700" />
              ) : (
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-5 h-5 block"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              )}
              <span>{isLoading ? 'Connessione in corso...' : 'Accedi con Google'}</span>
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-[#9A9DA5]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>I tuoi token rimangono al sicuro solo nella sessione attiva</span>
        </div>
      </div>
    </div>
  );
};
