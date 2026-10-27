'use client';

import { Info, Code, Cpu, Binary, GitFork, Heart, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Info className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-extrabold text-white">About the Simulator</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          A pedagogical and architectural simulation platform bridging algorithms, formal automata, and hardware organization.
        </p>
      </div>

      {/* Project Overview Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100">Project Mission & Objectives</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          The <strong>Huffman-Compressed Micro-Architecture Instruction Memory Simulator</strong> explores
          how software-level data compression principles can be synthesized into hardware logic. In modern embedded
          systems and IoT edge processors, instruction memory and bus bandwidth dominate silicon area and power consumption.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          By encoding frequently executed micro-architecture opcodes with shorter variable-length prefix bitstrings
          (DAA) and decompressing them instantaneously via on-chip deterministic finite state machines (FLAT),
          the CPU pipeline (COA) achieves up to <strong>73.8% memory bandwidth savings</strong> with zero runtime lookahead stalls.
        </p>
      </div>

      {/* Three Pillars Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <GitFork className="w-4 h-4" />
            <span>FLAT Automata</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            NFA with ε-transitions, powerset subset construction, and DFA execution tracing with decoupled syntax and semantics.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
            <Binary className="w-4 h-4" />
            <span>DAA Huffman Engine</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Greedy tree construction via Python&apos;s heapq, deterministic tie-breaking, Shannon entropy bounds, and tree overhead estimation.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Cpu className="w-4 h-4" />
            <span>COA Architecture</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Microprogrammed Control Memory, 16-bit register file (R0..R3, PC, MAR, MDR), condition flags, and cycle execution engine.
          </p>
        </div>
      </div>

      {/* Technology Stack Grid */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Code className="w-4 h-4 text-cyan-400" />
          Technology Stack
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-bold text-cyan-400 mb-1">Frontend</div>
            <ul className="text-slate-400 space-y-1 text-[11px]">
              <li>• Next.js 16 (App Router)</li>
              <li>• React 19</li>
              <li>• Tailwind CSS v4</li>
              <li>• React Flow (@xyflow/react)</li>
              <li>• Recharts</li>
              <li>• Lucide Icons</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-bold text-indigo-400 mb-1">Backend</div>
            <ul className="text-slate-400 space-y-1 text-[11px]">
              <li>• Python 3.11</li>
              <li>• FastAPI (REST API)</li>
              <li>• Uvicorn (ASGI Server)</li>
              <li>• Pydantic v2 (Validation)</li>
              <li>• Pytest (Automated Tests)</li>
              <li>• HTTPX (Async Testing)</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-bold text-emerald-400 mb-1">Core Modules</div>
            <ul className="text-slate-400 space-y-1 text-[11px]">
              <li>• JavaScript ES Modules</li>
              <li>• Node.js Native Test Runner</li>
              <li>• Deterministic Tie-Breaking</li>
              <li>• Formal 5-tuple State Machines</li>
              <li>• Cycle-Accurate Emulation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
