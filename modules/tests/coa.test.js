import test from 'node:test';
import assert from 'node:assert/strict';
import { InstructionMemory } from '../coa/instruction-memory.js';
import { CPUSimulator } from '../coa/cpu-simulator.js';
import { HuffmanDecoderAutomaton } from '../flat/decoder-automaton.js';

test('COA - InstructionMemory calculates compression ratio and bandwidth metrics', () => {
  const memory = new InstructionMemory({ wordSize: 16, busWidth: 32 });

  // 4 instructions, normally 4 * 16 = 64 bits
  // With Huffman: 1 + 2 + 3 + 3 = 9 bits
  const program = [
    { opcode: 'INC_R0', bits: '0' },
    { opcode: 'INC_R1', bits: '10' },
    { opcode: 'ADD_R0_R1', bits: '110' },
    { opcode: 'HALT', bits: '111' },
  ];

  memory.loadProgram(program);
  const stats = memory.getMemoryStats();

  assert.equal(stats.instructionCount, 4);
  assert.equal(stats.uncompressedBits, 64);
  assert.equal(stats.compressedBits, 9);
  assert.ok(stats.compressionRatio > 7);
  assert.ok(stats.spaceSavingsPercent > 80);
});

test('COA - CPUSimulator executes instructions fetched via DFA from compressed memory', () => {
  const codebook = {
    INC_R0: '0',
    INC_R1: '10',
    ADD_R0_R1: '110',
    HALT: '111',
  };

  const decoder = new HuffmanDecoderAutomaton(codebook);
  const memory = new InstructionMemory();

  // Program: INC_R0 (R0=1), INC_R1 (R1=1), ADD_R0_R1 (R0=2), HALT
  const program = [
    { opcode: 'INC_R0', bits: codebook.INC_R0 },
    { opcode: 'INC_R1', bits: codebook.INC_R1 },
    { opcode: 'ADD_R0_R1', bits: codebook.ADD_R0_R1 },
    { opcode: 'HALT', bits: codebook.HALT },
  ];

  memory.loadProgram(program);
  const cpu = new CPUSimulator({ memory, decoderAutomaton: decoder });

  const result = cpu.run();

  assert.equal(result.instructionsExecuted, 4);
  assert.equal(result.finalRegisters.R0, 2);
  assert.equal(result.finalRegisters.R1, 1);
  assert.equal(cpu.isHalted, true);
});
