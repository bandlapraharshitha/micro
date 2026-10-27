/**
 * Computer Organization and Architecture (COA) - Execution Engine.
 *
 * Implements the cycle-by-cycle microprogrammed control unit simulation:
 * - Microprogram counter (μPC) management
 * - Control signal generation and decoding
 * - Register reads/writes, ALU operations, memory reads/writes, PC updates
 * - Step, run, pause, resume, reset controls
 * - Execution history tracking, program completion detection, and error guards
 */

import {
  ALU_OPS,
  CONDITIONS,
  MEM_OPS,
  PC_OPS,
  REG_ID,
} from './microinstructions.js';
import { ControlMemory } from './controlMemory.js';
import { DataMemory, RegisterFile } from './registers.js';

export const ENGINE_STATUS = Object.freeze({
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  HALTED: 'HALTED',
  ERROR: 'ERROR',
});

export class ExecutionEngine {
  /**
   * @param {Object} [config]
   * @param {ControlMemory} [config.controlMemory]
   * @param {DataMemory} [config.dataMemory]
   * @param {RegisterFile} [config.registers]
   */
  constructor({ controlMemory = null, dataMemory = null, registers = null } = {}) {
    this.controlMemory = controlMemory || new ControlMemory();
    this.dataMemory = dataMemory || new DataMemory();
    this.registers = registers || new RegisterFile();

    this.uPC = 0; // Microprogram Counter
    this.cycleCount = 0;
    this.status = ENGINE_STATUS.IDLE;
    this.lastError = null;
    /** @type {Array<Object>} */
    this.history = [];
  }

  /**
   * Resets all components (registers, data memory, control counter, history) to initial state.
   */
  reset() {
    this.registers.reset();
    this.dataMemory.reset();
    this.uPC = 0;
    this.cycleCount = 0;
    this.status = ENGINE_STATUS.IDLE;
    this.lastError = null;
    this.history = [];
  }

  /**
   * Evaluates branch condition based on current processor flags.
   * @param {string} condition
   * @returns {boolean}
   * @private
   */
  _evaluateCondition(condition) {
    const flags = this.registers.flags;
    switch (condition) {
      case CONDITIONS.UNCONDITIONAL:
        return true;
      case CONDITIONS.IF_ZERO:
        return flags.Z === 1;
      case CONDITIONS.IF_NOT_ZERO:
        return flags.Z === 0;
      case CONDITIONS.IF_CARRY:
        return flags.C === 1;
      case CONDITIONS.IF_NEGATIVE:
        return flags.S === 1;
      default:
        return true;
    }
  }

  /**
   * Executes ALU operation on operandA and operandB.
   * @param {string} aluOp
   * @param {number} a - 16-bit operand A
   * @param {number} b - 16-bit operand B
   * @returns {number} Raw 32-bit result before 16-bit masking
   * @private
   */
  _computeALU(aluOp, a, b) {
    switch (aluOp) {
      case ALU_OPS.NONE:
        return 0;
      case ALU_OPS.ADD:
        return a + b;
      case ALU_OPS.SUB:
        return a - b;
      case ALU_OPS.AND:
        return a & b;
      case ALU_OPS.OR:
        return a | b;
      case ALU_OPS.XOR:
        return a ^ b;
      case ALU_OPS.INC:
        return a + 1;
      case ALU_OPS.DEC:
        return a - 1;
      case ALU_OPS.PASS_A:
        return a;
      case ALU_OPS.PASS_B:
        return b;
      default:
        throw new Error(`Invalid operation: unsupported ALU operation '${aluOp}'.`);
    }
  }

