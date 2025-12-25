
import React, { useState, useEffect, useMemo } from 'react';
import { CONTRACTORS, CHECKLIST_ITEMS } from './constants';
import { AppState } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Checklist from './components/Checklist';
import SummaryTable from './components/SummaryTable';

const JSONBLOB_API = "https://jsonblob.com/api/jsonBlob";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('pnn_contratistas_v2');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'individual' | 'summary'>('individual');
  const [notification, setNotification] = useState<string | null>(null);
  const [cloudId, setCloudId] = useState<string | null>(localStorage.getItem('pnn_cloud_id'));
  const [isSyncing, setIsSyncing] = useState(false);

  // Guardar localmente siempre como respaldo
  useEffect(() => {
    localStorage.setItem('pnn_contratistas_v2', JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    if (cloudId) localStorage.setItem('pnn_cloud_id', cloudId);
    else localStorage.removeItem('pnn_cloud_id');
  }, [cloudId]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- LÓGICA DE NUBE SIMPLIFICADA ---
  
  const createCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(JSONBLOB_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState)
      });
      const id = res.headers.get('Location')?.split('/').pop();
      if (id) {
        setCloudId(id);
        showToast("Nube activada. Comparte el ID con tu equipo.");
      }
    } catch (e) {
      showToast("Error al conectar");
    } finally {
      setIsSyncing(false);
    }
  };

  const joinCloud = () => {
    const id = prompt("Pega el ID de nube de tu equipo:");
    if (id) {
      setCloudId(id);
      syncFromCloud(id);
    }
  };

  const syncFromCloud = async (idToUse?: string) => {
    const id = idToUse || cloudId;
    if (!id) return;
    try {
      const res = await fetch(`${JSONBLOB_API}/${id}`);
      if (res.ok) {
        const data = await res.json();
        // Solo actualizamos si hay cambios reales para evitar parpadeos
        if (JSON.stringify(data) !== JSON.stringify(appState)) {
          setAppState(data);
        }
      }
    } catch (e) {
      console.error("Error sync");
    }
  };

  const pushToCloud = async () => {
    if (!cloudId || isSyncing) return;
    try {
      await fetch(`${JSONBLOB_API}/${cloudId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState)
      });
    } catch (e) {
      console.error("Error push");
    }
  };

  // AUTO-SYNC: Guardar cuando el usuario cambia algo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cloudId) pushToCloud();
    }, 1500);
    return () => clearTimeout(timer);
  }, [appState, cloudId]);

  // AUTO-POLLING: Traer cambios de otros cada 20 segundos
  useEffect(() => {
    if (!cloudId) return;
    const interval = setInterval(() => syncFromCloud(), 20000);
    return () => clearInterval(interval);
  }, [cloudId, appState]);

  // --- FIN LÓGICA NUBE ---

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
    return Math.round((Object.values(status).filter(Boolean).length / CHECKLIST_ITEMS.length) * 100);
  };

  return (
    <Layout>
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-2 rounded-full text-[10px] font-black shadow-xl z-[100] animate-bounce uppercase">
          {notification}
        </div>
      )}

      <div className="space-y-6 no-print">
        {/* Header de herramientas simple */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Panel de Control</h2>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setView('individual')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${view === 'individual' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>Individual</button>
              <button onClick={() => setView('summary')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${view === 'summary' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>Matriz</button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!cloudId ? (
              <div className="flex gap-1">
                <button onClick={createCloud} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-all uppercase">Crear Equipo</button>
                <button onClick={joinCloud} className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-all uppercase">Unirse a ID</button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-emerald-900 text-white px-3 py-1.5 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black opacity-60 uppercase">Sincronizando ID</span>
                  <span className="text-[10px] font-mono font-bold">{cloudId.substring(0, 8)}...</span>
                </div>
                <button 
                  onClick={() => { navigator.clipboard.writeText(cloudId); showToast("ID Copiado"); }}
                  className="p-1 hover:bg-white/10 rounded" title="Copiar ID para el equipo"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                </button>
                <button onClick={() => setCloudId(null)} className="text-red-300 hover:text-red-100 p-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            <button onClick={() => window.print()} className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all">
              <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </button>
          </div>
        </div>

        <Dashboard contractors={CONTRACTORS} appState={appState} />

        {view === 'individual' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 h-[500px] overflow-y-auto divide-y shadow-sm">
              {CONTRACTORS.map(c => {
                const prog = calculateProgress(c.id);
                return (
                  <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full p-3 text-left transition-all ${selectedId === c.id ? 'bg-emerald-50 border-r-4 border-emerald-500' : 'hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase truncate pr-2 text-slate-700">{c.name}</span>
                      <span className={`text-[10px] font-black ${prog === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>{prog}%</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[500px] shadow-sm flex flex-col">
              {selectedContractor ? (
                <>
                  <div className="p-4 bg-emerald-900 text-white flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest">{selectedContractor.name}</h3>
                      <p className="text-[8px] font-bold opacity-60">VERIFICACIÓN DOCUMENTAL</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black leading-none">{calculateProgress(selectedContractor.id)}%</p>
                      <p className="text-[8px] font-bold opacity-60 uppercase">Completado</p>
                    </div>
                  </div>
                  <div className="p-6 flex-grow overflow-y-auto">
                    <Checklist status={appState[selectedContractor.id] || {}} onChange={handleToggle} />
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-300">
                  <p className="text-[10px] font-black uppercase tracking-widest">Selecciona un contratista para iniciar</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SummaryTable contractors={CONTRACTORS} appState={appState} />
        )}
      </div>

      {/* Vista Impresión */}
      <div className="hidden print:block p-8 bg-white">
        <h1 className="text-lg font-black uppercase border-b-2 border-black mb-4">Acta de Verificación - {selectedContractor?.name}</h1>
        <table className="w-full text-[9px] border-collapse border border-black">
          <thead>
            <tr className="bg-slate-100 uppercase font-black">
              <th className="border border-black p-1 text-left">Documento / Requisito</th>
              <th className="border border-black p-1 text-center w-20">Estado</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST_ITEMS.map(item => (
              <tr key={item.id}>
                <td className="border border-black p-1">{item.label}</td>
                <td className="border border-black p-1 text-center font-bold">
                  {appState[selectedContractor?.id || '']?.[item.id] ? 'RECIBIDO' : 'PENDIENTE'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default App;
