import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Prize,
  SpinLog,
  SystemSettings,
  ViewMode,
  QuizQuestion,
  CompetitionEntry,
} from '../types';
import {
  getStoredPrizes,
  saveStoredPrizes,
  getStoredSettings,
  saveStoredSettings,
  getStoredSpins,
  saveStoredSpins,
  addSpinLog,
  clearSpinLogs,
  resetPrizesToDefault,
  getStoredQuestions,
  saveStoredQuestions,
  resetQuestionsToDefault,
  getStoredCompetitionEntries,
  saveStoredCompetitionEntries,
  addCompetitionEntry,
  deleteCompetitionEntry,
  clearCompetitionEntries,
  isDeviceUnlocked,
  setDeviceUnlocked,
  restoreStorageFromIndexedDB,
  isEmailAlreadyParticipatedLocally,
  markEmailAsParticipated,
  clearParticipatedEmails,
  removeParticipatedEmailLocally,
} from '../utils/storage';
import {
  queueEntryForGoogleSheets,
  queueSpinForGoogleSheets,
  checkEmailInGoogleSheets,
  logParticipantAttempt,
  fetchLiveStockFromGoogleSheets,
  pushStockToGoogleSheets,
  fetchLiveConfigFromGoogleSheets,
  pushConfigToGoogleSheets,
} from '../services/googleSheets';
import {
  isSupabaseConfigured,
  fetchContestantsFromSupabase,
  fetchSpinsFromSupabase,
  deleteContestantFromSupabase,
  clearContestantsInSupabase,
  clearSpinsInSupabase,
} from '../services/supabase';

