'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  PlayCircle,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Cpu,
  Binary,
  GitFork,
  Sparkles,
  ShieldCheck,
  Activity,
  FileText,
  ChevronRight,
  Clock,
  HardDrive,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import {
  instructionToControlWord,
  parseInstructionToken,
  controlWordToMicroinstruction,
  SIMULATION_PRESETS,
} from '@/lib/simulation/bridge';
import { validateControlWord } from '@/lib/flat/validator';
import { ControlMemory } from '@/lib/coa/controlMemory';
import { ExecutionEngine, ENGINE_STATUS } from '@/lib/coa/executionEngine';

const STAGE_KEYS = {
  STAGE_1_LOAD: 'STAGE_1_LOAD',
  STAGE_2_COMPRESS: 'STAGE_2_COMPRESS',
  STAGE_3_METRICS: 'STAGE_3_METRICS',
  STAGE_4_DECOMPRESS: 'STAGE_4_DECOMPRESS',
  STAGE_5_VERIFY: 'STAGE_5_VERIFY',
  STAGE_6_TRANSLATE: 'STAGE_6_TRANSLATE',
  STAGE_7_DFA_VALIDATE: 'STAGE_7_DFA_VALIDATE',
  STAGE_8_LOAD_ROM: 'STAGE_8_LOAD_ROM',
  STAGE_9_EXECUTE: 'STAGE_9_EXECUTE',
  STAGE_10_REPORT: 'STAGE_10_REPORT',
};

const STAGE_CONFIG = [
  {
    key: STAGE_KEYS.STAGE_1_LOAD,
    number: 1,
    title: 'Load Microinstruction Sequence',
    domain: 'SOURCE',
    badgeColor: 'border-slate-500/30 text-slate-300 bg-slate-500/10',
    description: 'Load sequence of assembly instructions or micro-operations.',
  },
  {
    key: STAGE_KEYS.STAGE_2_COMPRESS,
    number: 2,
    title: 'DAA Huffman Compression',
    domain: 'DAA',
    badgeColor: 'border-violet-500/30 text-violet-300 bg-violet-500/10',
    description: 'Python min-heap algorithm constructs prefix tree and generates variable-length codes.',
  },
  {
    key: STAGE_KEYS.STAGE_3_METRICS,
    number: 3,
    title: 'Bitstream & Compression Metrics',
    domain: 'DAA',
    badgeColor: 'border-violet-500/30 text-violet-300 bg-violet-500/10',
    description: 'Inspect encoded bitstream payload, compression ratio, and storage reduction.',
  },
  {
    key: STAGE_KEYS.STAGE_4_DECOMPRESS,
    number: 4,
    title: 'DAA Huffman Decompression',
    domain: 'DAA',
    badgeColor: 'border-violet-500/30 text-violet-300 bg-violet-500/10',
    description: 'Python prefix tree traversal reconstructs original symbolic instruction stream.',
  },
  {
    key: STAGE_KEYS.STAGE_5_VERIFY,
    number: 5,
    title: 'Lossless Round-Trip Verification',
    domain: 'DAA',
    badgeColor: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
    description: 'Verify 100% exact equality: Decoded Tokens === Original Sequence.',
  },
  {
    key: STAGE_KEYS.STAGE_6_TRANSLATE,
    number: 6,
    title: '12-Bit Control-Word Binary Translation',
    domain: 'FLAT',
    badgeColor: 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10',
    description: 'Encode decoded tokens into documented format: [11:8] Op, [7:6] Rd, [5:4] Rs, [3:0] Imm.',
  },
  {
    key: STAGE_KEYS.STAGE_7_DFA_VALIDATE,
    number: 7,
    title: 'DFA Hardware Format Validation',
    domain: 'FLAT',
    badgeColor: 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10',
    description: 'FLAT subset-constructed DFA strictly verifies 12-bit syntax and architectural semantics.',
  },
  {
    key: STAGE_KEYS.STAGE_8_LOAD_ROM,
    number: 8,
    title: 'Stage into Control Memory (ROM)',
    domain: 'COA',
    badgeColor: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
    description: 'Load validated microinstructions into simulated Control Store at indexed μPC addresses.',
  },
  {
    key: STAGE_KEYS.STAGE_9_EXECUTE,
    number: 9,
    title: 'COA Microprogram Execution',
    domain: 'COA',
    badgeColor: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
    description: 'Execute cycle-by-cycle micro-operations, updating register file, ALU flags, and memory.',
  },
  {
    key: STAGE_KEYS.STAGE_10_REPORT,
    number: 10,
    title: 'Comprehensive Pipeline Final Report',
    domain: 'AUDIT',
    badgeColor: 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10',
    description: 'Final architectural audit report summarizing cross-domain verification and throughput.',
  },
];

