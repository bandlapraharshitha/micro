/**
 * Computer Organization and Architecture (COA) - Register File & Data Memory.
 *
 * Implements:
 * - General-purpose registers (R0, R1, R2, R3)
 * - Special micro-architectural registers (PC, IR, MAR, MDR, TEMP)
 * - Arithmetic and status flags (Zero, Sign/Negative, Carry, Overflow)
 * - Simulated Data Memory array with bounds checking
 */

export class RegisterFile {
  constructor() {
    this.reset();
  }

  /**
   * Resets all registers and condition flags to zero.
   */
  reset() {
    // General Purpose Registers (16-bit unsigned: 0x0000 - 0xFFFF)
    this.R0 = 0;
    this.R1 = 0;
    this.R2 = 0;
    this.R3 = 0;

    // Special Architectural Registers
    this.PC = 0; // Program Counter
    this.IR = 0; // Instruction Register
    this.MAR = 0; // Memory Address Register
    this.MDR = 0; // Memory Data Register
    this.TEMP = 0; // ALU Temp Latch

    // Processor Condition Flags
    this.flags = {
      Z: 0, // Zero Flag
      S: 0, // Sign / Negative Flag
      C: 0, // Carry Flag
      V: 0, // Overflow Flag
    };
  }

  /**
   * Reads the value of a register by name.
   * @param {string} regName
   * @returns {number}
   */
  read(regName) {
    if (regName === 'NONE') return 0;
    if (this[regName] !== undefined && typeof this[regName] === 'number') {
      return this[regName];
    }
    throw new Error(`Invalid register read request: unknown register '${regName}'.`);
  }

  /**
   * Writes a 16-bit value into the specified register.
   * @param {string} regName
   * @param {number} value
   */
  write(regName, value) {
    if (regName === 'NONE') return;

    if (this[regName] === undefined || typeof this[regName] !== 'number') {
      throw new Error(`Invalid register write request: unknown register '${regName}'.`);
    }

    // Mask to 16-bit unsigned integer
    this[regName] = (value >>> 0) & 0xffff;
  }

  /**
   * Updates arithmetic condition flags based on an ALU result.
   * @param {number} rawResult - Unmasked 32-bit arithmetic result
   * @param {number} operandA - 16-bit operand A
   * @param {number} operandB - 16-bit operand B
   * @param {string} aluOp - Operation name ('ADD', 'SUB', etc.)
   */
  updateFlags(rawResult, operandA = 0, operandB = 0, aluOp = 'ADD') {
    const maskedResult = (rawResult >>> 0) & 0xffff;

    // Zero Flag (Z)
    this.flags.Z = maskedResult === 0 ? 1 : 0;

    // Sign Flag (S) - Bit 15 set
    this.flags.S = (maskedResult & 0x8000) !== 0 ? 1 : 0;

    // Carry Flag (C)
    if (aluOp === 'ADD' || aluOp === 'INC') {
      this.flags.C = rawResult > 0xffff ? 1 : 0;
    } else if (aluOp === 'SUB' || aluOp === 'DEC') {
      this.flags.C = rawResult < 0 ? 1 : 0;
    } else {
      this.flags.C = 0;
    }

    // Overflow Flag (V) - Signed 16-bit overflow
    if (aluOp === 'ADD') {
      const aSigned = (operandA << 16) >> 16;
      const bSigned = (operandB << 16) >> 16;
      const resSigned = aSigned + bSigned;
      this.flags.V = resSigned > 32767 || resSigned < -32768 ? 1 : 0;
    } else if (aluOp === 'SUB') {
      const aSigned = (operandA << 16) >> 16;
      const bSigned = (operandB << 16) >> 16;
      const resSigned = aSigned - bSigned;
      this.flags.V = resSigned > 32767 || resSigned < -32768 ? 1 : 0;
    } else {
      this.flags.V = 0;
    }
  }

  /**
   * Returns a copy of the current register state and flags.
   * @returns {Object}
   */
  getSnapshot() {
    return {
      R0: this.R0,
      R1: this.R1,
      R2: this.R2,
      R3: this.R3,
      PC: this.PC,
      IR: this.IR,
      MAR: this.MAR,
      MDR: this.MDR,
      TEMP: this.TEMP,
      flags: { ...this.flags },
    };
  }
}

export class DataMemory {
  /**
   * @param {number} [size=256] - Number of 16-bit addressable words in data memory
   */
  constructor(size = 256) {
    this.size = size;
    this.memory = new Uint16Array(size);
  }

  /**
   * Resets all memory cells to zero.
   */
  reset() {
    this.memory.fill(0);
  }

  /**
   * Reads a 16-bit word from the given memory address.
   * @param {number} address
   * @returns {number}
   */
  read(address) {
    if (address < 0 || address >= this.size) {
      throw new Error(`Data memory read out-of-bounds: address 0x${address.toString(16)} (size: ${this.size}).`);
    }
    return this.memory[address];
  }

  /**
   * Writes a 16-bit word into the given memory address.
   * @param {number} address
   * @param {number} value
   */
  write(address, value) {
    if (address < 0 || address >= this.size) {
      throw new Error(`Data memory write out-of-bounds: address 0x${address.toString(16)} (size: ${this.size}).`);
    }
    this.memory[address] = (value >>> 0) & 0xffff;
  }

  /**
   * Bulk loads initial data values into memory.
   * @param {Object.<number, number>|number[]} initialData
   */
  loadData(initialData) {
    if (Array.isArray(initialData)) {
      for (let i = 0; i < Math.min(initialData.length, this.size); i++) {
        this.memory[i] = initialData[i] & 0xffff;
      }
    } else if (typeof initialData === 'object' && initialData !== null) {
      for (const [addrStr, val] of Object.entries(initialData)) {
        const addr = parseInt(addrStr, 10);
        if (!isNaN(addr) && addr >= 0 && addr < this.size) {
          this.memory[addr] = val & 0xffff;
        }
      }
    }
  }

  /**
   * Returns a snapshot of non-zero memory locations.
   * @returns {Object.<number, number>}
   */
  getSnapshot() {
    const nonZero = {};
    for (let i = 0; i < this.size; i++) {
      if (this.memory[i] !== 0) {
        nonZero[i] = this.memory[i];
      }
    }
    return nonZero;
  }
}
