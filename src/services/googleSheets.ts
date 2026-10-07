import { CompetitionEntry, SpinLog, Prize, SystemSettings, QuizQuestion } from '../types';
import {
  saveOutboxItemToIDB,
  removeOutboxItemFromIDB,
  getAllOutboxItemsFromIDB,
  OutboxItem,
} from '../utils/offlineDb';
import {
  isSupabaseConfigured,
  checkEmailInSupabase,
  logParticipantAttemptToSupabase,
  fetchLiveStockFromSupabase,
  pushStockToSupabase,
  dispatchOutboxItemToSupabase,
  LivePrizeData,
} from './supabase';

export interface GoogleSheetsSyncStatus {
  isConfigured: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSuccessTime: number | null;
  lastError: string | null;
  provider: 'supabase' | 'sheets' | 'none';
  hasBackup?: boolean;
}

const OUTBOX_STORAGE_KEY = 'kolo_stesti_sheets_outbox';

let outbox: OutboxItem[] = [];
let isProcessing = false;
let lastSuccessTime: number | null = null;
let lastError: string | null = null;

const listeners = new Set<(status: GoogleSheetsSyncStatus) => void>();

export function getSyncProvider(): 'supabase' | 'sheets' | 'none' {
  if (isSupabaseConfigured()) return 'supabase';
  const webhookUrl = getWebhookUrl();
  if (webhookUrl && webhookUrl.trim().length > 10) return 'sheets';
  return 'none';
}

function notify() {
  const provider = getSyncProvider();
  const webhookUrl = getWebhookUrl();
  const hasBackup = Boolean(
    isSupabaseConfigured() && webhookUrl && webhookUrl.trim().length > 10
  );
  const status: GoogleSheetsSyncStatus = {
    isConfigured: provider !== 'none',
    isSyncing: isProcessing,
    pendingCount: outbox.length,
    lastSuccessTime,
    lastError,
    provider,
    hasBackup,
  };
  listeners.forEach((cb) => cb(status));
}

export function getWebhookUrl(): string {
  try {
    const raw = localStorage.getItem('kolo_stesti_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.googleSheetWebhookUrl) return parsed.googleSheetWebhookUrl;
    }
  } catch {
    // ignore
  }
  return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEET_WEBHOOK_URL) || '';
}

function getStationName(): string {
  if (typeof navigator === 'undefined') return 'Mobilní web';
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return 'Mobil (iPhone)';
  if (/ipad/i.test(ua)) return 'Tablet (iPad)';
  if (/android/i.test(ua)) return 'Mobil (Android)';
  return 'Mobilní web';
}

function persistOutbox() {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
  } catch {
    // ignore
  }
}

export function subscribeGoogleSheetsStatus(
  callback: (status: GoogleSheetsSyncStatus) => void
): () => void {
  listeners.add(callback);
  notify();
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Checks whether an email has already participated.
 * Supabase is used when configured; otherwise falls back to Webhook.
 */
export async function checkEmailInGoogleSheets(
  email: string
): Promise<{ exists: boolean; message?: string }> {
  if (isSupabaseConfigured()) {
    return checkEmailInSupabase(email);
  }

  // Fallback if only Google Sheets is configured
  const webhookUrl = getWebhookUrl();
  const normalized = email.trim().toLowerCase();
  if (!webhookUrl || webhookUrl.trim().length < 10) return { exists: false };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = new URL(webhookUrl);
    url.searchParams.set('action', 'check_email');
    url.searchParams.set('email', normalized);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return { exists: Boolean(data?.exists), message: data?.message };
    }
  } catch (err) {
    console.warn('Fallback email check error:', err);
  }
  return { exists: false };
}

/**
 * Logs a quiz participation attempt.
 */
export async function logParticipantAttempt(email: string): Promise<void> {
  if (isSupabaseConfigured()) {
    logParticipantAttemptToSupabase(email).catch(() => {});
  }
}

