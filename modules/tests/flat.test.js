import test from 'node:test';
import assert from 'node:assert/strict';
import { DFA } from '../flat/automata.js';
import { HuffmanDecoderAutomaton } from '../flat/decoder-automaton.js';

test('FLAT - Generic DFA transitions and acceptance', () => {
  // DFA accepting binary strings ending in '01'
  const dfa = new DFA({
    states: ['q0', 'q1', 'q2'],
    alphabet: ['0', '1'],
    transitions: {
      q0: { '0': 'q1', '1': 'q0' },
      q1: { '0': 'q1', '1': 'q2' },
      q2: { '0': 'q1', '1': 'q0' },
    },
    initialState: 'q0',
    acceptingStates: ['q2'],
  });

  const res1 = dfa.process('101');
  assert.equal(res1.accepted, true);
  assert.equal(res1.finalState, 'q2');

  const res2 = dfa.process('100');
  assert.equal(res2.accepted, false);
  assert.equal(res2.finalState, 'q1');
});

test('FLAT - HuffmanDecoderAutomaton translates prefix tree and decodes bitstream', () => {
  // Example codebook:
  // ADD: '0'
  // SUB: '10'
  // MOV: '110'
  // HALT: '111'
  const codebook = {
    ADD: '0',
    SUB: '10',
    MOV: '110',
    HALT: '111',
  };

  const decoder = new HuffmanDecoderAutomaton(codebook);
  const spec = decoder.getSpecification();

  assert.ok(spec.states.includes('q0'));
  assert.equal(spec.alphabet.length, 2);

  // Bitstream: ADD, SUB, MOV, HALT -> '0' + '10' + '110' + '111' = '010110111'
  const bitStream = '010110111';
  const result = decoder.decodeStream(bitStream);

  assert.deepEqual(result.decoded, ['ADD', 'SUB', 'MOV', 'HALT']);
  assert.equal(result.bitCount, 9);
  assert.equal(result.isCleanTermination, true);
});

test('FLAT - Rejects invalid alphabet in DFA', () => {
  const dfa = new DFA({
    states: ['q0'],
    alphabet: ['0', '1'],
    transitions: { q0: { '0': 'q0', '1': 'q0' } },
    initialState: 'q0',
    acceptingStates: ['q0'],
  });

  assert.throws(() => {
    dfa.step('2');
  }, /is not in alphabet/);
});
