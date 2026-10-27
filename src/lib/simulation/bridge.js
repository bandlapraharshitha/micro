/**
 * Integrated Simulation Bridge.
 *
 * Connects the three domains:
 * 1. DAA (Huffman Compression & Decompression)
 * 2. FLAT (12-bit Control Word DFA Validation)
 * 3. COA (Microprogrammed Control Store & Execution)
 *
 * Adheres strictly to the architectural boundary:
 * - DAA handles variable-length symbol entropy coding.
 * - FLAT validates the fixed 12-bit control word syntax and semantics.
 * - COA executes validated microinstructions on the micro-architecture.
 */

import {
  CONTROL_WORD_SPEC,
  OPCODE_MAP,
  REGISTER_MAP,
  validateControlWord,
} from '../flat/validator.js';
import {
  ALU_OPS,
  CONDITIONS,
  MEM_OPS,
  PC_OPS,
  REG_ID,
  createMicroinstruction,
} from '../coa/microinstructions.js';
import { ControlMemory } from '../coa/controlMemory.js';
import { ExecutionEngine, ENGINE_STATUS } from '../coa/executionEngine.js';

// Inverse mappings for encoding
export const MNEMONIC_TO_OPCODE = Object.entries(OPCODE_MAP).reduce((acc, [bin, info]) => {
  acc[info.mnemonic] = bin;
  return acc;
}, {});

export const REGISTER_TO_BIN = Object.entries(REGISTER_MAP).reduce((acc, [bin, name]) => {
  acc[name] = bin;
  return acc;
}, {});

/**
 * Encodes an instruction object or assembly token into a 12-bit binary string.
 *
 * @param {Object} inst
 * @param {string} inst.mnemonic - e.g., 'ADD', 'LOAD', 'STORE'
 * @param {string} [inst.dest='R0'] - e.g., 'R0', 'R1'
 * @param {string} [inst.src='R0'] - e.g., 'R0', 'R1'
 * @param {number} [inst.imm=0] - 0 to 15 (4 bits)
 * @returns {string} 12-bit binary control word
 */
export function instructionToControlWord({ mnemonic, dest = 'R0', src = 'R0', imm = 0 }) {
  const opcodeBits = MNEMONIC_TO_OPCODE[mnemonic.toUpperCase()];
  if (!opcodeBits) {
    throw new Error(`Unknown mnemonic: '${mnemonic}'. Cannot encode to 12-bit control word.`);
  }

  const destBits = REGISTER_TO_BIN[dest.toUpperCase()] || '00';
  const srcBits = REGISTER_TO_BIN[src.toUpperCase()] || '00';
  const immBits = (Number(imm) & 0x0f).toString(2).padStart(4, '0');

  return `${opcodeBits}${destBits}${srcBits}${immBits}`;
}

/**
 * Parses an instruction token string (e.g. 'ADD R0, R1, 5' or 'LOAD_R0_R1_10') into its fields.
 *
 * @param {string} token
 * @returns {{ mnemonic: string, dest: string, src: string, imm: number }}
 */
export function parseInstructionToken(token) {
  if (typeof token !== 'string') {
    throw new Error(`Token must be a string, got ${typeof token}`);
  }

  // Normalize delimiters (replace underscores/commas with spaces)
  const parts = token
    .trim()
    .replace(/[,_]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error('Empty instruction token.');
  }

  const mnemonic = parts[0].toUpperCase();
  const dest = parts.length > 1 ? parts[1].toUpperCase() : 'R0';
  const src = parts.length > 2 ? parts[2].toUpperCase() : 'R0';
  const imm = parts.length > 3 ? parseInt(parts[3], 10) || 0 : 0;

  return { mnemonic, dest, src, imm };
}

/**
 * Converts a validated 12-bit control word into an executable COA Microinstruction.
 *
 * @param {string} bitstring - 12-bit binary control word
 * @param {number} [address=0] - Control memory address
 * @returns {Microinstruction}
 */
