
import React from 'react';
import { CHECKLIST_ITEMS } from '../constants';
import { ContractorStatus } from '../types';

interface ChecklistProps {
  status: ContractorStatus;
  onChange: (itemId: string, checked: boolean) => void;
}

const Checklist: React.FC<ChecklistProps> = ({ status, onChange }) => {
  const s1 = CHECKLIST_ITEMS.filter(i => i.section === 1);
  const s2 = CHECKLIST_ITEMS.filter(i => i.section === 2);

  const renderSection = (title: string, items: typeof CHECKLIST_ITEMS) => (
    <div className="mb-8">
      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">{title}</h4>
      <div className="space-y-3">
        {items.map(item => (
          <label key={item.id} className="group flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={!!status[item.id]}
              onChange={(e) => onChange(item.id, e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="flex-1">
              <p className={`text-sm font-medium transition-colors ${status[item.id] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {item.label}
              </p>
              {item.description && <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
      {renderSection('Sección 1: Básicos', s1)}
      {renderSection('Sección 2: Contractuales', s2)}
    </div>
  );
};

export default Checklist;
