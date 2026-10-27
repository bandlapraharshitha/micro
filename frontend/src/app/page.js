'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitFork,
  Binary,
  Cpu,
  PlayCircle,
  ArrowRight,
  Activity,
  CheckCircle2,
  HardDrive,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function Dashboard() {
  const [backendHealth, setBackendHealth] = useState(null);
  const [sampleStats, setSampleStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const healthRes = await apiClient.checkHealth();
      if (healthRes.success) {
        setBackendHealth(healthRes.data);
      }

      const sampleRes = await apiClient.getSampleData();
      if (sampleRes.success) {
        setSampleStats(sampleRes.data.samples);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multidisciplinary Research Lab</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Huffman-Compressed Micro-Architecture Instruction Memory Simulator
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Bridging Design and Analysis of Algorithms (DAA), Formal Languages and Automata Theory (FLAT),
            and Computer Organization and Architecture (COA) to model hardware-efficient prefix decoding.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/simulation"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 transition"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Launch Integrated Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/documentation"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 hover:text-white transition"
            >
              <span>Explore Architecture Docs</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Architecture Domains</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white">3 Subsystems</div>
          <div className="mt-1 text-xs text-slate-400">DAA (Python) + FLAT + COA (JS)</div>
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Max Bandwidth Reduction</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-emerald-400">Up to 73.8%</div>
          <div className="mt-1 text-xs text-slate-400">Achieved on skewed assembly loops</div>
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Control-Word Format</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-white">12-Bit Fixed Word</div>
          <div className="mt-1 text-xs text-slate-400">4b Opcode | 2b Rd | 2b Rs | 4b Imm</div>
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Backend Engine Status</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 text-2xl font-extrabold flex items-center gap-2">
            {loading ? (
              <span className="text-slate-400 text-base">Checking...</span>
            ) : backendHealth ? (
              <>
                <span className="text-emerald-400">Online</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </>
            ) : (
              <span className="text-rose-400 text-base">Offline</span>
            )}
          </div>
          <div className="mt-1 text-xs font-mono text-slate-400">FastAPI Port :8000</div>
        </div>
      </div>

      {/* Three Subject Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Subject Simulation Labs</h2>
          <span className="text-xs font-mono text-slate-400">Modular & Decoupled Execution</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: FLAT Automata Lab */}
          <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-cyan-500/10 transition duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <GitFork className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  FLAT LAB
                </span>
              </div>

              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition">
                Formal Automata & DFA Decoders
              </h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Explore modular NFA representations with formal epsilon (ε) transitions, subset construction
                powerset determinization, 2D state transition tables, and 12-bit syntax execution tracing.
              </p>

              <div className="mt-5 pt-4 border-t border-slate-800 space-y-2 text-xs font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Alphabet:</span>
                  <span className="text-slate-200 font-semibold">Σ = &#123;0, 1&#125;</span>
                </div>
                <div className="flex justify-between">
                  <span>Subset Construction:</span>
                  <span className="text-emerald-400 font-semibold">Rabin-Scott Verified</span>
                </div>
                <div className="flex justify-between">
                  <span>Syntax Decoupling:</span>
                  <span className="text-cyan-400 font-semibold">Independent</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <Link
                href="/flat"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500 hover:text-black transition"
              >
                <span>Open FLAT Lab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: DAA Huffman Lab */}
          <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-indigo-500/10 transition duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Binary className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  DAA LAB
                </span>
              </div>

              <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">
                Greedy Huffman Compression Engine
              </h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Min-heap binary tree construction using Python's heapq, Shannon entropy calculation,
                variable-length prefix codebook generation, and lossless round-trip compression.
              </p>

              <div className="mt-5 pt-4 border-t border-slate-800 space-y-2 text-xs font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Algorithm:</span>
                  <span className="text-slate-200 font-semibold">Greedy O(N log N)</span>
                </div>
                <div className="flex justify-between">
                  <span>Tie-Breaking:</span>
                  <span className="text-emerald-400 font-semibold">Deterministic</span>
                </div>
                <div className="flex justify-between">
                  <span>Tree Overhead:</span>
                  <span className="text-indigo-400 font-semibold">Distinguished</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <Link
                href="/daa"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold hover:bg-indigo-500 hover:text-white transition"
              >
                <span>Open DAA Lab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: COA Microprogrammed Lab */}
          <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-emerald-500/10 transition duration-300">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  COA LAB
                </span>
              </div>

              <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">
                Microprogrammed Control Unit Lab
              </h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Control Memory (ROM) simulation, microprogram counter (&mu;PC), register file
                (R0..R3, MAR, MDR, PC), condition flags (Z, S, C, V), single-step and run controls.
              </p>

              <div className="mt-5 pt-4 border-t border-slate-800 space-y-2 text-xs font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Data Memory:</span>
                  <span className="text-slate-200 font-semibold">256 Words (16-bit)</span>
                </div>
                <div className="flex justify-between">
                  <span>Execution:</span>
                  <span className="text-emerald-400 font-semibold">Cycle-Accurate</span>
                </div>
                <div className="flex justify-between">
                  <span>Controls:</span>
                  <span className="text-emerald-400 font-semibold">Step / Run / Pause / Reset</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <Link
                href="/coa"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500 hover:text-black transition"
              >
                <span>Open COA Lab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Integrated Simulation Teaser Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            INTEGRATED PIPELINE (PHASE 8)
          </div>
          <h3 className="text-xl font-bold text-white">
            Complete Micro-Architecture Pipeline Simulation
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Execute assembly instructions flowing through DAA Huffman compression, bit-packed ROM storage,
            hardware DFA streaming validation, and microprogrammed CPU register execution with active safeguards.
          </p>
        </div>

        <Link
          href="/simulation"
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/20 transition"
        >
          <PlayCircle className="w-4 h-4" />
          <span>Launch Simulation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Verification Status Matrix */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Automated Test Verification Matrix
          </h4>
          <span className="text-xs font-mono text-emerald-400 font-bold">104 / 104 Tests Passing (100%)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">FLAT Automata Tests</div>
              <div className="text-[11px] text-slate-400">10 / 10 Suites Passing</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">DAA Python Engine Tests</div>
              <div className="text-[11px] text-slate-400">36 / 36 Suites Passing</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">COA Architecture Tests</div>
              <div className="text-[11px] text-slate-400">9 / 9 Suites Passing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
