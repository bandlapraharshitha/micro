import { HuffmanDecoderAutomaton } from '../flat/decoder-automaton.js';
import { InstructionMemory } from './instruction-memory.js';

/**
 * Micro-Architecture CPU Simulator for COA.
 * Implements a cycle-by-cycle fetch-decode-execute pipeline with:
 * - Program Counter (PC)
 * - Fetch Buffer (Shift Register for compressed bitstream)
 * - Hardware DFA Decompressor (FLAT integration)
 * - Register File (R0, R1, R2, R3)
 */
export class CPUSimulator {
  /**
   * @param {Object} config
   * @param {InstructionMemory} config.memory
   * @param {HuffmanDecoderAutomaton} config.decoderAutomaton
   */
  constructor({ memory, decoderAutomaton }) {
    this.memory = memory;
    this.decoder = decoderAutomaton;

    // Architectural state
    this.pc = 0; // instruction index
    this.bitPointer = 0; // current bit index in compressed memory
    this.registers = { R0: 0, R1: 0, R2: 0, R3: 0 };
    this.cycleCount = 0;
    this.executionLog = [];
    this.isHalted = false;
  }

  /**
   * Resets the CPU state.
   */
  reset() {
    this.pc = 0;
    this.bitPointer = 0;
    this.registers = { R0: 0, R1: 0, R2: 0, R3: 0 };
    this.cycleCount = 0;
    this.executionLog = [];
    this.isHalted = false;
  }

  /**
   * Steps the CPU through one instruction fetch, decode, and execute cycle.
   */
  step() {
    if (this.isHalted || this.bitPointer >= this.memory.compressedBitStream.length) {
      this.isHalted = true;
      return { halted: true, cycle: this.cycleCount };
    }

    this.cycleCount++;
    const startBit = this.bitPointer;

    // Fetch and Decode via FLAT Automaton bit-by-bit
    let decodedOpcode = null;
    let bitsConsumed = 0;
    this.decoder.dfa.reset();

    while (this.bitPointer < this.memory.compressedBitStream.length) {
      const bit = this.memory.compressedBitStream[this.bitPointer];
      this.bitPointer++;
      bitsConsumed++;
      this.decoder.dfa.step(bit);

      if (this.decoder.dfa.isAccepting()) {
        decodedOpcode = this.decoder.dfa.getCurrentOutput();
        break;
      }
    }

    if (!decodedOpcode) {
      this.isHalted = true;
      return { halted: true, error: 'Incomplete bitstream at EOF' };
    }

    // Execute instruction
    const logEntry = {
      cycle: this.cycleCount,
      pc: this.pc,
      startBit,
      bitsConsumed,
      opcode: decodedOpcode,
      registersBefore: { ...this.registers },
    };

    this._executeOpcode(decodedOpcode);

    logEntry.registersAfter = { ...this.registers };
    this.executionLog.push(logEntry);
    this.pc++;

    return logEntry;
  }

  /**
   * Internal execution unit.
   * @private
   */
  _executeOpcode(opcode) {
    switch (opcode) {
      case 'NOP':
        break;
      case 'INC_R0':
        this.registers.R0 = (this.registers.R0 + 1) & 0xffff;
        break;
      case 'INC_R1':
        this.registers.R1 = (this.registers.R1 + 1) & 0xffff;
        break;
      case 'ADD_R0_R1':
        this.registers.R0 = (this.registers.R0 + this.registers.R1) & 0xffff;
        break;
      case 'CLEAR_ALL':
        this.registers.R0 = 0;
        this.registers.R1 = 0;
        this.registers.R2 = 0;
        this.registers.R3 = 0;
        break;
      case 'HALT':
        this.isHalted = true;
        break;
      default:
        // Generic instruction execution
        break;
    }
  }

  /**
   * Runs the simulator to completion.
   */
  run(maxCycles = 1000) {
    while (!this.isHalted && this.cycleCount < maxCycles) {
      const result = this.step();
      if (result.halted) break;
    }
    return {
      totalCycles: this.cycleCount,
      instructionsExecuted: this.pc,
      finalRegisters: { ...this.registers },
      executionLog: this.executionLog,
    };
  }
}
