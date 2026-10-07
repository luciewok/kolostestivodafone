import React, { useState, useRef } from 'react';
import { SystemSettings, Prize, QuizQuestion } from '../../types';
import {
  Settings as SettingsIcon,
  Key,
  Lock,
  Volume2,
  VolumeX,
  Cloud,
  Download,
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
  QrCode,
  Database,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { QRCodeModal } from './QRCodeModal';
import { triggerSheetsSync, sendTestRowToGoogleSheets } from '../../services/googleSheets';
import {
  isSupabaseConfigured,
  getSupabaseCredentials,
  testSupabaseConnection,
  clearAttemptsInSupabase,
} from '../../services/supabase';
import { clearParticipatedEmails, isAllowedEmail } from '../../utils/storage';
import { AlertTriangle, Copy, Check, Terminal } from 'lucide-react';

interface SettingsTabProps {
  settings: SystemSettings;
  prizes: Prize[];
  questions: QuizQuestion[];
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdatePrizes: (prizes: Prize[]) => void;
  onUpdateQuestions: (questions: QuizQuestion[]) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  prizes,
  questions,
  onUpdateSettings,
  onUpdatePrizes,
  onUpdateQuestions,
  onShowToast,
}) => {
  // PIN management
  const [newPin, setNewPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // Import state
  const [importConfirmData, setImportConfirmData] = useState<{
    prizes?: Prize[];
    settings?: SystemSettings;
    questions?: QuizQuestion[];
  } | null>(null);

  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [supabaseTest, setSupabaseTest] = useState<{
    running: boolean;
    result: { ok: boolean; message: string; details?: string } | null;
  }>({ running: false, result: null });

  const handleTestSupabase = async () => {
    setSupabaseTest({ running: true, result: null });
    const res = await testSupabaseConnection(settings.supabaseUrl, settings.supabaseAnonKey);
    setSupabaseTest({ running: false, result: res });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPin.trim();
    if (trimmed.length < 4) {
      setPinError('PIN musí mít minimálně 4 znaky');
      return;
    }
    onUpdateSettings({
      ...settings,
      pin: trimmed,
    });
    setNewPin('');
    setPinError('');
    onShowToast('Administrátorský PIN byl úspěšně změněn.', 'success');
  };

  const handleExportJSON = () => {
    try {
      const exportData = {
        prizes,
        settings,
        questions,
      };
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kolo_stesti_nastaveni_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast('Nastavení bylo exportováno do JSON souboru.', 'success');
    } catch (err) {
      onShowToast('Chyba při exportu: ' + String(err), 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const parsed = JSON.parse(fileContent.trim());
        if (parsed && (parsed.prizes || parsed.settings || parsed.questions)) {
          setImportConfirmData(parsed);
        } else {
          onShowToast('Neplatný formát souboru s nastavením.', 'error');
        }
      } catch {
        onShowToast('Chyba při čtení souboru. Zvolte platný JSON soubor.', 'error');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importConfirmData) return;
    if (importConfirmData.prizes) onUpdatePrizes(importConfirmData.prizes);
    if (importConfirmData.settings) onUpdateSettings(importConfirmData.settings);
    if (importConfirmData.questions) onUpdateQuestions(importConfirmData.questions);
    setImportConfirmData(null);
    onShowToast('Konfigurace byla úspěšně importována!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Event Branding & Basic Config */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-[#e5a995]" />
          Základní nastavení promo akce
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Název akce (hlavní titulek)
            </label>
            <input
              type="text"
              value={settings.eventTitle}
              onChange={(e) =>
                onUpdateSettings({ ...settings, eventTitle: e.target.value })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e5a995]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Podtitulek akce
            </label>
            <input
              type="text"
              value={settings.eventSubTitle}
              onChange={(e) =>
                onUpdateSettings({ ...settings, eventSubTitle: e.target.value })
              }
              placeholder="Volitelný text pod titulkem"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e5a995]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Délka točení kola (vteřiny)
            </label>
            <input
              type="number"
              min="2"
              max="15"
              value={settings.minSpinsDuration}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  minSpinsDuration: Math.max(2, Math.min(15, parseInt(e.target.value, 10) || 5)),
                })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e5a995]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Min. skóre pro Kolo štěstí (počet správných)
            </label>
            <input
              type="number"
              min="0"
              max={questions?.length || 10}
              value={settings.minPassingScore ?? 5}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  minPassingScore: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e5a995]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Min. skóre pro slosování o hlavní cenu
            </label>
            <input
              type="number"
              min="0"
              max={questions?.length || 10}
              value={settings.grandPrizeScore ?? (questions?.length || 10)}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  grandPrizeScore: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#e5a995]"
            />
          </div>
        </div>

        {/* Email Validation Mode and Live Tester */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Ověření e-mailu soutěžícího
            </label>
            <p className="text-[11px] text-slate-400">
              Nastavte, komu je vstup do soutěže povolen. V ostrém provozu mají přístup výhradně zaměstnanci Vodafone.
            </p>
          </div>

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({
                  ...settings,
                  allowedEmailRegex: '^[a-zA-Z0-9._%+-]+@(vodafone\\.cz|vodafone\\.com)$',
                });
                onShowToast('Aktivován ostrý režim: POUZE Vodafone zaměstnanci', 'success');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                !settings.allowedEmailRegex ||
                !settings.allowedEmailRegex.includes('[^@\\s]')
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                  : 'bg-black/30 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Pouze Vodafone zaměstnanci (Doporučeno)
                </span>
                {(!settings.allowedEmailRegex || !settings.allowedEmailRegex.includes('[^@\\s]')) && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                    Aktivní
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Povoluje pouze domény <strong>@vodafone.cz</strong> a <strong>@vodafone.com</strong>. Všechny ostatní e-maily (gmail, seznam atd.) budou odmítnuty.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdateSettings({
                  ...settings,
                  allowedEmailRegex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
                });
                onShowToast('Aktivován testovací režim: povolen jakýkoliv e-mail', 'info');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                settings.allowedEmailRegex && settings.allowedEmailRegex.includes('[^@\\s]')
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                  : 'bg-black/30 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-amber-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  Volný režim (Testování)
                </span>
                {settings.allowedEmailRegex && settings.allowedEmailRegex.includes('[^@\\s]') && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                    Aktivní
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Umožní přihlášení s jakýmkoliv platným e-mailem (vhodné pro interní vyzkoušení kvízu).
              </p>
            </button>
          </div>

          {/* Interactive Live Email Tester */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <span className="text-[11px] font-semibold text-slate-300 block">
              Vyzkoušet kontrolu e-mailu v reálném čase:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                placeholder="Napište e-mail (např. lucka@vodafone.cz nebo test@gmail.com)..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#e5a995]"
              />
              {testEmailInput.trim() && (
                <button
                  type="button"
                  onClick={() => setTestEmailInput('')}
                  className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                >
                  Vymazat
                </button>
              )}
            </div>

            {testEmailInput.trim() && (() => {
              const res = isAllowedEmail(testEmailInput.trim(), settings.allowedEmailRegex);
              return res.valid ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>E-mail <strong>{testEmailInput.trim()}</strong> JE POVOLEN pro vstup do soutěže.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{res.reason || 'Tento e-mail není povolen.'}</span>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) =>
                onUpdateSettings({ ...settings, soundEnabled: e.target.checked })
              }
              className="w-4 h-4 rounded accent-[#e5a995] cursor-pointer"
            />
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
            Povolit zvukové efekty (tikání kola, fanfáry)
          </label>
        </div>
      </div>

      {/* Security & PIN */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-[#e5a995]" />
          Bezpečnost a PIN kód administrace
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
            <p className="text-xs text-slate-400">Aktuální PIN</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-mono font-bold text-white tracking-widest">
                {showCurrentPin ? settings.pin : '••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title={showCurrentPin ? 'Skrýt PIN' : 'Zobrazit PIN'}
              >
                {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <form onSubmit={handleSavePin} className="space-y-2">
            <label className="block text-xs text-slate-400">Změnit PIN kód</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showNewPin ? 'text' : 'password'}
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value);
                    setPinError('');
                  }}
                  placeholder="Nový PIN (min. 4 znaky)"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:border-[#e5a995]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                Uložit
              </button>
            </div>
            {pinError && <p className="text-xs text-rose-400">{pinError}</p>}
          </form>
        </div>
      </div>

      {/* Cloud & Database Integration (Supabase + Google Sheets) */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#e5a995]" />
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Cloudová databáze (Supabase PostgreSQL)
              </h4>
              <p className="text-xs text-slate-400">
                Hlavní vysokorychlostní databáze pro ověřování e-mailů a řízení skladu výher
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSupabaseConfigured() ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Supabase aktivní (SQL)
              </span>
            ) : settings.googleSheetWebhookUrl ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Google Sheets
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                Pouze lokální režim
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-slate-950 transition-opacity hover:opacity-95 shadow-sm cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR kód pro soutěžící</span>
            </button>
          </div>
        </div>

        {/* 1. Supabase SQL Configuration */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#e5a995]" />
              Supabase (Doporučeno pro ostrý start)
            </span>
            <span className="text-[11px] text-slate-400">
              Nastavitelné i přes <code className="text-[#e5a995]">VITE_SUPABASE_URL</code> na Vercelu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={settings.supabaseUrl || ''}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, supabaseUrl: e.target.value.trim() })
                }
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#e5a995]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Supabase Publishable API key (Anon key)
              </label>
              <input
                type="password"
                value={settings.supabaseAnonKey || ''}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, supabaseAnonKey: e.target.value.trim() })
                }
                placeholder="sbp_... nebo eyJhbGciOi..."
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#e5a995]"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-slate-400">
              Při vyplnění má Supabase přednost před Google Tabulkou. Data se ukládají přímo do tabulek <code className="text-slate-300">attempts</code>, <code className="text-slate-300">contestants</code>, <code className="text-slate-300">spins</code> a <code className="text-slate-300">prize_stock</code>.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSqlModal(!showSqlModal)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-[#e5a995]" />
                <span>{showSqlModal ? 'Skrýt SQL skript' : 'Zobrazit SQL skript'}</span>
              </button>
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={supabaseTest.running}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Database className={`w-3.5 h-3.5 ${supabaseTest.running ? 'animate-spin' : ''}`} />
                <span>{supabaseTest.running ? 'Testuji...' : 'Otestovat spojení a tabulky'}</span>
              </button>
            </div>
          </div>

          {/* Test connection result display */}
          {supabaseTest.result && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                supabaseTest.result.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              {supabaseTest.result.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-semibold">{supabaseTest.result.message}</p>
                {supabaseTest.result.details && (
                  <p className="text-[11px] opacity-80">{supabaseTest.result.details}</p>
                )}
              </div>
            </div>
          )}

          {/* Expandable SQL schema box */}
          {showSqlModal && (
            <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#e5a995]" />
                  SQL skript pro vytvoření všech tabulek a oprávnění v Supabase
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const sql = `-- 1. Tabulka pro sklad, váhy i stav zobrazení výher
CREATE TABLE IF NOT EXISTS prize_stock (
  prize_id TEXT PRIMARY KEY,
  prize_name TEXT,
  remaining_stock INTEGER DEFAULT 9999,
  weight INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migrace pro stávající tabulku v Supabase:
ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 5;
ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Tabulka pro finalisty kvízu (10/10) do slosování
CREATE TABLE IF NOT EXISTS contestants (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  score TEXT NOT NULL,
  prize_won TEXT,
  station TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabulka pro historii roztočení kola štěstí
CREATE TABLE IF NOT EXISTS spins (
  id TEXT PRIMARY KEY,
  email TEXT,
  prize_id TEXT,
  prize_name TEXT NOT NULL,
  station TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabulka pro evidenci pokusů e-mailů (zabránění opakovanému kvízu)
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  station TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migrace pro případ starší tabulky attempts bez sloupců id a station:
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS station TEXT;
CREATE INDEX IF NOT EXISTS idx_attempts_email ON attempts (email);

-- Povolení přístupu pro anonymní klíč (aby web mohl zapisovat bez přihlašování):
ALTER TABLE prize_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Povolit anon pro prize_stock" ON prize_stock;
CREATE POLICY "Povolit anon pro prize_stock" ON prize_stock FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Povolit anon pro contestants" ON contestants;
CREATE POLICY "Povolit anon pro contestants" ON contestants FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Povolit anon pro spins" ON spins;
CREATE POLICY "Povolit anon pro spins" ON spins FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Povolit anon pro attempts" ON attempts;
CREATE POLICY "Povolit anon pro attempts" ON attempts FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. Naplnění všech 11 výher do prize_stock:
INSERT INTO prize_stock (prize_id, prize_name, remaining_stock, weight, is_active)
VALUES
  ('p1', 'Qi2 Nabíječka', 10, 5, true),
  ('p2', 'Qi2 Stojánek', 10, 4, true),
  ('p3', 'Kickstand', 15, 6, true),
  ('p4', '67W Adaptér', 10, 5, true),
  ('p5', 'Pixel Buds', 5, 3, true),
  ('p6', 'Sluneční brýle', 20, 7, true),
  ('p7', 'Lanyard', 50, 8, true),
  ('p8', 'Termohrnek', 15, 6, true),
  ('p9', 'Ponožky', 25, 7, true),
  ('p10', 'Batoh', 5, 4, true),
  ('p11', 'Čepice', 15, 6, true)
ON CONFLICT (prize_id) DO UPDATE SET
  prize_name = EXCLUDED.prize_name,
  remaining_stock = EXCLUDED.remaining_stock,
  weight = EXCLUDED.weight,
  is_active = EXCLUDED.is_active;`;
                    navigator.clipboard.writeText(sql);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-[#e5a995] text-black hover:opacity-90 flex items-center gap-1 cursor-pointer"
                >
                  {sqlCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{sqlCopied ? 'Zkopírováno!' : 'Kopírovat SQL'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Otevřete v Supabase menu <strong>SQL Editor</strong>, vložte tento kód a klikněte na zelené tlačítko <strong>Run</strong>.
              </p>
              <pre className="p-3 rounded-lg bg-black/80 border border-white/5 text-[10px] font-mono text-emerald-300 max-h-48 overflow-y-auto whitespace-pre">
{`CREATE TABLE IF NOT EXISTS prize_stock (
  prize_id TEXT PRIMARY KEY,
  prize_name TEXT,
  remaining_stock INTEGER DEFAULT 9999,
  weight INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 5;
ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS contestants (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  score TEXT NOT NULL,
  prize_won TEXT,
  station TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spins (
  id TEXT PRIMARY KEY,
  email TEXT,
  prize_id TEXT,
  prize_name TEXT NOT NULL,
  station TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  station TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE attempts ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS station TEXT;
CREATE INDEX IF NOT EXISTS idx_attempts_email ON attempts (email);

ALTER TABLE prize_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Povolit anon pro prize_stock" ON prize_stock;
CREATE POLICY "Povolit anon pro prize_stock" ON prize_stock FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Povolit anon pro contestants" ON contestants;
CREATE POLICY "Povolit anon pro contestants" ON contestants FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Povolit anon pro spins" ON spins;
CREATE POLICY "Povolit anon pro spins" ON spins FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Povolit anon pro attempts" ON attempts;
CREATE POLICY "Povolit anon pro attempts" ON attempts FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO prize_stock (prize_id, prize_name, remaining_stock, weight, is_active)
VALUES
  ('p1', 'Qi2 Nabíječka', 10, 5, true),
  ('p2', 'Qi2 Stojánek', 10, 4, true),
  ('p3', 'Kickstand', 15, 6, true),
  ('p4', '67W Adaptér', 10, 5, true),
  ('p5', 'Pixel Buds', 5, 3, true),
  ('p6', 'Sluneční brýle', 20, 7, true),
  ('p7', 'Lanyard', 50, 8, true),
  ('p8', 'Termohrnek', 15, 6, true),
  ('p9', 'Ponožky', 25, 7, true),
  ('p10', 'Batoh', 5, 4, true),
  ('p11', 'Čepice', 15, 6, true)
ON CONFLICT (prize_id) DO UPDATE SET
  prize_name = EXCLUDED.prize_name,
  remaining_stock = EXCLUDED.remaining_stock,
  weight = EXCLUDED.weight,
  is_active = EXCLUDED.is_active;`}
              </pre>
            </div>
          )}
        </div>

        {/* 2. Google Sheets Mirror Backup (Optional) */}
        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Volitelná záloha: Google Sheets Webhook URL
            </label>
            {isSupabaseConfigured() && settings.googleSheetWebhookUrl && (
              <span className="text-[11px] text-emerald-400 font-medium">
                ✓ Zrcadlení do Google Tabulky aktivní
              </span>
            )}
          </div>
          <input
            type="url"
            value={settings.googleSheetWebhookUrl || ''}
            onChange={(e) =>
              onUpdateSettings({ ...settings, googleSheetWebhookUrl: e.target.value.trim() })
            }
            placeholder="https://script.google.com/macros/s/.../exec (volitelné)"
            className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#e5a995]"
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isTestingSheets || !settings.googleSheetWebhookUrl}
              onClick={async () => {
                if (!settings.googleSheetWebhookUrl) {
                  onShowToast('Nejprve vložte URL adresu webhooku.', 'error');
                  return;
                }
                setIsTestingSheets(true);
                const res = await sendTestRowToGoogleSheets(settings.googleSheetWebhookUrl);
                setIsTestingSheets(false);
                onShowToast(res.message, res.success ? 'success' : 'error');
              }}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{isTestingSheets ? 'Odesílám test...' : 'Otestovat zápis do Google Tabulky'}</span>
            </button>

            {settings.googleSheetWebhookUrl && settings.googleSheetWebhookUrl.includes('/exec') && (
              <a
                href={`${settings.googleSheetWebhookUrl}${settings.googleSheetWebhookUrl.includes('?') ? '&' : '?'}action=test`}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Otevřít přímý test v prohlížeči (?action=test)</span>
              </a>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            {isSupabaseConfigured()
              ? 'Supabase obsluhuje celý provoz webu i sklad. Toto pole je volitelné – pokud zadáte URL Google skriptu, na pozadí se do tabulky bude zrcadlit kopie pro přímé losování o Pixel 11.'
              : 'Pokud nemáte Supabase, můžete zde zadat Google Apps Script webhook.'}
          </p>

          <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-slate-300 space-y-1">
            <strong className="text-white block">Pokud se data nezapisují, zkontrolujte 3 nejčastější příčiny v Google Apps Scriptu:</strong>
            <p>1. <strong>URL musí končit na <code>/exec</code></strong> (zkopírujte URL webové aplikace z okna Nasazení, nikoli odkaz z adresního řádku prohlížeče končící na <code>/edit</code>).</p>
            <p>2. <strong>Přístup musí být nastaven na „Kdokoli“ (Anyone)</strong> – nikoli „Pouze já“.</p>
            <p>3. <strong>Vždy po změně kódu v Apps Scriptu je nutné:</strong> Nasadit → Spravovat nasazení → kliknout na ikonu tužky (Upravit) → zvolit <em>Verze: Nová verze</em> → kliknout na <em>Nasadit</em>. (Pouhé uložení kód na existující URL nepropíše!).</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setShowQRModal(true)}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-[#e5a995]" />
            <span>Stáhnout QR kód pro účastníky</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerSheetsSync();
              onShowToast('Odesílání neuložených dat do cloudu bylo spuštěno.', 'info');
            }}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Cloud className="w-4 h-4 text-[#e5a995]" />
            <span>Odeslat neuložená data</span>
          </button>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Download className="w-4 h-4 text-[#e5a995]" />
          Záloha a přenos konfigurace (JSON)
        </h4>
        <p className="text-xs text-slate-400">
          Uložte celé nastavení, výhry i otázky do jednoho souboru nebo je nahrajte do jiného zařízení.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportovat konfiguraci (.json)
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Nahrát konfiguraci (.json)
          </button>

          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setClearHistoryConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
              title="Umožní znovu soutěžit již použitým e-mailům na tomto zařízení"
            >
              Resetovat historii e-mailů (pro test)
            </button>
          </div>
        </div>
      </div>

      {/* Clear Participated Emails Confirmation Dialog */}
      <ConfirmModal
        isOpen={clearHistoryConfirm}
        title="Vymazat historii použitých e-mailů a pokusů?"
        message="Tato akce vymaže historii pokusů v tomto prohlížeči i v databázi Supabase (tabulka attempts). Umožní tak jakémukoliv e-mailu znovu soutěžit od začátku."
        confirmLabel="Vymazat historii e-mailů"
        variant="warning"
        onConfirm={async () => {
          clearParticipatedEmails();
          if (isSupabaseConfigured()) {
            await clearAttemptsInSupabase().catch(() => {});
          }
          setClearHistoryConfirm(false);
          onShowToast('Historie zadaných e-mailů (lokální i v Supabase) byla úspěšně promazána.', 'success');
        }}
        onCancel={() => setClearHistoryConfirm(false)}
      />

      {/* Import Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(importConfirmData)}
        title="Přepsat konfiguraci?"
        message="Opravdu chcete přepsat aktuální nastavení, výhry a otázky kvízu daty ze souboru? Tato akce je nevratná."
        confirmLabel="Importovat a přepsat"
        variant="warning"
        onConfirm={confirmImport}
        onCancel={() => setImportConfirmData(null)}
      />

      {/* QR Code Modal for contestants */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        webhookUrl={settings.googleSheetWebhookUrl}
        allowedEmailRegex={settings.allowedEmailRegex}
        onShowToast={onShowToast}
      />
    </div>
  );
};
