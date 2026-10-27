import test from 'node:test';
import assert from 'node:assert/strict';
import { NFA, NFAState, EPSILON } from '../src/lib/flat/nfa.js';
import { convertNFAtoDFA } from '../src/lib/flat/subsetConstruction.js';
import {
  CONTROL_WORD_SPEC,
  OPCODE_MAP,
  REGISTER_MAP,
  buildControlWordNFA,
  getControlWordDFA,
  traceDFA,
  validateSyntax,
  validateSemantics,
  validateControlWord,
} from '../src/lib/flat/validator.js';

// ============================================================================
// 1. NFA State Representation & Epsilon Transitions Tests
// ============================================================================

test('FLAT - NFA state creation and epsilon transitions', () => {
  const nfa = new NFA();
  const s0 = nfa.createState('s0');
  const s1 = nfa.createState('s1');
  const s2 = nfa.createState('s2', true);

  nfa.addEpsilonTransition('s0', 's1');
  nfa.addEpsilonTransition('s1', 's2');

  assert.equal(s0.epsilonTransitions.size, 1);
  assert.equal(s1.epsilonTransitions.size, 1);
  assert.equal(s2.isAccepting, true);

  // Epsilon closure of {s0} should include {s0, s1, s2}
  const closure = nfa.epsilonClosure([s0]);
  const closureIds = Array.from(closure).map((s) => s.id).sort();
  assert.deepEqual(closureIds, ['s0', 's1', 's2']);
});

test('FLAT - Epsilon closure handles cycles without infinite recursion', () => {
  const nfa = new NFA();
  const s0 = nfa.createState('s0');
  const s1 = nfa.createState('s1');

  // Mutual cyclic epsilon transitions
  nfa.addEpsilonTransition('s0', 's1');
  nfa.addEpsilonTransition('s1', 's0');

  const closure = nfa.epsilonClosure([s0]);
  const closureIds = Array.from(closure).map((s) => s.id).sort();
  assert.deepEqual(closureIds, ['s0', 's1']);
});

test('FLAT - NFA move and step operations', () => {
  const nfa = new NFA();
  nfa.setStartState('q0');
  nfa.addTransition('q0', '0', 'q1');
  nfa.addTransition('q0', '1', 'q0');
  nfa.addEpsilonTransition('q1', 'q2');
  nfa.createState('q2', true);

  const startSet = nfa.epsilonClosure([nfa.states.get('q0')]);
  // Move on '0' from q0 reaches q1
  const moved = nfa.move(startSet, '0');
  assert.equal(moved.size, 1);
  assert.ok(moved.has(nfa.states.get('q1')));

  // Epsilon closure of {q1} reaches {q1, q2}
  const stepResult = nfa.epsilonClosure(moved);
  const stepIds = Array.from(stepResult).map((s) => s.id).sort();
  assert.deepEqual(stepIds, ['q1', 'q2']);
});

// ============================================================================
// 2. Subset Construction & Transition Table Generation Tests
// ============================================================================

test('FLAT - Subset construction converts NFA with epsilon to equivalent DFA', () => {
  // NFA accepting binary strings ending in '01'
  const nfa = new NFA();
  nfa.setStartState('s0');
  nfa.addTransition('s0', '0', 's0');
  nfa.addTransition('s0', '1', 's0');
  nfa.addTransition('s0', '0', 's1');
  nfa.addEpsilonTransition('s1', 's2');
  nfa.addTransition('s2', '1', 's3');
  nfa.createState('s3', true);

  const { dfa, rows, stateCount } = convertNFAtoDFA(nfa);

  assert.ok(stateCount >= 3, `Expected at least 3 DFA states, got ${stateCount}`);
  assert.ok(dfa.acceptingStates.size > 0);
  assert.equal(rows.length, stateCount);

  // Each table row should have dfaState, nfaSubset, transitions, isAccepting
  for (const row of rows) {
    assert.ok(typeof row.dfaState === 'string');
    assert.ok(Array.isArray(row.nfaSubset));
    assert.ok(typeof row.transitions === 'object');
    assert.ok(typeof row.isAccepting === 'boolean');
  }

  // String ending in 01 should be accepted
  const trace1 = traceDFA(dfa, '1001');
  assert.equal(trace1.accepted, true);

  // String ending in 00 should be rejected
  const trace2 = traceDFA(dfa, '1000');
  assert.equal(trace2.accepted, false);
});

test('FLAT - Control-word NFA constructs valid DFA via subset construction', () => {
  const nfa = buildControlWordNFA();
  assert.equal(nfa.alphabet.size, 2);
  assert.ok(nfa.alphabet.has('0'));
  assert.ok(nfa.alphabet.has('1'));

  const { dfa, rows } = convertNFAtoDFA(nfa);
  assert.ok(dfa.states.length > 12);
  assert.equal(rows.length, dfa.states.length);
  assert.equal(dfa.startState, 'D0');
  assert.ok(dfa.acceptingStates.size >= 1);
});

// ============================================================================
// 3. 12-Bit Control-Word Format & Valid Strings Tests
// ============================================================================

