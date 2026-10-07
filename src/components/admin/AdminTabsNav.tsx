import React from 'react';
import { Gift, History, Mail, HelpCircle, Settings as SettingsIcon } from 'lucide-react';

export type AdminTabType = 'prizes' | 'spins' | 'contestants' | 'questions' | 'settings';

interface AdminTabsNavProps {
  activeTab: AdminTabType;
  onSelectTab: (tab: AdminTabType) => void;
  contestantsCount: number;
  spinsCount: number;
}

export const AdminTabsNav: React.FC<AdminTabsNavProps> = ({
  activeTab,
  onSelectTab,
  contestantsCount,
  spinsCount,
}) => {
  const tabs = [
    { id: 'prizes' as AdminTabType, label: 'Výhry', icon: Gift },
    { id: 'spins' as AdminTabType, label: 'Historie točení', icon: History, count: spinsCount },
    { id: 'contestants' as AdminTabType, label: 'Soutěžící', icon: Mail, count: contestantsCount },
    { id: 'questions' as AdminTabType, label: 'Kvíz', icon: HelpCircle },
    { id: 'settings' as AdminTabType, label: 'Nastavení', icon: SettingsIcon },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-2xl overflow-x-auto scrollbar-none mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-[#e5a995] to-[#d68c74] text-slate-950 font-semibold shadow-md shadow-orange-950/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-black/20 text-slate-950 font-bold' : 'bg-white/10 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