export function controlWordToMicroinstruction(bitstring, address = 0) {
  // First validate through FLAT validator
  const validation = validateControlWord(bitstring);
  if (!validation.isValid) {
    const errorMsg = validation.syntax.error ||
      (validation.semantics && validation.semantics.errors.join('; ')) ||
      'Invalid control word';
    throw new Error(`Control word validation failed for '${bitstring}': ${errorMsg}`);
  }

  const { mnemonic, destReg, srcReg, immediate } = validation.semantics;

  const dest = REG_ID[destReg] || REG_ID.NONE;
  const srcA = REG_ID[destReg] || REG_ID.NONE;
  const srcB = REG_ID[srcReg] || REG_ID.NONE;

  switch (mnemonic) {
    case 'NOP':
      return createMicroinstruction({
        address,
        label: `NOP_${address}`,
        aluOp: ALU_OPS.NONE,
        description: 'No Operation',
      });

    case 'LOAD':
      // Loads immediate constant into register
      return createMicroinstruction({
        address,
        label: `LOAD_${destReg}`,
        aluOp: ALU_OPS.PASS_B,
        imm: immediate,
        dest,
        description: `${destReg} <- Imm(${immediate})`,
      });

    case 'STORE':
      // Writes register value into data memory at address specified by immediate
      return createMicroinstruction({
        address,
        label: `STORE_${destReg}`,
        memOp: MEM_OPS.WRITE,
        srcA: dest,
        imm: immediate,
        description: `Memory[0x${immediate.toString(16).padStart(2, '0')}] <- ${destReg}`,
      });

    case 'ADD':
      return createMicroinstruction({
        address,
        label: `ADD_${destReg}_${srcReg}`,
        aluOp: ALU_OPS.ADD,
        srcA,
        srcB,
        dest,
        imm: immediate,
        description: `${destReg} <- ${destReg} + ${srcReg}`,
      });

    case 'SUB':
      return createMicroinstruction({
        address,
        label: `SUB_${destReg}_${srcReg}`,
        aluOp: ALU_OPS.SUB,
        srcA,
        srcB,
        dest,
        description: `${destReg} <- ${destReg} - ${srcReg}`,
      });

    case 'INC':
      return createMicroinstruction({
        address,
        label: `INC_${destReg}`,
        aluOp: ALU_OPS.INC,
        srcA,
        dest,
        description: `${destReg} <- ${destReg} + 1`,
      });

    case 'DEC':
      return createMicroinstruction({
        address,
        label: `DEC_${destReg}`,
        aluOp: ALU_OPS.DEC,
        srcA,
        dest,
        description: `${destReg} <- ${destReg} - 1`,
      });

    case 'AND':
      return createMicroinstruction({
        address,
        label: `AND_${destReg}_${srcReg}`,
        aluOp: ALU_OPS.AND,
        srcA,
        srcB,
        dest,
        description: `${destReg} <- ${destReg} & ${srcReg}`,
      });

    case 'OR':
      return createMicroinstruction({
        address,
        label: `OR_${destReg}_${srcReg}`,
        aluOp: ALU_OPS.OR,
        srcA,
        srcB,
        dest,
        description: `${destReg} <- ${destReg} | ${srcReg}`,
      });

    case 'XOR':
      return createMicroinstruction({
        address,
        label: `XOR_${destReg}_${srcReg}`,
        aluOp: ALU_OPS.XOR,
        srcA,
        srcB,
        dest,
        description: `${destReg} <- ${destReg} ^ ${srcReg}`,
      });

    case 'JMP':
      return createMicroinstruction({
        address,
        label: `JMP_${immediate}`,
        nextAddress: immediate,
        description: `Unconditional Jump to μPC ${immediate}`,
      });

    case 'JZ':
      return createMicroinstruction({
        address,
        label: `JZ_${immediate}`,
        condition: CONDITIONS.IF_ZERO,
        nextAddress: immediate,
        description: `Jump to μPC ${immediate} if Z == 1`,
      });

    case 'JNZ':
      return createMicroinstruction({
        address,
        label: `JNZ_${immediate}`,
        condition: CONDITIONS.IF_NOT_ZERO,
        nextAddress: immediate,
        description: `Jump to μPC ${immediate} if Z == 0`,
      });

    case 'HALT':
      return createMicroinstruction({
        address,
        label: 'HALT',
        isHalt: true,
        description: 'Halt Execution',
      });

    default:
      throw new Error(`Unsupported micro-operation mapping for mnemonic '${mnemonic}'`);
  }
}

