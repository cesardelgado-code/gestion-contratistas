
import React from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded">
              <img src="https://picsum.photos/id/191/40/40" alt="Logo" className="w-8 h-8 object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight uppercase tracking-wider">Parques Nacionales Naturales</h1>
              <p className="text-[10px] opacity-80 uppercase font-medium">Suscripción de Contratos - Persona Natural</p>
            </div>
          </div>
          <div className="hidden md:block">
            <span className="text-xs bg-emerald-700 px-3 py-1 rounded-full border border-emerald-600">Gestor de Documentación</span>
          </div>
        </div>
      </header>
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      <footer className="bg-slate-900 text-slate-400 py-6 text-center text-sm border-t border-slate-800 no-print">
        <p>© {new Date().getFullYear()} Parques Nacionales Naturales de Colombia - Subdirección Administrativa y Financiera</p>
      </footer>
    </div>
  );
};

export default Layout;