/**
 * Fetches real-time prize stock and probability weights.
 */
export async function fetchLiveStockFromGoogleSheets(): Promise<Record<string, LivePrizeData> | null> {
  if (isSupabaseConfigured()) {
    return fetchLiveStockFromSupabase();
  }
  return null;
}

/**
 * Pushes/updates prize stock limits and probability weights.
 */
export async function pushStockToGoogleSheets(
  prizes: Prize[]
): Promise<{
  success: boolean;
  error?: string;
  cleanedCount?: number;
  missingWeightColumn?: boolean;
  missingActiveColumn?: boolean;
}> {
  if (isSupabaseConfigured()) {
    return pushStockToSupabase(prizes);
  }
  return {
    success: false,
    error: 'Supabase není připojena (chybí Project URL nebo API klíč v záložce Nastavení).',
  };
}

/**
 * Optional legacy config handlers (clean no-ops since Supabase handles state).
 */
export async function fetchLiveConfigFromGoogleSheets(): Promise<{
  settings?: Partial<SystemSettings>;
  questions?: QuizQuestion[];
} | null> {
  return null;
}

export async function pushConfigToGoogleSheets(
  _settings: SystemSettings,
  _questions?: QuizQuestion[]
): Promise<boolean> {
  return true;
}

export async function initializeGoogleSheetsSync(): Promise<void> {
  try {
    const local = localStorage.getItem(OUTBOX_STORAGE_KEY);
    const localItems: OutboxItem[] = local ? JSON.parse(local) : [];
    const idbItems = await getAllOutboxItemsFromIDB();

    const map = new Map<string, OutboxItem>();
    [...localItems, ...idbItems].forEach((i) => {
      if (i && i.id) map.set(i.id, i);
    });

    outbox = Array.from(map.values());
    persistOutbox();
    notify();

    if (outbox.length > 0) {
      triggerSheetsSync();
    }
  } catch (err) {
    console.warn('Failed to init cloud sync outbox', err);
  }
}

function formatTimestampSafely(ts: unknown): string {
  if (!ts) {
    return new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
  }
  if (typeof ts === 'number') {
    return new Date(ts).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
  }
  if (typeof ts === 'string') {
    if (ts.includes('.') && ts.includes(':')) {
      return ts;
    }
    const parsed = Date.parse(ts);
    if (!isNaN(parsed)) {
      return new Date(parsed).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
    }
  }
  return new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
}

export async function queueEntryForGoogleSheets(entry: CompetitionEntry): Promise<void> {
  const item: OutboxItem = {
    id: entry.id,
    type: 'entry',
    data: entry,
    createdAt: Date.now(),
    attempts: 0,
  };

  const existingIdx = outbox.findIndex((i) => i.id === item.id);
  if (existingIdx >= 0) {
    outbox[existingIdx] = item;
  } else {
    outbox.push(item);
  }

  persistOutbox();
  saveOutboxItemToIDB(item).catch(() => {});
  notify();

  triggerSheetsSync();
}

export async function queueSpinForGoogleSheets(spin: SpinLog): Promise<void> {
  const item: OutboxItem = {
    id: spin.id,
    type: 'spin',
    data: spin,
    createdAt: Date.now(),
    attempts: 0,
  };

  const existingIdx = outbox.findIndex((i) => i.id === item.id);
  if (existingIdx >= 0) {
    outbox[existingIdx] = item;
  } else {
    outbox.push(item);
  }

  persistOutbox();
  saveOutboxItemToIDB(item).catch(() => {});
  notify();

  triggerSheetsSync();
}

/**
 * Flushes outbox to Supabase (primary) and silently mirrors to Google Sheets (backup).
 */