/**
 * Standard Simulation Presets
 */
export const SIMULATION_PRESETS = [
  {
    id: 'arithmetic_store',
    name: 'Arithmetic Accumulation & Memory Store',
    description: 'Initializes R0 and R1, performs repeated additions, stores result in memory, and halts.',
    sequence: [
      { mnemonic: 'LOAD', dest: 'R0', src: 'R0', imm: 10, token: 'LOAD R0, R0, 10' },
      { mnemonic: 'LOAD', dest: 'R1', src: 'R0', imm: 5,  token: 'LOAD R1, R0, 5' },
      { mnemonic: 'ADD',  dest: 'R0', src: 'R1', imm: 0,  token: 'ADD R0, R1, 0' },
      { mnemonic: 'STORE',dest: 'R0', src: 'R0', imm: 4,  token: 'STORE R0, R0, 4' },
      { mnemonic: 'INC',  dest: 'R1', src: 'R0', imm: 0,  token: 'INC R1, R0, 0' },
      { mnemonic: 'ADD',  dest: 'R0', src: 'R1', imm: 0,  token: 'ADD R0, R1, 0' },
      { mnemonic: 'HALT', dest: 'R0', src: 'R0', imm: 0,  token: 'HALT R0, R0, 0' },
    ],
  },
  {
    id: 'conditional_branch',
    name: 'Arithmetic Subtraction & Conditional Branch (JZ)',
    description: 'Loads equal values, subtracts to raise Zero Flag (Z=1), jumps over NOP to execute target load.',
    sequence: [
      { mnemonic: 'LOAD', dest: 'R0', src: 'R0', imm: 8,  token: 'LOAD R0, R0, 8' },
      { mnemonic: 'LOAD', dest: 'R1', src: 'R0', imm: 8,  token: 'LOAD R1, R0, 8' },
      { mnemonic: 'SUB',  dest: 'R2', src: 'R1', imm: 0,  token: 'SUB R2, R1, 0' },
      { mnemonic: 'JZ',   dest: 'R0', src: 'R0', imm: 5,  token: 'JZ R0, R0, 5' },
      { mnemonic: 'NOP',  dest: 'R0', src: 'R0', imm: 0,  token: 'NOP R0, R0, 0' },
      { mnemonic: 'LOAD', dest: 'R3', src: 'R0', imm: 15, token: 'LOAD R3, R0, 15' },
      { mnemonic: 'HALT', dest: 'R0', src: 'R0', imm: 0,  token: 'HALT R0, R0, 0' },
    ],
  },
  {
    id: 'fault_invalid_word',
    name: 'Intentional Fault Injection (Invalid DFA Word)',
    description: 'Injects an illegal non-binary character and invalid length into Stage 7 to demonstrate pipeline safety halts.',
    sequence: [
      { mnemonic: 'LOAD', dest: 'R0', src: 'R0', imm: 10, token: 'LOAD R0, R0, 10' },
      { mnemonic: 'ADD',  dest: 'R0', src: 'R1', imm: 0,  token: 'ADD R0, R1, 0' },
      // Illegal token that will generate invalid bitstring for DFA
      { mnemonic: 'INVALID_OP', dest: 'R9', src: 'RX', imm: 99, token: 'FAULT_CORRUPT_WORD_BAD' },
      { mnemonic: 'HALT', dest: 'R0', src: 'R0', imm: 0,  token: 'HALT R0, R0, 0' },
    ],
    faultyBitstringOverride: '00110001010X99', // 14 chars with invalid symbol
  },
];
