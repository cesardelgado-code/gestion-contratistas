
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CONTRACTORS, CHECKLIST_ITEMS } from './constants';
import { AppState } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Checklist from './components/Checklist';
import SummaryTable from './components/SummaryTable';

const API_URL = "https://jsonblob.com/api/jsonBlob";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('pnn_v4_data');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [teamId, setTeamId] = useState<string | null>(localStorage.getItem('pnn_v4_team'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'individual' | 'summary'>('individual');
  const [notification, setNotification] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  
  const lastUpdateRef = useRef<string>(JSON.stringify(appState));

  // Persistencia local robusta
  useEffect(() => {
    localStorage.setItem('pnn_v4_data', JSON.stringify(appState));
  }, [appState]);

  const showToast = (msg: string, type: 'error' | 'success' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- SINCRONIZACIÓN MANUAL (Cero Dependencia de Red) ---
  const exportManual = () => {
    const dataStr = JSON.stringify(appState);
    const encoded = btoa(unescape(encodeURIComponent(dataStr))); // Base64 safe
    navigator.clipboard.writeText(encoded);
    showToast("Código de progreso copiado. Envíalo a tu equipo.");
  };

  const importManual = () => {
    const code = prompt("Pega el código de progreso compartido por tu colega:");
    if (!code) return;
    try {
      const decoded = decodeURIComponent(escape(atob(code)));
      const data = JSON.parse(decoded);
      if (confirm("¿Sobrescribir tus datos locales con esta versión?")) {
        setAppState(data);
        showToast("Datos actualizados correctamente");
      }
    } catch (e) {
      showToast("Código inválido", "error");
    }
  };

  // --- SINCRONIZACIÓN NUBE (Mejorada para evitar bloqueos) ---
  const initCloud = async () => {
    setIsSyncing(true);
    setNetworkError(null);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState)
      });

      if (!response.ok) throw new Error(`El servidor respondió con error ${response.status}`);
      
      const id = response.headers.get('Location')?.split('/').pop();
      if (id) {
        setTeamId(id);
        localStorage.setItem('pnn_v4_team', id);
        lastUpdateRef.current = JSON.stringify(appState);
        showToast("¡Nube activada!");
      } else {
        // En algunos navegadores no se puede leer 'Location' por CORS. Intentamos método alternativo.
        showToast("Servidor conectado pero ID oculto. Usa el modo manual.", "error");
      }
    } catch (err: any) {
      setNetworkError(err.message || "Error de conexión");
      showToast("Error de Red: El servidor de nube está bloqueado en esta red.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncPull = async () => {
    if (!teamId || isSyncing) return;
    try {
      const response = await fetch(`${API_URL}/${teamId}`);
      if (response.ok) {
        const data = await response.json();
        const dataStr = JSON.stringify(data);
        if (dataStr !== lastUpdateRef.current) {
          setAppState(data);
          lastUpdateRef.current = dataStr;
          setNetworkError(null);
        }
      }
    } catch (e) {
      setNetworkError("Fallo en sincronización automática");
    }
  };

  const syncPush = async () => {
    if (!teamId) return;
    const currentStr = JSON.stringify(appState);
    if (currentStr === lastUpdateRef.current) return;

    setIsSyncing(true);
    try {
      const response = await fetch(`${API_URL}/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: currentStr
      });
      if (response.ok) {
        lastUpdateRef.current = currentStr;
        setNetworkError(null);
      }
    } catch (e) {
      setNetworkError("Error al guardar en nube");
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
    const interval = setInterval(() => syncPull(), 20000);
    return () => clearInterval(interval);
  }, [teamId]);

  // --- COMPONENTES ---

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
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-8 py-4 rounded-3xl text-[10px] font-black shadow-2xl z-[100] animate-bounce uppercase tracking-widest border-2 ${
          notification.type === 'error' ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-900 border-emerald-500 text-white'
        }`}>
          {notification.msg}
        </div>
      )}

      <div className="space-y-6 no-print">
        {/* Panel de Control de Red y Sincronización */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-emerald-900 text-white p-3 rounded-2xl shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-1">PNN Verificador</h2>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onClick={() => setView('individual')} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase ${view === 'individual' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-400 hover:text-slate-600'}`}>Individual</button>
                <button onClick={() => setView('summary')} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase ${view === 'summary' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-400 hover:text-slate-600'}`}>Matriz</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Estado de Red */}
            {networkError && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-2xl border border-red-100 flex flex-col items-center">
                <span className="text-[8px] font-black uppercase">Red Restringida</span>
                <button onClick={() => showToast("Tu red bloquea el servidor de nube. Usa el botón 'Exportar' para compartir.", "error")} className="text-[7px] font-bold underline">¿Por qué?</button>
              </div>
            )}

            {/* Acciones de Sincronización */}
            <div className="flex gap-2">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                <button onClick={exportManual} className="px-4 py-2 bg-white text-slate-700 rounded-xl text-[9px] font-black hover:bg-slate-50 transition-all uppercase border border-slate-200">Exportar</button>
                <button onClick={importManual} className="px-4 py-2 bg-white text-slate-700 rounded-xl text-[9px] font-black hover:bg-slate-50 transition-all uppercase border border-slate-200">Importar</button>
              </div>

              {!teamId ? (
                <button onClick={initCloud} disabled={isSyncing} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[9px] font-black hover:bg-emerald-700 transition-all uppercase shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50">Activar Nube</button>
              ) : (
                <div className="flex items-center gap-4 bg-slate-900 text-white pl-5 pr-2 py-2 rounded-2xl shadow-xl border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Nube ID</span>
                    <span className="text-[10px] font-mono font-bold">{teamId}</span>
                  </div>
                  <button onClick={() => { setTeamId(null); localStorage.removeItem('pnn_v4_team'); }} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Dashboard contractors={CONTRACTORS} appState={appState} />

        {view === 'individual' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white rounded-[2rem] border border-slate-200 h-[620px] overflow-y-auto divide-y shadow-sm">
              <div className="p-5 bg-slate-50/50 sticky top-0 z-10 border-b backdrop-blur-md">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contratistas ({CONTRACTORS.length})</p>
              </div>
              {CONTRACTORS.map(c => {
                const prog = calculateProgress(c.id);
                const isSelected = selectedId === c.id;
                return (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedId(c.id)} 
                    className={`w-full p-5 text-left transition-all group relative ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                  >
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600"></div>}
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-bold uppercase truncate pr-4 ${isSelected ? 'text-emerald-900' : 'text-slate-600'}`}>{c.name}</span>
                      <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${prog === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {prog}%
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="lg:col-span-8 bg-white rounded-[2rem] border border-slate-200 overflow-hidden min-h-[620px] shadow-sm flex flex-col">
              {selectedContractor ? (
                <>
                  <div className="p-8 bg-emerald-900 text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-lg font-black uppercase tracking-tight mb-2 leading-none">{selectedContractor.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-800 px-3 py-1 rounded-full">Proceso de Selección</span>
                      </div>
                    </div>
                    <div className="bg-white/10 px-8 py-5 rounded-[2rem] text-center backdrop-blur-3xl border border-white/20 shadow-2xl relative z-10">
                      <p className="text-3xl font-black leading-none">{calculateProgress(selectedContractor.id)}%</p>
                      <p className="text-[9px] font-black opacity-60 uppercase mt-2 tracking-widest">Documentación</p>
                    </div>
                    {/* Decoración */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                  </div>
                  <div className="p-10 flex-grow overflow-y-auto bg-slate-50/20">
                    <Checklist status={appState[selectedContractor.id] || {}} onChange={handleToggle} />
                  </div>
                  <div className="p-6 bg-white border-t flex justify-end gap-3">
                    <button onClick={() => window.print()} className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black hover:bg-black transition-all flex items-center gap-4 shadow-xl uppercase tracking-widest active:scale-95">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Imprimir Acta
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-16 text-center bg-slate-50/10">
                  <div className="w-28 h-28 bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex items-center justify-center mb-10 rotate-6 group hover:rotate-0 transition-transform duration-500">
                    <svg className="h-12 w-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  </div>
                  <p className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-300 max-w-sm leading-relaxed">Seleccione un contratista para iniciar la auditoría documental</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SummaryTable contractors={CONTRACTORS} appState={appState} />
        )}
      </div>

      {/* Acta de Impresión Optimizada */}
      <div className="hidden print:block p-16 bg-white text-black">
        <div className="border-b-[4px] border-black pb-10 mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase mb-2 tracking-tighter">Reporte de Verificación</h1>
            <p className="text-sm font-bold tracking-[0.3em] uppercase opacity-60">Parques Nacionales Naturales de Colombia</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black uppercase bg-slate-100 px-6 py-3 rounded-2xl border-2 border-slate-200">Emitido: {new Date().toLocaleDateString('es-CO')}</p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 mb-12">
          <p className="text-[11px] font-black text-slate-400 uppercase mb-3 tracking-widest">Contratista Auditado</p>
          <p className="text-xl font-black uppercase text-slate-900">{selectedContractor?.name}</p>
          <div className="mt-6 flex gap-12">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Estado General</p>
              <p className="text-sm font-black text-emerald-700">{calculateProgress(selectedContractor?.id || '') === 100 ? 'COMPLETO' : 'EN PROCESO'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase">Cumplimiento</p>
              <p className="text-sm font-black">{calculateProgress(selectedContractor?.id || '')}%</p>
            </div>
          </div>
        </div>

        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white uppercase font-black">
              <th className="p-5 text-left rounded-tl-2xl">Requisito Documental</th>
              <th className="p-5 w-40 text-center rounded-tr-2xl">Verificación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-x-2 border-b-2 border-slate-100">
            {CHECKLIST_ITEMS.map(item => (
              <tr key={item.id}>
                <td className="p-5 font-bold text-slate-700">{item.label}</td>
                <td className="p-5 text-center font-black">
                  {appState[selectedContractor?.id || '']?.[item.id] ? (
                    <span className="text-emerald-700 font-black">● RECIBIDO</span>
                  ) : (
                    <span className="text-slate-300 font-bold">○ PENDIENTE</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-40 grid grid-cols-2 gap-40">
          <div className="border-t-[3px] border-slate-900 pt-6">
             <p className="text-xs font-black uppercase tracking-widest">Responsable Administrativo</p>
             <p className="text-[10px] text-slate-500 font-bold mt-2">PNN de Colombia</p>
          </div>
          <div className="border-t-[3px] border-slate-900 pt-6">
             <p className="text-xs font-black uppercase tracking-widest">Contratista</p>
             <p className="text-[10px] text-slate-500 font-bold mt-2">C.C. No. ________________________</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