const INITIAL_STAGES_STATE = STAGE_CONFIG.reduce((acc, stage) => {
  acc[stage.key] = {
    status: 'Pending', // 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Blocked'
    error: null,
    data: null,
    timeMs: null,
  };
  return acc;
}, {});

export default function SimulationPage() {
  const [selectedPresetId, setSelectedPresetId] = useState('arithmetic_store');
  const [stages, setStages] = useState(INITIAL_STAGES_STATE);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [currentRunningStage, setCurrentRunningStage] = useState(null);
  const [pipelineFinished, setPipelineFinished] = useState(false);
  const [pipelineError, setPipelineError] = useState(null);
  const [copiedBitstream, setCopiedBitstream] = useState(false);

  // COA Execution State for live UI display
  const [registersState, setRegistersState] = useState({
    R0: 0,
    R1: 0,
    R2: 0,
    R3: 0,
    PC: 0,
    IR: 0,
    MAR: 0,
    MDR: 0,
    TEMP: 0,
    flags: { Z: 0, S: 0, C: 0, V: 0 },
  });
  const [memoryState, setMemoryState] = useState({});
  const [executionHistory, setExecutionHistory] = useState([]);
  const [activeControlSignals, setActiveControlSignals] = useState(null);

  const activePreset = useMemo(() => {
    return (
      SIMULATION_PRESETS.find((p) => p.id === selectedPresetId) ||
      SIMULATION_PRESETS[0]
    );
  }, [selectedPresetId]);

  // Reset entire pipeline
  const handleReset = useCallback(() => {
    setStages(INITIAL_STAGES_STATE);
    setIsPipelineRunning(false);
    setCurrentRunningStage(null);
    setPipelineFinished(false);
    setPipelineError(null);
    setRegistersState({
      R0: 0,
      R1: 0,
      R2: 0,
      R3: 0,
      PC: 0,
      IR: 0,
      MAR: 0,
      MDR: 0,
      TEMP: 0,
      flags: { Z: 0, S: 0, C: 0, V: 0 },
    });
    setMemoryState({});
    setExecutionHistory([]);
    setActiveControlSignals(null);
  }, []);

  // Update single stage state helper
  const updateStage = (key, updates) => {
    setStages((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  };

  // Helper to mark remaining stages as Blocked
  const blockRemainingStages = (failedStageKey, reason) => {
    const stageIndex = STAGE_CONFIG.findIndex((s) => s.key === failedStageKey);
    setStages((prev) => {
      const next = { ...prev };
      for (let i = stageIndex + 1; i < STAGE_CONFIG.length; i++) {
        next[STAGE_CONFIG[i].key] = {
          status: 'Blocked',
          error: `Execution prevented: Dependent Stage ${STAGE_CONFIG[stageIndex].number} failed (${reason}).`,
          data: null,
          timeMs: null,
        };
      }
      return next;
    });
    setPipelineError(`Pipeline halted at Stage ${STAGE_CONFIG[stageIndex].number}: ${reason}`);
    setIsPipelineRunning(false);
    setCurrentRunningStage(null);
    setPipelineFinished(true);
  };

  // Run the full pipeline through all 10 stages
  const runCompleteSimulation = async () => {
    handleReset();
    setIsPipelineRunning(true);
    setPipelineError(null);

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // -------------------------------------------------------------
      // STAGE 1: Load Sample Sequence
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_1_LOAD);
      updateStage(STAGE_KEYS.STAGE_1_LOAD, { status: 'Running' });
      await sleep(150);

      const sequence = activePreset.sequence;
      const originalTokens = sequence.map((s) => s.token);
      updateStage(STAGE_KEYS.STAGE_1_LOAD, {
        status: 'Completed',
        data: {
          preset: activePreset.name,
          sequence,
          tokenCount: originalTokens.length,
        },
      });

      // -------------------------------------------------------------
      // STAGE 2: DAA Huffman Compression via FastAPI backend
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_2_COMPRESS);
      updateStage(STAGE_KEYS.STAGE_2_COMPRESS, { status: 'Running' });
      const t0 = performance.now();

      const compressRes = await apiClient.compress(originalTokens, 12);
      const compressDuration = (performance.now() - t0).toFixed(2);

      if (!compressRes.success) {
        updateStage(STAGE_KEYS.STAGE_2_COMPRESS, {
          status: 'Failed',
          error: compressRes.error,
          timeMs: compressDuration,
        });
        blockRemainingStages(STAGE_KEYS.STAGE_2_COMPRESS, compressRes.error);
        return;
      }

      let { bitstring, codebook, tree, metrics } = compressRes.data;

      // Handle intentional fault injection if active preset requests faulty bitstring
      if (activePreset.id === 'fault_invalid_word' && activePreset.faultyBitstringOverride) {
        // We allow DAA to finish, but we inject bad control word for FLAT Stage 7
      }

      updateStage(STAGE_KEYS.STAGE_2_COMPRESS, {
        status: 'Completed',
        data: {
          codebook,
          tree,
          bitCount: bitstring.length,
          metrics,
        },
        timeMs: compressDuration,
      });

      // -------------------------------------------------------------
      // STAGE 3: Bitstream & Compression Metrics
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_3_METRICS);
      updateStage(STAGE_KEYS.STAGE_3_METRICS, { status: 'Running' });
      await sleep(120);

      updateStage(STAGE_KEYS.STAGE_3_METRICS, {
        status: 'Completed',
        data: {
          bitstring,
          originalBits: metrics.original_bits,
          compressedBits: metrics.payload_bits,
          ratio: metrics.payload_compression_ratio,
          savings: metrics.payload_space_savings_percent,
          entropy: metrics.shannon_entropy,
        },
      });

      // -------------------------------------------------------------
      // STAGE 4: DAA Huffman Decompression via FastAPI backend
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_4_DECOMPRESS);
      updateStage(STAGE_KEYS.STAGE_4_DECOMPRESS, { status: 'Running' });
      const t1 = performance.now();

      const decompressRes = await apiClient.decompress(bitstring, codebook, false);
      const decompressDuration = (performance.now() - t1).toFixed(2);

      if (!decompressRes.success) {
        updateStage(STAGE_KEYS.STAGE_4_DECOMPRESS, {
          status: 'Failed',
          error: decompressRes.error,
          timeMs: decompressDuration,
        });
        blockRemainingStages(STAGE_KEYS.STAGE_4_DECOMPRESS, decompressRes.error);
        return;
      }

      const decodedTokens = decompressRes.data.decoded;
      updateStage(STAGE_KEYS.STAGE_4_DECOMPRESS, {
        status: 'Completed',
        data: {
          decodedTokens,
          symbolCount: decodedTokens.length,
        },
        timeMs: decompressDuration,
      });

      // -------------------------------------------------------------
      // STAGE 5: Lossless Round-Trip Verification
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_5_VERIFY);
      updateStage(STAGE_KEYS.STAGE_5_VERIFY, { status: 'Running' });
      await sleep(100);

      const lengthMatch = decodedTokens.length === originalTokens.length;
      let exactMatch = lengthMatch;
      const diffs = [];

      if (lengthMatch) {
        for (let i = 0; i < originalTokens.length; i++) {
          if (decodedTokens[i] !== originalTokens[i]) {
            exactMatch = false;
            diffs.push({ index: i, expected: originalTokens[i], got: decodedTokens[i] });
          }
        }
      }

      if (!exactMatch) {
        const errorMsg = `Lossless verification failed: Decoded tokens do not match original sequence (${diffs.length} differences).`;
        updateStage(STAGE_KEYS.STAGE_5_VERIFY, {
          status: 'Failed',
          error: errorMsg,
          data: { diffs },
        });
        blockRemainingStages(STAGE_KEYS.STAGE_5_VERIFY, errorMsg);
        return;
      }

      updateStage(STAGE_KEYS.STAGE_5_VERIFY, {
        status: 'Completed',
        data: {
          isLossless: true,
          matchRate: '100.0%',
          tokenCount: decodedTokens.length,
        },
      });

      // -------------------------------------------------------------
      // STAGE 6: 12-Bit Control-Word Binary Translation
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_6_TRANSLATE);
      updateStage(STAGE_KEYS.STAGE_6_TRANSLATE, { status: 'Running' });
      await sleep(150);

      const controlWordEntries = [];
      let translationError = null;

      for (let i = 0; i < decodedTokens.length; i++) {
        const token = decodedTokens[i];

        // Fault injection check
        if (activePreset.id === 'fault_invalid_word' && i === 2) {
          controlWordEntries.push({
            token,
            bitstring: activePreset.faultyBitstringOverride || '00110001010X99',
            index: i,
            isFaultInjected: true,
          });
          continue;
        }

        try {
          const parsed = parseInstructionToken(token);
          const bits = instructionToControlWord(parsed);
          controlWordEntries.push({
            token,
            parsed,
            bitstring: bits,
            index: i,
          });
        } catch (err) {
          translationError = `Token #${i} ('${token}') failed translation: ${err.message}`;
          break;
        }
      }

      if (translationError) {
        updateStage(STAGE_KEYS.STAGE_6_TRANSLATE, {
          status: 'Failed',
          error: translationError,
        });
        blockRemainingStages(STAGE_KEYS.STAGE_6_TRANSLATE, translationError);
        return;
      }

      updateStage(STAGE_KEYS.STAGE_6_TRANSLATE, {
        status: 'Completed',
        data: {
          entries: controlWordEntries,
        },
      });

      // -------------------------------------------------------------
      // STAGE 7: DFA Hardware Format Validation (FLAT Automaton)
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_7_DFA_VALIDATE);
      updateStage(STAGE_KEYS.STAGE_7_DFA_VALIDATE, { status: 'Running' });
      await sleep(200);

      const dfaValidationResults = [];
      let validationFailure = null;

      for (const entry of controlWordEntries) {
        const result = validateControlWord(entry.bitstring);
        dfaValidationResults.push({
          entry,
          result,
        });

        if (!result.isValid) {
          const reason = result.syntax.error ||
            (result.semantics && result.semantics.errors.join('; ')) ||
            'Rejected by control word DFA.';
          validationFailure = `Control word at index ${entry.index} ('${entry.bitstring}') failed DFA validation: ${reason}`;
          break;
        }
      }

      if (validationFailure) {
        updateStage(STAGE_KEYS.STAGE_7_DFA_VALIDATE, {
          status: 'Failed',
          error: validationFailure,
          data: { results: dfaValidationResults },
        });
        blockRemainingStages(STAGE_KEYS.STAGE_7_DFA_VALIDATE, validationFailure);
        return;
      }

      updateStage(STAGE_KEYS.STAGE_7_DFA_VALIDATE, {
        status: 'Completed',
        data: {
          results: dfaValidationResults,
          validatedCount: dfaValidationResults.length,
          syntaxPassRate: '100%',
          semanticsPassRate: '100%',
        },
      });

      // -------------------------------------------------------------
      // STAGE 8: Stage into Control Memory (COA ROM)
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_8_LOAD_ROM);
      updateStage(STAGE_KEYS.STAGE_8_LOAD_ROM, { status: 'Running' });
      await sleep(150);

      const microprogram = controlWordEntries.map((e, idx) =>
        controlWordToMicroinstruction(e.bitstring, idx)
      );
      const controlMemory = new ControlMemory(microprogram);

      updateStage(STAGE_KEYS.STAGE_8_LOAD_ROM, {
        status: 'Completed',
        data: {
          romSize: controlMemory.size(),
          microprogram,
        },
      });

      // -------------------------------------------------------------
      // STAGE 9: COA Microprogram Execution
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_9_EXECUTE);
      updateStage(STAGE_KEYS.STAGE_9_EXECUTE, { status: 'Running' });

      const engine = new ExecutionEngine({ controlMemory });
      const stepHistory = [];

      // Step through with animation
      while (
        engine.status !== ENGINE_STATUS.HALTED &&
        engine.status !== ENGINE_STATUS.ERROR &&
        engine.cycleCount < 100
      ) {
        const log = engine.step();
        stepHistory.push(log);

        setRegistersState({
          R0: engine.registers.read('R0'),
          R1: engine.registers.read('R1'),
          R2: engine.registers.read('R2'),
          R3: engine.registers.read('R3'),
          PC: engine.registers.read('PC'),
          IR: engine.registers.read('IR'),
          MAR: engine.registers.read('MAR'),
          MDR: engine.registers.read('MDR'),
          TEMP: engine.registers.read('TEMP'),
          flags: { ...engine.registers.flags },
        });
        setMemoryState({ ...engine.dataMemory.storage });
        setExecutionHistory([...stepHistory]);
        setActiveControlSignals(log.controlSignals);

        await sleep(100);
      }

      if (engine.status === ENGINE_STATUS.ERROR) {
        const err = engine.lastError || 'Micro-architectural execution error.';
        updateStage(STAGE_KEYS.STAGE_9_EXECUTE, {
          status: 'Failed',
          error: err,
        });
        blockRemainingStages(STAGE_KEYS.STAGE_9_EXECUTE, err);
        return;
      }

      updateStage(STAGE_KEYS.STAGE_9_EXECUTE, {
        status: 'Completed',
        data: {
          cyclesExecuted: engine.cycleCount,
          finalStatus: engine.status,
          finalRegisters: {
            R0: engine.registers.read('R0'),
            R1: engine.registers.read('R1'),
            R2: engine.registers.read('R2'),
            R3: engine.registers.read('R3'),
          },
          flags: { ...engine.registers.flags },
        },
      });

      // -------------------------------------------------------------
      // STAGE 10: Final Integrated Report
      // -------------------------------------------------------------
      setCurrentRunningStage(STAGE_KEYS.STAGE_10_REPORT);
      updateStage(STAGE_KEYS.STAGE_10_REPORT, { status: 'Running' });
      await sleep(150);

      updateStage(STAGE_KEYS.STAGE_10_REPORT, {
        status: 'Completed',
        data: {
          auditVerdict: 'PIPELINE_VERIFIED_SUCCESSFUL',
          originalInstructionCount: originalTokens.length,
          compressedBitLength: bitstring.length,
          compressionRatio: metrics.payload_compression_ratio,
          spaceSavings: `${metrics.payload_space_savings_percent.toFixed(1)}%`,
          losslessMatch: '100.0%',
          dfaPassRate: '100.0%',
          executionCycles: engine.cycleCount,
          finalRegisters: {
            R0: engine.registers.read('R0'),
            R1: engine.registers.read('R1'),
            R2: engine.registers.read('R2'),
            R3: engine.registers.read('R3'),
          },
        },
      });

      setCurrentRunningStage(null);
      setIsPipelineRunning(false);
      setPipelineFinished(true);
    } catch (unexpectedErr) {
      console.error('Pipeline error:', unexpectedErr);
      setPipelineError(`Unexpected pipeline failure: ${unexpectedErr.message}`);
      setIsPipelineRunning(false);
      setCurrentRunningStage(null);
    }
  };

  const copyBitstreamToClipboard = () => {
    const bitstring = stages[STAGE_KEYS.STAGE_3_METRICS]?.data?.bitstring;
    if (bitstring) {
      navigator.clipboard.writeText(bitstring);
      setCopiedBitstream(true);
      setTimeout(() => setCopiedBitstream(false), 2000);
    }
  };

  const completedStagesCount = useMemo(() => {
    return Object.values(stages).filter((s) => s.status === 'Completed').length;
  }, [stages]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 8: Integrated End-to-End Simulation</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Cross-Domain Micro-Architecture Pipeline
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Connects the three independent disciplines without duplicating algorithm code:
              <span className="text-violet-400 font-semibold"> DAA Huffman Compression</span> packs the instruction sequence,
              <span className="text-cyan-400 font-semibold"> FLAT Automata DFA</span> validates 12-bit control words, and
              <span className="text-emerald-400 font-semibold"> COA Control Store</span> simulates cycle-by-cycle register execution.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap md:flex-col items-stretch gap-3 shrink-0">
            <button
              onClick={runCompleteSimulation}
              disabled={isPipelineRunning}
              className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
                isPipelineRunning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:from-cyan-400 hover:to-indigo-500 active:scale-95 shadow-cyan-500/20'
              }`}
            >
              <PlayCircle className={`w-4 h-4 ${isPipelineRunning ? 'animate-spin' : ''}`} />
              <span>{isPipelineRunning ? 'Pipeline Running...' : 'Run Full Simulation'}</span>
            </button>

            <button
              onClick={handleReset}
              disabled={isPipelineRunning}
              className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Pipeline</span>
            </button>
          </div>
        </div>

        {/* Pipeline Progress Indicator */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>Pipeline Progression: {completedStagesCount} / 10 Stages Completed</span>
            <span className={pipelineError ? 'text-rose-400 font-bold' : pipelineFinished ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {pipelineError ? 'Status: HALTED (Error Injected)' : pipelineFinished ? 'Status: 100% VERIFIED' : isPipelineRunning ? 'Status: EXECUTING' : 'Status: READY'}
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                pipelineError
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-500'
              }`}
              style={{ width: `${(completedStagesCount / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Preset Selector Banner */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Select Test Microinstruction Sequence:
          </span>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose a preset sequence to observe nominal execution or trigger safety stops.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {SIMULATION_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            const isFault = preset.id === 'fault_invalid_word';
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  handleReset();
                }}
                disabled={isPipelineRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
                  isSelected
                    ? isFault
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pipeline Error Alert */}
      {pipelineError && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 text-rose-300 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-200">Pipeline Safeguard Triggered</h4>
            <p className="text-xs leading-relaxed text-rose-300/90">{pipelineError}</p>
            <p className="text-[11px] font-mono text-rose-400 mt-1">
              Safety rule enforced: Dependent stages (COA Control Memory & Register Execution) were blocked.
              No invalid microinstructions were executed.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: 10 Pipeline Stages (Left 7 Cols) + Live COA Machine State (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Stages List (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Ten-Stage Pipeline Execution Tracker
          </h2>

          <div className="space-y-3">
            {STAGE_CONFIG.map((stage) => {
              const state = stages[stage.key];
              const isCurrent = currentRunningStage === stage.key;

              return (
                <div
                  key={stage.key}
                  className={`p-4 rounded-xl border transition-all ${
                    state.status === 'Completed'
                      ? 'border-emerald-500/30 bg-slate-900/60'
                      : state.status === 'Running'
                      ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-500/30'
                      : state.status === 'Failed'
                      ? 'border-rose-500/50 bg-rose-950/30'
                      : state.status === 'Blocked'
                      ? 'border-slate-800/60 bg-slate-950/40 opacity-60'
                      : 'border-slate-800 bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Step Number Badge */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          state.status === 'Completed'
                            ? 'bg-emerald-500 text-black'
                            : state.status === 'Running'
                            ? 'bg-cyan-500 text-black animate-pulse'
                            : state.status === 'Failed'
                            ? 'bg-rose-500 text-white'
                            : state.status === 'Blocked'
                            ? 'bg-slate-800 text-slate-500'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {state.status === 'Completed' ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : state.status === 'Failed' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          stage.number
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${stage.badgeColor}`}>
                            {stage.domain}
                          </span>
                          <h3 className="text-xs font-bold text-slate-200">
                            {stage.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {stage.description}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      <span
                        className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                          state.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : state.status === 'Running'
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse'
                            : state.status === 'Failed'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold'
                            : state.status === 'Blocked'
                            ? 'bg-slate-800/40 text-slate-500 border-slate-700/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700/50'
                        }`}
                      >
                        {state.status}
                        {state.timeMs ? ` (${state.timeMs}ms)` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Stage-Specific Detailed Inspection Body */}
                  {state.status === 'Completed' && state.data && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs font-mono space-y-2">
                      {/* STAGE 1 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_1_LOAD && (
                        <div className="space-y-1 text-slate-300">
                          <span className="text-[11px] text-slate-400">Loaded Sequence ({state.data.tokenCount} instructions):</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {state.data.sequence.map((inst, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-cyan-300">
                                {idx}: {inst.token}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* STAGE 2 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_2_COMPRESS && (
                        <div className="grid grid-cols-2 gap-2 text-slate-300">
                          <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block">Encoded Bitstream:</span>
                            <span className="text-violet-300 font-bold">{state.data.bitCount} bits</span>
                          </div>
                          <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block">Payload Ratio:</span>
                            <span className="text-emerald-400 font-bold">{state.data.metrics.payload_compression_ratio}x</span>
                          </div>
                        </div>
                      )}

                      {/* STAGE 3 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_3_METRICS && (
                        <div className="space-y-2">
                          <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 break-all flex items-center justify-between gap-2">
                            <span>Bitstream: <span className="text-violet-300 font-semibold">{state.data.bitstring}</span></span>
                            <button
                              onClick={copyBitstreamToClipboard}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 shrink-0 text-[10px]"
                            >
                              {copiedBitstream ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedBitstream ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                            <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                              <span className="text-slate-400 block">Original</span>
                              <span className="text-slate-200 font-bold">{state.data.originalBits} bits</span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                              <span className="text-slate-400 block">Compressed</span>
                              <span className="text-violet-400 font-bold">{state.data.compressedBits} bits</span>
                            </div>
                            <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                              <span className="text-slate-400 block">Savings</span>
                              <span className="text-emerald-400 font-bold">{state.data.savings.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STAGE 4 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_4_DECOMPRESS && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400">Decoded Symbolic Stream ({state.data.symbolCount} symbols):</span>
                          <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-emerald-300">
                            {state.data.decodedTokens.join(' -> ')}
                          </div>
                        </div>
                      )}

                      {/* STAGE 5 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_5_VERIFY && (
                        <div className="flex items-center justify-between p-2 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Round-Trip Integrity: 100% Lossless Match</span>
                          </span>
                          <span className="font-bold">{state.data.tokenCount} / {state.data.tokenCount} Matched</span>
                        </div>
                      )}

                      {/* STAGE 6 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_6_TRANSLATE && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400">Documented 12-Bit Control Word Binary Representations:</span>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {state.data.entries.map((entry, idx) => (
                              <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                                <span className="text-slate-400">{entry.token}</span>
                                <div className="space-x-1 font-mono">
                                  <span className="text-cyan-400 font-bold" title="Opcode [11:8]">{entry.bitstring.slice(0, 4)}</span>
                                  <span className="text-amber-400" title="Dest [7:6]">{entry.bitstring.slice(4, 6)}</span>
                                  <span className="text-violet-400" title="Src [5:4]">{entry.bitstring.slice(6, 8)}</span>
                                  <span className="text-emerald-400" title="Imm [3:0]">{entry.bitstring.slice(8, 12)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* STAGE 7 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_7_DFA_VALIDATE && (
                        <div className="flex items-center justify-between p-2 rounded bg-cyan-950/20 border border-cyan-500/30 text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>DFA Acceptance: All {state.data.validatedCount} Words Validated</span>
                          </span>
                          <span className="font-bold text-slate-300">Syntax & Semantics Passed</span>
                        </div>
                      )}

                      {/* STAGE 8 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_8_LOAD_ROM && (
                        <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center justify-between">
                          <span>Control Memory (ROM) Staged:</span>
                          <span className="text-emerald-400 font-bold">{state.data.romSize} Microinstructions</span>
                        </div>
                      )}

                      {/* STAGE 9 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_9_EXECUTE && (
                        <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center justify-between">
                          <span>Execution Terminated Cleanly:</span>
                          <span className="text-amber-400 font-bold">{state.data.cyclesExecuted} Clock Cycles ({state.data.finalStatus})</span>
                        </div>
                      )}

                      {/* STAGE 10 DATA */}
                      {stage.key === STAGE_KEYS.STAGE_10_REPORT && (
                        <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30 space-y-2 text-indigo-200">
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Audit Verdict:</span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              SUCCESS (100% Lossless)
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-indigo-500/20">
                            <div>Compression Ratio: <span className="text-white font-bold">{state.data.compressionRatio}x</span></div>
                            <div>Space Savings: <span className="text-emerald-400 font-bold">{state.data.spaceSavings}</span></div>
                            <div>DFA Hardware Pass: <span className="text-cyan-400 font-bold">100%</span></div>
                            <div>Total Clock Cycles: <span className="text-amber-400 font-bold">{state.data.executionCycles}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stage Error Display */}
                  {state.status === 'Failed' && state.error && (
                    <div className="mt-3 pt-3 border-t border-rose-500/30 text-xs font-mono text-rose-300 space-y-1">
                      <span className="text-rose-400 font-bold block">Error Diagnostic:</span>
                      <p className="bg-slate-950/80 p-2 rounded border border-rose-500/30 text-[11px] leading-relaxed">
                        {state.error}
                      </p>
                    </div>
                  )}

                  {/* Blocked State Display */}
                  {state.status === 'Blocked' && (
                    <div className="mt-2 text-[11px] font-mono text-slate-500 italic">
                      {state.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live COA Machine State & Microprogram Inspector (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Live Micro-Architecture Machine State
          </h2>

          {/* Active Control Signals Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300">Active Hardware Control Signals</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                COA DECODER
              </span>
            </div>

            {activeControlSignals ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">ALU Operation:</span>
                  <span className="text-amber-400 font-bold">{activeControlSignals.ALU}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Dest Write:</span>
                  <span className="text-cyan-400 font-bold">{activeControlSignals.DEST_WRITE}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Bus A Source:</span>
                  <span className="text-slate-300 font-bold">{activeControlSignals.BUS_A}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Bus B Source:</span>
                  <span className="text-slate-300 font-bold">{activeControlSignals.BUS_B}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic font-mono py-2">
                No active microinstruction currently loaded on the control bus.
              </p>
            )}
          </div>

          {/* Register File Panel */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300">16-Bit Register File</span>
              <div className="flex items-center gap-1.5">
                {['Z', 'S', 'C', 'V'].map((flag) => {
                  const isActive = registersState.flags[flag] === 1;
                  return (
                    <span
                      key={flag}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border transition ${
                        isActive
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-slate-950 text-slate-600 border-slate-800'
                      }`}
                    >
                      {flag}={registersState.flags[flag]}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {['R0', 'R1', 'R2', 'R3', 'PC', 'MAR', 'MDR', 'TEMP'].map((reg) => {
                const val = registersState[reg] || 0;
                return (
                  <div key={reg} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-400 font-bold">{reg}:</span>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold block">{val}</span>
                      <span className="text-[10px] text-slate-500 block">0x{val.toString(16).padStart(4, '0')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Memory Inspector */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-3">
            <span className="text-xs font-mono font-bold text-slate-300">Data Memory Snapshot (Non-zero words)</span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {Object.keys(memoryState).length > 0 ? (
                Object.entries(memoryState).map(([addr, val]) => (
                  <div key={addr} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono">
                    <span className="text-slate-400">Address 0x{Number(addr).toString(16).padStart(2, '0')}:</span>
                    <span className="text-cyan-400 font-bold">{val} (0x{Number(val).toString(16)})</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic font-mono py-2">
                  All memory cells currently initialized to 0x0000.
                </p>
              )}
            </div>
          </div>

          {/* Cycle Timeline Log */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-3">
            <span className="text-xs font-mono font-bold text-slate-300">Cycle-by-Cycle Execution Log</span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs font-mono">
              {executionHistory.length > 0 ? (
                executionHistory.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-cyan-400 font-bold">Cycle #{entry.step}</span>
                      <span className="text-slate-400">μPC: {entry.uPC}</span>
                    </div>
                    <p className="text-slate-300 text-[10px]">{entry.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic font-mono py-2">
                  No cycles executed yet. Run simulation to populate.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