  /**
   * Executes a single microinstruction step.
   * @returns {Object} Result of the step execution
   */
  step() {
    if (this.status === ENGINE_STATUS.HALTED) {
      return { status: this.status, message: 'Execution already halted.' };
    }

    const currentUPC = this.uPC;
    const uinst = this.controlMemory.getMicroinstruction(currentUPC);

    if (!uinst) {
      // Reached past the end of control memory without an explicit HALT
      this.status = ENGINE_STATUS.HALTED;
      return { status: this.status, message: 'Control memory boundary reached.' };
    }

    const snapshotBefore = this.registers.getSnapshot();
    const memoryBefore = this.dataMemory.getSnapshot();
    let memoryOpDetails = null;

    try {
      this.cycleCount++;

      // 1. Fetch operands for Bus A and Bus B
      let operandA = 0;
      let operandB = 0;

      if (uinst.srcA !== REG_ID.NONE) {
        operandA = this.registers.read(uinst.srcA);
      }

      if (uinst.srcB !== REG_ID.NONE) {
        operandB = this.registers.read(uinst.srcB);
      } else {
        operandB = uinst.imm;
      }

      // 2. Execute ALU operation & update status flags
      let aluResult = 0;
      if (uinst.aluOp !== ALU_OPS.NONE) {
        const rawResult = this._computeALU(uinst.aluOp, operandA, operandB);
        aluResult = (rawResult >>> 0) & 0xffff;
        this.registers.updateFlags(rawResult, operandA, operandB, uinst.aluOp);
      }

      // 3. Register Write Back (from ALU or Pass)
      if (uinst.dest !== REG_ID.NONE && uinst.aluOp !== ALU_OPS.NONE) {
        this.registers.write(uinst.dest, aluResult);
      }

      // 4. Memory Operations
      if (uinst.memOp === MEM_OPS.READ) {
        const address = (uinst.imm !== undefined && uinst.imm > 0) ? uinst.imm : this.registers.MAR;
        const readVal = this.dataMemory.read(address);
        this.registers.MDR = readVal;
        if (uinst.dest && uinst.dest !== REG_ID.NONE && uinst.dest !== REG_ID.MDR) {
          this.registers.write(uinst.dest, readVal);
        }
        memoryOpDetails = { type: 'READ', address, value: readVal };
      } else if (uinst.memOp === MEM_OPS.WRITE) {
        const address = (uinst.imm !== undefined && uinst.imm > 0) ? uinst.imm : this.registers.MAR;
        const writeVal = (uinst.srcA && uinst.srcA !== REG_ID.NONE) ? this.registers.read(uinst.srcA) : this.registers.MDR;
        this.dataMemory.write(address, writeVal);
        memoryOpDetails = { type: 'WRITE', address, value: writeVal };
      }

      // 5. Program Counter (PC) Updates
      if (uinst.pcOp === PC_OPS.INCREMENT) {
        this.registers.PC = (this.registers.PC + 1) & 0xffff;
      } else if (uinst.pcOp === PC_OPS.LOAD_ALU) {
        this.registers.PC = aluResult;
      } else if (uinst.pcOp === PC_OPS.LOAD_MDR) {
        this.registers.PC = this.registers.MDR;
      } else if (uinst.pcOp === PC_OPS.LOAD_IMM) {
        this.registers.PC = uinst.imm;
      }

      // 6. Microprogram Counter (μPC) Sequencing
      const conditionMet = this._evaluateCondition(uinst.condition);
      if (conditionMet && typeof uinst.nextAddress === 'number') {
        this.uPC = uinst.nextAddress;
      } else {
        this.uPC = currentUPC + 1;
      }

      // 7. Check for HALT signal or end of control memory
      if (uinst.isHalt || this.uPC >= this.controlMemory.size()) {
        this.status = ENGINE_STATUS.HALTED;
      } else if (this.status !== ENGINE_STATUS.PAUSED) {
        this.status = ENGINE_STATUS.RUNNING;
      }

      const logEntry = {
        step: this.cycleCount,
        uPC: currentUPC,
        label: uinst.label,
        description: uinst.description,
        controlSignals: uinst.getControlSignals(),
        aluResult: uinst.aluOp !== ALU_OPS.NONE ? aluResult : null,
        registersBefore: snapshotBefore,
        registersAfter: this.registers.getSnapshot(),
        memoryOp: memoryOpDetails,
        nextUPC: this.uPC,
        status: this.status,
      };

      this.history.push(logEntry);
      return logEntry;
    } catch (err) {
      this.status = ENGINE_STATUS.ERROR;
      this.lastError = err.message;
      const errorEntry = {
        step: this.cycleCount,
        uPC: currentUPC,
        label: uinst.label,
        error: err.message,
        registersBefore: snapshotBefore,
        registersAfter: this.registers.getSnapshot(),
        status: this.status,
      };
      this.history.push(errorEntry);
      return errorEntry;
    }
  }

  /**
   * Executes the microprogram continuously until HALTED, PAUSED, ERROR, or maxSteps exceeded.
   * @param {number} [maxSteps=1000] - Loop protection ceiling
   * @returns {{ stepsExecuted: number, finalStatus: string, history: Array<Object>, exceededMaxSteps: boolean }}
   */
  run(maxSteps = 1000) {
    if (this.status === ENGINE_STATUS.HALTED || this.status === ENGINE_STATUS.ERROR) {
      return {
        stepsExecuted: 0,
        finalStatus: this.status,
        history: this.history,
        exceededMaxSteps: false,
      };
    }

    this.status = ENGINE_STATUS.RUNNING;
    let stepsCount = 0;
    let exceededMaxSteps = false;

    while (this.status === ENGINE_STATUS.RUNNING && stepsCount < maxSteps) {
      this.step();
      stepsCount++;
      if (this.status === ENGINE_STATUS.HALTED || this.status === ENGINE_STATUS.ERROR) {
        break;
      }
    }

    if (stepsCount >= maxSteps && this.status === ENGINE_STATUS.RUNNING) {
      exceededMaxSteps = true;
      this.status = ENGINE_STATUS.PAUSED;
    }

    return {
      stepsExecuted: stepsCount,
      finalStatus: this.status,
      history: this.history,
      exceededMaxSteps,
    };
  }

  /**
   * Pauses continuous execution while preserving current machine state.
   */
  pause() {
    if (this.status === ENGINE_STATUS.RUNNING) {
      this.status = ENGINE_STATUS.PAUSED;
    }
  }

  /**
   * Resumes execution if engine was paused.
   * @param {number} [maxSteps=1000]
   */
  resume(maxSteps = 1000) {
    if (this.status === ENGINE_STATUS.PAUSED) {
      this.status = ENGINE_STATUS.RUNNING;
      return this.run(maxSteps);
    }
    return {
      stepsExecuted: 0,
      finalStatus: this.status,
      history: this.history,
      exceededMaxSteps: false,
    };
  }

  /**
   * Returns complete audit trail of microinstruction execution steps.
   * @returns {Array<Object>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Returns a snapshot of the complete machine state.
   * @returns {Object}
   */
  getState() {
    return {
      uPC: this.uPC,
      cycleCount: this.cycleCount,
      status: this.status,
      lastError: this.lastError,
      registers: this.registers.getSnapshot(),
      nonZeroMemory: this.dataMemory.getSnapshot(),
      controlMemorySize: this.controlMemory.size(),
    };
  }
}
