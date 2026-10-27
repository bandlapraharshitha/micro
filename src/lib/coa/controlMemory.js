/**
 * Computer Organization and Architecture (COA) - Control Memory.
 *
 * Implements the Microprogram Control Store (Control ROM/RAM):
 * - Stores microinstructions indexed by microprogram counter (μPC).
 * - Provides default standard microprograms demonstrating arithmetic,
 *   register transfer, memory access, and branch sequencing.
 */

import {
  ALU_OPS,
  CONDITIONS,
  MEM_OPS,
  Microinstruction,
  PC_OPS,
  REG_ID,
} from './microinstructions.js';

export class ControlMemory {
  /**
   * @param {Microinstruction[]} [initialProgram=[]]
   */
  constructor(initialProgram = []) {
    /** @type {Microinstruction[]} */
    this.storage = [];
    if (initialProgram.length > 0) {
      this.loadMicroprogram(initialProgram);
    }
  }

  /**
   * Loads a microprogram into control memory, assigning addresses sequentially
   * if not already assigned.
   * @param {Microinstruction[]} microinstructions
   */
  loadMicroprogram(microinstructions) {
    this.storage = microinstructions.map((uinst, idx) => {
      const copy = new Microinstruction(uinst);
      copy.address = idx;
      return copy;
    });
  }

  /**
   * Retrieves the microinstruction at the specified control memory address.
   * @param {number} uPC - Microprogram Counter
   * @returns {Microinstruction|null}
   */
  getMicroinstruction(uPC) {
    if (uPC >= 0 && uPC < this.storage.length) {
      return this.storage[uPC];
    }
    return null;
  }

  /**
   * Returns total number of microinstructions in control memory.
   * @returns {number}
   */
  size() {
    return this.storage.length;
  }

  /**
   * Clears the control memory storage.
   */
  reset() {
    this.storage = [];
  }

  /**
   * Builds a canonical sample microprogram that performs:
   * 1. R0 <- 10 (via ALU PASS_B with immediate 10)
   * 2. R1 <- 25 (via ALU PASS_B with immediate 25)
   * 3. R0 <- R0 + R1 (via ALU ADD R0, R1 -> R0)
   * 4. MAR <- 0x20 (load target memory address)
   * 5. MDR <- R0 (prepare data to write)
   * 6. Memory[MAR] <- MDR (write to data memory)
   * 7. PC <- PC + 1 (increment macro program counter)
   * 8. HALT
   *
   * @returns {Microinstruction[]}
   */
  static createDefaultMicroprogram() {
    return [
      new Microinstruction({
        label: 'INIT_R0',
        aluOp: ALU_OPS.PASS_B,
        imm: 10,
        dest: REG_ID.R0,
        description: 'R0 <- 10',
      }),
      new Microinstruction({
        label: 'INIT_R1',
        aluOp: ALU_OPS.PASS_B,
        imm: 25,
        dest: REG_ID.R1,
        description: 'R1 <- 25',
      }),
      new Microinstruction({
        label: 'EXEC_ADD',
        aluOp: ALU_OPS.ADD,
        srcA: REG_ID.R0,
        srcB: REG_ID.R1,
        dest: REG_ID.R0,
        description: 'R0 <- R0 + R1 (35)',
      }),
      new Microinstruction({
        label: 'SET_MAR',
        aluOp: ALU_OPS.PASS_B,
        imm: 0x20,
        dest: REG_ID.MAR,
        description: 'MAR <- 0x20',
      }),
      new Microinstruction({
        label: 'SET_MDR',
        aluOp: ALU_OPS.PASS_A,
        srcA: REG_ID.R0,
        dest: REG_ID.MDR,
        description: 'MDR <- R0 (35)',
      }),
      new Microinstruction({
        label: 'MEM_WRITE',
        memOp: MEM_OPS.WRITE,
        description: 'Memory[MAR] <- MDR',
      }),
      new Microinstruction({
        label: 'PC_INC',
        pcOp: PC_OPS.INCREMENT,
        description: 'PC <- PC + 1',
      }),
      new Microinstruction({
        label: 'HALT_STEP',
        isHalt: true,
        description: 'HALT microprogram',
      }),
    ];
  }
}
