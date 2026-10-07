import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, CheckCircle2, Trophy, Gift, ArrowRight } from 'lucide-react';
import { Prize } from '../types';
import { resolvePrizeImage } from '../utils/storage';

interface ThankYouScreenProps {
  email: string;
  score: number;
  totalQuestions: number;
  wonPrize: Prize | null;
  onReset: () => void;
  eventTitle?: string;
  grandPrizeScore?: number;
}

export const ThankYouScreen: React.FC<ThankYouScreenProps> = ({
  email,
  score,
  totalQuestions,
  wonPrize,
  onReset,
  eventTitle = 'Pixel 11',
  grandPrizeScore,
}) => {
  const targetThreshold = Math.max(grandPrizeScore ?? totalQuestions, totalQuestions);
  const isGrandPrizeParticipant = score >= targetThreshold;
  const prizeImg = wonPrize ? resolvePrizeImage(wonPrize) : undefined;

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] w-full max-w-xl mx-auto px-4 py-8 text-center select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full bg-[#150f0d]/95 border border-[#e5a995]/30 rounded-3xl p-6 sm:p-9 shadow-2xl backdrop-blur-md space-y-6"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-300" />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase font-bold tracking-wider text-[#e5a995] px-3 py-1 rounded-full bg-[#e5a995]/10 border border-[#e5a995]/20">
            {eventTitle} • Dokončeno
          </span>
          <h2 className="text-2xl sm:text-3xl font-light text-white pt-1">
            Děkujeme za účast!
          </h2>
          <p className="text-slate-300 text-sm">
            Vaše účast v soutěži byla úspěšně zaznamenána.
          </p>
        </div>

        {/* Prize Summary Card */}
        {wonPrize && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 text-left">
            {prizeImg ? (
              <div className="w-14 h-14 rounded-xl bg-white/10 p-2 flex items-center justify-center shrink-0">
                <img src={prizeImg} alt={wonPrize.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#e5a995]/10 border border-[#e5a995]/20 flex items-center justify-center shrink-0 text-[#e5a995]">
                <Gift className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Vytočená výhra
              </span>
              <p className="text-base font-bold text-white truncate">{wonPrize.name}</p>
              <p className="text-xs text-emerald-400">Odměnu si vyzvedněte u stánku</p>
            </div>
          </div>
        )}

        {/* Grand Prize Status */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span>Soutěžní e-mail:</span>
            <span className="font-mono text-white font-semibold">{email}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span>Výsledek v kvízu:</span>
            <span className="font-mono text-white font-semibold">
              {score} / {totalQuestions} správně
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/5">
            <span>Slosování o hlavní cenu:</span>
            {isGrandPrizeParticipant ? (
              <span className="text-amber-300 font-bold inline-flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Zařazeno ({score}/{totalQuestions})
              </span>
            ) : (
              <span className="text-slate-400">Nezařazeno (nutno {targetThreshold}/{totalQuestions})</span>
            )}
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full py-4 px-6 rounded-2xl font-semibold text-sm bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-slate-950 shadow-lg shadow-orange-950/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Ukončit</span>
        </button>
      </motion.div>
    </div>
  );
};
