'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitFork,
  Binary,
  Cpu,
  PlayCircle,
  BookOpen,
  Info,
  Activity,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'FLAT Lab', href: '/flat', icon: GitFork, badge: 'Automata' },
  { name: 'DAA Lab', href: '/daa', icon: Binary, badge: 'Huffman' },
  { name: 'COA Lab', href: '/coa', icon: Cpu, badge: 'Micro-Arch' },
  { name: 'End-to-End Sim', href: '/simulation', icon: PlayCircle, badge: 'Phase 8' },
  { name: 'Documentation', href: '/documentation', icon: BookOpen },
  { name: 'About', href: '/about', icon: Info },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState({ online: false, checking: true });

  const checkHealth = async () => {
    setBackendHealth((prev) => ({ ...prev, checking: true }));
    const res = await apiClient.checkHealth();
    if (res.success && res.data?.status === 'healthy') {
      setBackendHealth({ online: true, checking: false });
    } else {
      setBackendHealth({ online: false, checking: false });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Mobile Menu Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 shadow-xl focus:outline-none"
          aria-label="Toggle Navigation"
        >
          {isOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-mono font-bold text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition">
              μA
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Instruction Memory
              </div>
              <div className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition">
                Simulator Lab
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Backend Status & Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                {backendHealth.online ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                )}
              </span>
              <div>
                <div className="text-[11px] font-semibold text-slate-300">
                  DAA FastAPI
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  {backendHealth.online ? 'Online (:8000)' : 'Offline / Error'}
                </div>
              </div>
            </div>
            <button
              onClick={checkHealth}
              disabled={backendHealth.checking}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition disabled:opacity-50"
              title="Ping backend"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${backendHealth.checking ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          <div className="mt-3 text-center text-[10px] font-mono text-slate-400">
            Phase 6 & 7 Unified UI
          </div>
        </div>
      </aside>
    </>
  );
}
