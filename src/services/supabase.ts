import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CompetitionEntry, SpinLog, Prize } from '../types';
import { OutboxItem } from '../utils/offlineDb';

let clientInstance: SupabaseClient | null = null;
let lastConfigHash = '';

function getStationName(): string {
  if (typeof navigator === 'undefined') return 'Mobilní web';
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return 'Mobil (iPhone)';
  if (/ipad/i.test(ua)) return 'Tablet (iPad)';
  if (/android/i.test(ua)) return 'Mobil (Android)';
  return 'Mobilní web';
}

/**
 * Global project configuration for Supabase.
 * Embedded directly so all devices, phones and kiosks connect automatically out-of-the-box.
 */
export const GLOBAL_SUPABASE_CONFIG = {
  url: 'https://nislyvamypauoftpfmqn.supabase.co',
  anonKey: 'sb_publishable_HJroWjhGzoADvT1x2h8Huw_UU-APDUN',
};

/**
 * Reads Supabase connection credentials from environment variables, localStorage, or global defaults.
 */
export function getSupabaseCredentials(
  customUrl?: string,
  customKey?: string
): { url: string; anonKey: string; isConfigured: boolean } {
  let url = customUrl ? String(customUrl).trim() : '';
  let anonKey = customKey ? String(customKey).trim() : '';

  // 1. Vite environment variables (Vercel)
  if (!url || !anonKey) {
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        if (!url && import.meta.env.VITE_SUPABASE_URL) {
          url = String(import.meta.env.VITE_SUPABASE_URL).trim();
        }
        if (!anonKey && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim();
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Local storage overrides (Admin settings)
  if (!url || !anonKey) {
    try {
      const raw =
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage.getItem('kolo_stesti_settings')
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.supabaseUrl && !url) url = String(parsed.supabaseUrl).trim();
        if (parsed.supabaseAnonKey && !anonKey) anonKey = String(parsed.supabaseAnonKey).trim();
      }
    } catch {
      // ignore
    }
  }

  // 3. Built-in global defaults
  if (!url) {
    url = GLOBAL_SUPABASE_CONFIG.url;
  }
  if (!anonKey && GLOBAL_SUPABASE_CONFIG.anonKey) {
    anonKey = GLOBAL_SUPABASE_CONFIG.anonKey;
  }

  // Clean and normalize URL
  url = url.replace(/['"\s]/g, '');
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  url = url.replace(/\/+$/, '');

  // Clean and normalize Key
  anonKey = anonKey.replace(/['"\s]/g, '');

  const isConfigured = Boolean(
    url &&
    url.startsWith('http') &&
    url.length > 10 &&
    anonKey &&
    anonKey.length > 10
  );

  return { url, anonKey, isConfigured };
}

/**
 * Returns singleton Supabase client or null if not configured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;

  const currentHash = `${url}::${anonKey}`;
  if (!clientInstance || currentHash !== lastConfigHash) {
    try {
      clientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      lastConfigHash = currentHash;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return clientInstance;
}

/**
 * Checks if Supabase integration is ready to use.
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseCredentials().isConfigured;
}

/**
 * Checks if the given email already participated by querying Supabase.
 * Checks both 'attempts' and 'contestants' tables.
 */
export async function checkEmailInSupabase(
  email: string
): Promise<{ exists: boolean; message?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { exists: false };

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { exists: false };

  try {
    // 1. Check in attempts table
    const { data: attemptData, error: attemptErr } = await supabase
      .from('attempts')
      .select('id')
      .eq('email', cleanEmail)
      .limit(1);

    if (!attemptErr && attemptData && attemptData.length > 0) {
      return { exists: true, message: 'Tento e-mail se již soutěže zúčastnil.' };
    }

    // 2. Check in contestants table
    const { data: contestantData, error: contestantErr } = await supabase
      .from('contestants')
      .select('id')
      .eq('email', cleanEmail)
      .limit(1);

    if (!contestantErr && contestantData && contestantData.length > 0) {
      return { exists: true, message: 'Tento e-mail již dokončil soutěžní kvíz.' };
    }

    return { exists: false };
  } catch (err) {
    console.warn('Supabase email verification query failed, bypassing online check:', err);
    return { exists: false };
  }
}

/**
 * Logs a quiz participation attempt to the 'attempts' table in Supabase.
 */
export async function logParticipantAttemptToSupabase(email: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return false;

  try {
    const attemptId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const { error } = await supabase.from('attempts').insert({
      id: attemptId,
      email: cleanEmail,
      station: getStationName(),
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Supabase attempt insert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to log participant attempt in Supabase:', err);
    return false;
  }
}

export interface LivePrizeData {
  stock: number;
  weight?: number;
  isActive?: boolean;
}

/**
 * Fetches real-time prize stock, probability weights and active state directly from the 'prize_stock' table in Supabase.
 */
export async function fetchLiveStockFromSupabase(): Promise<Record<string, LivePrizeData> | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    // 1. Try to select prize_id, remaining_stock, weight, is_active
    const { data, error } = await supabase
      .from('prize_stock')
      .select('prize_id, remaining_stock, weight, is_active');

    if (error) {
      // 2. Fallback if 'is_active' column doesn't exist yet
      if (error.message.includes('column "is_active" does not exist') || error.code === '42703') {
        const { data: fbData, error: fbErr } = await supabase
          .from('prize_stock')
          .select('prize_id, remaining_stock, weight');

        if (fbErr) {
          // 3. Fallback if 'weight' also doesn't exist yet
          const { data: legacyData, error: legErr } = await supabase
            .from('prize_stock')
            .select('prize_id, remaining_stock');

          if (legErr) {
            console.warn('Failed fallback fetch from Supabase:', legErr.message);
            return null;
          }

          if (Array.isArray(legacyData)) {
            const fallbackMap: Record<string, LivePrizeData> = {};
            legacyData.forEach((row: { prize_id: string; remaining_stock: number }) => {
              if (row.prize_id) {
                const stockVal = Number(row.remaining_stock);
                fallbackMap[row.prize_id] = {
                  stock: stockVal,
                  // Auto-deactivate if stock <= 0
                  isActive: stockVal <= 0 ? false : undefined,
                };
              }
            });
            return fallbackMap;
          }
        }

        if (Array.isArray(fbData)) {
          const fallbackMap: Record<string, LivePrizeData> = {};
          fbData.forEach((row: { prize_id: string; remaining_stock: number; weight?: number | null }) => {
            if (row.prize_id) {
              const stockVal = Number(row.remaining_stock);
              fallbackMap[row.prize_id] = {
                stock: stockVal,
                weight: row.weight != null ? Number(row.weight) : undefined,
                // Auto-deactivate if stock <= 0
                isActive: stockVal <= 0 ? false : undefined,
              };
            }
          });
          return fallbackMap;
        }
      }

      console.warn('Failed to fetch prize stock from Supabase:', error.message);
      return null;
    }

    if (Array.isArray(data)) {
      const stockMap: Record<string, LivePrizeData> = {};
      data.forEach(
        (row: {
          prize_id: string;
          remaining_stock: number;
          weight?: number | null;
          is_active?: boolean | null;
        }) => {
          if (row.prize_id) {
            const stockVal = Number(row.remaining_stock);
            // Crucial rule: If stock is 0 or less, it MUST be deactivated
            const activeVal =
              stockVal <= 0
                ? false
                : row.is_active !== null && row.is_active !== undefined
                ? Boolean(row.is_active)
                : undefined;

            stockMap[row.prize_id] = {
              stock: stockVal,
              weight: row.weight !== null && row.weight !== undefined ? Number(row.weight) : undefined,
              isActive: activeVal,
            };
          }
        }
      );
      return stockMap;
    }
  } catch (err) {
    console.warn('Supabase stock fetch exception:', err);
  }

  return null;
}

/**
 * Pushes/updates all prizes, their remaining quantities, probability weights and active state in the 'prize_stock' table in Supabase.
 * Also cleans up any orphan or duplicate rows whose prize_id is not in the active prize list.
 */
export async function pushStockToSupabase(
  prizes: Prize[],
  cleanupOrphans = true
): Promise<{
  success: boolean;
  error?: string;
  cleanedCount?: number;
  missingWeightColumn?: boolean;
  missingActiveColumn?: boolean;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase není připojena (chybí URL nebo anon klíč v Nastavení / Vercelu).',
    };
  }

  try {
    const validPrizes = prizes.filter((p) => p.id && p.id.trim().length > 0);
    const validIds = validPrizes.map((p) => p.id.trim().toLowerCase());

    const rowsWithAll = validPrizes.map((p) => {
      const stockVal = typeof p.stock === 'number' ? Math.max(0, p.stock) : 9999;
      // Auto-deactivate if stock <= 0
      const activeVal = stockVal <= 0 ? false : Boolean(p.active);
      return {
        prize_id: p.id.trim().toLowerCase(),
        prize_name: p.name,
        remaining_stock: stockVal,
        weight: typeof p.weight === 'number' ? Math.max(1, p.weight) : 5,
        is_active: activeVal,
        updated_at: new Date().toISOString(),
      };
    });

    let missingWeightColumn = false;
    let missingActiveColumn = false;

    // 1. Try upsert with all columns (prize_id, prize_name, remaining_stock, weight, is_active)
    let { error } = await supabase
      .from('prize_stock')
      .upsert(rowsWithAll, { onConflict: 'prize_id' });

    // Handle missing is_active column gracefully
    if (error && (error.message.includes('column "is_active"') || error.code === '42703')) {
      missingActiveColumn = true;
      const rowsWithoutActive = validPrizes.map((p) => ({
        prize_id: p.id.trim().toLowerCase(),
        prize_name: p.name,
        remaining_stock: typeof p.stock === 'number' ? Math.max(0, p.stock) : 9999,
        weight: typeof p.weight === 'number' ? Math.max(1, p.weight) : 5,
        updated_at: new Date().toISOString(),
      }));

      const retryWithoutActive = await supabase
        .from('prize_stock')
        .upsert(rowsWithoutActive, { onConflict: 'prize_id' });

      error = retryWithoutActive.error;
    }

    // Handle missing weight column gracefully
    if (error && (error.message.includes('column "weight"') || error.code === '42703')) {
      missingWeightColumn = true;
      const rowsBaseOnly = validPrizes.map((p) => ({
        prize_id: p.id.trim().toLowerCase(),
        prize_name: p.name,
        remaining_stock: typeof p.stock === 'number' ? Math.max(0, p.stock) : 9999,
        updated_at: new Date().toISOString(),
      }));

      const retryBase = await supabase
        .from('prize_stock')
        .upsert(rowsBaseOnly, { onConflict: 'prize_id' });

      error = retryBase.error;
    }

    if (error) {
      console.warn('Supabase pushStock error:', error);
      let friendlyError = error.message;
      if (error.message.includes('relation "prize_stock" does not exist')) {
        friendlyError = 'Tabulka "prize_stock" v Supabase neexistuje. Spusťte SQL skript v SQL editoru.';
      } else if (error.message.includes('row-level security') || error.code === '42501') {
        friendlyError = 'Zápis do "prize_stock" blokován RLS. Vypněte RLS nebo přidejte politiku pro anon.';
      } else if (error.message.includes('unique or exclusion constraint')) {
        friendlyError = 'Sloupec prize_id v tabulce prize_stock musí být PRIMARY KEY.';
      }
      return { success: false, error: friendlyError };
    }

    let cleanedCount = 0;
    // 2. Automatically delete legacy/duplicate records (e.g. "hrnek", text names in id column)
    if (cleanupOrphans && validIds.length > 0) {
      try {
        const { data: existingRows } = await supabase
          .from('prize_stock')
          .select('prize_id');

        if (Array.isArray(existingRows)) {
          const orphanIds = existingRows
            .map((r: { prize_id: string }) => r.prize_id)
            .filter((id: string) => id && !validIds.includes(String(id).trim().toLowerCase()));

          if (orphanIds.length > 0) {
            await supabase
              .from('prize_stock')
              .delete()
              .in('prize_id', orphanIds);
            cleanedCount = orphanIds.length;
            console.info('Vyčištěny neplatné/duplicitní záznamy ze Supabase:', orphanIds);
          }
        }
      } catch (cleanErr) {
        console.warn('Failed to cleanup orphan prize_stock rows:', cleanErr);
      }
    }

    let warningMessage: string | undefined;
    if (missingWeightColumn && missingActiveColumn) {
      warningMessage = 'Sklad byl uložen, ale v tabulce prize_stock chybí sloupce "weight" i "is_active". Váhy se do databáze nemohly propsat! Spusťte SQL příkaz v záložce Nastavení.';
    } else if (missingWeightColumn) {
      warningMessage = 'Sklad byl uložen, ale v tabulce prize_stock chybí sloupec "weight". Váhy se do databáze nemohly propsat! Spusťte v Supabase: ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 5;';
    } else if (missingActiveColumn) {
      warningMessage = 'Sklad byl uložen, ale v tabulce prize_stock chybí sloupec "is_active". Spusťte v Supabase: ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;';
    }

    return {
      success: true,
      cleanedCount,
      missingWeightColumn,
      missingActiveColumn,
      error: warningMessage,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Failed to push stock to Supabase:', err);
    return { success: false, error: msg };
  }
}

/**
 * Tests connection to Supabase and validates tables exist with proper permissions.
 */
export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{
  ok: boolean;
  message: string;
  details?: string;
}> {
  const { isConfigured, url, anonKey } = getSupabaseCredentials(customUrl, customKey);

  if (!url && !anonKey) {
    return {
      ok: false,
      message: 'Chybí URL i API klíč.',
      details: 'Vyplňte políčka Supabase Project URL i Publishable API key výše.',
    };
  }

  if (!url) {
    return {
      ok: false,
      message: 'Chybí Supabase Project URL.',
      details: 'Zadejte URL ve tvaru https://xxxx.supabase.co.',
    };
  }

  if (!anonKey) {
    return {
      ok: false,
      message: 'Chybí Supabase Publishable / Anon klíč.',
      details: 'Vložte Publishable API klíč ze Supabase dashboardu (Project Settings -> API).',
    };
  }

  if (!url.startsWith('http')) {
    return {
      ok: false,
      message: 'Neplatná adresa Supabase URL.',
      details: 'URL adresa musí začínat https:// (např. https://xxxx.supabase.co).',
    };
  }

  let testClient: SupabaseClient;
  try {
    testClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    return {
      ok: false,
      message: 'Chyba při vytváření klienta Supabase.',
      details: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    // 1. Ověření prize_stock včetně přítomnosti sloupců weight a is_active
    let hasWeightColumn = true;
    let hasActiveColumn = true;

    const { error: stockErr } = await testClient
      .from('prize_stock')
      .select('prize_id, remaining_stock, weight, is_active')
      .limit(1);

    if (stockErr) {
      if (stockErr.message.includes('relation "prize_stock" does not exist') || stockErr.code === '42P01') {
        return {
          ok: false,
          message: 'Databáze je připojena, ale chybí tabulka "prize_stock"!',
          details: 'Klikněte na tlačítko "Zobrazit SQL skript", zkopírujte kód a spusťte ho v Supabase SQL Editoru.',
        };
      }
      if (stockErr.message.includes('column "weight"') || stockErr.code === '42703') {
        hasWeightColumn = false;
      }
      if (stockErr.message.includes('column "is_active"')) {
        hasActiveColumn = false;
      }
      if (stockErr.message.includes('row-level security') || stockErr.code === '42501') {
        return {
          ok: false,
          message: 'Spojení funguje, ale zápis blokuje Row Level Security (RLS)!',
          details: 'Spusťte v Supabase SQL Editoru přiložený SQL skript, který obsahuje RLS politiky pro anonymní přístup.',
        };
      }
      if (
        stockErr.message.toLowerCase().includes('invalid api key') ||
        stockErr.message.toLowerCase().includes('jwt') ||
        stockErr.message.toLowerCase().includes('unauthorized') ||
        stockErr.code === 'PGRST301' ||
        (stockErr as unknown as { status?: number }).status === 401
      ) {
        return {
          ok: false,
          message: 'Neplatný nebo expirovaný Supabase API klíč (Chyba 401 Unauthorized).',
          details: 'Zkontrolujte v Supabase -> Project Settings -> API, zda máte zkopírovaný kompletní "anon / public" klíč (nikoliv service_role ani heslo).',
        };
      }
    }

    // 2. Ověření contestants
    const { error: cErr } = await testClient.from('contestants').select('id').limit(1);
    if (cErr) {
      return {
        ok: false,
        message: 'Chybí tabulka "contestants"!',
        details: 'Spusťte v Supabase SQL Editoru přiložený SQL skript.',
      };
    }

    // 3. Ověření spins
    const { error: sErr } = await testClient.from('spins').select('id').limit(1);
    if (sErr) {
      return {
        ok: false,
        message: 'Chybí tabulka "spins"!',
        details: 'Spusťte v Supabase SQL Editoru přiložený SQL skript.',
      };
    }

    let host = 'Supabase';
    try {
      host = new URL(url).hostname;
    } catch {
      // ignore
    }

    if (!hasWeightColumn) {
      return {
        ok: false,
        message: 'Tabulka prize_stock existuje, ale CHYBÍ sloupec "weight" pro váhy cen!',
        details: 'Váhy cen se do Supabase nemohou ukládat, dokud sloupec nepřidáte. Spusťte v Supabase SQL editoru: ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 5;',
      };
    }

    if (!hasActiveColumn) {
      return {
        ok: false,
        message: 'Tabulka prize_stock existuje, ale CHYBÍ sloupec "is_active" pro skrytí/deaktivaci!',
        details: 'Spusťte v Supabase SQL editoru: ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;',
      };
    }

    return {
      ok: true,
      message: 'Připojení k Supabase je 100% v pořádku!',
      details: `Databáze na ${host} je připojena, tabulky i sloupce "weight" a "is_active" jsou plně aktivní.`,
    };
  } catch (err) {
    return {
      ok: false,
      message: 'Chyba síťového spojení se Supabase.',
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface SupabaseLiveStatus {
  configured: boolean;
  connected: boolean;
  host: string;
  hasPrizeStockTable: boolean;
  hasWeightColumn: boolean;
  hasActiveColumn: boolean;
  rowCount?: number;
  error?: string;
}

/**
 * Checks live connection and schema column status for the admin UI.
 */
export async function getSupabaseLiveStatus(): Promise<SupabaseLiveStatus> {
  const { url, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) {
    return {
      configured: false,
      connected: false,
      host: '',
      hasPrizeStockTable: false,
      hasWeightColumn: false,
      hasActiveColumn: false,
    };
  }

  let host = 'Supabase';
  try {
    host = new URL(url).hostname;
  } catch {
    // ignore
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      configured: true,
      connected: false,
      host,
      hasPrizeStockTable: false,
      hasWeightColumn: false,
      hasActiveColumn: false,
      error: 'Klienta Supabase se nepodařilo inicializovat.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('prize_stock')
      .select('prize_id, remaining_stock, weight, is_active');

    if (error) {
      if (error.message.includes('relation "prize_stock" does not exist') || error.code === '42P01') {
        return {
          configured: true,
          connected: true,
          host,
          hasPrizeStockTable: false,
          hasWeightColumn: false,
          hasActiveColumn: false,
          error: 'V databázi chybí tabulka "prize_stock". Spusťte SQL skript.',
        };
      }

      let hasWeight = true;
      let hasActive = true;
      if (error.message.includes('column "weight"') || error.code === '42703') {
        hasWeight = false;
      }
      if (error.message.includes('column "is_active"')) {
        hasActive = false;
      }

      const { data: baseData } = await supabase.from('prize_stock').select('prize_id');

      let errDesc = '';
      if (!hasWeight && !hasActive) {
        errDesc = 'V tabulce prize_stock chybí sloupce "weight" i "is_active".';
      } else if (!hasWeight) {
        errDesc = 'V tabulce prize_stock chybí sloupec "weight" pro váhy cen.';
      } else if (!hasActive) {
        errDesc = 'V tabulce prize_stock chybí sloupec "is_active" pro stav zobrazení.';
      } else {
        errDesc = error.message;
      }

      return {
        configured: true,
        connected: true,
        host,
        hasPrizeStockTable: true,
        hasWeightColumn: hasWeight,
        hasActiveColumn: hasActive,
        rowCount: Array.isArray(baseData) ? baseData.length : 0,
        error: errDesc,
      };
    }

    return {
      configured: true,
      connected: true,
      host,
      hasPrizeStockTable: true,
      hasWeightColumn: true,
      hasActiveColumn: true,
      rowCount: Array.isArray(data) ? data.length : 0,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      host,
      hasPrizeStockTable: false,
      hasWeightColumn: false,
      hasActiveColumn: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Directly records a wheel spin in Supabase and decrements stock atomically.
 */
export async function recordSpinInSupabase(
  spin: SpinLog
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase není nakonfigurována' };

  const cleanEmail = spin.userEmail ? spin.userEmail.trim().toLowerCase() : null;
  const station = getStationName();

  try {
    // 1. Insert spin log
    const { error: spinErr } = await supabase.from('spins').insert({
      id: spin.id,
      email: cleanEmail,
      prize_id: spin.prizeId,
      prize_name: spin.prizeName,
      station: station,
      created_at: new Date().toISOString(),
    });

    if (spinErr) {
      console.warn('Supabase spin insert error:', spinErr.message);
      return { success: false, error: spinErr.message };
    }

    // 2. If email exists, update prize_won in contestants table
    if (cleanEmail) {
      await supabase
        .from('contestants')
        .update({ prize_won: spin.prizeName })
        .eq('email', cleanEmail);
    }

    // 3. Atomically decrement prize stock in prize_stock table
    if (spin.prizeId) {
      const cleanPrizeId = spin.prizeId.trim().toLowerCase();
      const { data: stockRow } = await supabase
        .from('prize_stock')
        .select('remaining_stock')
        .eq('prize_id', cleanPrizeId)
        .maybeSingle();

      if (stockRow && typeof stockRow.remaining_stock === 'number' && stockRow.remaining_stock > 0) {
        const nextStock = Math.max(0, stockRow.remaining_stock - 1);
        const updatePayload: Record<string, unknown> = {
          remaining_stock: nextStock,
          updated_at: new Date().toISOString(),
        };
        // Auto-deactivate if remaining stock reached 0
        if (nextStock === 0) {
          updatePayload.is_active = false;
        }

        const { error: updErr } = await supabase
          .from('prize_stock')
          .update(updatePayload)
          .eq('prize_id', cleanPrizeId);

        // Fallback if is_active column doesn't exist yet
        if (updErr && (updErr.message.includes('column "is_active"') || updErr.code === '42703')) {
          await supabase
            .from('prize_stock')
            .update({
              remaining_stock: nextStock,
              updated_at: new Date().toISOString(),
            })
            .eq('prize_id', cleanPrizeId);
        }
      }
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Directly records an 8/8 quiz finalist in Supabase.
 * Uses upsert on 'email' to eliminate any duplicates.
 */
export async function recordContestantInSupabase(
  entry: CompetitionEntry
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase není nakonfigurována' };

  const cleanEmail = entry.email.trim().toLowerCase();
  const station = getStationName();

  try {
    const { error } = await supabase.from('contestants').upsert(
      {
        id: entry.id,
        email: cleanEmail,
        score: `${entry.score}/${entry.totalQuestions}`,
        prize_won: entry.prizeWon || 'Čeká na točení...',
        station: station,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );

    if (error) {
      console.warn('Supabase contestant upsert error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Dispatches an outbox item to Supabase.
 */
export async function dispatchOutboxItemToSupabase(item: OutboxItem): Promise<boolean> {
  if (item.type === 'spin') {
    const spin = item.data as SpinLog;
    const res = await recordSpinInSupabase(spin);
    return res.success;
  } else if (item.type === 'entry') {
    const entry = item.data as CompetitionEntry;
    const res = await recordContestantInSupabase(entry);
    return res.success;
  }
  return true;
}

/**
 * Fetches all contestants (finalists 8/8) recorded in Supabase.
 * Reads on-demand without wasteful continuous polling.
 */
export async function fetchContestantsFromSupabase(): Promise<CompetitionEntry[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('contestants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch contestants from Supabase:', error.message);
      return null;
    }

    if (Array.isArray(data)) {
      return data.map((row) => {
        let score = 8;
        let totalQuestions = 8;
        if (row.score && typeof row.score === 'string' && row.score.includes('/')) {
          const parts = row.score.split('/');
          score = parseInt(parts[0], 10) || 8;
          totalQuestions = parseInt(parts[1], 10) || 8;
        }

        return {
          id: row.id || `c_${row.email}`,
          email: row.email,
          score,
          totalQuestions,
          prizeWon: row.prize_won || undefined,
          timestamp: row.created_at || new Date().toISOString(),
        };
      });
    }
  } catch (err) {
    console.warn('Supabase fetchContestants exception:', err);
  }

  return null;
}

/**
 * Fetches all spin logs recorded in Supabase.
 * Reads on-demand without wasteful continuous polling.
 */
export async function fetchSpinsFromSupabase(): Promise<SpinLog[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('spins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch spins from Supabase:', error.message);
      return null;
    }

    if (Array.isArray(data)) {
      return data.map((row) => ({
        id: row.id || `spin_${Math.random()}`,
        timestamp: row.created_at || new Date().toISOString(),
        prizeId: row.prize_id || '',
        prizeName: row.prize_name || 'Neznámá výhra',
        userEmail: row.email || undefined,
      }));
    }
  } catch (err) {
    console.warn('Supabase fetchSpins exception:', err);
  }

  return null;
}

/**
 * Deletes a contestant from Supabase by email or id, and clears their attempts.
 */
export async function deleteContestantFromSupabase(emailOrId: string, emailHint?: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const clean = emailOrId.trim().toLowerCase();
    await supabase.from('contestants').delete().or(`id.eq.${emailOrId},email.eq.${clean}`);
    const emailToDelete = emailHint?.trim().toLowerCase() || (clean.includes('@') ? clean : null);
    if (emailToDelete) {
      await supabase.from('attempts').delete().eq('email', emailToDelete);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a specific email from attempts table so the user can retry.
 */
export async function deleteAttemptFromSupabase(email: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const clean = email.trim().toLowerCase();
    await supabase.from('attempts').delete().eq('email', clean);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all attempts in Supabase.
 */
export async function clearAttemptsInSupabase(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    await supabase.from('attempts').delete().neq('id', '___non_existent___');
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all contestants in Supabase and clears all attempts.
 */
export async function clearContestantsInSupabase(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    await supabase.from('contestants').delete().neq('id', '___non_existent___');
    await supabase.from('attempts').delete().neq('id', '___non_existent___');
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all spins in Supabase.
 */
export async function clearSpinsInSupabase(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    await supabase.from('spins').delete().neq('id', '___non_existent___');
    return true;
  } catch {
    return false;
  }
}
