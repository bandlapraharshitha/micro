'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Cpu,
  Play,
  PlayCircle,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Layers,
  Sparkles,
  Zap,
  Activity,
} from 'lucide-react';
import {
  ALU_OPS,
  CONDITIONS,
  MEM_OPS,
  PC_OPS,
  REG_ID,
  createMicroinstruction,
} from '@/lib/coa/microinstructions';
import { ControlMemory } from '@/lib/coa/controlMemory';
import { DataMemory, RegisterFile } from '@/lib/coa/registers';
import { ExecutionEngine, ENGINE_STATUS } from '@/lib/coa/executionEngine';

const SAMPLE_PROGRAMS = {
  default_add_store: {
    name: 'Arithmetic & Memory Store',
    description: 'R0 <- 10; R1 <- 25; R0 <- R0 + R1 (35); Memory[0x20] <- R0; PC++; HALT',
    create: () => ControlMemory.createDefaultMicroprogram(),
  },
  flag_branch_test: {
    name: 'Subtraction & Conditional Branch',
    description: 'R0 <- 5; R1 <- 5; R2 <- R0 - R1 (Z=1); If Z==1 Branch to Target; R3 <- 42; HALT',
    create: () => [
      createMicroinstruction({ label: 'INIT_R0', aluOp: ALU_OPS.PASS_B, imm: 5, dest: REG_ID.R0, description: 'R0 <- 5' }),
      createMicroinstruction({ label: 'INIT_R1', aluOp: ALU_OPS.PASS_B, imm: 5, dest: REG_ID.R1, description: 'R1 <- 5' }),
      createMicroinstruction({ label: 'SUB_CHECK', aluOp: ALU_OPS.SUB, srcA: REG_ID.R0, srcB: REG_ID.R1, dest: REG_ID.R2, description: 'R2 <- R0 - R1 (Z=1)' }),
      createMicroinstruction({ label: 'BRANCH_Z', condition: CONDITIONS.IF_ZERO, nextAddress: 5, description: 'If Z==1 goto 5 (SKIP)' }),
      createMicroinstruction({ label: 'SKIPPED_OP', aluOp: ALU_OPS.PASS_B, imm: 999, dest: REG_ID.R3, description: 'R3 <- 999 (SKIPPED)' }),
      createMicroinstruction({ label: 'TARGET_OP', aluOp: ALU_OPS.PASS_B, imm: 42, dest: REG_ID.R3, description: 'R3 <- 42' }),
      createMicroinstruction({ label: 'HALT', isHalt: true, description: 'HALT' }),
    ],
  },
  memory_load_read: {
    name: 'Memory Load & Register Transfer',
    description: 'DataMemory[0x15]=0xBEEF; MAR <- 0x15; MDR <- Memory[MAR]; R1 <- MDR; HALT',
    create: () => [
      createMicroinstruction({ label: 'SET_ADDR', aluOp: ALU_OPS.PASS_B, imm: 0x15, dest: REG_ID.MAR, description: 'MAR <- 0x15' }),
      createMicroinstruction({ label: 'READ_MEM', memOp: MEM_OPS.READ, description: 'MDR <- Memory[MAR]' }),
      createMicroinstruction({ label: 'STORE_REG', aluOp: ALU_OPS.PASS_A, srcA: REG_ID.MDR, dest: REG_ID.R1, description: 'R1 <- MDR' }),
      createMicroinstruction({ label: 'HALT', isHalt: true, description: 'HALT' }),
    ],
    initialMemory: { 0x15: 0xbeef },
  },
};

