import React, { useState } from 'react';
import { CompetitionEntry } from '../../types';
import { Search, Download, Trash2, Mail, Trophy, UserCheck, RefreshCw, Database, Sparkles } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { RaffleModal } from './RaffleModal';
import { isSupabaseConfigured } from '../../services/supabase';

interface ContestantsTabProps {
  entries: CompetitionEntry[];
  onDeleteEntry: (id: string) => void;
  onClearEntries: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSyncFromSupabase?: () => Promise<{ count: number; error?: string }>;
}

export const ContestantsTab: React.FC<ContestantsTabProps> = ({
  entries,
  onDeleteEntry,
  onClearEntries,
  onShowToast,
  onSyncFromSupabase,
}) => {
  const [search, setSearch] = useState('');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRaffleOpen, setIsRaffleOpen] = useState(false);

  const hasSupabase = isSupabaseConfigured();

  const handleSyncSupabase = async () => {
    if (!onSyncFromSupabase) return;
    setIsSyncing(true);
    const res = await onSyncFromSupabase();
    setIsSyncing(false);
    if (res.error) {
      onShowToast(res.error, 'error');
    } else {
      onShowToast(`Ze Supabase bylo načteno ${res.count} finalistů (8/8).`, 'success');
    }
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.timestamp.includes(search)
  );

  const handleExportCSV = () => {
    if (entries.length === 0) {
      onShowToast('Seznam soutěžících je prázdný, není co exportovat.', 'info');
      return;
    }

    const headers = ['ID', 'E-mail', 'Čas registrace', 'Skóre v kvízu', 'Celkem otázek'];
    const rows = entries.map((e) => [
      `"${e.id}"`,
      `"${e.email.replace(/"/g, '""')}"`,
      `"${e.timestamp}"`,
      e.score,
      e.totalQuestions,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `pixel_soutezici_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Seznam soutěžících byl exportován do CSV.', 'success');
  };

  const handleConfirmClear = () => {
    onClearEntries();
    setClearConfirmOpen(false);
    onShowToast('Všichni soutěžící byli promazáni.', 'info');
  };

  const handleConfirmDelete = () => {
    if (!deleteEntryId) return;
    onDeleteEntry(deleteEntryId);
    setDeleteEntryId(null);
    onShowToast('Soutěžící byl odebrán.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Vyhledat e-mail nebo datum..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#e5a995]"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Nalezeno: {filteredEntries.length} z {entries.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRaffleOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] hover:opacity-95 shadow-md shadow-orange-950/20 active:scale-[0.98] transition cursor-pointer"
            title="Otevře okno pro náhodné losování výherců ze všech finalistů kvízu"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span>Vylosovat výherce</span>
          </button>

          {hasSupabase && onSyncFromSupabase && (
            <button
              onClick={handleSyncSupabase}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              title="Stáhne aktuální data finalistů ze Supabase databáze ze všech telefonů"
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
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Smazat kontakty
          </button>
        </div>
      </div>

      {/* Contestants Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {filteredEntries.length > 0 ? (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400 sticky top-0 backdrop-blur-sm z-10">
                <tr>
                  <th className="py-3 px-4">E-mail soutěžícího</th>
                  <th className="py-3 px-3 text-center">Výsledek kvízu</th>
                  <th className="py-3 px-4">Čas registrace</th>
                  <th className="py-3 px-4 text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-[#e5a995]" />
                        <span className="font-semibold text-white">{entry.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                        <Trophy className="w-3 h-3" />
                        {entry.score} / {entry.totalQuestions}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-300">
                      {entry.timestamp}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeleteEntryId(entry.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Odstranit kontakt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#e5a995]" />
            <p className="text-sm font-medium">Žádné e-mailové kontakty</p>
            <p className="text-xs text-slate-500 mt-1">
              {search
                ? 'Nenalezen žádný kontakt odpovídající hledání.'
                : 'Po úspěšném vyplnění kvízu se zde budou ukládat kontakty do slosování.'}
            </p>
          </div>
        )}
      </div>

      {/* Clear All Confirmation */}
      <ConfirmModal
        isOpen={clearConfirmOpen}
        title="Smazat všechny soutěžící?"
        message="Všechny nasbírané e-maily a výsledky kvízu budou odstraněny z tohoto zařízení. Pro jistotu doporučujeme nejprve provést Export do CSV."
        confirmLabel="Smazat všechny kontakty"
        variant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setClearConfirmOpen(false)}
      />

      {/* Delete Single Entry Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteEntryId)}
        title="Odebrat kontakt?"
        message="Opravdu chcete tento záznam odebrat ze slosování?"
        confirmLabel="Odebrat"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteEntryId(null)}
      />

      {/* Raffle / Winner Drawing Modal */}
      <RaffleModal
        isOpen={isRaffleOpen}
        onClose={() => setIsRaffleOpen(false)}
        entries={entries}
        onSyncFromSupabase={onSyncFromSupabase}
        onShowToast={onShowToast}
      />
    </div>
  );
};
