/**
 * Formal Languages and Automata Theory (FLAT) - Validator & Control-Word Lab.
 *
 * Implements:
 * 1. Educational 12-bit micro-architecture control word specification.
 * 2. Modular NFA construction with epsilon transitions.
 * 3. Subset-construction generated DFA.
 * 4. Distinct, decoupled Syntax and Semantic validation operations.
 * 5. Cycle-by-cycle / bit-by-bit transition tracing.
 */

import { NFA } from './nfa.js';
import { convertNFAtoDFA, DFATransitionTable } from './subsetConstruction.js';

// ============================================================================
// 1. Educational 12-Bit Control-Word Format Specification
// ============================================================================
//
// Format:
//   Bits [11:8] (4 bits) : OPCODE
//   Bits [7:6]  (2 bits) : DESTINATION REGISTER (Rdest)
//   Bits [5:4]  (2 bits) : SOURCE REGISTER (Rsrc)
//   Bits [3:0]  (4 bits) : IMMEDIATE VALUE / OFFSET (0 - 15)
//
// Total Width: 12 bits
// Binary Alphabet: Σ = { '0', '1' }
// ============================================================================

export const CONTROL_WORD_SPEC = {
  totalBits: 12,
  fields: {
    opcode: { start: 0, end: 4, width: 4, label: 'Opcode [11:8]' },
    destReg: { start: 4, end: 6, width: 2, label: 'Destination Register [7:6]' },
    srcReg: { start: 6, end: 8, width: 2, label: 'Source Register [5:4]' },
    immediate: { start: 8, end: 12, width: 4, label: 'Immediate / Offset [3:0]' },
  },
};

export const OPCODE_MAP = {
  '0000': { mnemonic: 'NOP', name: 'No Operation', type: 'CONTROL' },
  '0001': { mnemonic: 'LOAD', name: 'Load Memory to Register', type: 'MEMORY' },
  '0010': { mnemonic: 'STORE', name: 'Store Register to Memory', type: 'MEMORY' },
  '0011': { mnemonic: 'ADD', name: 'Add Registers', type: 'ALU' },
  '0100': { mnemonic: 'SUB', name: 'Subtract Registers', type: 'ALU' },
  '0101': { mnemonic: 'AND', name: 'Bitwise AND', type: 'ALU' },
  '0110': { mnemonic: 'OR', name: 'Bitwise OR', type: 'ALU' },
  '0111': { mnemonic: 'XOR', name: 'Bitwise XOR', type: 'ALU' },
  '1000': { mnemonic: 'INC', name: 'Increment Register', type: 'ALU' },
  '1001': { mnemonic: 'DEC', name: 'Decrement Register', type: 'ALU' },
  '1010': { mnemonic: 'JMP', name: 'Unconditional Jump', type: 'BRANCH' },
  '1011': { mnemonic: 'JZ', name: 'Jump if Zero', type: 'BRANCH' },
  '1100': { mnemonic: 'JNZ', name: 'Jump if Not Zero', type: 'BRANCH' },
  '1101': { mnemonic: 'IN', name: 'Read Peripheral Port', type: 'IO' },
  '1110': { mnemonic: 'OUT', name: 'Write Peripheral Port', type: 'IO' },
  '1111': { mnemonic: 'HALT', name: 'Halt Execution', type: 'CONTROL' },
};

export const REGISTER_MAP = {
  '00': 'R0',
  '01': 'R1',
  '10': 'R2',
  '11': 'R3',
};

// ============================================================================
// 2. Automata Construction (NFA with Epsilon Transitions -> Subset DFA)
// ============================================================================

/**
 * Builds an NFA accepting the regular language of 12-bit control words:
 * L = { w ∈ {0, 1}* | |w| = 12 }
 *
 * Uses modular state stages connected via explicit ε (epsilon) transitions:
 * Stage 1 (Opcode, 4 bits) -> ε -> Stage 2 (Rdest, 2 bits) -> ε ->
 * Stage 3 (Rsrc, 2 bits) -> ε -> Stage 4 (Immediate, 4 bits) -> Accepting.
 *
 * @returns {NFA}
 */
