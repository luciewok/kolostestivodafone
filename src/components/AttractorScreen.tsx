import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Mail, AlertCircle, CheckCircle2, Loader2, ShieldCheck, Trophy, Gift } from 'lucide-react';
import { isAllowedEmail } from '../utils/storage';

interface AttractorScreenProps {
  onStartQuiz: (email: string) => void;
  eventTitle?: string;
  totalQuestions?: number;
  minPassingScore?: number;
  grandPrizeScore?: number;
  allowedEmailRegex?: string;
  onCheckEmailIsUsed: (email: string) => Promise<boolean>;
}

export const AttractorScreen: React.FC<AttractorScreenProps> = ({
  onStartQuiz,
  eventTitle = 'GP 11',
  totalQuestions = 10,
  minPassingScore = 5,
  grandPrizeScore = 10,
  allowedEmailRegex,
  onCheckEmailIsUsed,
}) => {
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('Zadejte prosím svůj firemní e-mail.');
      return;
    }

    const check = isAllowedEmail(cleanEmail, allowedEmailRegex);
    if (!check.valid) {
      setErrorMsg(
        check.reason ||
          'Soutěž je určena pouze pro zaměstnance Vodafone s firemním e-mailem (@vodafone.cz, @vodafone.com).'
      );
      return;
    }

    setErrorMsg(null);
    setIsVerifying(true);

    try {
      const isUsed = await onCheckEmailIsUsed(cleanEmail);
      if (isUsed) {
        setErrorMsg('S tímto e-mailem již bylo v soutěži soutěženo. Každý soutěžící má pouze 1 pokus.');
        setIsVerifying(false);
        return;
      }

      // Valid and not used yet!
      onStartQuiz(cleanEmail);
    } catch {
      // In case of transient failure, let user proceed or retry
      onStartQuiz(cleanEmail);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 text-center select-none overflow-hidden">
      {/* Dynamic ambient background glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10 overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
          className="w-[360px] sm:w-[520px] md:w-[650px] h-[360px] sm:h-[520px] md:h-[650px] rounded-full absolute"
        >
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 sm:w-80 h-64 sm:h-80 rounded-full"
            style={{
              background:
                'radial-gradient(circle at center, rgba(245, 213, 200, 0.22) 0%, rgba(229, 169, 149, 0.1) 40%, transparent 100%)',
            }}
          />
          <div
            className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-60 sm:w-72 h-60 sm:h-72 rounded-full"
            style={{
              background:
                'radial-gradient(circle at center, rgba(200, 143, 113, 0.16) 0%, rgba(180, 110, 80, 0.05) 50%, transparent 100%)',
            }}
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full flex flex-col items-center relative z-10 max-w-xl mx-auto"
      >
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e5a995]/10 border border-[#e5a995]/30 text-[#e5a995] text-xs sm:text-sm font-medium tracking-wide mb-5 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-[#e5a995] animate-pulse" />
          <span>{eventTitle} • Kolo štěstí</span>
        </div>

        {/* Display Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-tight leading-[1.18] mb-3">
          Otestuj své znalosti
          <br />
          a&nbsp;roztoč{' '}
          <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995]">
            Kolo štěstí
          </span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed mb-6">
          Zodpovězte {totalQuestions} kvízových otázek a získejte skvělé odměny!
        </p>

        {/* Rules Highlight Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full mb-6 text-left">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-[#e5a995]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Kolo štěstí</span>
            </div>
            <p className="text-xs text-slate-300">
              Minimálně <strong className="text-white">{minPassingScore} z {totalQuestions}</strong> správných odpovědí.
            </p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Slosování</span>
            </div>
            <p className="text-xs text-slate-300">
              Plný počet <strong className="text-amber-300">{grandPrizeScore} z {totalQuestions}</strong> správně.
            </p>
          </div>
        </div>

        {/* Email Gatekeeper Form */}
        <div className="w-full bg-[#171110]/85 border border-[#e5a995]/30 rounded-3xl p-5 sm:p-7 backdrop-blur-md shadow-2xl text-left">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="employee-email"
                className="block text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between"
              >
                <span>Váš firemní e-mail</span>
                <span className="text-[11px] text-[#e5a995] font-normal normal-case">
                  @vodafone.cz nebo @vodafone.com
                </span>
              </label>

              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="employee-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="jmeno.prijmeni@vodafone.cz"
                  disabled={isVerifying}
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-black/50 border border-white/15 text-white text-base placeholder-slate-500 focus:outline-none focus:border-[#e5a995] focus:ring-1 focus:ring-[#e5a995] transition-all disabled:opacity-50"
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#e5a995] shrink-0" />
                Každý účastník má nárok na 1 soutěžní pokus.
              </p>
            </div>

            {/* Error Message Alert */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isVerifying || !email.trim()}
              className="w-full py-4 px-6 rounded-2xl font-semibold text-base bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-slate-950 shadow-lg shadow-orange-950/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Ověřuji e-mail...</span>
                </>
              ) : (
                <>
                  <span>Vstoupit do kvízu</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
