'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from '@xyflow/react';
import {
  GitFork,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Table,
} from 'lucide-react';
import {
  buildControlWordNFA,
  convertNFAtoDFA,
  getControlWordDFA,
  validateControlWord,
  OPCODE_MAP,
  REGISTER_MAP,
  CONTROL_WORD_SPEC,
} from '@/lib/flat';

const SAMPLE_PRESETS = [
  {
    label: 'ADD R1, R2, 5',
    bits: '001101100101',
    description: 'Valid 12-bit ALU addition instruction',
  },
  {
    label: 'LOAD R0, R1, 10',
    bits: '000100011010',
    description: 'Valid memory load with destination R0 and source R1',
  },
  {
    label: 'NOP',
    bits: '000000000000',
    description: 'Valid No-Operation control instruction',
  },
  {
    label: 'HALT',
    bits: '111100000000',
    description: 'Valid clock halt micro-instruction',
  },
  {
    label: 'Invalid Char (Contains 2)',
    bits: '001102100101',
    description: 'Syntax Error: non-binary character violates Σ = {0, 1}',
  },
  {
    label: 'Too Short (10 bits)',
    bits: '0011011001',
    description: 'Syntax Error: length mismatch (expected exactly 12 bits)',
  },
  {
    label: 'Too Long (14 bits)',
    bits: '00110110010111',
    description: 'Syntax Error: input exceeds 12-bit fixed boundary',
  },
];

