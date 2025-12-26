
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
    const saved = localStorage.getItem('pnn_v3_data');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [teamId, setTeamId] = useState<string | null>(localStorage.getItem('pnn_v3_team'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'individual' | 'summary'>('individual');
  const [notification, setNotification] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  
  const lastUpdateRef = useRef<string>(JSON.stringify(appState));

  useEffect(() => {
    localStorage.setItem('pnn_v3_data', JSON.stringify(appState));
  }, [appState]);

  const showToast = (msg: string, type: 'error' | 'success' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- LÓGICA DE SINCRONIZACIÓN PROFESIONAL ---

  const initCloud = async () => {
    setIsSyncing(true);
    setNetworkError(false);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(appState)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const location = response.headers.get('Location');
      const id = location ? location.split('/').pop() : null;

      if (id) {
        setTeamId(id);
        localStorage.setItem('pnn_v3_team', id);
        lastUpdateRef.current = JSON.stringify(appState);
        showToast("Sesión de equipo creada con éxito");
      } else {
        throw new Error("No se pudo obtener el ID de sesión");
      }
    } catch (err: any) {
      console.error("Cloud Error:", err);
      setNetworkError(true);
      showToast("Error al conectar: Revisa si tu navegador bloquea jsonblob.com", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const joinTeam = async () => {
    const id = prompt("Pega el ID de equipo (Ej: 1352...):");
    if (!id || !id.trim()) return;
    
    const cleanId = id.trim();
    setIsSyncing(true);
    try {
      const response = await fetch(`${API_URL}/${cleanId}`, { mode: 'cors' });
      if (!response.ok) throw new Error("ID no encontrado");
      
      const data = await response.json();
      setAppState(data);
      setTeamId(cleanId);
      localStorage.setItem('pnn_v3_team', cleanId);
      lastUpdateRef.current = JSON.stringify(data);
      showToast("Te has unido al equipo correctamente");
    } catch (err) {
      showToast("ID inválido o error de conexión", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncPull = async () => {
    if (!teamId || isSyncing) return;
    try {
      const response = await fetch(`${API_URL}/${teamId}`, { mode: 'cors' });
      if (response.ok) {
        const data = await response.json();
        const dataStr = JSON.stringify(data);
        if (dataStr !== lastUpdateRef.current) {
          setAppState(data);
          lastUpdateRef.current = dataStr;
        }
      }
    } catch (e) {
      setNetworkError(true);
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
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: currentStr
      });
      if (response.ok) {
        lastUpdateRef.current = currentStr;
        setNetworkError(false);
      }
    } catch (e) {
      setNetworkError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => syncPush(), 2000);
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
      {/* Notificaciones Mejoradas */}
      {notification && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-[10px] font-black shadow-2xl z-[100] animate-bounce uppercase tracking-widest border-2 ${
          notification.type === 'error' ? 'bg-red-600 border-red-400 text-white' : 'bg-emerald-900 border-emerald-500 text-white'
        }`}>
          {notification.msg}
        </div>
      )}

      <div className="space-y-6 no-print">
        {/* Barra de Herramientas de Red */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Verificador PNN</h2>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button onClick={() => setView('individual')} className={`px-5 py-2 text-[10px] font-black rounded-xl transition-all uppercase ${view === 'individual' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-400 hover:text-slate-600'}`}>Individual</button>
              <button onClick={() => setView('summary')} className={`px-5 py-2 text-[10px] font-black rounded-xl transition-all uppercase ${view === 'summary' ? 'bg-white shadow-sm text-emerald-800' : 'text-slate-400 hover:text-slate-600'}`}>Matriz</button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {networkError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-xl border border-red-100 animate-pulse">
                <span className="text-[9px] font-black uppercase">Sin Conexión</span>
              </div>
            )}
            
            {isSyncing && (
              <div className="flex items-center gap-2 text-emerald-600">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                <span className="text-[9px] font-black uppercase">Sincronizando</span>
              </div>
            )}

            {!teamId ? (
              <div className="flex gap-2">
                <button 
                  onClick={initCloud} 
                  disabled={isSyncing}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black hover:bg-emerald-700 transition-all uppercase shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                >
                  Iniciar Nube
                </button>
                <button 
                  onClick={joinTeam}
                  disabled={isSyncing}
                  className="px-6 py-3 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl text-[10px] font-black hover:bg-slate-100 transition-all uppercase active:scale-95 disabled:opacity-50"
                >
                  Unirse a Equipo
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-slate-900 text-white pl-5 pr-2 py-2.5 rounded-2xl shadow-xl border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-0.5">ID DE EQUIPO</span>
                  <span className="text-[11px] font-mono font-bold">{teamId}</span>
                </div>
                <div className="flex gap-1 border-l border-slate-700 pl-2">
                  <button 
                    onClick={() => { navigator.clipboard.writeText(teamId); showToast("ID Copiado"); }}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-emerald-400"
                    title="Copiar ID"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                  </button>
                  <button 
                    onClick={() => { if(confirm("¿Desconectar sesión?")) { setTeamId(null); localStorage.removeItem('pnn_v3_team'); } }}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Desconectar"
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
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 h-[600px] overflow-y-auto divide-y shadow-sm">
              <div className="p-4 bg-slate-50/80 sticky top-0 z-10 border-b backdrop-blur-md">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Listado de Personal</p>
              </div>
              {CONTRACTORS.map(c => {
                const prog = calculateProgress(c.id);
                const isSelected = selectedId === c.id;
                return (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedId(c.id)} 
                    className={`w-full p-4.5 text-left transition-all group relative ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                  >
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600"></div>}
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-bold uppercase truncate pr-4 ${isSelected ? 'text-emerald-900' : 'text-slate-600 group-hover:text-slate-900'}`}>{c.name}</span>
                      <span className={`text-[10px] font-black ${prog === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>{prog}%</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 overflow-hidden min-h-[600px] shadow-sm flex flex-col">
              {selectedContractor ? (
                <>
                  <div className="p-7 bg-emerald-900 text-white flex justify-between items-center shadow-inner">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-widest mb-1.5">{selectedContractor.name}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase border border-emerald-400/30 px-2 py-0.5 rounded">Checklist</span>
                        <span className="text-[9px] font-bold text-white/40 uppercase">Persona Natural</span>
                      </div>
                    </div>
                    <div className="bg-white/10 px-6 py-4 rounded-2xl text-center backdrop-blur-xl border border-white/10 shadow-lg">
                      <p className="text-2xl font-black leading-none">{calculateProgress(selectedContractor.id)}%</p>
                      <p className="text-[8px] font-bold opacity-50 uppercase mt-1.5">Progreso</p>
                    </div>
                  </div>
                  <div className="p-10 flex-grow overflow-y-auto">
                    <Checklist status={appState[selectedContractor.id] || {}} onChange={handleToggle} />
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end">
                    <button onClick={() => window.print()} className="px-8 py-3.5 bg-white border border-slate-300 rounded-2xl text-[10px] font-black hover:bg-slate-100 transition-all flex items-center gap-3 shadow-sm uppercase tracking-widest active:scale-95">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Generar Documento
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-12 text-center bg-slate-50/20">
                  <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-center mb-8 rotate-3">
                    <svg className="h-10 w-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <p className="text-[13px] font-black uppercase tracking-[0.3em] text-slate-400 max-w-xs leading-loose">Seleccione un contratista para iniciar la verificación documental</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SummaryTable contractors={CONTRACTORS} appState={appState} />
        )}
      </div>

      {/* Acta Oficial (Impresión) */}
      <div className="hidden print:block p-14 bg-white">
        <div className="border-b-[6px] border-emerald-900 pb-8 mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase mb-1.5 tracking-tighter">Acta de Verificación</h1>
            <p className="text-sm font-bold text-emerald-900 tracking-widest uppercase">Parques Nacionales Naturales de Colombia</p>
          </div>
          <div className="text-right">
             <p className="text-xs font-black uppercase bg-slate-100 px-5 py-2.5 rounded-xl border border-slate-200">Fecha: {new Date().toLocaleDateString('es-CO')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 mb-10">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <p className="text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre Completo del Contratista</p>
            <p className="text-base font-black uppercase text-slate-800">{selectedContractor?.name}</p>
          </div>
        </div>

        <table className="w-full text-[11px] border-collapse border border-slate-300 shadow-sm rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-slate-100 uppercase font-black">
              <th className="border border-slate-300 p-4 text-left">Documento / Requisito Soportado</th>
              <th className="border border-slate-300 p-4 w-36 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST_ITEMS.map(item => (
              <tr key={item.id} className="even:bg-slate-50/50">
                <td className="border border-slate-300 p-4 font-medium text-slate-700">{item.label}</td>
                <td className="border border-slate-300 p-4 text-center font-black">
                  {appState[selectedContractor?.id || '']?.[item.id] ? (
                    <span className="text-emerald-700">RECIBIDO</span>
                  ) : (
                    <span className="text-slate-300">— PENDIENTE —</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-32 grid grid-cols-2 gap-32">
          <div className="border-t-2 border-slate-900 pt-5">
             <p className="text-xs font-black uppercase tracking-widest">Encargado Administrativo</p>
             <p className="text-[10px] text-slate-500 font-bold mt-1">PNN de Colombia</p>
          </div>
          <div className="border-t-2 border-slate-900 pt-5">
             <p className="text-xs font-black uppercase tracking-widest">Firma del Contratista</p>
             <p className="text-[10px] text-slate-500 font-bold mt-1">C.C. No. ________________________</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
