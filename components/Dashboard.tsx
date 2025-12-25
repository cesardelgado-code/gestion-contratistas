
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AppState, Contractor } from '../types';
import { CHECKLIST_ITEMS } from '../constants';

interface DashboardProps {
  contractors: Contractor[];
  appState: AppState;
}

const Dashboard: React.FC<DashboardProps> = ({ contractors, appState }) => {
  const totalItems = CHECKLIST_ITEMS.length;

  const stats = useMemo(() => {
    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;
    let totalDoneItems = 0;

    const contractorProgress = contractors.map(c => {
      const itemsDone = Object.values(appState[c.id] || {}).filter(Boolean).length;
      const progress = Math.round((itemsDone / totalItems) * 100);
      
      totalDoneItems += itemsDone;
      if (progress === 100) completedCount++;
      else if (progress > 0) inProgressCount++;
      else notStartedCount++;

      return {
        name: c.name.split(' ')[0],
        progress
      };
    });

    const globalAvg = Math.round((totalDoneItems / (contractors.length * totalItems)) * 100);

    return {
      globalAvg,
      completedCount,
      inProgressCount,
      notStartedCount,
      chartData: contractorProgress.slice(0, 15)
    };
  }, [contractors, appState, totalItems]);

  return (
    <div className="space-y-6 mb-8 no-print">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Progreso Total</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-emerald-600">{stats.globalAvg}%</span>
            <span className="text-[10px] text-slate-400 mb-1.5 font-medium">Global</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${stats.globalAvg}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Listos 100%</p>
          <span className="text-3xl font-black text-slate-800">{stats.completedCount}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">En Proceso</p>
          <span className="text-3xl font-black text-slate-800">{stats.inProgressCount}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sin Iniciar</p>
          <span className="text-3xl font-black text-slate-800">{stats.notStartedCount}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
