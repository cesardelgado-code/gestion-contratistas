
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CONTRACTORS, CHECKLIST_ITEMS } from './constants';
import { AppState } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Checklist from './components/Checklist';
import SummaryTable from './components/SummaryTable';

// Usamos una API de almacenamiento KV (Key-Value) muy sencilla y compatible
const SYNC_SERVICE = "https://jsonblob.com/api/jsonBlob";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('pnn_local_data');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [teamId, setTeamId] = useState<string | null>(localStorage.getItem('pnn_team_id'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'individual' | 'summary'>('individual');
  const [notification, setNotification] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const lastUpdateRef = useRef<string>(JSON.stringify(appState));

  // Guardar siempre una copia local por seguridad
  useEffect(() => {
    localStorage.setItem('pnn_local_data', JSON.stringify(appState));
  }, [appState]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- LÓGICA DE CONEXIÓN ---

  const handleConnect = async () => {
    const name = prompt("Escribe un NOMBRE para tu equipo (ej: pnn-central):");
    if (!name || name.trim().length < 3) return;
    
    const safeName = name.trim().toLowerCase().replace(/[^a-z0-h0-9]/g, '-');
    setIsSyncing(true);
    
    try {
      // Intentamos crear el "bloque" de datos para este equipo
      const res = await fetch(SYNC_SERVICE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(appState)
      });
      
      if (!res.ok) throw new Error();
      
      // Extraemos el ID único que nos da el servidor
      const url = res.headers.get('Location');
      const id = url ? url.split('/').pop() : null;
      
      if (id) {
        setTeamId(id);
        localStorage.setItem('pnn_team_id', id);
        showToast("¡Equipo conectado! Comparte este ID: " + id);
      }
    } catch (e) {
      showToast("Error de red. Intenta de nuevo.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleJoin = () => {
    const id = prompt("Pega el ID de equipo que te compartieron:");
    if (id && id.trim()) {
      const cleanId = id.trim();
      setTeamId(cleanId);
      localStorage.setItem('pnn_team_id', cleanId);
      fetchData(cleanId);
    }
  };

  const fetchData = async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`${SYNC_SERVICE}/${id}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const dataStr = JSON.stringify(data);
        if (dataStr !== lastUpdateRef.current) {
          setAppState(data);
          lastUpdateRef.current = dataStr;
        }
      }
    } catch (e) {
      console.warn("Error al recibir datos");
    }
  };

  const pushData = async () => {
    if (!teamId) return;
    const currentStr = JSON.stringify(appState);
    if (currentStr === lastUpdateRef.current) return;

    setIsSyncing(true);
    try {
      const res = await fetch(`${SYNC_SERVICE}/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: currentStr
      });
      if (res.ok) {
        lastUpdateRef.current = currentStr;
      }
    } catch (e) {
      console.error("Error al enviar datos");
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-guardado al detectar cambios locales
  useEffect(() => {
    const timer = setTimeout(() => pushData(), 2000);
    return () => clearTimeout(timer);
  }, [appState]);

  // Auto-actualización cada 15 segundos para ver lo que hacen otros
  useEffect(() => {
    if (!teamId) return;
    const interval = setInterval(() => fetchData(teamId), 15000);
    return () => clearInterval(interval);
  }, [teamId]);

  // --- FIN LÓGICA ---

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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-emerald-700 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-2xl z-[100] animate-bounce uppercase tracking-widest">
          {notification}
        </div>
      )}

      <div className="space-y-6 no-print">
        {/* Barra de Sincronización Minimalista */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Panel Central</h2>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button onClick={() => setView('individual')} className={`px-5 py-2 text-[10px] font-black rounded-xl transition-all uppercase ${view === 'individual' ? 'bg-white shadow-md text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>Individual</button>
              <button onClick={() => setView('summary')} className={`px-5 py-2 text-[10px] font-black rounded-xl transition-all uppercase ${view === 'summary' ? 'bg-white shadow-md text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>Matriz</button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isSyncing && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}
            
            {!teamId ? (
              <div className="flex gap-2">
                <button onClick={handleConnect} className="px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black hover:bg-emerald-700 transition-all uppercase shadow-lg shadow-emerald-100">Iniciar Nube</button>
                <button onClick={handleJoin} className="px-5 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl text-[10px] font-black hover:bg-slate-100 transition-all uppercase">Unirse a Equipo</button>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-slate-900 text-white pl-5 pr-2 py-2 rounded-2xl shadow-xl border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">ID Sincronización</span>
                  <span className="text-[11px] font-mono font-bold">{teamId}</span>
                </div>
                <div className="flex gap-1 border-l border-slate-700 pl-2">
                  <button 
                    onClick={() => { navigator.clipboard.writeText(teamId); showToast("ID Copiado"); }}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-emerald-400"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                  </button>
                  <button 
                    onClick={() => { if(confirm("¿Desconectar?")) { setTeamId(null); localStorage.removeItem('pnn_team_id'); } }}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Dashboard contractors={CONTRACTORS} appState={appState} />

        {view === 'individual' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 h-[580px] overflow-y-auto divide-y shadow-sm">
              <div className="p-4 bg-slate-50/50 sticky top-0 z-10 border-b backdrop-blur-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal de Parques</p>
              </div>
              {CONTRACTORS.map(c => {
                const prog = calculateProgress(c.id);
                const isSelected = selectedId === c.id;
                return (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedId(c.id)} 
                    className={`w-full p-4 text-left transition-all group ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-bold uppercase truncate pr-4 ${isSelected ? 'text-emerald-900' : 'text-slate-600 group-hover:text-slate-900'}`}>{c.name}</span>
                      <span className={`text-[10px] font-black ${prog === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>{prog}%</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 overflow-hidden min-h-[580px] shadow-sm flex flex-col">
              {selectedContractor ? (
                <>
                  <div className="p-6 bg-emerald-900 text-white flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-widest mb-1">{selectedContractor.name}</h3>
                      <div className="flex gap-4">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Checklist Documental</span>
                        <span className="text-[9px] font-bold text-white/40 uppercase">PNN Colombia</span>
                      </div>
                    </div>
                    <div className="bg-white/10 px-6 py-3 rounded-2xl text-center backdrop-blur-md border border-white/10">
                      <p className="text-2xl font-black leading-none">{calculateProgress(selectedContractor.id)}%</p>
                      <p className="text-[8px] font-bold opacity-50 uppercase mt-1">Avance Total</p>
                    </div>
                  </div>
                  <div className="p-8 flex-grow overflow-y-auto">
                    <Checklist status={appState[selectedContractor.id] || {}} onChange={handleToggle} />
                  </div>
                  <div className="p-5 bg-slate-50 border-t flex justify-end">
                    <button onClick={() => window.print()} className="px-8 py-3 bg-white border border-slate-300 rounded-2xl text-[10px] font-black hover:bg-slate-100 transition-all flex items-center gap-3 shadow-sm uppercase tracking-widest active:scale-95">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Generar Acta Oficial
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-300 bg-slate-50/30 p-10 text-center">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                    <svg className="h-8 w-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400">Seleccione un perfil para comenzar la verificación</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SummaryTable contractors={CONTRACTORS} appState={appState} />
        )}
      </div>

      {/* Acta de Impresión */}
      <div className="hidden print:block p-12 bg-white">
        <div className="border-b-4 border-emerald-800 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase mb-1">Verificación de Requisitos</h1>
            <p className="text-[11px] font-bold text-emerald-800">UNIDAD ADMINISTRATIVA ESPECIAL PARQUES NACIONALES NATURALES</p>
          </div>
          <p className="text-xs font-bold bg-slate-100 px-4 py-2 rounded-lg">Fecha: {new Date().toLocaleDateString('es-CO')}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-10 mb-8">
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Contratista</p>
            <p className="text-sm font-black uppercase">{selectedContractor?.name}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Avance Documental</p>
            <p className="text-xl font-black text-emerald-700">{calculateProgress(selectedContractor?.id || '')}%</p>
          </div>
        </div>

        <table className="w-full text-[10px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 uppercase font-black">
              <th className="border border-slate-300 p-3 text-left">Ítem de Verificación</th>
              <th className="border border-slate-300 p-3 w-32 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST_ITEMS.map(item => (
              <tr key={item.id} className="even:bg-slate-50/50">
                <td className="border border-slate-300 p-3">{item.label}</td>
                <td className="border border-slate-300 p-3 text-center font-black">
                  {appState[selectedContractor?.id || '']?.[item.id] ? 'RECIBIDO' : 'PENDIENTE'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-24 grid grid-cols-2 gap-24">
          <div className="border-t-2 border-slate-900 pt-3">
             <p className="text-[11px] font-black uppercase">Responsable Administrativo</p>
             <p className="text-[10px] text-slate-500">PNN de Colombia</p>
          </div>
          <div className="border-t-2 border-slate-900 pt-3">
             <p className="text-[11px] font-black uppercase">Firma del Contratista</p>
             <p className="text-[10px] text-slate-500">C.C. ________________________</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
