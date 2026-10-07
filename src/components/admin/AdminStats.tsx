import React from 'react';
import { History, CheckCircle, Package, Users, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { GoogleSheetsSyncStatus } from '../../services/googleSheets';

interface AdminStatsProps {
  totalSpins: number;
  activePrizesCount: number;
  outOfStockCount: number;
  totalContestants: number;
  sheetsStatus: GoogleSheetsSyncStatus | null;
  onTriggerSync: () => void;
}

export const AdminStats: React.FC<AdminStatsProps> = ({
  totalSpins,
  activePrizesCount,
  outOfStockCount,
  totalContestants,
  sheetsStatus,
  onTriggerSync,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#e5a995]">
          <History className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Celkem roztočení</p>
          <p className="text-xl font-bold text-white">{totalSpins}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Aktivní výhry</p>
          <p className="text-xl font-bold text-white">{activePrizesCount}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Vyčerpané zásoby</p>
          <p className="text-xl font-bold text-white">{outOfStockCount}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium">Soutěžící / E-maily</p>
          <p className="text-xl font-bold text-white">{totalContestants}</p>
        </div>
      </div>

      <div className="col-span-2 lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              sheetsStatus?.isConfigured
                ? sheetsStatus.pendingCount > 0
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
            }`}
          >
            {sheetsStatus?.isConfigured ? (
              <Cloud className="w-5 h-5" />
            ) : (
              <CloudOff className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">
              {sheetsStatus?.provider === 'supabase'
                ? sheetsStatus.hasBackup
                  ? 'Supabase + G-Sheets'
                  : 'Supabase SQL databáze'
                : sheetsStatus?.provider === 'sheets'
                ? 'Google Sheets (Záložní)'
                : 'Databáze'}
            </p>
            <p className="text-xs font-semibold text-white">
              {sheetsStatus?.isConfigured
                ? sheetsStatus.pendingCount > 0
                  ? `Čeká ${sheetsStatus.pendingCount} k odeslání`
                  : sheetsStatus.provider === 'supabase'
                  ? 'Aktivní (Supabase)'
                  : 'Připojeno'
                : 'Nenastaveno'}
            </p>
          </div>
        </div>

        {sheetsStatus?.isConfigured && (
          <button
            onClick={onTriggerSync}
            disabled={sheetsStatus.isSyncing}
            title="Okamžitě odeslat neuložená data"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${sheetsStatus.isSyncing ? 'animate-spin text-[#e5a995]' : ''}`}
            />
          </button>
        )}
      </div>
    </div>
  );
};
