/**
 * Computer Organization and Architecture (COA) - Microinstruction Definitions.
 *
 * Defines the microinstruction word format, control signals, ALU operations,
 * and sequencing conditions for the microprogrammed control unit.
 */

export const ALU_OPS = Object.freeze({
  NONE: 'NONE',
  ADD: 'ADD',
  SUB: 'SUB',
  AND: 'AND',
  OR: 'OR',
  XOR: 'XOR',
  INC: 'INC',
  DEC: 'DEC',
  PASS_A: 'PASS_A',
  PASS_B: 'PASS_B',
});

export const REG_ID = Object.freeze({
  NONE: 'NONE',
  R0: 'R0',
  R1: 'R1',
  R2: 'R2',
  R3: 'R3',
  PC: 'PC',
  MAR: 'MAR',
  MDR: 'MDR',
  IR: 'IR',
  TEMP: 'TEMP',
});

export const MEM_OPS = Object.freeze({
  NONE: 'NONE',
  READ: 'READ',
  WRITE: 'WRITE',
});

export const PC_OPS = Object.freeze({
  NONE: 'NONE',
  INCREMENT: 'INCREMENT',
  LOAD_ALU: 'LOAD_ALU',
  LOAD_MDR: 'LOAD_MDR',
  LOAD_IMM: 'LOAD_IMM',
});

export const CONDITIONS = Object.freeze({
  UNCONDITIONAL: 'UNCONDITIONAL',
  IF_ZERO: 'IF_ZERO',
  IF_NOT_ZERO: 'IF_NOT_ZERO',
  IF_CARRY: 'IF_CARRY',
  IF_NEGATIVE: 'IF_NEGATIVE',
});

/**
 * Represents a single microinstruction stored in Control Memory.
 */
export class Microinstruction {
  /**
   * @param {Object} config
   * @param {number} [config.address=0] - Control memory location
   * @param {string} [config.label=''] - Symbolic label (e.g., 'FETCH_0', 'EXEC_ADD')
   * @param {string} [config.aluOp=ALU_OPS.NONE] - ALU operation
   * @param {string} [config.srcA=REG_ID.NONE] - Register fed to ALU Input A
   * @param {string} [config.srcB=REG_ID.NONE] - Register fed to ALU Input B
   * @param {string} [config.dest=REG_ID.NONE] - Destination register to latch result
   * @param {number} [config.imm=0] - 16-bit constant immediate value
   * @param {string} [config.memOp=MEM_OPS.NONE] - Memory bus operation
   * @param {string} [config.pcOp=PC_OPS.NONE] - Program counter update mode
   * @param {string} [config.condition=CONDITIONS.UNCONDITIONAL] - Branch condition
   * @param {number|'NEXT'} [config.nextAddress='NEXT'] - Next control address
   * @param {boolean} [config.isHalt=false] - Signals termination of execution
   * @param {string} [config.description=''] - Human-readable micro-op summary
   */
  constructor({
    address = 0,
    label = '',
    aluOp = ALU_OPS.NONE,
    srcA = REG_ID.NONE,
    srcB = REG_ID.NONE,
    dest = REG_ID.NONE,
    imm = 0,
    memOp = MEM_OPS.NONE,
    pcOp = PC_OPS.NONE,
    condition = CONDITIONS.UNCONDITIONAL,
    nextAddress = 'NEXT',
    isHalt = false,
    description = '',
  } = {}) {
    this.address = address;
    this.label = label;
    this.aluOp = aluOp;
    this.srcA = srcA;
    this.srcB = srcB;
    this.dest = dest;
    this.imm = imm & 0xffff;
    this.memOp = memOp;
    this.pcOp = pcOp;
    this.condition = condition;
    this.nextAddress = nextAddress;
    this.isHalt = isHalt;
    this.description = description;
  }

  /**
   * Generates a readable representation of the active control signals.
   * @returns {Object}
   */
  getControlSignals() {
    return {
      ALU: this.aluOp,
      BUS_A: this.srcA,
      BUS_B: this.srcB,
      DEST_WRITE: this.dest,
      MEM_CTRL: this.memOp,
      PC_CTRL: this.pcOp,
      COND: this.condition,
      HALT: this.isHalt,
    };
  }
}

/**
 * Factory helper to construct a validated Microinstruction.
 * @param {Object} config
 * @returns {Microinstruction}
 */
export function createMicroinstruction(config) {
  return new Microinstruction(config);
}