export function buildControlWordNFA() {
  const nfa = new NFA();

  // Helper to build a linear bit-sequence stage
  const buildStage = (prefix, bitCount) => {
    for (let i = 0; i < bitCount; i++) {
      const from = `${prefix}_${i}`;
      const to = `${prefix}_${i + 1}`;
      nfa.addTransition(from, '0', to);
      nfa.addTransition(from, '1', to);
    }
  };

  // Stage 1: Opcode (4 bits: s_op_0 -> ... -> s_op_4)
  buildStage('s_op', 4);

  // Stage 2: Rdest (2 bits: s_rd_0 -> ... -> s_rd_2)
  buildStage('s_rd', 2);

  // Stage 3: Rsrc (2 bits: s_rs_0 -> ... -> s_rs_2)
  buildStage('s_rs', 2);

  // Stage 4: Immediate (4 bits: s_imm_0 -> ... -> s_imm_4)
  buildStage('s_imm', 4);

  // Connect modular sub-stages with formal ε-transitions
  nfa.addEpsilonTransition('s_op_4', 's_rd_0');
  nfa.addEpsilonTransition('s_rd_2', 's_rs_0');
  nfa.addEpsilonTransition('s_rs_2', 's_imm_0');

  // Set start and accepting states
  nfa.setStartState('s_op_0');
  nfa.createState('s_imm_4', true); // unique accepting state

  return nfa;
}

// Cached DFA instance constructed via subset construction
let _cachedControlWordDFA = null;

/**
 * Returns the compiled DFA generated via subset construction from the modular NFA.
 * @returns {DFATransitionTable}
 */
export function getControlWordDFA() {
  if (!_cachedControlWordDFA) {
    const nfa = buildControlWordNFA();
    const result = convertNFAtoDFA(nfa);
    _cachedControlWordDFA = result.dfa;
  }
  return _cachedControlWordDFA;
}

// ============================================================================
// 3. Execution Tracing & DFA Validation
// ============================================================================

/**
 * Traces step-by-step state transitions of a DFA on an input string.
 *
 * @param {DFATransitionTable} dfa
 * @param {string} inputString
 * @returns {{
 *   accepted: boolean,
 *   finalState: string|null,
 *   trace: Array<{ step: number, symbol: string|null, fromState: string|null, toState: string|null }>,
 *   error: string|null
 * }}
 */
export function traceDFA(dfa, inputString) {
  let currentState = dfa.startState;
  const trace = [
    {
      step: 0,
      symbol: null,
      fromState: null,
      toState: currentState,
    },
  ];

  for (let i = 0; i < inputString.length; i++) {
    const symbol = inputString[i];

    if (!dfa.alphabet.includes(symbol)) {
      return {
        accepted: false,
        finalState: currentState,
        trace,
        error: `Invalid character '${symbol}' at position ${i}. Expected alphabet Σ = {${dfa.alphabet.join(', ')}}.`,
      };
    }

    const nextState = dfa.getNextState(currentState, symbol);
    if (!nextState) {
      trace.push({
        step: i + 1,
        symbol,
        fromState: currentState,
        toState: null,
      });
      return {
        accepted: false,
        finalState: null,
        trace,
        error: `No transition defined for δ(${currentState}, '${symbol}') at bit ${i}. Trapped in dead state.`,
      };
    }

    trace.push({
      step: i + 1,
      symbol,
      fromState: currentState,
      toState: nextState,
    });
    currentState = nextState;
  }

  const accepted = dfa.isAccepting(currentState);
  return {
    accepted,
    finalState: currentState,
    trace,
    error: accepted ? null : 'DFA finished in a non-accepting state.',
  };
}

// ============================================================================
// 4. Decoupled Syntax and Semantic Validation Operations
// ============================================================================

/**
 * Performs strict formal syntax validation of a 12-bit control word using the DFA.
 *
 * Checks:
 * - Length exactness (must be exactly 12 characters).
 * - Alphabet purity (only '0' and '1').
 * - DFA transition acceptance.
 *
 * @param {string} bitstring
 * @param {DFATransitionTable} [customDFA]
 * @returns {{
 *   isValid: boolean,
 *   error: string|null,
 *   length: number,
 *   trace: Array<Object>,
 *   finalState: string|null
 * }}
 */
