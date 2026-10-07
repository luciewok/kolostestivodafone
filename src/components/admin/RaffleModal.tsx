import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  Sparkles,
  Users,
  Copy,
  Check,
  RotateCcw,
  X,
  Download,
  AlertCircle,
  Mail,
  Crown,
  Medal,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CompetitionEntry } from '../../types';

interface RaffleModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CompetitionEntry[];
  onSyncFromSupabase?: () => Promise<{ count: number; error?: string }>;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RaffleModal: React.FC<RaffleModalProps> = ({
  isOpen,
  onClose,
  entries,
  onSyncFromSupabase,
  onShowToast,
}) => {
  const [winnerCount, setWinnerCount] = useState<number>(3);
  const [step, setStep] = useState<'config' | 'drawing' | 'result'>('config');
  const [drawingStatus, setDrawingStatus] = useState<string>('');
  const [winners, setWinners] = useState<CompetitionEntry[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [currentEntries, setCurrentEntries] = useState<CompetitionEntry[]>(entries);

  // Sync internal list when prop changes
  useEffect(() => {
    setCurrentEntries(entries);
  }, [entries]);

  // Adjust default winnerCount when currentEntries length changes
  useEffect(() => {
    if (currentEntries.length > 0 && winnerCount > currentEntries.length) {
      setWinnerCount(Math.max(1, Math.min(3, currentEntries.length)));
    }
  }, [currentEntries.length]);

  if (!isOpen) return null;

  const maxAvailable = currentEntries.length;

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#fcefe9', '#f5d5c8', '#e5a995', '#fbbf24', '#f59e0b'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#f5d5c8', '#e5a995', '#fbbf24'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#f5d5c8', '#e5a995', '#fbbf24'],
        });
      }, 250);
    } catch {
      // ignore
    }
  };

  const handleStartDraw = async () => {
    setStep('drawing');
    setDrawingStatus('Načítám nejnovější data ze Supabase...');

    let pool = [...currentEntries];

    // 1. Fetch fresh contestants directly from Supabase to guarantee 100% current data
    if (onSyncFromSupabase) {
      try {
        const syncRes = await onSyncFromSupabase();
        if (syncRes.error) {
          console.warn('Sync before raffle warning:', syncRes.error);
        }
      } catch (err) {
        console.warn('Failed to sync before raffle:', err);
      }
    }

    // Small delay for thrilling suspense
    await new Promise((resolve) => setTimeout(resolve, 600));
    setDrawingStatus('Míchám osudí finalistů...');

    // Use current pool (from prop or fresh sync)
    // Filter out invalid/empty emails and deduplicate by email
    const uniqueMap = new Map<string, CompetitionEntry>();
    entries.forEach((e) => {
      const clean = e.email.trim().toLowerCase();
      if (clean && !uniqueMap.has(clean)) {
        uniqueMap.set(clean, e);
      }
    });

    pool = Array.from(uniqueMap.values());
    setCurrentEntries(pool);

    await new Promise((resolve) => setTimeout(resolve, 800));

    if (pool.length === 0) {
      setStep('config');
      onShowToast('V databázi nejsou žádní soutěžící k vylosování.', 'error');
      return;
    }

    // 2. Cryptographically sound unbiased Fisher-Yates shuffle
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Pick random index
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const countToPick = Math.min(winnerCount, shuffled.length);
    const selectedWinners = shuffled.slice(0, countToPick);

    setWinners(selectedWinners);
    setStep('result');
    triggerCelebration();
  };

  const handleCopyEmails = () => {
    if (winners.length === 0) return;
    const text = winners.map((w) => w.email).join(', ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast(`E-maily ${winners.length} výherců byly zkopírovány.`, 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportWinnersCSV = () => {
    if (winners.length === 0) return;
    const headers = ['Pořadí', 'E-mail'];
    const rows = winners.map((w, idx) => [
      idx + 1,
      `"${w.email.replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vyherci_losovani_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Seznam výherců byl stažen jako CSV.', 'success');
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-sm">
          <Crown className="w-3.5 h-3.5 text-amber-300" />
          1. místo
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-400/20 border border-slate-300/30 text-slate-200 font-bold text-xs">
          <Medal className="w-3.5 h-3.5 text-slate-300" />
          2. místo
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-700/20 border border-amber-600/30 text-amber-200 font-bold text-xs">
          <Medal className="w-3.5 h-3.5 text-amber-600" />
          3. místo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-slate-300 font-bold text-xs">
        {rank}. místo
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="w-full max-w-xl bg-[#16100e] border border-[#e5a995]/30 rounded-3xl p-6 sm:p-8 text-left shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Ambient background glow */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(229, 169, 149, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Vylosovat výherce</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </h3>
              <p className="text-xs text-slate-400">
                Náhodný výběr ze všech finalistů s plným počtem bodů v kvízu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content based on step */}
        <div className="py-5 overflow-y-auto flex-1">
          {step === 'config' && (
            <div className="space-y-5">
              {/* Contestants Stats Card */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-[#e5a995]" />
                  <div>
                    <p className="text-xs text-slate-400">Dostupní finalisté v databázi:</p>
                    <p className="text-base font-bold text-white font-mono">
                      {maxAvailable > 0 ? (
                        <span>{maxAvailable} unikátních soutěžících</span>
                      ) : (
                        <span className="text-amber-400 font-sans text-sm">Zatím 0 finalistů</span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  100% náhodný výběr
                </span>
              </div>

              {/* Number of winners input */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Kolik e-mailů chcete vylosovat?
                </label>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, maxAvailable)}
                      value={winnerCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setWinnerCount(Math.max(1, val));
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white font-mono font-bold text-base focus:outline-none focus:border-[#e5a995]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                      výherců
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5">
                    {[1, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setWinnerCount(num)}
                        className={`px-3 py-3 rounded-xl text-xs font-bold font-mono transition cursor-pointer border ${
                          winnerCount === num
                            ? 'bg-[#e5a995] text-slate-950 border-[#e5a995]'
                            : 'bg-white/5 text-slate-300 hover:text-white border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {winnerCount > maxAvailable && maxAvailable > 0 && (
                  <p className="text-xs text-amber-300 flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Požadováno {winnerCount}, v databázi je ale celkem {maxAvailable} soutěžících.
                      Vylosuje se všech {maxAvailable}.
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'drawing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-[#e5a995]/20 border border-[#e5a995]/40 flex items-center justify-center animate-spin">
                  <Sparkles className="w-8 h-8 text-[#e5a995]" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Probíhá losování...</h4>
                <p className="text-xs text-slate-400 font-mono animate-pulse">{drawingStatus}</p>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Vylosovaní výherci ({winners.length})
                </span>
                <span className="text-xs text-slate-400">
                  {new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* List of Drawn Winners */}
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {winners.map((winner, idx) => (
                  <motion.div
                    key={winner.id || winner.email}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {getRankBadge(idx + 1)}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Mail className="w-4 h-4 text-[#e5a995] shrink-0" />
                        <span className="text-sm sm:text-base font-bold text-white truncate font-mono">
                          {winner.email}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 shrink-0">
          {step === 'config' && (
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleStartDraw}
                disabled={maxAvailable === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-slate-950 shadow-lg shadow-orange-950/30 hover:opacity-95 active:scale-[0.99] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Spustit losování</span>
              </button>
            </div>
          )}

          {step === 'result' && (
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setStep('config')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Znovu vylosovat</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportWinnersCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
                  title="Exportovat vylosované výherce do CSV souboru"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyEmails}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-[#fcefe9] to-[#e5a995] hover:opacity-95 transition cursor-pointer shadow-md"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Zkopírováno!' : 'Kopírovat e-maily'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 transition cursor-pointer"
                >
                  Zavřít
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
