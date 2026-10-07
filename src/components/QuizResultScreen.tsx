import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, Sparkles, CheckCircle2, AlertCircle, Gift, Award, Home } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface QuizResultScreenProps {
  score: number;
  totalQuestions: number;
  participantEmail?: string;
  minPassingScore?: number; // 5
  grandPrizeScore?: number; // 10
  onProceedToWheel: () => void;
  onFinish: () => void;
  soundEnabled?: boolean;
}

export const QuizResultScreen: React.FC<QuizResultScreenProps> = ({
  score,
  totalQuestions,
  participantEmail,
  minPassingScore = 5,
  grandPrizeScore = 10,
  onProceedToWheel,
  onFinish,
  soundEnabled = true,
}) => {
  const targetGrandPrize = Math.max(grandPrizeScore, totalQuestions);
  const isEligibleForWheel = score >= minPassingScore;
  const isEligibleForGrandPrize = score >= targetGrandPrize;

  useEffect(() => {
    if (isEligibleForGrandPrize) {
      soundEngine.playWin(soundEnabled);
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#fff7f4', '#faede7', '#f5d5c8', '#e5a995', '#fbbf24', '#f59e0b'],
        });
      } catch {
        // Confetti fallback
      }
    } else if (isEligibleForWheel) {
      soundEngine.playWin(soundEnabled);
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#fff7f4', '#f5d5c8', '#e5a995'],
        });
      } catch {
        // Fallback
      }
    } else {
      soundEngine.playTryAgain(soundEnabled);
    }
  }, [isEligibleForGrandPrize, isEligibleForWheel, soundEnabled]);

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] w-full max-w-xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full bg-[#140e0c]/95 border border-[#e5a995]/30 rounded-3xl p-6 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-center relative overflow-hidden backdrop-blur-md"
      >
        {/* Glow backdrop */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none rounded-full"
          style={{
            background: isEligibleForWheel
              ? 'radial-gradient(circle, rgba(229, 169, 149, 0.22) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* 1. LESS THAN 4 (FAILED WHEEL THRESHOLD) */}
        {!isEligibleForWheel && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#2a1714] border border-[#f43f5e]/30 flex items-center justify-center text-[#fca5a5] shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-light text-white">
                Děkujeme za účast!
              </h2>
              <p className="text-rose-300 text-sm font-medium">
                Škoda! Získali jste {score} z {totalQuestions} správných odpovědí
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs text-slate-300 space-y-2 w-full">
              <p>
                Pro možnost si vytočit jenu z cen bylo potřeba{' '}
                <strong className="text-white">{minPassingScore} z {totalQuestions}</strong> správných odpovědí.
              </p>
              {participantEmail && (
                <p className="text-slate-400">
                  Soutěžní pokus pro e-mail <strong className="text-slate-200">{participantEmail}</strong> byl zaznamenán. Tak třeba příště!
                </p>
              )}
            </div>

            <button
              onClick={onFinish}
              className="w-full py-3.5 px-6 rounded-2xl font-medium text-sm bg-white/10 hover:bg-white/15 text-white transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Home className="w-4 h-4" />
              <span>Zpět na úvodní obrazovku</span>
            </button>
          </div>
        )}

        {/* 2. BETWEEN 4 AND 7 (ELIGIBLE FOR WHEEL, BUT NOT GRAND PRIZE) */}
        {isEligibleForWheel && !isEligibleForGrandPrize && (
          <div className="flex flex-col items-center space-y-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-300" />
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Úspěšně splněno!
              </span>
              <h2 className="text-2xl sm:text-3xl font-light text-white pt-2">
                Získáváte zatočení na kole štěstí!
              </h2>
              <p className="text-slate-300 text-sm">
                Vaše skóre: <strong className="text-white font-bold">{score} z {totalQuestions}</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left text-xs text-amber-200/90 leading-relaxed w-full">
              <p>
                <strong>Do slosování o zážitkové poukazy</strong> postupují pouze soutěžící s plným počtem <strong>{grandPrizeScore} z {totalQuestions}</strong>. Vy si však můžete ihned vytočit některou ze skvělých okamžitých výher!
              </p>
            </div>

            <button
              onClick={onProceedToWheel}
              className="w-full py-4 px-6 rounded-2xl font-semibold text-base bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-slate-950 shadow-lg shadow-orange-950/30 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Roztočit kolo štěstí</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 3. PERFECT SCORE 8 OUT OF 8 (WHEEL + GRAND PRIZE DRAW) */}
        {isEligibleForGrandPrize && (
          <div className="flex flex-col items-center space-y-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.3)] animate-bounce">
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300" />
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-300 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Perfektní výsledek 10 / 10
              </span>
              <h2 className="text-2xl sm:text-3xl font-light text-white pt-2">
                Jste zařazeni do slosování!
              </h2>
              <p className="text-slate-300 text-sm">
                Všechny otázky máte správně. Nezapomeňte si ještě zatočit kolem štěstí!
              </p>
            </div>

            {participantEmail && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left text-xs text-emerald-200 leading-relaxed w-full flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  E-mail <strong className="text-white">{participantEmail}</strong> byl úspěšně zařazen do slosování o zážitkové poukazy!
                </span>
              </div>
            )}

            <button
              onClick={onProceedToWheel}
              className="w-full py-4 px-6 rounded-2xl font-semibold text-base bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-slate-950 shadow-lg shadow-orange-950/30 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Pokračovat k roztočení kola</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