export function validateSyntax(bitstring, customDFA = null) {
  if (typeof bitstring !== 'string') {
    return {
      isValid: false,
      error: `Input must be a string, received ${typeof bitstring}.`,
      length: 0,
      trace: [],
      finalState: null,
    };
  }

  const dfa = customDFA || getControlWordDFA();
  const traceResult = traceDFA(dfa, bitstring);

  if (bitstring.length !== CONTROL_WORD_SPEC.totalBits) {
    return {
      isValid: false,
      error: `Incorrect input length: got ${bitstring.length} bits, expected exactly ${CONTROL_WORD_SPEC.totalBits} bits.`,
      length: bitstring.length,
      trace: traceResult.trace,
      finalState: traceResult.finalState,
    };
  }

  if (!traceResult.accepted) {
    return {
      isValid: false,
      error: traceResult.error || 'Syntax rejected by control-word DFA.',
      length: bitstring.length,
      trace: traceResult.trace,
      finalState: traceResult.finalState,
    };
  }

  return {
    isValid: true,
    error: null,
    length: bitstring.length,
    trace: traceResult.trace,
    finalState: traceResult.finalState,
  };
}

/**
 * Performs micro-architectural semantic validation of a 12-bit control word.
 *
 * Checks:
 * - Opcode decoding and membership in supported opcodes set.
 * - Register operand field semantics.
 * - Structural semantic constraints for specific instructions (NOP, HALT, INC).
 *
 * @param {string} bitstring
 * @param {Object} [options]
 * @param {string[]} [options.supportedOpcodes] - List of active supported opcode mnemonics
 * @returns {{
 *   isValid: boolean,
 *   mnemonic: string|null,
 *   opcodeInfo: Object|null,
 *   destReg: string,
 *   srcReg: string,
 *   immediate: number,
 *   errors: string[],
 *   warnings: string[]
 * }}
 */
export function validateSemantics(bitstring, { supportedOpcodes = null } = {}) {
  const errors = [];
  const warnings = [];

  // Extract slices
  const opcodeBits = bitstring.slice(0, 4);
  const destBits = bitstring.slice(4, 6);
  const srcBits = bitstring.slice(6, 8);
  const immBits = bitstring.slice(8, 12);

  const opcodeInfo = OPCODE_MAP[opcodeBits] || null;
  const destReg = REGISTER_MAP[destBits] || null;
  const srcReg = REGISTER_MAP[srcBits] || null;
  const immediate = parseInt(immBits, 2);

  // 1. Validate Opcode Support
  if (!opcodeInfo) {
    errors.push(`Unsupported binary opcode: '${opcodeBits}'.`);
  } else if (supportedOpcodes && !supportedOpcodes.includes(opcodeInfo.mnemonic)) {
    errors.push(`Opcode '${opcodeInfo.mnemonic}' (${opcodeBits}) is not enabled in supported opcodes.`);
  }

  // 2. Validate Register Fields
  if (!destReg) {
    errors.push(`Invalid destination register encoding: '${destBits}'.`);
  }
  if (!srcReg) {
    errors.push(`Invalid source register encoding: '${srcBits}'.`);
  }

  // 3. Instruction-specific semantic rules
  if (opcodeInfo) {
    switch (opcodeInfo.mnemonic) {
      case 'NOP':
      case 'HALT':
        if (destBits !== '00' || srcBits !== '00' || immBits !== '0000') {
          warnings.push(`${opcodeInfo.mnemonic} instruction should conventionally have zeroed operand fields.`);
        }
        break;
      case 'INC':
      case 'DEC':
        if (srcBits !== '00') {
          warnings.push(`${opcodeInfo.mnemonic} operates on single register Rdest; Rsrc should be '00'.`);
        }
        break;
      case 'JMP':
      case 'JZ':
      case 'JNZ':
        if (destBits !== '00' || srcBits !== '00') {
          warnings.push(`Branch instruction ${opcodeInfo.mnemonic} branches to immediate target; registers are unused.`);
        }
        break;
      default:
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    mnemonic: opcodeInfo ? opcodeInfo.mnemonic : null,
    opcodeInfo,
    destReg,
    srcReg,
    immediate,
    rawFields: {
      opcodeBits,
      destBits,
      srcBits,
      immBits,
    },
    errors,
    warnings,
  };
}

/**
 * Executes unified validation while keeping syntax and semantics strictly decoupled.
 *
 * @param {string} bitstring
 * @param {Object} [options]
 * @returns {{
 *   isValid: boolean,
 *   syntax: Object,
 *   semantics: Object|null
 * }}
 */
export function validateControlWord(bitstring, options = {}) {
  const syntax = validateSyntax(bitstring, options.dfa);

  if (!syntax.isValid) {
    return {
      isValid: false,
      syntax,
      semantics: null,
    };
  }

  const semantics = validateSemantics(bitstring, options);
  return {
    isValid: syntax.isValid && semantics.isValid,
    syntax,
    semantics,
  };
}
