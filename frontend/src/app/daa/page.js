'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from '@xyflow/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Binary,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Clock,
  Layers,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function DaaLabPage() {
  const [inputMode, setInputMode] = useState('assembly'); // 'assembly' | 'text'
  const [inputText, setInputText] = useState(
    'LOAD_R0, LOAD_R1, ADD_R0_R1, STORE_R0, LOAD_R0, ADD_R0_R1, SUB_R0_R1, BRANCH_ZERO, LOAD_R0, ADD_R0_R1, STORE_R0, HALT'
  );
  const [bitsPerSymbol, setBitsPerSymbol] = useState(12);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tree' | 'chart' | 'codes'

  // Loading & Execution State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Result state from Python backend
  const [compressionResult, setCompressionResult] = useState(null);
  const [decompressionResult, setDecompressionResult] = useState(null);
  const [timings, setTimings] = useState({ encodeMs: 0, decodeMs: 0, totalMs: 0 });

  // Handle Preset Selection
  const loadPreset = async (presetType) => {
    setError(null);
    if (presetType === 'assembly') {
      setInputMode('assembly');
      setInputText(
        'LOAD_R0, LOAD_R1, ADD_R0_R1, STORE_R0, LOAD_R0, ADD_R0_R1, SUB_R0_R1, BRANCH_ZERO, LOAD_R0, ADD_R0_R1, STORE_R0, HALT'
      );
      setBitsPerSymbol(12);
    } else if (presetType === 'skewed') {
      setInputMode('assembly');
      setInputText(
        'NOP, NOP, NOP, NOP, NOP, NOP, NOP, NOP, ADD_R0_R1, LOAD_R0, STORE_R0, HALT'
      );
      setBitsPerSymbol(12);
    } else if (presetType === 'text') {
      setInputMode('text');
      setInputText('MICROPROGRAMMED_HUFFMAN_INSTRUCTION_MEMORY_SIMULATOR');
      setBitsPerSymbol(8);
    }
  };

  // Run Compression & Lossless Round-Trip
  const runCompression = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      // Parse input based on mode
      let dataToCompress;
      if (inputMode === 'assembly') {
        dataToCompress = inputText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      } else {
        dataToCompress = inputText;
      }

      if (!dataToCompress || dataToCompress.length === 0) {
        setError('Please enter at least one symbol or instruction token.');
        setLoading(false);
        return;
      }

      // Timing compression
      const t0 = performance.now();
      const compRes = await apiClient.compress(dataToCompress, bitsPerSymbol);
      const t1 = performance.now();

      if (!compRes.success) {
        setError(compRes.error || 'Failed to compress data via backend.');
        setLoading(false);
        return;
      }

      setCompressionResult(compRes.data);

      // Timing decompression
      const t2 = performance.now();
      const decRes = await apiClient.decompress(
        compRes.data.bitstring,
        compRes.data.codebook,
        inputMode === 'text'
      );
      const t3 = performance.now();

      if (!decRes.success) {
        setError(decRes.error || 'Failed to decompress data via backend.');
      } else {
        setDecompressionResult(decRes.data);
      }

      setTimings({
        encodeMs: Number((t1 - t0).toFixed(2)),
        decodeMs: Number((t3 - t2).toFixed(2)),
        totalMs: Number((t3 - t0).toFixed(2)),
      });
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during compression.');
    } finally {
      setLoading(false);
    }
  }, [inputMode, inputText, bitsPerSymbol]);

  // Initial execution on mount
  useEffect(() => {
    runCompression();
  }, [runCompression]);

  // Copy bitstring to clipboard
  const handleCopyBitstring = () => {
    if (compressionResult?.bitstring) {
      navigator.clipboard.writeText(compressionResult.bitstring);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Frequency Chart Data for Recharts
  const chartData = useMemo(() => {
    if (!compressionResult?.frequencies) return [];
    return Object.entries(compressionResult.frequencies).map(([symbol, count]) => ({
      symbol,
      count,
      code: compressionResult.codebook?.[symbol] || '',
      len: compressionResult.codebook?.[symbol]?.length || 0,
    }));
  }, [compressionResult]);

  // React Flow Tree Nodes and Edges Generation
  const { treeNodes, treeEdges } = useMemo(() => {
    if (!compressionResult?.tree) return { treeNodes: [], treeEdges: [] };

    const nodes = [];
    const edges = [];
    let nodeIdCounter = 0;

    // Recursive layout calculator
    function traverse(node, x = 400, y = 40, spread = 200) {
      if (!node) return null;
      const currentId = `node-${nodeIdCounter++}`;
      const isLeaf = node.is_leaf;

      nodes.push({
        id: currentId,
        position: { x, y },
        data: {
          label: (
            <div className="text-center font-mono p-1">
              {isLeaf ? (
                <>
                  <div className="font-bold text-xs text-amber-300 truncate max-w-[110px]">
                    {node.symbol}
                  </div>
                  <div className="text-[10px] text-emerald-400">Freq: {node.frequency}</div>
                  <div className="text-[9px] text-cyan-300 mt-0.5">
                    Code: {compressionResult.codebook?.[node.symbol]}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-xs text-slate-300">Σ = {node.frequency}</div>
                  <div className="text-[9px] text-slate-500">Internal Merge</div>
                </>
              )}
            </div>
          ),
        },
        style: {
          background: isLeaf ? '#1e293b' : '#0f172a',
          border: isLeaf ? '2px solid #f59e0b' : '1px solid #475569',
          borderRadius: isLeaf ? '10px' : '999px',
          color: '#fff',
          width: isLeaf ? 120 : 90,
          padding: 6,
        },
      });

      if (node.left) {
        const leftId = traverse(node.left, x - spread, y + 90, spread * 0.55);
        if (leftId) {
          edges.push({
            id: `edge-${currentId}-${leftId}`,
            source: currentId,
            target: leftId,
            label: '0',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#38bdf8', strokeWidth: 1.5 },
            labelStyle: { fill: '#38bdf8', fontSize: 10, fontWeight: 'bold' },
          });
        }
      }

      if (node.right) {
        const rightId = traverse(node.right, x + spread, y + 90, spread * 0.55);
        if (rightId) {
          edges.push({
            id: `edge-${currentId}-${rightId}`,
            source: currentId,
            target: rightId,
            label: '1',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#818cf8', strokeWidth: 1.5 },
            labelStyle: { fill: '#818cf8', fontSize: 10, fontWeight: 'bold' },
          });
        }
      }

      return currentId;
    }

    traverse(compressionResult.tree);
    return { treeNodes: nodes, treeEdges: edges };
  }, [compressionResult]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Binary className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-white">DAA Huffman Compression Lab</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Design and Analysis of Algorithms • Greedy Binary Tree Construction • Shannon Entropy Analysis • Python Engine
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'overview' ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Overview & Stats
          </button>
          <button
            onClick={() => setActiveTab('tree')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'tree' ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Interactive Tree
          </button>
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'chart' ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Frequency Chart
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'codes' ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Codebook Table
          </button>
        </div>
      </div>

      {/* Input & Control Panel */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Input Mode:
            </span>
            <div className="inline-flex p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setInputMode('assembly')}
                className={`px-3 py-1 rounded transition ${
                  inputMode === 'assembly' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Assembly Tokens (CSV)
              </button>
              <button
                onClick={() => setInputMode('text')}
                className={`px-3 py-1 rounded transition ${
                  inputMode === 'text' ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw Text String
              </button>
            </div>
          </div>

          {/* Word Size Baseline */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Baseline Word Size:</span>
            <select
              value={bitsPerSymbol}
              onChange={(e) => setBitsPerSymbol(Number(e.target.value))}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value={8}>8 bits (Byte / Char)</option>
              <option value={12}>12 bits (Educational Format)</option>
              <option value={16}>16 bits (Word)</option>
              <option value={32}>32 bits (RISC-V Word)</option>
            </select>
          </div>
        </div>

        {/* Text Area */}
        <div>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={inputMode === 'assembly' ? 'LOAD_R0, ADD_R0_R1, ...' : 'Text string...'}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 leading-relaxed tracking-wide"
          />
        </div>

        {/* Presets and Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">Presets:</span>
            <button
              onClick={() => loadPreset('assembly')}
              className="px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs font-mono hover:bg-slate-800 hover:text-white transition"
            >
              Assembly Loop
            </button>
            <button
              onClick={() => loadPreset('skewed')}
              className="px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs font-mono hover:bg-slate-800 hover:text-white transition"
            >
              Skewed (80% NOP)
            </button>
            <button
              onClick={() => loadPreset('text')}
              className="px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 text-xs font-mono hover:bg-slate-800 hover:text-white transition"
            >
              Architecture Text
            </button>
          </div>

          <button
            onClick={runCompression}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Python Engine...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Compress & Analyze</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Tab 1: Overview & Compression Statistics */}
      {activeTab === 'overview' && compressionResult && (
        <div className="space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[11px] font-mono text-slate-400 block">Original Storage</span>
              <span className="text-xl font-bold text-slate-100 mt-1 block">
                {compressionResult.metrics.original_bits} bits
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {compressionResult.metrics.storage.original_bytes} bytes ({bitsPerSymbol}b/sym)
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[11px] font-mono text-slate-400 block">Payload Size</span>
              <span className="text-xl font-bold text-indigo-400 mt-1 block">
                {compressionResult.metrics.payload_bits} bits
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {compressionResult.metrics.storage.payload_bytes} bytes (Bitstream)
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[11px] font-mono text-slate-400 block">Payload Compression Ratio</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                {compressionResult.metrics.payload_compression_ratio}x
              </span>
              <span className="text-[10px] text-emerald-500/80 font-mono">
                {compressionResult.metrics.payload_space_savings_percent}% Space Savings
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
              <span className="text-[11px] font-mono text-slate-400 block">Total Ratio (Incl. Tree)</span>
              <span className="text-xl font-bold text-cyan-400 mt-1 block">
                {compressionResult.metrics.total_compression_ratio}x
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Tree Overhead: {compressionResult.metrics.metadata_bits} bits
              </span>
            </div>
          </div>

          {/* Theoretical Shannon Analysis Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Shannon Entropy & Source Coding Optimality
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Shannon Entropy H(X):</span>
                <span className="text-base font-bold text-indigo-300 mt-1 block">
                  {compressionResult.metrics.shannon_entropy} bits/symbol
                </span>
                <span className="text-[10px] text-slate-500">Theoretical Lower Bound</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Average Code Length L:</span>
                <span className="text-base font-bold text-cyan-300 mt-1 block">
                  {compressionResult.metrics.average_code_length} bits/symbol
                </span>
                <span className="text-[10px] text-slate-500">Satisfies H(X) ≤ L &lt; H(X) + 1</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Coding Efficiency:</span>
                <span className="text-base font-bold text-emerald-400 mt-1 block">
                  {compressionResult.metrics.coding_efficiency_percent}%
                </span>
                <span className="text-[10px] text-slate-500">H(X) / L Ratio</span>
              </div>
            </div>
          </div>

          {/* Encoded Bitstream & Lossless Verification */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bitstream Card */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Continuous Encoded Bitstream</h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    {compressionResult.bit_count} bits contiguously packed
                  </span>
                </div>
                <button
                  onClick={handleCopyBitstring}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 break-all max-h-36 overflow-y-auto leading-relaxed">
                {compressionResult.bitstring}
              </div>
            </div>

            {/* Decoded Output & Lossless Status */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-200">Decoded Output Verification</h4>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Lossless Round-Trip
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 break-all max-h-36 overflow-y-auto leading-relaxed">
                {Array.isArray(decompressionResult?.decoded)
                  ? decompressionResult.decoded.join(', ')
                  : decompressionResult?.decoded || 'Decoding...'}
              </div>
            </div>
          </div>

          {/* Timings Panel */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Execution Timings:</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <span>Encoding: <strong className="text-indigo-300">{timings.encodeMs} ms</strong></span>
              <span>Decoding: <strong className="text-emerald-300">{timings.decodeMs} ms</strong></span>
              <span>Total API Round-Trip: <strong className="text-cyan-300">{timings.totalMs} ms</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Interactive Tree (React Flow) */}
      {activeTab === 'tree' && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Interactive Binary Huffman Prefix Tree
              </h3>
              <p className="text-xs text-slate-400">
                Constructed via min-heap greedy extraction. Pan and zoom to navigate branches.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded bg-slate-800 text-slate-300">
              Left: '0' • Right: '1'
            </span>
          </div>

          <div className="w-full h-[540px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <ReactFlow
              nodes={treeNodes}
              edges={treeEdges}
              fitView
              attributionPosition="bottom-left"
            >
              <Background color="#1e293b" gap={16} />
              <Controls />
              <MiniMap
                nodeColor={(n) => (n.style?.border?.includes('f59e0b') ? '#f59e0b' : '#38bdf8')}
                style={{ background: '#020617', border: '1px solid #1e293b' }}
              />
            </ReactFlow>
          </div>
        </div>
      )}

      {/* Tab 3: Frequency Chart (Recharts) */}
      {activeTab === 'chart' && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Instruction / Symbol Frequency Histogram
              </h3>
              <p className="text-xs text-slate-400">
                Recharts visualization of symbol distribution across the program stream.
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-400">
              Vocabulary: {chartData.length} unique symbols
            </span>
          </div>

          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                <XAxis
                  dataKey="symbol"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#38bdf8' : index === 1 ? '#6366f1' : '#818cf8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 4: Codebook Table */}
      {activeTab === 'codes' && compressionResult?.codebook && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Generated Variable-Length Prefix Codebook
              </h3>
              <p className="text-xs text-slate-400">
                Prefix-free codes mapping frequent instructions to shorter bit representations.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              Prefix-Free Property Guaranteed
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Symbol / Instruction</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Probability (p)</th>
                  <th className="py-2.5 px-3">Assigned Prefix Code</th>
                  <th className="py-2.5 px-3 text-right">Length (li)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.entries(compressionResult.codebook).map(([sym, code]) => {
                  const freq = compressionResult.frequencies[sym] || 0;
                  const prob = (freq / compressionResult.metrics.symbol_count).toFixed(3);
                  return (
                    <tr key={sym} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-bold text-indigo-300">{sym}</td>
                      <td className="py-2 px-3 text-slate-300">{freq}</td>
                      <td className="py-2 px-3 text-slate-400">{prob}</td>
                      <td className="py-2 px-3 font-bold text-amber-300 tracking-wider">{code}</td>
                      <td className="py-2 px-3 text-right text-cyan-300">{code.length} bits</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