export default function FlatLabPage() {
  const [inputBits, setInputBits] = useState('001101100101');
  const [activeTab, setActiveTab] = useState('validator'); // 'validator' | 'dfa_table' | 'subset_steps' | 'graph'
  const [graphMode, setGraphMode] = useState('dfa'); // 'dfa' | 'nfa'

  // Run subset construction
  const { nfa, dfa, rows: dfaRows } = useMemo(() => {
    const n = buildControlWordNFA();
    const result = convertNFAtoDFA(n);
    return { nfa: n, dfa: result.dfa, rows: result.rows };
  }, []);

  // Validation state
  const validationResult = useMemo(() => {
    if (!inputBits) return null;
    return validateControlWord(inputBits, { dfa });
  }, [inputBits, dfa]);

  // Generate React Flow nodes and edges for DFA visualization
  const { nodes, edges } = useMemo(() => {
    if (graphMode === 'dfa') {
      // Display a subset of DFA states arranged in an intuitive horizontal pipeline
      const dfaNodes = dfaRows.slice(0, 14).map((row, index) => {
        const isAccepting = row.isAccepting;
        const isStart = index === 0;

        return {
          id: row.dfaState,
          position: { x: (index % 5) * 180 + 40, y: Math.floor(index / 5) * 140 + 40 },
          data: {
            label: (
              <div className="text-center font-mono">
                <div className="font-bold text-xs text-cyan-300">{row.dfaState}</div>
                <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                  {`{${row.nfaSubset.slice(0, 2).join(',')}${row.nfaSubset.length > 2 ? '...' : ''}}`}
                </div>
                {isAccepting && (
                  <span className="inline-block mt-1 text-[8px] px-1 bg-emerald-500/20 text-emerald-400 rounded">
                    Accepting
                  </span>
                )}
                {isStart && (
                  <span className="inline-block mt-1 text-[8px] px-1 bg-cyan-500/20 text-cyan-400 rounded">
                    Start
                  </span>
                )}
              </div>
            ),
          },
          style: {
            background: isAccepting ? '#064e3b' : isStart ? '#0e7490' : '#0f172a',
            border: isAccepting
              ? '2px solid #10b981'
              : isStart
              ? '2px solid #06b6d4'
              : '1px solid #334155',
            borderRadius: '12px',
            color: '#fff',
            width: 140,
            padding: 8,
          },
        };
      });

      const dfaEdges = [];
      dfaRows.slice(0, 13).forEach((row) => {
        for (const [symbol, target] of Object.entries(row.transitions)) {
          dfaEdges.push({
            id: `e-${row.dfaState}-${target}-${symbol}`,
            source: row.dfaState,
            target,
            label: symbol,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: symbol === '0' ? '#38bdf8' : '#818cf8', strokeWidth: 1.5 },
            labelStyle: { fill: '#f8fafc', fontSize: 10, fontFamily: 'monospace' },
          });
        }
      });

      return { nodes: dfaNodes, edges: dfaEdges };
    } else {
      // NFA modular stages
      const stages = [
        { id: 's_op_0', label: 'Opcode Start (s_op_0)', x: 40, y: 80 },
        { id: 's_op_4', label: 'Opcode End (s_op_4)', x: 220, y: 80 },
        { id: 's_rd_0', label: 'Rdest Start (s_rd_0)', x: 400, y: 80 },
        { id: 's_rd_2', label: 'Rdest End (s_rd_2)', x: 580, y: 80 },
        { id: 's_rs_0', label: 'Rsrc Start (s_rs_0)', x: 400, y: 220 },
        { id: 's_rs_2', label: 'Rsrc End (s_rs_2)', x: 580, y: 220 },
        { id: 's_imm_0', label: 'Imm Start (s_imm_0)', x: 760, y: 150 },
        { id: 's_imm_4', label: 'Accepting (s_imm_4)', x: 960, y: 150, isAccepting: true },
      ];

      const nfaNodes = stages.map((st) => ({
        id: st.id,
        position: { x: st.x, y: st.y },
        data: {
          label: (
            <div className="text-center font-mono text-xs">
              <div className="font-bold">{st.id}</div>
              <div className="text-[10px] text-slate-300">{st.label}</div>
            </div>
          ),
        },
        style: {
          background: st.isAccepting ? '#064e3b' : '#1e1b4b',
          border: st.isAccepting ? '2px solid #10b981' : '1px solid #6366f1',
          borderRadius: '10px',
          color: '#fff',
          width: 150,
          padding: 8,
        },
      }));

      const nfaEdges = [
        { id: 'e-op', source: 's_op_0', target: 's_op_4', label: '0, 1 (4 bits)', markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-eps1', source: 's_op_4', target: 's_rd_0', label: 'ε (epsilon)', style: { strokeDasharray: '5,5', stroke: '#ec4899' }, markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-rd', source: 's_rd_0', target: 's_rd_2', label: '0, 1 (2 bits)', markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-eps2', source: 's_rd_2', target: 's_rs_0', label: 'ε (epsilon)', style: { strokeDasharray: '5,5', stroke: '#ec4899' }, markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-rs', source: 's_rs_0', target: 's_rs_2', label: '0, 1 (2 bits)', markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-eps3', source: 's_rs_2', target: 's_imm_0', label: 'ε (epsilon)', style: { strokeDasharray: '5,5', stroke: '#ec4899' }, markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'e-imm', source: 's_imm_0', target: 's_imm_4', label: '0, 1 (4 bits)', markerEnd: { type: MarkerType.ArrowClosed } },
      ];

      return { nodes: nfaNodes, edges: nfaEdges };
    }
  }, [graphMode, dfaRows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <GitFork className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-white">FLAT Automata Lab</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Formal Languages and Automata Theory • NFA with Epsilon Transitions • Subset Construction • 12-Bit Decoder
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('validator')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'validator' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Validator & Trace
          </button>
          <button
            onClick={() => setActiveTab('dfa_table')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'dfa_table' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Transition Table
          </button>
          <button
            onClick={() => setActiveTab('subset_steps')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'subset_steps' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Subset Construction
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'graph' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            State Diagram
          </button>
        </div>
      </div>

      {/* Educational 12-Bit Word Specification Banner */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-100">12-Bit Control-Word Format:</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            [11:8] Opcode (4b)
          </span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            [7:6] Rdest (2b)
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            [5:4] Rsrc (2b)
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            [3:0] Imm / Offset (4b)
          </span>
        </div>
      </div>

      {/* Tab 1: Validator & Trace */}
      {activeTab === 'validator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Binary Control Word Input
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  Length: {inputBits.length} / 12 bits
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={inputBits}
                  onChange={(e) => setInputBits(e.target.value)}
                  placeholder="e.g. 001101100101"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 tracking-wider"
                />
              </div>

              {/* Sample Presets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Sample Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setInputBits(preset.bits)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition ${
                        inputBits === preset.bits
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-800'
                      }`}
                      title={preset.description}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Validation Results Badges */}
              {validationResult && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Syntax Validation:</span>
                    {validationResult.syntax.isValid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accepted by DFA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400">
                        <XCircle className="w-3.5 h-3.5" /> Rejected by DFA
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Semantic Validation:</span>
                    {validationResult.semantics ? (
                      validationResult.semantics.isValid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid Opcode & Operands
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400">
                          <XCircle className="w-3.5 h-3.5" /> Semantic Error
                        </span>
                      )
                    ) : (
                      <span className="text-slate-500">Awaiting Valid Syntax</span>
                    )}
                  </div>

                  {/* Errors / Warnings Output */}
                  {validationResult.syntax.error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                      <strong>Syntax Error:</strong> {validationResult.syntax.error}
                    </div>
                  )}

                  {validationResult.semantics?.errors?.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                      <strong>Semantic Error:</strong> {validationResult.semantics.errors.join(' ')}
                    </div>
                  )}

                  {validationResult.semantics?.warnings?.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                      <strong>Warning:</strong> {validationResult.semantics.warnings.join(' ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Decoded Semantics Card */}
            {validationResult?.semantics && (
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Decoded Architectural Fields
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">OPCODE</span>
                    <span className="font-bold text-cyan-300">
                      {validationResult.semantics.mnemonic} ({validationResult.semantics.rawFields.opcodeBits})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">DESTINATION REGISTER</span>
                    <span className="font-bold text-indigo-300">
                      {validationResult.semantics.destReg} ({validationResult.semantics.rawFields.destBits})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">SOURCE REGISTER</span>
                    <span className="font-bold text-emerald-300">
                      {validationResult.semantics.srcReg} ({validationResult.semantics.rawFields.srcBits})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">IMMEDIATE / OFFSET</span>
                    <span className="font-bold text-amber-300">
                      {validationResult.semantics.immediate} (0x{validationResult.semantics.immediate.toString(16).toUpperCase()})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trace Execution View */}
          <div className="lg:col-span-7">
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl flex flex-col h-full">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    DFA State Transition Trace
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bit-by-bit deterministic state machine traversal δ(q, a)
                  </p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {validationResult?.syntax?.trace?.length || 0} Steps
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-800/60 mt-3 pr-2">
                {validationResult?.syntax?.trace?.map((step) => (
                  <div
                    key={step.step}
                    className="py-2 px-3 flex items-center justify-between text-xs font-mono hover:bg-slate-800/30 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-slate-500">#{step.step}</span>
                      {step.step === 0 ? (
                        <span className="text-cyan-400 font-semibold">Start State</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">
                            '{step.symbol}'
                          </span>
                          <span className="text-slate-400">{step.fromState}</span>
                          <span className="text-slate-500">&rarr;</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{step.toState}</span>
                      {step.step === 12 && validationResult.syntax.isValid && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Accepted
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: DFA Transition Table */}
      {activeTab === 'dfa_table' && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Generated DFA Transition Table
              </h3>
              <p className="text-xs text-slate-400">
                Produced via Rabin-Scott subset construction on the modular 12-bit control word NFA.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Total States: {dfaRows.length}
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">DFA State</th>
                  <th className="py-2.5 px-3">Underlying NFA Subset</th>
                  <th className="py-2.5 px-3">Input '0'</th>
                  <th className="py-2.5 px-3">Input '1'</th>
                  <th className="py-2.5 px-3 text-right">Accepting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {dfaRows.map((row) => (
                  <tr key={row.dfaState} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-bold text-cyan-300">{row.dfaState}</td>
                    <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                      {`{${row.nfaSubset.join(', ')}}`}
                    </td>
                    <td className="py-2 px-3 text-sky-400">{row.transitions['0'] || '-'}</td>
                    <td className="py-2 px-3 text-indigo-400">{row.transitions['1'] || '-'}</td>
                    <td className="py-2 px-3 text-right">
                      {row.isAccepting ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                          Yes
                        </span>
                      ) : (
                        <span className="text-slate-600">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Subset Construction Steps */}
      {activeTab === 'subset_steps' && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Subset Construction Algorithm Trace
              </h3>
              <p className="text-xs text-slate-400">
                Detailed computation of &epsilon;-closures and move sets for each discovered powerset state.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded bg-slate-800 text-slate-300">
              Deterministic Powerset Mapping
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {dfaRows.map((row, idx) => (
              <div
                key={row.dfaState}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-slate-500 font-bold">#{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                      {row.dfaState}
                    </span>
                    <span className="text-slate-400">= ε-closure({`{${row.nfaSubset.join(', ')}}`})</span>
                  </div>
                  {row.isAccepting && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                      Contains Accepting NFA Leaf
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pl-8 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-500 block">δ({row.dfaState}, '0')</span>
                    <span className="text-sky-300 font-semibold">
                      &rarr; {row.transitions['0'] || 'Dead State (Trap)'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-500 block">δ({row.dfaState}, '1')</span>
                    <span className="text-indigo-300 font-semibold">
                      &rarr; {row.transitions['1'] || 'Dead State (Trap)'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Graph View (React Flow) */}
      {activeTab === 'graph' && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Interactive State Transition Graph
              </h3>
              <p className="text-xs text-slate-400">
                Visualized using React Flow • Pan and zoom to inspect states and transitions.
              </p>
            </div>

            <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setGraphMode('dfa')}
                className={`px-3 py-1 rounded-lg transition ${
                  graphMode === 'dfa' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                DFA Graph
              </button>
              <button
                onClick={() => setGraphMode('nfa')}
                className={`px-3 py-1 rounded-lg transition ${
                  graphMode === 'nfa' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                NFA Stages (ε)
              </button>
            </div>
          </div>

          <div className="w-full h-[520px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              attributionPosition="bottom-left"
            >
              <Background color="#1e293b" gap={16} />
              <Controls />
              <MiniMap
                nodeColor={(n) => (n.id.includes('imm_4') || n.style?.background?.includes('064e3b') ? '#10b981' : '#0ea5e9')}
                style={{ background: '#020617', border: '1px solid #1e293b' }}
              />
            </ReactFlow>
          </div>
        </div>
      )}
    </div>
  );
}