test('FLAT - Valid 12-bit control word strings accept in syntax and semantics', () => {
  // Instruction: ADD R1, R2, 5
  // Opcode ADD: 0011 (4 bits)
  // Rdest R1:   01   (2 bits)
  // Rsrc R2:    10   (2 bits)
  // Imm 5:      0101 (4 bits)
  // Full 12-bit word: 0011 01 10 0101 -> "001101100101"
  const addWord = '001101100101';
  const result = validateControlWord(addWord);

  assert.equal(result.isValid, true);
  assert.equal(result.syntax.isValid, true);
  assert.equal(result.semantics.isValid, true);
  assert.equal(result.semantics.mnemonic, 'ADD');
  assert.equal(result.semantics.destReg, 'R1');
  assert.equal(result.semantics.srcReg, 'R2');
  assert.equal(result.semantics.immediate, 5);
  assert.equal(result.semantics.errors.length, 0);

  // NOP: 0000 00 00 0000
  const nopResult = validateControlWord('000000000000');
  assert.equal(nopResult.isValid, true);
  assert.equal(nopResult.semantics.mnemonic, 'NOP');

  // HALT: 1111 00 00 0000
  const haltResult = validateControlWord('111100000000');
  assert.equal(haltResult.isValid, true);
  assert.equal(haltResult.semantics.mnemonic, 'HALT');
});

// ============================================================================
// 4. Execution Tracing Tests
// ============================================================================

test('FLAT - Transition-by-transition execution tracing', () => {
  const dfa = getControlWordDFA();
  const word = '000111100011'; // LOAD R3, R2, 3

  const traceResult = traceDFA(dfa, word);
  assert.equal(traceResult.accepted, true);

  // Trace should contain initial state (step 0) + 12 bit transitions = 13 steps
  assert.equal(traceResult.trace.length, 13);

  // Step 0 check
  assert.equal(traceResult.trace[0].step, 0);
  assert.equal(traceResult.trace[0].symbol, null);
  assert.equal(traceResult.trace[0].toState, dfa.startState);

  // Subsequent steps check
  for (let step = 1; step <= 12; step++) {
    const entry = traceResult.trace[step];
    assert.equal(entry.step, step);
    assert.equal(entry.symbol, word[step - 1]);
    assert.ok(entry.fromState !== null);
    assert.ok(entry.toState !== null);
  }
});

// ============================================================================
// 5. Invalid Input Lengths Tests
// ============================================================================

test('FLAT - Rejects incorrect input lengths in syntax validation', () => {
  // 11 bits (too short)
  const shortWord = '00110110010';
  const shortResult = validateSyntax(shortWord);
  assert.equal(shortResult.isValid, false);
  assert.match(shortResult.error, /Incorrect input length: got 11 bits/);

  // 13 bits (too long)
  const longWord = '0011011001011';
  const longResult = validateSyntax(longWord);
  assert.equal(longResult.isValid, false);
  assert.match(longResult.error, /Incorrect input length: got 13 bits/);

  // Empty string (0 bits)
  const emptyResult = validateSyntax('');
  assert.equal(emptyResult.isValid, false);
  assert.match(emptyResult.error, /Incorrect input length: got 0 bits/);
});

// ============================================================================
// 6. Invalid Characters Tests
// ============================================================================

test('FLAT - Rejects non-binary characters in syntax validation', () => {
  // Non-binary character '2'
  const invalidCharWord = '001102100101';
  const result = validateSyntax(invalidCharWord);
  assert.equal(result.isValid, false);
  assert.match(result.error, /Invalid character '2'/);

  // Non-binary character 'A'
  const letterWord = '00110A100101';
  const letterResult = validateSyntax(letterWord);
  assert.equal(letterResult.isValid, false);
  assert.match(letterResult.error, /Invalid character 'A'/);
});

// ============================================================================
// 7. Decoupled Syntax vs Semantic Validation & Unsupported Opcodes Tests
// ============================================================================

test('FLAT - Decoupled syntax and semantic validation with unsupported opcode', () => {
  // A syntactically valid 12-bit word: 1111 00 00 0000 (HALT)
  const haltWord = '111100000000';

  // Syntax validation passes because it is valid 12-bit binary syntax
  const syntaxResult = validateSyntax(haltWord);
  assert.equal(syntaxResult.isValid, true);
  assert.equal(syntaxResult.error, null);

  // Semantic validation with restricted active opcodes (excluding HALT)
  const supportedOpcodes = ['LOAD', 'STORE', 'ADD', 'SUB'];
  const semanticResult = validateSemantics(haltWord, { supportedOpcodes });

  assert.equal(semanticResult.isValid, false);
  assert.equal(semanticResult.mnemonic, 'HALT');
  assert.match(semanticResult.errors[0], /Opcode 'HALT' .* is not enabled in supported opcodes/);

  // Unified validation reflects syntax passing but semantics failing
  const combined = validateControlWord(haltWord, { supportedOpcodes });
  assert.equal(combined.isValid, false);
  assert.equal(combined.syntax.isValid, true);
  assert.equal(combined.semantics.isValid, false);
});
