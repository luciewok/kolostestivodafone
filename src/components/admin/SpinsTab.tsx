import React, { useState } from 'react';
import { SpinLog } from '../../types';
import { Search, Download, Trash2, History, RefreshCw, Database } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { isSupabaseConfigured } from '../../services/supabase';

interface SpinsTabProps {
  spins: SpinLog[];
  onClearSpins: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSyncFromSupabase?: () => Promise<{ count: number; error?: string }>;
}

export const SpinsTab: React.FC<SpinsTabProps> = ({
  spins,
  onClearSpins,
  onShowToast,
  onSyncFromSupabase,
}) => {
  const [search, setSearch] = useState('');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const hasSupabase = isSupabaseConfigured();

  const handleSyncSupabase = async () => {
    if (!onSyncFromSupabase) return;
    setIsSyncing(true);
    const res = await onSyncFromSupabase();
    setIsSyncing(false);
    if (res.error) {
      onShowToast(res.error, 'error');
    } else {
      onShowToast(`Ze Supabase bylo načteno ${res.count} záznamů o točení kola.`, 'success');
    }
  };

  const filteredSpins = spins.filter(
    (s) =>
      s.prizeName.toLowerCase().includes(search.toLowerCase()) ||
      s.timestamp.includes(search)
  );

  const handleExportCSV = () => {
    if (spins.length === 0) {
      onShowToast('Historie točení je prázdná, není co exportovat.', 'info');
      return;
    }

    const headers = ['ID', 'Čas roztočení', 'E-mail soutěžícího', 'ID Výhry', 'Název výhry'];
    const rows = spins.map((s) => [
      `"${s.id}"`,
      `"${new Date(s.timestamp).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })}"`,
      `"${s.userEmail || ''}"`,
      `"${s.prizeId}"`,
      `"${s.prizeName.replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pixel_spins_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Historie točení byla exportována do CSV.', 'success');
  };

  const handleConfirmClear = () => {
    onClearSpins();
    setClearConfirmOpen(false);
    onShowToast('Historie točení byla kompletně promazána.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Vyhledat v historii..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#e5a995]"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Nalezeno: {filteredSpins.length} z {spins.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasSupabase && onSyncFromSupabase && (
            <button
              onClick={handleSyncSupabase}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              title="Stáhne aktuální data točení ze Supabase databáze ze všech zařízení"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Načítám...' : 'Načíst ze Supabase'}
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportovat CSV
          </button>
          <button
            onClick={() => setClearConfirmOpen(true)}
            disabled={spins.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Smazat historii
          </button>
        </div>
      </div>

      {/* Spins Log Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {filteredSpins.length > 0 ? (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400 sticky top-0 backdrop-blur-sm z-10">
                <tr>
                  <th className="py-3 px-4">Čas točení</th>
                  <th className="py-3 px-4">Soutěžící (E-mail)</th>
                  <th className="py-3 px-4">Vytočená výhra</th>
                  <th className="py-3 px-4 text-right">Záznam ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSpins.map((spin) => (
                  <tr key={spin.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-slate-300">
                      {spin.timestamp.includes('T') || !spin.timestamp.includes(':')
                        ? new Date(spin.timestamp).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })
                        : spin.timestamp}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-[#e5a995]">
                      {spin.userEmail || <span className="text-slate-500 italic">Nepřiřazeno</span>}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {spin.prizeName}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-mono text-slate-500">
                      {spin.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <History className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#e5a995]" />
            <p className="text-sm font-medium">Žádné záznamy o roztočení</p>
            <p className="text-xs text-slate-500 mt-1">
              {search ? 'Zkuste upravit vyhledávací dotaz.' : 'Jakmile návštěvníci roztočí kolo, záznamy se objeví zde.'}
            </p>
          </div>
        )}
      </div>

      {/* Clear Confirmation */}
      <ConfirmModal
        isOpen={clearConfirmOpen}
        title="Smazat celou historii točení?"
        message="Všechny zaznamenané statistiky roztočení kola budou nenávratně odstraněny ze zařízení i offline databáze."
        confirmLabel="Smazat historii"
        variant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </div>
  );
};
