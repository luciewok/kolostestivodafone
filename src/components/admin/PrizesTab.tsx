import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Prize, SpinLog } from '../../types';
import {
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Package,
  AlertCircle,
  Check,
  Cloud,
  CloudUpload,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import { resolvePrizeImage } from '../../utils/storage';
import { PrizeEditModal } from './PrizeEditModal';
import { ConfirmModal } from './ConfirmModal';
import { fetchLiveStockFromGoogleSheets, pushStockToGoogleSheets } from '../../services/googleSheets';
import { isSupabaseConfigured, getSupabaseLiveStatus, SupabaseLiveStatus } from '../../services/supabase';

interface PrizesTabProps {
  prizes: Prize[];
  spins: SpinLog[];
  onUpdatePrizes: (prizes: Prize[]) => void;
  onResetPrizes: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PrizesTab: React.FC<PrizesTabProps> = ({
  prizes,
  spins,
  onUpdatePrizes,
  onResetPrizes,
  onShowToast,
}) => {
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deletePrizeId, setDeletePrizeId] = useState<string | null>(null);
  const [isSyncingStock, setIsSyncingStock] = useState(false);
  const [isFetchingFromDb, setIsFetchingFromDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<SupabaseLiveStatus | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Check database live connection and schema status
  const checkDatabaseConnection = useCallback(async () => {
    try {
      const status = await getSupabaseLiveStatus();
      setDbStatus(status);
    } catch {
      // ignore
    }
  }, []);

  // Auto-fetch latest stock, weights, and active states from Supabase in background on mount
  useEffect(() => {
    checkDatabaseConnection();
    fetchLiveStockFromGoogleSheets().then((stockMap) => {
      if (stockMap && Object.keys(stockMap).length > 0) {
        // If newly added prizes (Batoh, Čepice) are missing in Supabase, auto-push them
        const missingInRemote = prizes.some((p) => p.id && !stockMap[p.id]);
        if (missingInRemote) {
          pushStockToGoogleSheets(prizes).catch(() => {});
        }

        let hasDiff = false;
        const updated = prizes.map((p) => {
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

          // Crucial: If stock <= 0, automatically deactivate. Otherwise sync remote.isActive if provided.
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
          onUpdatePrizes(updated);
        }
      }
    });
  }, [checkDatabaseConnection]);

  const handleManualSyncStock = async () => {
    setIsSyncingStock(true);
    const res = await pushStockToGoogleSheets(prizes);
    await checkDatabaseConnection();
    setIsSyncingStock(false);
    if (res.success) {
      if (res.missingWeightColumn) {
        onShowToast(
          'Sklad propsán, ale v Supabase CHYBÍ sloupec "weight"! Váhy se do databáze nemohly propsat. Spusťte SQL příkaz v záhlaví.',
          'error'
        );
      } else if (res.missingActiveColumn) {
        onShowToast(
          'Sklad i váhy propsány, ale chybí sloupec "is_active". Spusťte v Supabase: ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;',
          'info'
        );
      } else if (res.cleanedCount && res.cleanedCount > 0) {
        onShowToast(
          `Všech ${prizes.length} cen (sklad, váhy i stav zobrazení) úspěšně propsáno do Supabase (${res.cleanedCount} starých záznamů vyčištěno).`,
          'success'
        );
      } else {
        onShowToast(`Všech ${prizes.length} cen (sklad, váhy i stavy zobrazení) bylo úspěšně propsáno do Supabase.`, 'success');
      }
    } else {
      onShowToast(res.error || 'Chyba při odesílání skladu do Supabase.', 'error');
    }
  };

  const handleFetchFromSupabase = async () => {
    setIsFetchingFromDb(true);
    const stockMap = await fetchLiveStockFromGoogleSheets();
    await checkDatabaseConnection();
    setIsFetchingFromDb(false);
    if (stockMap && Object.keys(stockMap).length > 0) {
      let changeCount = 0;
      const updated = prizes.map((p) => {
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
          changeCount++;
          return { ...p, stock: newStock, weight: newWeight, active: newActive };
        }
        return p;
      });
      if (changeCount > 0) {
        onUpdatePrizes(updated);
        onShowToast(`Ze Supabase bylo načteno a aktualizováno ${changeCount} položek.`, 'success');
      } else {
        onShowToast('Data na webu i v Supabase jsou již v synchronizovaném stavu.', 'info');
      }
    } else {
      onShowToast('Z databáze Supabase se nepodařilo načíst žádná data.', 'error');
    }
  };

  const handleSavePrize = async (saved: Prize) => {
    const exists = prizes.some((p) => p.id === saved.id);
    let updated: Prize[];
    if (exists) {
      updated = prizes.map((p) => (p.id === saved.id ? saved : p));
      onShowToast('Výhra byla úspěšně upravena.', 'success');
    } else {
      updated = [...prizes, saved];
      onShowToast('Nová výhra byla přidána.', 'success');
    }
    onUpdatePrizes(updated);
    const res = await pushStockToGoogleSheets(updated);
    if (!res.success && res.error) {
      onShowToast(res.error, 'error');
    } else if (res.missingWeightColumn) {
      onShowToast(
        'Výhra uložena lokálně. V Supabase chybí sloupec "weight"! Spusťte SQL příkaz v záhlaví.',
        'error'
      );
    }
  };

  const handleToggleActive = async (id: string) => {
    let blockedByStock = false;
    const updated = prizes.map((p) => {
      if (p.id === id) {
        const nextActive = !p.active;
        if (nextActive && typeof p.stock === 'number' && p.stock <= 0) {
          blockedByStock = true;
          return p;
        }
        return { ...p, active: nextActive };
      }
      return p;
    });

    if (blockedByStock) {
      onShowToast('Výhra má 0 ks skladem. Před jejím zobrazením na kole nejprve doplňte sklad.', 'warning');
      return;
    }

    onUpdatePrizes(updated);
    const res = await pushStockToGoogleSheets(updated);
    if (res.missingActiveColumn) {
      onShowToast(
        'Stav změněn. Tip: Pro synchronizaci skrytí spusťte v Supabase: ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;',
        'info'
      );
    } else if (res.success && isSupabaseConfigured()) {
      onShowToast('Stav zobrazení výhry propsán do Supabase.', 'success');
    }
  };

  const handleStockQuickChange = async (id: string, newStock: number) => {
    const val = Math.max(0, newStock);
    const targetPrize = prizes.find((p) => p.id === id);
    // If stock drops to 0, automatically deactivate. If stock rises above 0 from 0, automatically reactivate!
    const autoActive = val === 0 ? false : targetPrize ? targetPrize.active || true : true;

    const updated = prizes.map((p) =>
      p.id === id ? { ...p, stock: val, active: autoActive } : p
    );
    onUpdatePrizes(updated);
    const res = await pushStockToGoogleSheets(updated);

    if (val === 0) {
      onShowToast('Sklad je 0 – výhra byla automaticky skryta a vyřazena z kola štěstí.', 'info');
    } else if (targetPrize && targetPrize.stock === 0 && val > 0) {
      onShowToast(`Sklad navýšen (${val} ks) – výhra byla opět aktivována pro kolo štěstí.`, 'success');
    } else if (!res.success && res.error) {
      onShowToast(res.error, 'error');
    } else if (res.success && isSupabaseConfigured()) {
      onShowToast('Sklad propsán do Supabase.', 'success');
    }
  };

  const handleWeightQuickChange = async (id: string, newWeight: number) => {
    const val = Math.max(1, Math.min(100, newWeight));
    const targetPrize = prizes.find((p) => p.id === id);
    const updated = prizes.map((p) => (p.id === id ? { ...p, weight: val } : p));
    onUpdatePrizes(updated);
    const res = await pushStockToGoogleSheets(updated);

    if (!res.success && res.error) {
      onShowToast(res.error, 'error');
    } else if (res.missingWeightColumn) {
      onShowToast(
        'Váha nastavena, ale v Supabase CHYBÍ sloupec "weight"! Klikněte na "Kopírovat SQL" v záhlaví.',
        'error'
      );
    } else if (res.success && isSupabaseConfigured()) {
      onShowToast(`Váha pro "${targetPrize?.name || id}" nastavena na ${val}x a uložena do Supabase.`, 'success');
    }
  };

  const copyWeightFixSql = () => {
    const sql = `ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 5;\nALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`;
    navigator.clipboard.writeText(sql).then(() => {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 3000);
      onShowToast('Příkaz pro přidání sloupce vah (weight) byl zkopírován do schránky!', 'success');
    });
  };

  const confirmDelete = () => {
    if (!deletePrizeId) return;
    const updated = prizes.filter((p) => p.id !== deletePrizeId);
    onUpdatePrizes(updated);
    pushStockToGoogleSheets(updated).catch(() => {});
    setDeletePrizeId(null);
    onShowToast('Výhra byla odebrána.', 'info');
  };

  const confirmReset = () => {
    onResetPrizes();
    setResetConfirmOpen(false);
    onShowToast('Výhry byly obnoveny do výchozího stavu.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Live Supabase Connection & Schema Diagnostic Card */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Propojení s databází Supabase
                </h4>
                {dbStatus?.configured ? (
                  dbStatus.hasPrizeStockTable && dbStatus.hasWeightColumn ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      100% Propojeno a funkční
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-3 h-3" />
                      Chybí sloupce v databázi
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <AlertCircle className="w-3 h-3" />
                    Nepřipojeno
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                {dbStatus?.host ? `Hostitel: ${dbStatus.host}` : 'Připojení není nastaveno (vyplňte URL v Nastavení)'}
                {typeof dbStatus?.rowCount === 'number' && ` • Tabulka prize_stock: ${dbStatus.rowCount} položek`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFetchFromSupabase}
              disabled={isFetchingFromDb || !isSupabaseConfigured()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
              title="Stáhne aktuální počty kusů a váhy z databáze Supabase do této tabulky"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFromDb ? 'animate-spin' : ''}`} />
              <span>{isFetchingFromDb ? 'Načítám...' : 'Načíst z databáze'}</span>
            </button>
            <button
              onClick={handleManualSyncStock}
              disabled={isSyncingStock || !isSupabaseConfigured()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              title="Odešle aktuální počty kusů, váhy i stav zobrazení všech výher do tabulky prize_stock v Supabase"
            >
              <CloudUpload className={`w-3.5 h-3.5 ${isSyncingStock ? 'animate-bounce' : ''}`} />
              <span>{isSyncingStock ? 'Ukládám do Supabase...' : 'Odeslat sklad a váhy do Supabase'}</span>
            </button>
          </div>
        </div>

        {/* Column status badges */}
        {dbStatus?.configured && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-[11px]">
            <span className="text-slate-400 font-medium">Stav sloupců v databázi:</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono ${
              dbStatus.hasPrizeStockTable ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'
            }`}>
              {dbStatus.hasPrizeStockTable ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              tabulka: prize_stock
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono ${
              dbStatus.hasWeightColumn ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'
            }`}>
              {dbStatus.hasWeightColumn ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3 text-red-400" />}
              sloupec: weight (váhy) {dbStatus.hasWeightColumn ? 'OK' : 'CHYBÍ'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono ${
              dbStatus.hasActiveColumn ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
            }`}>
              {dbStatus.hasActiveColumn ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
              sloupec: is_active (zobrazení) {dbStatus.hasActiveColumn ? 'OK' : 'CHYBÍ'}
            </span>
          </div>
        )}

        {/* Warning & 1-click SQL fix if weight or active column is missing in Supabase */}
        {dbStatus?.configured && (!dbStatus.hasWeightColumn || !dbStatus.hasActiveColumn) && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200">
                <p className="font-bold">
                  {!dbStatus.hasWeightColumn
                    ? 'V databázi Supabase chybí sloupec "weight" pro váhy cen!'
                    : 'V databázi Supabase chybí sloupec "is_active" pro skrytí cen!'}
                </p>
                <p className="text-amber-300/80 text-[11px] mt-0.5">
                  Proto se váhy ani stavy do Supabase nemohou uložit. Stačí zkopírovat tento příkaz a spustit jej v Supabase v sekci <strong>SQL Editor</strong>:
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-300 overflow-x-auto select-all">
                ALTER TABLE prize_stock ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 5;
              </code>
              <button
                onClick={copyWeightFixSql}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
              >
                {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{sqlCopied ? 'Zkopírováno!' : 'Kopírovat SQL'}</span>
              </button>
            </div>
          </div>
        )}

        {!isSupabaseConfigured() && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Databáze Supabase není nakonfigurována. Veškeré změny skladu a vah se ukládají pouze do tohoto prohlížeče.
              </span>
            </div>
            <span className="text-[11px] text-rose-400/80 font-medium">Zadejte URL a klíč v záložce Nastavení</span>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
        <div>
          <h3 className="text-lg font-bold text-white">Správa výher</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Definujte položky na kole štěstí, pravděpodobnostní váhy a skladové zásoby (synchronizováno do Supabase).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Výchozí výhry
          </button>
          <button
            onClick={() => {
              setEditingPrize(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#e5a995] to-[#d68c74] text-slate-950 shadow-md shadow-orange-950/20 hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Přidat výhru
          </button>
        </div>
      </div>

      {/* Prizes Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/30 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Položka</th>
                <th className="py-3.5 px-3 text-center">Náhled</th>
                <th className="py-3.5 px-3 text-center" title="Pravděpodobnostní váha: vyšší číslo = vyšší šance na vytočení">
                  Váha (šance)
                </th>
                <th className="py-3.5 px-3 text-center">Sklad</th>
                <th className="py-3.5 px-3 text-center">Stav</th>
                <th className="py-3.5 px-4 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {prizes.map((p) => {
                const img = resolvePrizeImage(p);
                const isOutOfStock = p.stock !== undefined && p.stock !== null && p.stock <= 0;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      !p.active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <div>
                          <p className="font-semibold text-white">{p.name}</p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#e5a995]/15 text-[#e5a995] border border-[#e5a995]/25">
                            Kód ID: {p.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {img ? (
                        <div className="w-9 h-9 mx-auto rounded-lg bg-white/10 p-1 flex items-center justify-center">
                          <img src={img} alt={p.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>

                    {/* Directly editable Weight with live Supabase sync */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={p.weight}
                          onChange={(e) =>
                            handleWeightQuickChange(p.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-14 px-2 py-1 rounded-lg border text-center font-bold text-xs bg-black/40 border-white/15 text-[#e5a995] focus:outline-none focus:border-[#e5a995] transition-colors"
                          title="Pravděpodobnostní váha výhry (čím vyšší číslo, tím častěji padá na kole)"
                        />
                        <span className="text-xs text-slate-400 font-mono font-bold">x</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      {p.stock !== undefined && p.stock !== null ? (
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={p.stock}
                            onChange={(e) =>
                              handleStockQuickChange(p.id, parseInt(e.target.value, 10) || 0)
                            }
                            className={`w-16 px-2 py-1 rounded-lg border text-center font-bold text-xs focus:outline-none ${
                              isOutOfStock
                                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                : 'bg-black/30 border-white/10 text-white'
                            }`}
                          />
                          <span className="text-xs text-slate-400">ks</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Neomezeno</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(p.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                          p.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}
                      >
                        {p.active ? 'Aktivní' : 'Skrytá'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingPrize(p);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                          title="Upravit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletePrizeId(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Smazat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prize Edit Modal */}
      <PrizeEditModal
        isOpen={isModalOpen}
        prize={editingPrize}
        onSave={handleSavePrize}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPrize(null);
        }}
      />

      {/* Reset Confirmation */}
      <ConfirmModal
        isOpen={resetConfirmOpen}
        title="Obnovit výchozí výhry?"
        message="Všechny upravené výhry a skladové zásoby budou vráceny na výchozí promoční balíček Google Pixel."
        confirmLabel="Obnovit výchozí"
        variant="warning"
        onConfirm={confirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletePrizeId)}
        title="Smazat tuto výhru?"
        message="Opravdu si přejete tuto výhru odebrat z kola štěstí?"
        confirmLabel="Smazat"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletePrizeId(null)}
      />
    </div>
  );
};
