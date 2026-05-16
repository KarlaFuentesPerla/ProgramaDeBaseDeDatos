import { Outlet } from 'react-router-dom';
import SidebarNav from '../components/SidebarNav.jsx';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-black text-zinc-100">
      <SidebarNav />
      <main className="flex-1 overflow-auto bg-black">
        <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-black/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Consola / Sistema de respaldos
            </p>
            <span className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Conectado al API
            </span>
          </div>
        </header>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