export function useAppEngine() {
  // Always start directly on the quiz/email entry screen without any password
  const [viewMode, setViewMode] = useState<ViewMode>('attractor');

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    pin: '1008',
    eventTitle: 'Pixel 11',
    eventSubTitle: '',
    soundEnabled: true,
    minSpinsDuration: 5,
    minPassingScore: 5,
    grandPrizeScore: 10,
    allowedEmailRegex: '^[a-zA-Z0-9._%+-]+@(vodafone\\.cz|vodafone\\.com)$',
  });
  const [spins, setSpins] = useState<SpinLog[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [competitionEntries, setCompetitionEntries] = useState<CompetitionEntry[]>([]);
  const [activeWinningPrize, setActiveWinningPrize] = useState<Prize | null>(null);

  // Participant session state
  const [currentParticipantEmail, setCurrentParticipantEmail] = useState<string>('');
  const [currentWonPrize, setCurrentWonPrize] = useState<Prize | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizTotalQuestions, setQuizTotalQuestions] = useState<number>(10);
  const [isSiteUnlockedSession, setIsSiteUnlockedSession] = useState<boolean>(false);

  // Anti-looping and rate-limiting guards
  const lastStockFetchTimeRef = useRef<number>(0);
  const isFetchingStockRef = useRef<boolean>(false);
  const hasInitializedStockPushRef = useRef<boolean>(false);

  const refreshAllData = useCallback(() => {
    setPrizes(getStoredPrizes());
    setSettings(getStoredSettings());
    setSpins(getStoredSpins());
    setQuestions(getStoredQuestions());
    setCompetitionEntries(getStoredCompetitionEntries());
  }, []);

  // Synchronize stock limits, probability weights, and active states live from Supabase
  // Strictly throttled to prevent cycling or unnecessary quota depletion
  const syncLiveStock = useCallback(async (force: boolean = false) => {
    // 1. Never query if tab is hidden / phone is locked (saves requests & battery)
    if (typeof document !== 'undefined' && document.hidden && !force) {
      return;
    }

    // 2. Throttle rate limit: Skip if called less than 12 seconds ago unless forced
    const now = Date.now();
    if (!force && now - lastStockFetchTimeRef.current < 12000) {
      return;
    }

    // 3. Concurrency guard: Do not trigger parallel fetch if one is already in flight
    if (isFetchingStockRef.current) {
      return;
    }

    isFetchingStockRef.current = true;
    lastStockFetchTimeRef.current = now;

    try {
      const stockMap = await fetchLiveStockFromGoogleSheets();
      if (stockMap && Object.keys(stockMap).length > 0) {
        setPrizes((prev) => {
          // If newly added prizes (e.g. Batoh, Čepice) are missing in Supabase, auto-push AT MOST ONCE on initial load
          if (!hasInitializedStockPushRef.current) {
            hasInitializedStockPushRef.current = true;
            const hasMissingInRemote = prev.some((p) => p.id && !stockMap[p.id]);
            if (hasMissingInRemote) {
              pushStockToGoogleSheets(prev).catch(() => {});
            }
          }

          let hasDiff = false;
          const updated = prev.map((p) => {
            const remote = stockMap[p.id];
            if (!remote) return p;
            let pDiff = false;
            let newStock = p.stock;
            let newWeight = p.weight;
            let newActive = p.active;

            if (typeof remote.stock === 'number' && remote.stock !== p.stock) {
              newStock = remote.stock;
              pDiff = true;
            }
            if (typeof remote.weight === 'number' && remote.weight > 0 && remote.weight !== p.weight) {
              newWeight = remote.weight;
              pDiff = true;
            }

            // Automatic deactivation when stock reaches 0 OR remote is_active changed
            if (typeof newStock === 'number' && newStock <= 0) {
              if (newActive !== false) {
                newActive = false;
                pDiff = true;
              }
            } else if (remote.isActive !== undefined && remote.isActive !== p.active) {
              newActive = remote.isActive;
              pDiff = true;
            }

            if (pDiff) {
              hasDiff = true;
              return { ...p, stock: newStock, weight: newWeight, active: newActive };
            }
            return p;
          });
          if (hasDiff) {
            saveStoredPrizes(updated);
            return updated;
          }
          return prev;
        });
      }
    } catch {
      // ignore
    } finally {
      isFetchingStockRef.current = false;
    }
  }, []);

  // Synchronize global system configuration (Regex, scores, questions) live from Google Sheets
  const syncLiveConfig = useCallback(async () => {
    try {
      const remote = await fetchLiveConfigFromGoogleSheets();
      if (remote) {
        if (remote.settings && Object.keys(remote.settings).length > 0) {
          setSettings((prev) => {
            const next = { ...prev, ...remote.settings };
            saveStoredSettings(next);
            return next;
          });
        }
        if (remote.questions && remote.questions.length > 0) {
          setQuestions(remote.questions);
          saveStoredQuestions(remote.questions);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Initial load & IndexedDB safety recovery
  useEffect(() => {
    refreshAllData();
    syncLiveStock();
    syncLiveConfig();

    restoreStorageFromIndexedDB().then(
      ({
        restoredEntries,
        restoredSpins,
      }: {
        restoredEntries: CompetitionEntry[];
        restoredSpins: SpinLog[];
      }) => {
        if (restoredEntries && restoredEntries.length > 0) {
          setCompetitionEntries((prev) => {
            const map = new Map<string, CompetitionEntry>();
            prev.forEach((e) => map.set(e.id, e));
            restoredEntries.forEach((e) => {
              if (!map.has(e.id)) map.set(e.id, e);
            });
            return Array.from(map.values());
          });
        }
        if (restoredSpins && restoredSpins.length > 0) {
          setSpins((prev) => {
            const map = new Map<string, SpinLog>();
            prev.forEach((s) => map.set(s.id, s));
            restoredSpins.forEach((s) => {
              if (!map.has(s.id)) map.set(s.id, s);
            });
            return Array.from(map.values());
          });
        }
      }
    );
  }, [refreshAllData]);

  // Check if an email has already participated (both locally and in Google Sheets)
  const checkEmailIsUsed = useCallback(async (email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check local participation list
    if (isEmailAlreadyParticipatedLocally(cleanEmail)) {
      return true;
    }

    // 2. Check online via Google Sheets webhook
    const onlineCheck = await checkEmailInGoogleSheets(cleanEmail);
    if (onlineCheck.exists) {
      // Also cache locally
      markEmailAsParticipated(cleanEmail);
      return true;
    }

    return false;
  }, []);

  // Start quiz with verified email
  const startQuizWithEmail = useCallback((email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setCurrentParticipantEmail(cleanEmail);
    setCurrentWonPrize(null);
    setQuizScore(0);

    // Mark as participated locally and log attempt to Google Sheets
    markEmailAsParticipated(cleanEmail);
    logParticipantAttempt(cleanEmail);

    setViewMode('quiz');
  }, []);

  // Update prizes
  const handleUpdatePrizes = useCallback((updated: Prize[]) => {
    setPrizes(updated);
    saveStoredPrizes(updated);
    pushStockToGoogleSheets(updated).catch(() => {});
  }, []);

  // Update settings
  const handleUpdateSettings = useCallback(
    (updated: SystemSettings) => {
      setSettings(updated);
      saveStoredSettings(updated);
      pushConfigToGoogleSheets(updated, questions).catch(() => {});
    },
    [questions]
  );

  // Update questions
  const handleUpdateQuestions = useCallback(
    (updated: QuizQuestion[]) => {
      setQuestions(updated);
      saveStoredQuestions(updated);
      pushConfigToGoogleSheets(settings, updated).catch(() => {});
    },
    [settings]
  );

  // Reset questions to default
  const handleResetQuestions = useCallback(() => {
    const defaults = resetQuestionsToDefault();
    setQuestions(defaults);
    pushConfigToGoogleSheets(settings, defaults).catch(() => {});
  }, [settings]);

  // Reset prizes to default
  const handleResetPrizes = useCallback(() => {
    const defaults = resetPrizesToDefault();
    setPrizes(defaults);
  }, []);

  // Sync contestants live on-demand from Supabase
  const handleSyncContestantsFromSupabase = useCallback(async (): Promise<{
    count: number;
    error?: string;
  }> => {
    if (!isSupabaseConfigured()) {
      return { count: 0, error: 'Supabase není nakonfigurována' };
    }
    const remote = await fetchContestantsFromSupabase();
    if (remote === null) {
      return { count: 0, error: 'Chyba při stahování finalistů ze Supabase' };
    }

    setCompetitionEntries(remote);
    saveStoredCompetitionEntries(remote);
    return { count: remote.length };
  }, []);

  // Sync spins live on-demand from Supabase
  const handleSyncSpinsFromSupabase = useCallback(async (): Promise<{
    count: number;
    error?: string;
  }> => {
    if (!isSupabaseConfigured()) {
      return { count: 0, error: 'Supabase není nakonfigurována' };
    }
    const remote = await fetchSpinsFromSupabase();
    if (remote === null) {
      return { count: 0, error: 'Chyba při stahování točení ze Supabase' };
    }

    setSpins(remote);
    saveStoredSpins(remote);
    return { count: remote.length };
  }, []);

  // Delete participant entry
  const handleDeleteCompetitionEntry = useCallback((id: string) => {
    const entryToDelete = competitionEntries.find((e) => e.id === id);
    const updated = deleteCompetitionEntry(id);
    setCompetitionEntries(updated);
    if (entryToDelete?.email) {
      removeParticipatedEmailLocally(entryToDelete.email);
    }
    if (isSupabaseConfigured()) {
      deleteContestantFromSupabase(id, entryToDelete?.email).catch(() => {});
    }
  }, [competitionEntries]);

  // Clear all entries
  const handleClearCompetitionEntries = useCallback(() => {
    clearCompetitionEntries();
    clearParticipatedEmails();
    setCompetitionEntries([]);
    if (isSupabaseConfigured()) {
      clearContestantsInSupabase().catch(() => {});
    }
  }, []);

  // Handle spin completion
  const handleSpinEnd = useCallback(
    (winningPrize: Prize) => {
      const email = currentParticipantEmail ? currentParticipantEmail.trim().toLowerCase() : undefined;
      const newSpin = addSpinLog(winningPrize, email);

      setSpins((prev) => [newSpin, ...prev]);
      queueSpinForGoogleSheets(newSpin);
      setActiveWinningPrize(winningPrize);
      setCurrentWonPrize(winningPrize);

      // If contestant had an entry in 8/8, record their won prize
      if (email) {
        setCompetitionEntries((prev) =>
          prev.map((entry) => {
            if (entry.email === email) {
              return { ...entry, prizeWon: winningPrize.name };
            }
            return entry;
          })
        );
      }

      // If prize has limited stock, decrement it and auto-deactivate if stock drops to 0
      if (winningPrize.stock !== undefined && winningPrize.stock !== null) {
        setPrizes((prevPrizes) => {
          const updated = prevPrizes.map((p) => {
            if (p.id === winningPrize.id) {
              const current = typeof p.stock === 'number' ? p.stock : 0;
              const nextStock = Math.max(0, current - 1);
              return {
                ...p,
                stock: nextStock,
                active: nextStock > 0 ? p.active : false,
              };
            }
            return p;
          });
          saveStoredPrizes(updated);
          // Note: Do NOT call pushStockToGoogleSheets here! queueSpinForGoogleSheets -> recordSpinInSupabase
          // already decrements prize_stock in Supabase atomically. Calling both caused double deduction!
          return updated;
        });
      }
    },
    [currentParticipantEmail]
  );

  // Clear spin logs
  const handleClearSpins = useCallback(() => {
    clearSpinLogs();
    setSpins([]);
    if (isSupabaseConfigured()) {
      clearSpinsInSupabase().catch(() => {});
    }
  }, []);

  // Device unlock / lock
  const handleUnlockDevice = useCallback(() => {
    setDeviceUnlocked(true);
    setViewMode('attractor');
  }, []);

  const handleLockDevice = useCallback(() => {
    setDeviceUnlocked(false);
    setViewMode('device_lock');
  }, []);

  // Quiz completion
  const handleQuizComplete = useCallback(
    (score: number, total: number) => {
      setQuizScore(score);
      setQuizTotalQuestions(total);

      // Strictly require 100% full score (e.g. 10/10) to qualify for grand prize draw
      const grandPrizeScore = Math.max(settings.grandPrizeScore ?? total, total);

      // Only record email entry if participant achieved strictly 100% full score (10/10)
      if (score >= grandPrizeScore && currentParticipantEmail) {
        const newEntry = addCompetitionEntry(currentParticipantEmail, score, total);
        setCompetitionEntries((prev) => {
          const exists = prev.some((e) => e.email === newEntry.email);
          if (exists) return prev;
          return [newEntry, ...prev];
        });
        queueEntryForGoogleSheets(newEntry);
      }

      setViewMode('quiz_result');
    },
    [currentParticipantEmail, settings.grandPrizeScore]
  );

  // Finish turn -> navigate to ThankYou screen
  const handleFinishTurn = useCallback(() => {
    setActiveWinningPrize(null);
    setViewMode('thank_you');
  }, []);

  // Reset session back to Attractor / Gatekeeper
  const handleResetToStart = useCallback(() => {
    setCurrentParticipantEmail('');
    setCurrentWonPrize(null);
    setQuizScore(0);
    setActiveWinningPrize(null);
    setViewMode('attractor');
  }, []);

  useEffect(() => {
    // Only run live stock polling when on screens where prize inventory is actively displayed (attractor or wheel)
    const isInventoryScreen = viewMode === 'wheel' || viewMode === 'attractor';
    if (!isInventoryScreen) {
      return;
    }

    // Immediate sync upon arriving at wheel or attractor
    syncLiveStock(true);

    // Periodic gentle background sync every 25s so prize depletion reflects live without burning requests
    const interval = setInterval(() => {
      syncLiveStock(false);
    }, 25000);

    // Refresh immediately when user returns to tab, but never poll in background
    const handleVisibilityChange = () => {
      if (!document.hidden && isInventoryScreen) {
        syncLiveStock(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [viewMode, syncLiveStock]);

  useEffect(() => {
    if (viewMode === 'attractor') {
      syncLiveConfig();
    }
  }, [viewMode, syncLiveConfig]);

  const isGloballyLocked = Boolean(settings.siteLocked) && !isSiteUnlockedSession;

  return {
    viewMode,
    setViewMode,
    prizes,
    settings,
    spins,
    questions,
    competitionEntries,
    activeWinningPrize,
    currentParticipantEmail,
    currentWonPrize,
    quizScore,
    quizTotalQuestions,
    isGloballyLocked,
    setIsSiteUnlockedSession,
    refreshAllData,
    syncLiveStock,
    syncLiveConfig,
    checkEmailIsUsed,
    startQuizWithEmail,
    handleUpdatePrizes,
    handleUpdateSettings,
    handleUpdateQuestions,
    handleResetQuestions,
    handleResetPrizes,
    handleDeleteCompetitionEntry,
    handleClearCompetitionEntries,
    handleSyncContestantsFromSupabase,
    handleSyncSpinsFromSupabase,
    handleSpinEnd,
    handleClearSpins,
    handleUnlockDevice,
    handleLockDevice,
    handleQuizComplete,
    handleFinishTurn,
    handleResetToStart,
  };
}
