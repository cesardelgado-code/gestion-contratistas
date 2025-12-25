
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
  const [showHelp, setShowHelp] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [cloudId, setCloudId] = useState<string | null>(localStorage.getItem('pnn_cloud_id'));
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistencia local
  useEffect(() => {
    localStorage.setItem('pnn_contratistas_v2', JSON.stringify(appState));
  }, [appState]);

  // Guardar Cloud ID localmente
  useEffect(() => {
    if (cloudId) localStorage.setItem('pnn_cloud_id', cloudId);
    else localStorage.removeItem('pnn_cloud_id');
  }, [cloudId]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Lógica de Sincronización ---

  const createCloudSession = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(JSONBLOB_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(appState)
      });
      const location = response.headers.get('Location');
      if (location) {
        const id = location.split('/').pop();
        if (id) {
          setCloudId(id);
          showToast("Sesión de nube creada con éxito");
        }
      }
    } catch (err) {
      showToast("Error al crear sesión en la nube");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncFromCloud = async (idToUse?: string) => {
    const id = idToUse || cloudId;
    if (!id) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${JSONBLOB_API}/${id}`);
      if (response.ok) {
        const data = await response.json();
        setAppState(data);
        if (idToUse) setCloudId(idToUse);
        showToast("Datos sincronizados desde la nube");
      } else {
        showToast("No se encontró la sesión en la nube");
      }
    } catch (err) {
      showToast("Error de conexión con la nube");
    } finally {
      setIsSyncing(false);
    }
  };

  const pushToCloud = async () => {
    if (!cloudId) return;
    setIsSyncing(true);
    try {
      await fetch(`${JSONBLOB_API}/${cloudId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(appState)
      });
      console.log("Push exitoso");
    } catch (err) {
      console.error("Error al subir cambios");
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-push cuando cambia el estado si hay nube activa
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cloudId) pushToCloud();
    }, 1000);
    return () => clearTimeout(timer);
  }, [appState, cloudId]);

  // --- Fin Lógica Sincronización ---

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
    const itemsDone = Object.values(status).filter(Boolean).length;
    return Math.round((itemsDone / CHECKLIST_ITEMS.length) * 100);
  };

  const exportBackup = () => {
    const data = JSON.stringify(appState, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnn_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Copia de seguridad exportada");
  };

  const importBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (confirm('¿Desea importar los datos? Se reemplazará el progreso actual.')) {
          setAppState(json);
          showToast("Datos importados con éxito");
        }
      } catch (err) {
        alert('Error al leer el archivo. Formato no válido.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <Layout>
      {notification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl z-[100] animate-bounce">
          {notification}
        </div>
      )}

      <div className="space-y-6 no-print">
        {/* Barra de Control Superior */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase">Gestión de Requisitos</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 font-medium">Verificación documental colaborativa</p>
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md hover:bg-slate-200 font-bold text-slate-600 transition-colors"
              >
                CONFIGURACIÓN
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Sección Sincronización */}
            <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${cloudId ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              {!cloudId ? (
                <button 
                  onClick={createCloudSession}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-white text-amber-700 text-[10px] font-black uppercase rounded-lg shadow-sm hover:bg-amber-100 transition-all border border-amber-200"
                >
                  {isSyncing ? 'Conectando...' : 'Activar Nube'}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-emerald-700 uppercase leading-none">Nube Activa</span>
                    <span className="text-[10px] font-mono text-emerald-900 font-bold">{cloudId.substring(0,8)}...</span>
                  </div>
                  <button 
                    onClick={() => syncFromCloud()}
                    disabled={isSyncing}
                    className="p-1.5 bg-white rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                    title="Actualizar datos de otros usuarios"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => { if(confirm('¿Desconectar de la nube? Los datos volverán a ser solo locales.')) setCloudId(null); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setView('individual')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'individual' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Individual
              </button>
              <button 
                onClick={() => setView('summary')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'summary' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Matriz
              </button>
            </div>
            
            <button onClick={exportBackup} className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors">
              Backup
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="bg-slate-900 text-white p-6 rounded-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-black text-emerald-400 uppercase text-sm">Configuración de Sincronización</h3>
              <button onClick={() => setShowHelp(false)} className="text-slate-400 font-bold text-xs hover:text-white">Cerrar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              <div className="space-y-4">
                <p className="text-slate-400">Para que otros vean tus cambios, comparte el <strong>ID de Nube</strong>. Ellos deben pegarlo abajo y presionar "Unirse".</p>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-500 uppercase mb-1">Tu ID de Sincronización:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={cloudId || 'No activo'} 
                      className="bg-slate-800 border border-slate-700 rounded p-2 flex-grow font-mono text-emerald-400 text-[10px]"
                    />
                    <button 
                      onClick={() => { navigator.clipboard.writeText(cloudId || ''); showToast("ID Copiado"); }}
                      className="bg-slate-700 px-3 rounded hover:bg-slate-600 transition-colors"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-4 border-l border-slate-800 pl-8">
                <p className="text-slate-400">¿Tienes un ID de un colega? Pégalo aquí para conectarte:</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    id="join-id"
                    placeholder="Pegar ID aquí..."
                    className="bg-slate-800 border border-slate-700 rounded p-2 flex-grow font-mono text-[10px]"
                  />
                  <button 
                    onClick={() => {
                      const id = (document.getElementById('join-id') as HTMLInputElement).value;
                      if(id) syncFromCloud(id);
                    }}
                    className="bg-emerald-600 px-4 rounded font-bold hover:bg-emerald-500 transition-colors"
                  >
                    Unirse
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dashboard contractors={CONTRACTORS} appState={appState} />

        {view === 'individual' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lista Lateral */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 h-[600px] overflow-y-auto divide-y shadow-sm">
              <div className="p-4 bg-slate-50 sticky top-0 z-10 border-b">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Contratistas ({CONTRACTORS.length})</p>
              </div>
              {CONTRACTORS.map(c => {
                const prog = calculateProgress(c.id);
                return (
                  <button key={c.id} onClick={() => setSelectedId(c.id)} className={`w-full p-4 text-left transition-all ${selectedId === c.id ? 'bg-emerald-50 border-r-4 border-emerald-500' : 'hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase truncate pr-2">{c.name}</span>
                      <span className={`text-[10px] font-black ${prog === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>{prog}%</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Panel de Detalle */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[600px] shadow-sm">
              {selectedContractor ? (
                <>
                  <div className="p-6 bg-emerald-900 text-white flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">{selectedContractor.name}</h3>
                      <p className="text-[10px] opacity-70 font-bold">PROGRESO: {calculateProgress(selectedContractor.id)}%</p>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg text-center min-w-[60px]">
                      <p className="text-[8px] uppercase font-bold opacity-60">Items</p>
                      <p className="text-lg font-black">
                        {Object.values(appState[selectedContractor.id] || {}).filter(Boolean).length}/{CHECKLIST_ITEMS.length}
                      </p>
                    </div>
                  </div>
                  <div className="p-6 flex-grow overflow-y-auto">
                    <Checklist status={appState[selectedContractor.id] || {}} onChange={handleToggle} />
                  </div>
                  <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                    <button onClick={() => window.print()} className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimir Acta
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-300 gap-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Seleccione un contratista</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SummaryTable contractors={CONTRACTORS} appState={appState} />
        )}
      </div>

      {/* VISTA DE IMPRESIÓN (OCULTA EN WEB) */}
      <div className="hidden print:block p-10 bg-white">
        <div className="flex items-center gap-4 border-b-2 border-black pb-4 mb-6">
           <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
             <span className="text-xs font-black">PNN</span>
           </div>
           <div>
             <h1 className="text-xl font-black uppercase">Acta de Verificación de Requisitos</h1>
             <p className="text-[10px] font-bold">PARQUES NACIONALES NATURALES DE COLOMBIA</p>
           </div>
        </div>
        
        {selectedContractor && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8 bg-slate-50 p-4 border border-slate-200">
              <div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">CONTRATISTA:</p>
                <p className="text-xs font-black uppercase">{selectedContractor.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">FECHA:</p>
                <p className="text-xs font-black">{new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-2 border border-slate-300 text-left w-10">#</th>
                  <th className="p-2 border border-slate-300 text-left">REQUISITO DOCUMENTAL</th>
                  <th className="p-2 border border-slate-300 text-center w-24">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {CHECKLIST_ITEMS.map((i, idx) => (
                  <tr key={i.id}>
                    <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                    <td className="p-1.5 border border-slate-300 font-medium">{i.label}</td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold">
                      {appState[selectedContractor.id]?.[i.id] ? 'RECIBIDO' : 'PENDIENTE'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-16 text-[9px] text-slate-600 italic">
              <p className="mb-8">Se deja constancia de la verificación de los documentos aportados por el contratista.</p>
              <div className="grid grid-cols-2 gap-20">
                <div className="space-y-1">
                  <div className="border-b border-black h-12"></div>
                  <p className="font-bold uppercase text-black">Responsable PNN</p>
                  <p>Subdirección Administrativa y Financiera</p>
                </div>
                <div className="space-y-1">
                  <div className="border-b border-black h-12"></div>
                  <p className="font-bold uppercase text-black">Firma Contratista</p>
                  <p>C.C. ________________________</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
