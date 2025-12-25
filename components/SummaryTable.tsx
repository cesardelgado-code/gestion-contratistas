
import React, { useState, useMemo } from 'react';
import { Contractor, AppState } from '../types';
import { CHECKLIST_ITEMS } from '../constants';

interface SummaryTableProps {
  contractors: Contractor[];
  appState: AppState;
}

const SummaryTable: React.FC<SummaryTableProps> = ({ contractors, appState }) => {
  const [filter, setFilter] = useState('');
  
  const filtered = useMemo(() => 
    contractors.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
  , [contractors, filter]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px] no-print">
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Matriz General</h3>
        <input 
          type="text" 
          placeholder="Buscar..." 
          className="px-3 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      <div className="overflow-auto flex-grow">
        <table className="w-full text-left text-[10px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="p-3 border-b sticky left-0 bg-white z-20 min-w-[180px]">Contratista</th>
              <th className="p-3 border-b text-center">%</th>
              {CHECKLIST_ITEMS.map(i => (
                <th key={i.id} className="p-3 border-b text-center whitespace-nowrap" title={i.label}>{i.id.replace('s','').replace('_','.')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const status = appState[c.id] || {};
              const progress = Math.round((Object.values(status).filter(Boolean).length / CHECKLIST_ITEMS.length) * 100);
              return (
                <tr key={c.id} className="hover:bg-slate-50 group">
                  <td className="p-3 border-b sticky left-0 bg-white group-hover:bg-slate-50 font-bold uppercase">{c.name}</td>
                  <td className="p-3 border-b text-center font-black text-emerald-600">{progress}%</td>
                  {CHECKLIST_ITEMS.map(i => (
                    <td key={i.id} className="p-3 border-b text-center">
                      {status[i.id] ? '✅' : '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SummaryTable;
