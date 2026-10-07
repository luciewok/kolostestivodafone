/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAppEngine } from './hooks/useAppEngine';
import { Background } from './components/Background';
import { Header } from './components/Header';
import { Wheel } from './components/Wheel';
import { PinPadModal } from './components/PinPadModal';
import { AdminPanel } from './components/AdminPanel';
import { WinningModal } from './components/WinningModal';
import { AttractorScreen } from './components/AttractorScreen';
import { QuizScreen } from './components/QuizScreen';
import { QuizResultScreen } from './components/QuizResultScreen';
import { ThankYouScreen } from './components/ThankYouScreen';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const {
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
    refreshAllData,
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
    handleQuizComplete,
    handleFinishTurn,
    handleResetToStart,
  } = useAppEngine();

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white flex flex-col font-sans selection:bg-white/20 relative overflow-x-hidden">
      {/* Ambient Dark Gradient Background */}
      <Background />

      {/* Top Bar Header */}
      <Header
        eventTitle={settings.eventTitle || 'Pixel 11'}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onLockAdmin={() => setViewMode('attractor')}
        onRefreshData={refreshAllData}
      />

      {/* Main View Area */}
      <main
        className={`flex-1 flex flex-col items-center relative z-10 w-full max-w-7xl mx-auto px-2 sm:px-4 ${
          viewMode === 'admin' ? 'justify-start pt-2 sm:pt-4 md:pt-6' : 'justify-center'
        }`}
      >
        <AnimatePresence mode="wait">
          {/* 1. ATTRACTOR SCREEN WITH EMAIL GATEKEEPER (Zero passwords required) */}
          {viewMode === 'attractor' && (
            <motion.div
              key="attractor_view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <AttractorScreen
                onStartQuiz={startQuizWithEmail}
                eventTitle={settings.eventTitle || 'Pixel 11'}
                totalQuestions={questions.length || 10}
                minPassingScore={settings.minPassingScore ?? 5}
                grandPrizeScore={settings.grandPrizeScore ?? (questions.length || 10)}
                allowedEmailRegex={settings.allowedEmailRegex}
                onCheckEmailIsUsed={checkEmailIsUsed}
              />
            </motion.div>
          )}

          {/* 2. QUIZ SCREEN */}
          {viewMode === 'quiz' && (
            <motion.div
              key="quiz_view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <QuizScreen
                questions={questions}
                soundEnabled={settings.soundEnabled}
                onComplete={handleQuizComplete}
                onCancel={handleResetToStart}
              />
            </motion.div>
          )}

          {/* 3. QUIZ RESULT SCREEN */}
          {viewMode === 'quiz_result' && (
            <motion.div
              key="quiz_result_view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <QuizResultScreen
                score={quizScore}
                totalQuestions={quizTotalQuestions}
                participantEmail={currentParticipantEmail}
                minPassingScore={settings.minPassingScore ?? 5}
                grandPrizeScore={settings.grandPrizeScore ?? (questions.length || 10)}
                soundEnabled={settings.soundEnabled}
                onProceedToWheel={() => setViewMode('wheel')}
                onFinish={handleFinishTurn}
              />
            </motion.div>
          )}

          {/* 4. WHEEL OF FORTUNE */}
          {viewMode === 'wheel' && (
            <motion.div
              key="wheel_view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <Wheel
                prizes={prizes}
                soundEnabled={settings.soundEnabled}
                onToggleSound={() =>
                  handleUpdateSettings({
                    ...settings,
                    soundEnabled: !settings.soundEnabled,
                  })
                }
                onSpinEnd={handleSpinEnd}
                eventTitle={settings.eventTitle}
                eventSubTitle={settings.eventSubTitle}
              />
            </motion.div>
          )}

          {/* 5. THANK YOU / SESSION FINISHED SCREEN */}
          {viewMode === 'thank_you' && (
            <motion.div
              key="thank_you_view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <ThankYouScreen
                email={currentParticipantEmail}
                score={quizScore}
                totalQuestions={quizTotalQuestions}
                wonPrize={currentWonPrize}
                onReset={handleResetToStart}
                eventTitle={settings.eventTitle || 'Pixel 11'}
                grandPrizeScore={settings.grandPrizeScore ?? quizTotalQuestions}
              />
            </motion.div>
          )}

          {/* 6. PIN PAD MODAL (Admin entry only) */}
          {viewMode === 'pin_entry' && (
            <motion.div
              key="pin_view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center my-auto py-6"
            >
              <PinPadModal
                correctPin={settings.pin || '1008'}
                onSuccess={() => setViewMode('admin')}
                onCancel={() => setViewMode('attractor')}
              />
            </motion.div>
          )}

          {/* 7. ADMIN PANEL */}
          {viewMode === 'admin' && (
            <motion.div
              key="admin_view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <AdminPanel
                prizes={prizes}
                spins={spins}
                settings={settings}
                questions={questions}
                competitionEntries={competitionEntries}
                onUpdatePrizes={handleUpdatePrizes}
                onUpdateSettings={handleUpdateSettings}
                onClearSpins={handleClearSpins}
                onResetPrizes={handleResetPrizes}
                onUpdateQuestions={handleUpdateQuestions}
                onResetQuestions={handleResetQuestions}
                onDeleteEntry={handleDeleteCompetitionEntry}
                onClearEntries={handleClearCompetitionEntries}
                onSyncContestantsFromSupabase={handleSyncContestantsFromSupabase}
                onSyncSpinsFromSupabase={handleSyncSpinsFromSupabase}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Celebration Winner Modal on wheel spin */}
      <AnimatePresence>
        {activeWinningPrize && (
          <WinningModal
            prize={activeWinningPrize}
            onClose={handleFinishTurn}
          />
        )}
      </AnimatePresence>

      {/* Floating Sound Toggle */}
      <button
        onClick={() =>
          handleUpdateSettings({
            ...settings,
            soundEnabled: !settings.soundEnabled,
          })
        }
        title={settings.soundEnabled ? 'Vypnout zvuk' : 'Zapnout zvuk'}
        aria-label={settings.soundEnabled ? 'Vypnout zvuk' : 'Zapnout zvuk'}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171210]/80 hover:bg-[#251d1a] active:scale-95 border border-[#e5a995]/30 text-[#f5d5c8] hover:text-white transition-all backdrop-blur-md cursor-pointer shadow-lg opacity-75 hover:opacity-100"
      >
        {settings.soundEnabled ? (
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e5a995]" />
        ) : (
          <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
        )}
      </button>
    </div>
  );
}
