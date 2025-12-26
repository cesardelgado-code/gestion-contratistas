
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  
  // Ref para evitar que el auto-push se active por un cambio que vino de la nube
  const lastCloudDataRef = useRef<string>(JSON.stringify(appState));

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

  // --- LÓGICA DE NUBE REFORZADA ---
  
  const createCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(JSONBLOB_API, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(appState)
      });
      
      if (!res.ok) throw new Error("Servidor rechazó la petición");
      
      const id = res.headers.get('Location')?.split('/').pop();
      if (id) {
        setCloudId(id);
        lastCloudDataRef.current = JSON.stringify(appState);
        showToast("Nube activada correctamente");
      }
    } catch (e) {
      console.error(e);
      showToast("Error: No se pudo conectar con la nube");
    } finally {
      setIsSyncing(false);
    }
  };

  const joinCloud = () => {
    const id = prompt("Ingresa el ID de nube proporcionado por tu equipo:");
    if (id && id.trim()) {
      setCloudId(id.trim());
      syncFromCloud(id.trim());
    }
  };

  const syncFromCloud = async (idToUse?: string) => {
    const id = idToUse || cloudId;
    if (!id || isSyncing) return;
    
    try {
      const res = await fetch(`${JSONBLOB_API}/${id}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const dataStr = JSON.stringify(data);
        
        // Solo actualizar si hay cambios reales respecto a lo último que sabemos de la nube
        if (dataStr !== lastCloudDataRef.current) {
          setAppState(data);
          lastCloudDataRef.current = dataStr;
          console.log("Datos actualizados desde la nube");
        }
      }
    } catch (e) {
      console.warn("Fallo polling de sincronización");
    }
  };

  const pushToCloud = async () => {
    if (!cloudId) return;
    const currentDataStr = JSON.stringify(appState);
    
    // Si los datos actuales son los mismos que bajamos de la nube, no subimos nada
    if (currentDataStr === lastCloudDataRef.current) return;

    setIsSyncing(true);
    try {
      const res = await fetch(`${JSONBLOB_API}/${cloudId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: currentDataStr
      });
      if (res.ok) {
        lastCloudDataRef.current = currentDataStr;
      }
    } catch (e) {
      console.error("Error al guardar en nube");
    } finally {
      setIsSyncing(false);
    }
  };

  // Guardado automático al cambiar datos
  useEffect(() => {
    const timer = setTimeout(() => {
      pushToCloud();
    }, 2000);
    return () => clearTimeout(timer);
  }, [appState, cloudId]);

  // Consulta automática de cambios externos cada 15 segundos
  useEffect(() => {
    if (!cloudId) return;
    const interval = setInterval(() => syncFromCloud(), 15000);
    return () => clearInterval(interval);
  }, [cloudId]);

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
    const total = CHECKLIST_ITEMS.length;
    const done = Object.values(status).filter(Boolean).length;
    return Math.round((done / total) * 100);
  };

  return (
    <Layout>
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-2 rounded-full text-[10px] font-black shadow-2xl z-[100] animate-bounce uppercase">
          {notification}
        </div>
      )}

      <div className="space-y-6 no-print">
        {/* Barra Superior de Herramientas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Seguimiento</h2>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setView('individual')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${view === 'individual' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>Individual</button>
              <button onClick={() => setView('summary')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${view === 'summary' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>Matriz General</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSyncing && (
              <span className="text-[9px] font-black text-emerald-600 animate-pulse uppercase">Sincronizando...</span>
            )}
            
            {!cloudId ? (
              <div className="flex gap-2">
                <button onClick={createCloud} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-bold hover:bg-emerald-700 shadow-sm transition-all uppercase">Crear Sesión Equipo</button>
                <button onClick={joinCloud} className="px-4 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-all uppercase">Unirse a Sesión</button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-emerald-400 uppercase leading-none mb-0.5">Equipo Conectado</span>
                  <span className="text-[11px] font-mono font-bold leading-none">{cloudId.substring(0, 10)}</span>
                </div>
                <div className="flex gap-1 border-l border-slate-700 pl-3 ml-1">
                  <button 
                    onClick={() => { navigator.clipboard.writeText(cloudId); showToast("ID Copiado para compartir"); }}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-emerald-400" 
                    title="Copiar ID"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                  </button>
                  <button 
                    onClick={() => { if(confirm("¿Deseas desconectarte del equipo? El progreso seguirá guardado localmente.")) setCloudId(null); }} 
                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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
            {/* Lista de Contratistas */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 h-[550px] overflow-y-auto divide-y shadow-sm">
              <div className="p-3 bg-slate-50 sticky top-0 z-10 border-b">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Listado de Personal</p>
              </div>
              {CONTRACTORS.map(c => {
                const prog = calculateProgress(c.id);
                const isSelected = selectedId === c.id;
                return (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedId(c.id)} 
                    className={`w-full p-3.5 text-left transition-all relative ${isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                  >
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600"></div>}
                    <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-bold uppercase truncate pr-3 ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {c.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {prog === 100 && <span className="text-emerald-500">✅</span>}
                        <span className={`text-[10px] font-black ${prog === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {prog}%
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Formulario Checklist */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[550px] shadow-sm flex flex-col">
              {selectedContractor ? (
                <>
                  <div className="p-5 bg-emerald-900 text-white flex justify-between items-center shadow-inner">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest leading-none mb-1">{selectedContractor.name}</h3>
                      <p className="text-[9px] font-bold text-emerald-400 uppercase">Verificación de requisitos contractuales</p>
                    </div>
                    <div className="bg-white/10 px-4 py-2 rounded-xl text-center backdrop-blur-md">
                      <p className="text-xl font-black leading-none">{calculateProgress(selectedContractor.id)}%</p>
                      <p className="text-[8px] font-bold opacity-60 uppercase mt-1">Avance</p>
                    </div>
                  </div>
                  <div className="p-8 flex-grow overflow-y-auto">
                    <Checklist status={appState[selectedContractor.id] || {}} onChange={handleToggle} />
                  </div>
                  <div className="p-4 bg-slate-50 border-t flex justify-end">
                    <button onClick={() => window.print()} className="px-6 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-black hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm uppercase">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Generar Acta
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-300 gap-4">
                   <div className="w-16 h-16 border-4 border-dashed border-slate-200 rounded-full flex items-center justify-center opacity-40">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                   </div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Selecciona un contratista para ver detalles</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SummaryTable contractors={CONTRACTORS} appState={appState} />
        )}
      </div>

      {/* Documento de Impresión Oficial */}
      <div className="hidden print:block p-10 bg-white">
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-xl font-black uppercase mb-1">Acta de Verificación Documental</h1>
            <p className="text-[10px] font-bold text-slate-600">PARQUES NACIONALES NATURALES DE COLOMBIA</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold">FECHA: {new Date().toLocaleDateString('es-CO')}</p>
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-slate-100 rounded border border-slate-200">
           <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre del Contratista:</p>
           <p className="text-sm font-black uppercase">{selectedContractor?.name || 'N/A'}</p>
        </div>

        <table className="w-full text-[9px] border-collapse border border-black mb-10">
          <thead>
            <tr className="bg-slate-200 uppercase font-black text-center">
              <th className="border border-black p-2 text-left">Requisito / Documento Soportado</th>
              <th className="border border-black p-2 w-32">Estado</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST_ITEMS.map(item => (
              <tr key={item.id}>
                <td className="border border-black p-2 font-medium">{item.label}</td>
                <td className="border border-black p-2 text-center font-bold">
                  {appState[selectedContractor?.id || '']?.[item.id] ? 'RECIBIDO' : 'PENDIENTE'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-20 mt-20">
          <div className="border-t border-black pt-2 text-center">
            <p className="text-[10px] font-black uppercase">Responsable de Verificación</p>
            <p className="text-[9px] text-slate-500">PNN de Colombia</p>
          </div>
          <div className="border-t border-black pt-2 text-center">
            <p className="text-[10px] font-black uppercase">Firma del Contratista</p>
            <p className="text-[9px] text-slate-500">C.C. No. ____________________</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
