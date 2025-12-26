
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CONTRACTORS, CHECKLIST_ITEMS } from './constants';
import { AppState } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Checklist from './components/Checklist';
import SummaryTable from './components/SummaryTable';

// Cambiamos a npoint.io - Suele saltarse filtros corporativos mejor que jsonblob
const CLOUD_PROVIDER = "https://api.npoint.io/bins";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('pnn_v5_data');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [teamId, setTeamId] = useState<string | null>(localStorage.getItem('pnn_v5_team'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'individual' | 'summary'>('individual');
  const [notification, setNotification] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'online' | 'offline' | 'error'>('online');
  
  const lastUpdateRef = useRef<string>(JSON.stringify(appState));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('pnn_v5_data', JSON.stringify(appState));
  }, [appState]);

  const showToast = (msg: string, type: 'error' | 'success' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- MANTENIMIENTO POR ARCHIVO (SOLUCIÓN DEFINITIVA ANTE BLOQUEOS) ---
  const downloadBackup = () => {
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pnn_respaldo_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast("Archivo de respaldo descargado");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm("¿Cargar datos desde el archivo? Esto reemplazará tu progreso actual.")) {
          setAppState(data);
          showToast("Datos cargados desde archivo");
        }
      } catch (err) {
        showToast("Archivo no válido", "error");
      }
    };
    reader.readAsText(file);
  };

  // --- SINCRONIZACIÓN NUBE (NPOINT.IO) ---
  const initCloud = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(CLOUD_PROVIDER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: appState })
      });

      if (!response.ok) throw new Error();
      
      const result = await response.json();
      if (result.id) {
        setTeamId(result.id);
        localStorage.setItem('pnn_v5_team', result.id);
        lastUpdateRef.current = JSON.stringify(appState);
        setCloudStatus('online');
        showToast("¡Nube activada correctamente!");
      }
    } catch (err) {
      setCloudStatus('error');
      showToast("Bloqueo de Red: Usa 'Guardar Archivo' para transferir datos.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncPull = async () => {
    if (!teamId || isSyncing) return;
    try {
      const response = await fetch(`${CLOUD_PROVIDER}/${teamId}`);
      if (response.ok) {
        const result = await response.json();
        const dataStr = JSON.stringify(result.contents);
        if (dataStr !== lastUpdateRef.current) {
          setAppState(result.contents);
          lastUpdateRef.current = dataStr;
          setCloudStatus('online');
        }
      }
    } catch (e) {
      setCloudStatus('offline');
    }
  };

  const syncPush = async () => {
    if (!teamId) return;
    const currentStr = JSON.stringify(appState);
    if (currentStr === lastUpdateRef.current) return;

    setIsSyncing(true);
    try {
      const response = await fetch(`${CLOUD_PROVIDER}/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: appState })
      });
      if (response.ok) {
        lastUpdateRef.current = currentStr;
        setCloudStatus('online');
      }
    } catch (e) {
      setCloudStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => syncPush(), 3000);
    return () => clearTimeout(timer);
  }, [appState]);

  useEffect(() => {
    if (!teamId) return;
    const interval = setInterval(() => syncPull(), 15000);
    return () => clearInterval(interval);
  }, [teamId]);

  // --- RENDER ---
  const selectedContractor = useMemo(() => CONTRACTORS.find(c => c.id === selectedId), [selectedId]);

  const handleToggle = (itemId: string, checked: boolean) => {
    if (!selectedId) return;
    setAppState(prev => ({
      ...prev,
      [selectedId]: { ...(prev[selectedId] || {}), [itemId]: checked }
    }));
  };

  const calculateProgress = (id: string) => {
    const status = appState[id] || {};
    const total = CHECKLIST_ITEMS.length;
    const done = Object.values(status).filter(Boolean).length;
    return Math.round((done / total) * 100);
  };

  return (
    <Layout>
      {notification && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full text-[10px] font-black shadow-2xl z-[100] animate-bounce uppercase tracking-widest border-2 ${
          notification.type === 'error' ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-900 border-emerald-500 text-white'
        }`}>
          {notification.msg}
        </div>
      )}

      <div className="space-y-6 no-print">
        {/* BARRA DE HERRAMIENTAS MULTIMODO */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-emerald-900 text-white p-3.5 rounded-2xl shadow-lg rotate-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-1">PNN Auditor</h2>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setView('individual')} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase ${view === 'individual' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-400'}`}>Checklist</button>
                <button onClick={() => setView('summary')} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase ${view === 'summary' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-400'}`}>Matriz</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* OPCIONES DE ARCHIVO (Offline Safe) */}
            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
              <button onClick={downloadBackup} className="px-4 py-2 hover:bg-white rounded-xl text-[8px] font-black uppercase transition-all flex items-center gap-2">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Guardar Archivo
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 hover:bg-white rounded-xl text-[8px] font-black uppercase transition-all flex items-center gap-2">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Cargar
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json" />
            </div>

            {/* OPCIONES DE NUBE (Online) */}
            {!teamId ? (
              <button onClick={initCloud} disabled={isSyncing} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[9px] font-black hover:bg-emerald-700 transition-all uppercase shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50">
                {isSyncing ? 'Conectando...' : 'Compartir en Nube'}
              </button>
            ) : (
              <div className={`flex items-center gap-4 px-5 py-2.5 rounded-2xl shadow-xl border transition-all ${cloudStatus === 'online' ? 'bg-slate-900 border-emerald-500/50' : 'bg-red-900 border-red-500/50'}`}>
                <div className="flex flex-col">
                  <span className={`text-[7px] font-black uppercase tracking-widest mb-0.5 ${cloudStatus === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {cloudStatus === 'online' ? 'Nube Conectada' : 'Nube Bloqueda'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-white">{teamId}</span>
                </div>
                <button onClick={() => { setTeamId(null); localStorage.removeItem('pnn_v5_team'); }} className="p-1.5 text-white/30 hover:text-red-400 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <Dashboard contractors={CONTRACTORS} appState={appState} />

        {view === 'individual' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Lista Lateral */}
            <div className="lg:col-span-4 bg-white rounded-[2.5rem] border border-slate-200 h-[650px] overflow-hidden flex flex-col shadow-sm">
              <div className="p-6 bg-slate-50/80 border-b">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Listado de Personal</p>
              </div>
              <div className="flex-grow overflow-y-auto divide-y divide-slate-100">
                {CONTRACTORS.map(c => {
                  const prog = calculateProgress(c.id);
                  const isSelected = selectedId === c.id;
                  return (
                    <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full p-5 text-left transition-all relative ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600"></div>}
                      <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-bold uppercase truncate pr-4 ${isSelected ? 'text-emerald-900' : 'text-slate-600'}`}>{c.name}</span>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${prog === 100 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{prog}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Checklist Detallado */}
            <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden min-h-[650px] shadow-sm flex flex-col">
              {selectedContractor ? (
                <>
                  <div className="p-10 bg-gradient-to-br from-emerald-900 to-slate-900 text-white flex justify-between items-center shadow-2xl relative">
                    <div className="relative z-10">
                      <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-3">Expediente Contratista</p>
                      <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">{selectedContractor.name}</h3>
                      <span className="inline-block bg-white/10 px-3 py-1 rounded-full text-[9px] font-bold uppercase border border-white/10">Persona Natural</span>
                    </div>
                    <div className="bg-white/10 p-6 rounded-[2rem] text-center backdrop-blur-3xl border border-white/20 shadow-2xl relative z-10 min-w-[120px]">
                      <p className="text-4xl font-black leading-none">{calculateProgress(selectedContractor.id)}%</p>
                      <p className="text-[9px] font-black opacity-60 uppercase mt-2 tracking-widest">Auditoría</p>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                  </div>
                  <div className="p-12 flex-grow overflow-y-auto bg-slate-50/10">
                    <Checklist status={appState[selectedContractor.id] || {}} onChange={handleToggle} />
                  </div>
                  <div className="p-8 bg-white border-t flex justify-end gap-4">
                    <button onClick={() => window.print()} className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black hover:bg-black transition-all flex items-center gap-4 shadow-xl uppercase tracking-widest">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Generar Acta
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-20 text-center opacity-40">
                  <div className="w-32 h-32 bg-slate-100 rounded-[3.5rem] flex items-center justify-center mb-10 rotate-12">
                    <svg className="h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 20c4.083 0 7.674-2.43 9.352-6M12 11a4 4 0 10-8 0 4 4 0 008 0zm0 0v5m0 12l.001-.01" /></svg>
                  </div>
                  <p className="text-[16px] font-black uppercase tracking-[0.5em] text-slate-400 max-w-sm">Seleccione un perfil para comenzar</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SummaryTable contractors={CONTRACTORS} appState={appState} />
        )}
      </div>

      {/* ACTA DE IMPRESIÓN */}
      <div className="hidden print:block p-16 bg-white text-black">
        <div className="border-b-[5px] border-emerald-900 pb-10 mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase mb-2 tracking-tighter">Certificación Documental</h1>
            <p className="text-sm font-bold tracking-[0.3em] uppercase opacity-70">Parques Nacionales Naturales de Colombia</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black uppercase bg-slate-50 px-6 py-3 rounded-2xl border-2 border-slate-100">Corte: {new Date().toLocaleDateString('es-CO')}</p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-slate-100 mb-12 relative overflow-hidden">
          <p className="text-[11px] font-black text-slate-400 uppercase mb-4 tracking-widest">Información del Contratista</p>
          <p className="text-2xl font-black uppercase text-emerald-900 mb-6">{selectedContractor?.name}</p>
          <div className="grid grid-cols-3 gap-10">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Estado</p>
              <p className="text-sm font-black">{calculateProgress(selectedContractor?.id || '') === 100 ? 'ADAPTADO/OK' : 'PENDIENTE'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Efectividad</p>
              <p className="text-sm font-black">{calculateProgress(selectedContractor?.id || '')}%</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Vigencia</p>
              <p className="text-sm font-black">{new Date().getFullYear()}</p>
            </div>
          </div>
        </div>

        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-emerald-900 text-white uppercase font-black">
              <th className="p-5 text-left rounded-tl-3xl">Requisito Soportado</th>
              <th className="p-5 w-48 text-center rounded-tr-3xl">Verificación</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100 border-x-4 border-b-4 border-slate-50">
            {CHECKLIST_ITEMS.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="p-5 font-bold text-slate-800">{item.label}</td>
                <td className="p-5 text-center font-black">
                  {appState[selectedContractor?.id || '']?.[item.id] ? (
                    <span className="text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-lg border border-emerald-100">ENTREGADO</span>
                  ) : (
                    <span className="text-slate-300 font-bold italic">— PENDIENTE —</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-48 grid grid-cols-2 gap-48">
          <div className="border-t-4 border-emerald-900 pt-8">
             <p className="text-xs font-black uppercase tracking-widest text-emerald-900">Responsable Administrativo</p>
             <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">PNN de Colombia - Subdirección Financiera</p>
          </div>
          <div className="border-t-4 border-slate-900 pt-8">
             <p className="text-xs font-black uppercase tracking-widest text-slate-900">Firma Contratista</p>
             <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">C.C. ________________________</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