export async function triggerSheetsSync(): Promise<{ success: boolean; message: string }> {
  const provider = getSyncProvider();
  const webhookUrl = getWebhookUrl();

  if (provider === 'none') {
    notify();
    return {
      success: false,
      message: 'Není nakonfigurována Supabase ani URL Google Tabulky.',
    };
  }

  if (isProcessing) {
    return { success: true, message: 'Synchronizace již probíhá...' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    lastError = 'Zařízení je offline. Data budou odeslána po připojení k internetu.';
    notify();
    return { success: false, message: lastError };
  }

  if (outbox.length === 0) {
    notify();
    const providerName = provider === 'supabase' ? 'Supabase' : 'Google Tabulce';
    return { success: true, message: `Všechna data jsou v ${providerName} aktuální.` };
  }

  isProcessing = true;
  lastError = null;
  notify();

  const station = getStationName();
  let sentCount = 0;

  while (outbox.length > 0) {
    const item = outbox[0];
    try {
      if (provider === 'supabase') {
        // 1. Primární zápis do PostgreSQL v Supabase
        const ok = await dispatchOutboxItemToSupabase(item);
        if (!ok) {
          throw new Error('Chyba při zápisu do Supabase databáze');
        }

        // 2. Paralelní zrcadlová záloha do Google Sheets (pouze e-maily do slosování 8/8 a točení kola)
        if (webhookUrl && webhookUrl.trim().length > 10) {
          try {
            let backupPayload: Record<string, unknown> | null = null;
            if (item.type === 'spin') {
              const spin = item.data as SpinLog;
              backupPayload = {
                type: 'spin',
                id: spin.id,
                prizeName: spin.prizeName || 'Neznámá výhra',
                prizeId: spin.prizeId || '',
                email: (spin.userEmail || '').trim().toLowerCase(),
                timestamp: formatTimestampSafely(spin.timestamp),
                station,
              };
            } else if (item.type === 'entry') {
              const entry = item.data as CompetitionEntry;
              backupPayload = {
                type: 'entry',
                id: entry.id,
                email: (entry.email || '').trim().toLowerCase(),
                score: `${entry.score}/${entry.totalQuestions}`,
                prizeWon: entry.prizeWon || '',
                timestamp: formatTimestampSafely(entry.timestamp),
                station,
              };
            }

            if (backupPayload) {
              fetch(webhookUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(backupPayload),
              }).catch(() => {});
            }
          } catch {
            // Tichá záloha nikdy neblokuje hlavní flow
          }
        }
      } else {
        // Fallback pro standalone Google Sheets režim
        let payload: Record<string, unknown>;
        if (item.type === 'spin') {
          const spin = item.data as SpinLog;
          payload = {
            type: 'spin',
            id: spin.id,
            prizeName: spin.prizeName || 'Neznámá výhra',
            email: (spin.userEmail || '').trim().toLowerCase(),
            timestamp: formatTimestampSafely(spin.timestamp),
            station,
          };
        } else {
          const entry = item.data as CompetitionEntry;
          payload = {
            type: 'entry',
            id: entry.id,
            email: (entry.email || '').trim().toLowerCase(),
            score: `${entry.score}/${entry.totalQuestions}`,
            prizeWon: entry.prizeWon || '',
            timestamp: formatTimestampSafely(entry.timestamp),
            station,
          };
        }

        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });
      }

      outbox.shift();
      persistOutbox();
      removeOutboxItemFromIDB(item.id).catch(() => {});
      sentCount++;
      lastSuccessTime = Date.now();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      item.attempts += 1;
      item.lastError = msg;
      lastError = `Chyba při odesílání: ${msg}`;
      break;
    }
  }

  isProcessing = false;
  persistOutbox();
  notify();

  if (lastError) {
    return { success: false, message: lastError };
  }

  const targetName = provider === 'supabase' ? 'Supabase databáze' : 'Google Tabulky';
  return {
    success: true,
    message: `Úspěšně odesláno ${sentCount} záznamů do ${targetName}.`,
  };
}

// Auto-sync listener on internet connection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    triggerSheetsSync();
  });

  initializeGoogleSheetsSync();
}
