'use client';

import { BookOpen, FileText, Code2, Layers, Binary, GitFork, Cpu } from 'lucide-react';

export default function DocumentationPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BookOpen className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-extrabold text-white">Project Documentation & Architecture</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Theoretical specifications, mathematical formulations, and engineering principles.
        </p>
      </div>

      {/* Section 1: Educational 12-Bit Control-Word Format */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          1. Educational 12-Bit Micro-Architecture Control-Word Specification
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The simulator standardizes on a canonical 12-bit binary instruction word, divided into four discrete fields:
        </p>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-3">
          <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
            <div className="p-2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
              [11:8] Opcode (4b)
            </div>
            <div className="p-2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
              [7:6] Rdest (2b)
            </div>
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
              [5:4] Rsrc (2b)
            </div>
            <div className="p-2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
              [3:0] Imm / Offset (4b)
            </div>
          </div>

          <div className="text-slate-400 text-[11px] space-y-1">
            <div>• <strong>Opcode [11:8]:</strong> 16 operations (NOP, LOAD, STORE, ADD, SUB, AND, OR, XOR, INC, DEC, JMP, JZ, JNZ, IN, OUT, HALT).</div>
            <div>• <strong>Rdest [7:6]:</strong> Destination register (00: R0, 01: R1, 10: R2, 11: R3).</div>
            <div>• <strong>Rsrc [5:4]:</strong> Source register (00: R0, 01: R1, 10: R2, 11: R3).</div>
            <div>• <strong>Immediate [3:0]:</strong> Unsigned 4-bit constant or address offset (0 to 15).</div>
          </div>
        </div>
      </div>

      {/* Section 2: DAA Huffman Algorithms */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Binary className="w-4 h-4 text-indigo-400" />
          2. DAA: Greedy Huffman Algorithm & Shannon Entropy
        </h2>
        <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
          <p>
            David Huffman&apos;s greedy tree construction extracts the two lowest-frequency forest nodes iteratively
            from a min-priority queue with time complexity O(N log N).
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300">
            Shannon Entropy: H(X) = -Σ p_i · log2(p_i)<br />
            Expected Code Length: L = Σ p_i · l_i<br />
            Coding Bound: H(X) ≤ L &lt; H(X) + 1
          </div>
          <p>
            Storage calculations distinguish raw payload compression from total storage including serialized tree
            metadata overhead: (2N - 1) + (N · bits_per_symbol).
          </p>
        </div>
      </div>

      {/* Section 3: FLAT Automata Theory */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <GitFork className="w-4 h-4 text-cyan-400" />
          3. FLAT: Automata & Subset Construction
        </h2>
        <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
          <p>
            Non-Deterministic Finite Automata (NFA) are formally defined as M = (Q, Σ, Δ, q0, F). Epsilon (ε)
            transitions connect modular sub-expressions without consuming bitstream input.
          </p>
          <p>
            Rabin-Scott subset construction converts the NFA into a deterministic finite automaton (DFA), generating
            a full 2D transition table where each DFA state corresponds to an ε-closure subset of NFA states.
          </p>
          <p>
            Syntax validation (DFA language acceptance) is strictly decoupled from semantic micro-architectural validation.
          </p>
        </div>
      </div>

      {/* Section 4: COA Microprogrammed Control Unit */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          4. COA: Microprogrammed Control Store & CPU Pipeline
        </h2>
        <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
          <p>
            The microprogrammed control unit uses a Control Memory (ROM) indexed by the Microprogram Counter (μPC).
            Each microinstruction drives bus lines, ALU operations, register writes, data memory access, and branch sequencing.
          </p>
          <p>
            Variable-length instruction memory packing drastically reduces memory bus bandwidth compared to fixed-width
            uncompressed memory hierarchies.
          </p>
        </div>
      </div>
    </div>
  );
}