export default function CoaLabPage() {
  const [selectedProgramKey, setSelectedProgramKey] = useState('default_add_store');

  // Initialize engine instance
  const engine = useMemo(() => {
    return new ExecutionEngine();
  }, []);

  // UI state synchronized with engine
  const [engineState, setEngineState] = useState(engine.getState());
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('control_memory'); // 'control_memory' | 'data_memory' | 'timeline'

  // Load a program into engine
  const loadProgram = useCallback(
    (key) => {
      const progDef = SAMPLE_PROGRAMS[key];
      if (!progDef) return;

      engine.reset();
      engine.controlMemory.loadMicroprogram(progDef.create());

      if (progDef.initialMemory) {
        engine.dataMemory.loadData(progDef.initialMemory);
      }

      setEngineState(engine.getState());
      setHistory(engine.getHistory());
    },
    [engine]
  );

  useEffect(() => {
    loadProgram(selectedProgramKey);
  }, [loadProgram, selectedProgramKey]);

  // Actions
  const handleStep = () => {
    engine.step();
    setEngineState(engine.getState());
    setHistory(engine.getHistory());
  };

  const handleRun = () => {
    engine.run(500);
    setEngineState(engine.getState());
    setHistory(engine.getHistory());
  };

  const handlePause = () => {
    engine.pause();
    setEngineState(engine.getState());
  };

  const handleReset = () => {
    loadProgram(selectedProgramKey);
  };

  // Current Microinstruction
  const currentUinst = engine.controlMemory.getMicroinstruction(engineState.uPC);
  const controlSignals = currentUinst ? currentUinst.getControlSignals() : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cpu className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-white">COA Microprogrammed Control Unit Lab</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Computer Organization and Architecture • Microprogram Counter (μPC) • Control Store • Register Transfer & ALU Simulation
          </p>
        </div>

        {/* Program Selection Dropdown */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Microprogram:</span>
          <select
            value={selectedProgramKey}
            onChange={(e) => setSelectedProgramKey(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            {Object.entries(SAMPLE_PROGRAMS).map(([key, def]) => (
              <option key={key} value={key}>
                {def.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Control Execution Toolbar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStep}
            disabled={engineState.status === ENGINE_STATUS.HALTED}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            title="Execute single microinstruction"
          >
            <SkipForward className="w-4 h-4 text-cyan-400" />
            <span>Single Step</span>
          </button>

          <button
            onClick={handleRun}
            disabled={engineState.status === ENGINE_STATUS.HALTED}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 transition disabled:opacity-50"
            title="Run microprogram continuously"
          >
            <Play className="w-4 h-4" />
            <span>Run</span>
          </button>

          <button
            onClick={handlePause}
            disabled={engineState.status !== ENGINE_STATUS.RUNNING}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            title="Pause execution"
          >
            <Pause className="w-4 h-4 text-amber-400" />
            <span>Pause</span>
          </button>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition"
            title="Reset registers and memory"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>Reset</span>
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Clock Cycle (T):</span>
            <span className="px-2 py-0.5 rounded bg-slate-950 text-cyan-300 font-bold border border-slate-800">
              #{engineState.cycleCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">μPC Address:</span>
            <span className="px-2 py-0.5 rounded bg-slate-950 text-indigo-300 font-bold border border-slate-800">
              0x{engineState.uPC.toString(16).padStart(2, '0').toUpperCase()} ({engineState.uPC})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                engineState.status === ENGINE_STATUS.RUNNING
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : engineState.status === ENGINE_STATUS.HALTED
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : engineState.status === ENGINE_STATUS.ERROR
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {engineState.status}
            </span>
          </div>
        </div>
      </div>

      {/* Main Micro-Architecture Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Register File & Flags */}
        <div className="lg:col-span-5 space-y-4">
          {/* Register Panel */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Register File (16-Bit)
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Unsigned 0x0000 - 0xFFFF</span>
            </div>

            {/* General Purpose Registers */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              {['R0', 'R1', 'R2', 'R3'].map((reg) => {
                const val = engineState.registers[reg] || 0;
                return (
                  <div key={reg} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>{reg}</span>
                      <span className="text-slate-500">Dec: {val}</span>
                    </div>
                    <div className="font-bold text-sm text-emerald-300 mt-0.5">
                      0x{val.toString(16).padStart(4, '0').toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Special Architectural Registers */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Special Architectural Registers:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 block">PC</span>
                  <span className="font-bold text-cyan-300">
                    0x{engineState.registers.PC.toString(16).padStart(4, '0').toUpperCase()}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 block">MAR</span>
                  <span className="font-bold text-amber-300">
                    0x{engineState.registers.MAR.toString(16).padStart(4, '0').toUpperCase()}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 block">MDR</span>
                  <span className="font-bold text-amber-300">
                    0x{engineState.registers.MDR.toString(16).padStart(4, '0').toUpperCase()}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 block">IR</span>
                  <span className="font-bold text-indigo-300">
                    0x{engineState.registers.IR.toString(16).padStart(4, '0').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Condition Flags */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-2">
                Processor Status Flags:
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div
                  className={`p-2 rounded-lg border transition ${
                    engineState.registers.flags.Z === 1
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-600 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-bold">Z (Zero)</div>
                  <div className="text-sm font-extrabold">{engineState.registers.flags.Z}</div>
                </div>

                <div
                  className={`p-2 rounded-lg border transition ${
                    engineState.registers.flags.S === 1
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-600 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-bold">S (Sign)</div>
                  <div className="text-sm font-extrabold">{engineState.registers.flags.S}</div>
                </div>

                <div
                  className={`p-2 rounded-lg border transition ${
                    engineState.registers.flags.C === 1
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-600 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-bold">C (Carry)</div>
                  <div className="text-sm font-extrabold">{engineState.registers.flags.C}</div>
                </div>

                <div
                  className={`p-2 rounded-lg border transition ${
                    engineState.registers.flags.V === 1
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-600 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-bold">V (Overflow)</div>
                  <div className="text-sm font-extrabold">{engineState.registers.flags.V}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Microinstruction & Active Signals Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Active Microinstruction
              </h3>
              <span className="text-[11px] font-mono text-cyan-400">
                {currentUinst?.label || 'END_OF_PROGRAM'}
              </span>
            </div>

            {currentUinst ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                  <span className="text-slate-500 text-[10px] block">RTL OPERATION</span>
                  <span className="font-semibold text-cyan-300">
                    {currentUinst.description || 'No Description'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">ALU OPERATOR</span>
                    <span className="text-indigo-300 font-bold">{controlSignals.ALU}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">DEST WRITE</span>
                    <span className="text-emerald-300 font-bold">{controlSignals.DEST_WRITE}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">BUS A & B</span>
                    <span className="text-amber-300 font-bold">
                      {controlSignals.BUS_A} | {controlSignals.BUS_B}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">MEMORY / PC CTRL</span>
                    <span className="text-sky-300 font-bold">
                      {controlSignals.MEM_CTRL} | {controlSignals.PC_CTRL}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-xs font-mono text-slate-500">
                Execution Complete or Halted.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Control Memory, Data Memory & Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
            {/* Tab Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('control_memory')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'control_memory'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Control Store (ROM)
                </button>
                <button
                  onClick={() => setActiveTab('data_memory')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'data_memory'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Data Memory (RAM)
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'timeline'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Execution Timeline ({history.length})
                </button>
              </div>
            </div>

            {/* Tab 1: Control Memory Table */}
            {activeTab === 'control_memory' && (
              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-xs font-mono text-left border-collapse">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-2.5">μPC</th>
                      <th className="py-2 px-2.5">Label</th>
                      <th className="py-2 px-2.5">RTL Description</th>
                      <th className="py-2 px-2.5">ALU</th>
                      <th className="py-2 px-2.5">Dest</th>
                      <th className="py-2 px-2.5">Mem</th>
                      <th className="py-2 px-2.5 text-right">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {engine.controlMemory.storage.map((uinst, idx) => {
                      const isActive = idx === engineState.uPC;
                      return (
                        <tr
                          key={idx}
                          className={`transition ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-200 font-bold border-l-2 border-emerald-400'
                              : 'hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <td className="py-2 px-2.5">0x{idx.toString(16).padStart(2, '0').toUpperCase()}</td>
                          <td className="py-2 px-2.5 text-cyan-300">{uinst.label || '-'}</td>
                          <td className="py-2 px-2.5 truncate max-w-xs">{uinst.description || '-'}</td>
                          <td className="py-2 px-2.5 text-indigo-300">{uinst.aluOp}</td>
                          <td className="py-2 px-2.5 text-emerald-300">{uinst.dest}</td>
                          <td className="py-2 px-2.5 text-amber-300">{uinst.memOp}</td>
                          <td className="py-2 px-2.5 text-right text-slate-400">
                            {uinst.isHalt ? (
                              <span className="text-rose-400 font-bold">HALT</span>
                            ) : (
                              uinst.condition
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: Data Memory Viewer */}
            {activeTab === 'data_memory' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Non-Zero Data Memory Words (256 Words Available)</span>
                  <span>MAR Address: 0x{engineState.registers.MAR.toString(16).toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[440px] overflow-y-auto">
                  {Object.entries(engineState.nonZeroMemory).length > 0 ? (
                    Object.entries(engineState.nonZeroMemory).map(([addr, val]) => (
                      <div
                        key={addr}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono"
                      >
                        <div className="text-[10px] text-slate-500">
                          Addr: 0x{parseInt(addr).toString(16).padStart(2, '0').toUpperCase()}
                        </div>
                        <div className="font-bold text-amber-300 text-sm mt-0.5">
                          0x{val.toString(16).padStart(4, '0').toUpperCase()}
                        </div>
                        <div className="text-[10px] text-slate-400">Dec: {val}</div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full p-8 text-center text-xs font-mono text-slate-500">
                      All 256 data memory cells are currently initialized to zero.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Execution Timeline */}
            {activeTab === 'timeline' && (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-2">
                {history.length > 0 ? (
                  history.map((entry) => (
                    <div
                      key={entry.step}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-500">#{entry.step}</span>
                          <span className="font-semibold text-cyan-300">{entry.label}</span>
                          <span className="text-slate-400">({entry.description})</span>
                        </div>
                        <span className="text-[10px] text-slate-500">μPC: {entry.uPC}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                        <div>
                          ALU Result: <strong className="text-emerald-300">{entry.aluResult ?? 'N/A'}</strong>
                        </div>
                        <div>
                          {entry.memoryOp && (
                            <span>
                              Memory {entry.memoryOp.type}: 0x{entry.memoryOp.address.toString(16)} ={' '}
                              <strong className="text-amber-300">{entry.memoryOp.value}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs font-mono text-slate-500">
                    No steps executed yet. Click &quot;Single Step&quot; or &quot;Run&quot; above.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
