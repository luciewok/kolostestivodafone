import React, { useState, useEffect } from 'react';
import { Prize, SpinLog, SystemSettings, CompetitionEntry, QuizQuestion } from '../types';
import { GoogleSheetsSyncStatus, subscribeGoogleSheetsStatus, triggerSheetsSync } from '../services/googleSheets';
import { AdminStats } from './admin/AdminStats';
import { AdminTabsNav, AdminTabType } from './admin/AdminTabsNav';
import { PrizesTab } from './admin/PrizesTab';
import { SpinsTab } from './admin/SpinsTab';
import { ContestantsTab } from './admin/ContestantsTab';
import { QuestionsTab } from './admin/QuestionsTab';
import { SettingsTab } from './admin/SettingsTab';
import { ToastNotification, ToastMessage } from './admin/ToastNotification';

export interface AdminPanelProps {
  prizes: Prize[];
  spins: SpinLog[];
  settings: SystemSettings;
  competitionEntries: CompetitionEntry[];
  questions: QuizQuestion[];
  onUpdatePrizes: (prizes: Prize[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onClearSpins: () => void;
  onResetPrizes: () => void;
  onDeleteEntry: (id: string) => void;
  onClearEntries: () => void;
  onUpdateQuestions: (questions: QuizQuestion[]) => void;
  onResetQuestions: () => void;
  onSyncContestantsFromSupabase?: () => Promise<{ count: number; error?: string }>;
  onSyncSpinsFromSupabase?: () => Promise<{ count: number; error?: string }>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  prizes,
  spins,
  settings,
  competitionEntries,
  questions,
  onUpdatePrizes,
  onUpdateSettings,
  onClearSpins,
  onResetPrizes,
  onDeleteEntry,
  onClearEntries,
  onUpdateQuestions,
  onResetQuestions,
  onSyncContestantsFromSupabase,
  onSyncSpinsFromSupabase,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>('prizes');
  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsSyncStatus | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    return subscribeGoogleSheetsStatus((status) => {
      setSheetsStatus(status);
    });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({
      id: String(Date.now()),
      type,
      message,
    });
  };

  // Metrics
  const totalSpins = spins.length;
  const activePrizesCount = prizes.filter(
    (p) => p.active && (p.stock === undefined || p.stock === null || p.stock > 0)
  ).length;
  const outOfStockCount = prizes.filter(
    (p) => p.stock !== undefined && p.stock !== null && p.stock <= 0
  ).length;
  const totalContestants = competitionEntries.length;

  return (
    <div className="w-full max-w-6xl mx-auto pb-16">
      {/* Toast Feedback */}
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />

      {/* Top Metrics Cards */}
      <AdminStats
        totalSpins={totalSpins}
        activePrizesCount={activePrizesCount}
        outOfStockCount={outOfStockCount}
        totalContestants={totalContestants}
        sheetsStatus={sheetsStatus}
        onTriggerSync={() => {
          triggerSheetsSync().then((res) => {
            showToast(res.message, res.success ? 'success' : 'error');
          });
        }}
      />

      {/* Tabs Navigation */}
      <AdminTabsNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        contestantsCount={totalContestants}
        spinsCount={totalSpins}
      />

      {/* Tab Panels */}
      {activeTab === 'prizes' && (
        <PrizesTab
          prizes={prizes}
          spins={spins}
          onUpdatePrizes={onUpdatePrizes}
          onResetPrizes={onResetPrizes}
          onShowToast={showToast}
        />
      )}

      {activeTab === 'spins' && (
        <SpinsTab
          spins={spins}
          onClearSpins={onClearSpins}
          onShowToast={showToast}
          onSyncFromSupabase={onSyncSpinsFromSupabase}
        />
      )}

      {activeTab === 'contestants' && (
        <ContestantsTab
          entries={competitionEntries}
          onDeleteEntry={onDeleteEntry}
          onClearEntries={onClearEntries}
          onShowToast={showToast}
          onSyncFromSupabase={onSyncContestantsFromSupabase}
        />
      )}

      {activeTab === 'questions' && (
        <QuestionsTab
          questions={questions}
          onUpdateQuestions={onUpdateQuestions}
          onResetQuestions={onResetQuestions}
          onShowToast={showToast}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          settings={settings}
          prizes={prizes}
          questions={questions}
          onUpdateSettings={onUpdateSettings}
          onUpdatePrizes={onUpdatePrizes}
          onUpdateQuestions={onUpdateQuestions}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
