/**
 * Formal Languages and Automata Theory (FLAT) - Subset Construction.
 *
 * Implements standard Rabin-Scott Powerset / Subset Construction algorithm:
 * - Translates non-deterministic NFA with epsilon transitions into an equivalent DFA.
 * - Computes epsilon-closures of subsets.
 * - Generates full 2D DFA transition table with state-subset mapping.
 */

import { NFA } from './nfa.js';

export class DFATransitionTable {
  /**
   * @param {Object} config
   * @param {string[]} config.alphabet
   * @param {string[]} config.states
   * @param {string} config.startState
   * @param {string[]} config.acceptingStates
   * @param {Array<{ dfaState: string, nfaSubset: string[], transitions: Object.<string, string>, isAccepting: boolean }>} config.rows
   * @param {Map<string, Object.<string, string>>} config.transitionMap
   */
  constructor({ alphabet, states, startState, acceptingStates, rows, transitionMap }) {
    this.alphabet = alphabet;
    this.states = states;
    this.startState = startState;
    this.acceptingStates = new Set(acceptingStates);
    this.rows = rows;
    this.transitionMap = transitionMap;
  }

  /**
   * Returns next state from state on symbol, or null if no transition defined.
   * @param {string} state
   * @param {string} symbol
   * @returns {string|null}
   */
  getNextState(state, symbol) {
    const row = this.transitionMap.get(state);
    if (!row || row[symbol] === undefined) {
      return null;
    }
    return row[symbol];
  }

  /**
   * Checks whether a given DFA state is an accepting state.
   * @param {string} state
   * @returns {boolean}
   */
  isAccepting(state) {
    return this.acceptingStates.has(state);
  }
}

/**
 * Converts an NFA to a minimal or standard equivalent DFA via subset construction.
 *
 * @param {NFA} nfa - The source NFA instance
 * @returns {{ dfa: DFATransitionTable, rows: Array<Object>, stateCount: number }}
 */
export function convertNFAtoDFA(nfa) {
  if (!nfa.startState) {
    throw new Error('Cannot perform subset construction on an NFA with no start state.');
  }

  const sortedAlphabet = Array.from(nfa.alphabet).sort();

  // Helper to serialize an NFA state subset into a canonical sorted string key
  const getSubsetKey = (states) => {
    return Array.from(states)
      .map((s) => s.id)
      .sort()
      .join(',');
  };

  // 1. Initial DFA state: ε-closure of NFA start state
  const initialSubset = nfa.epsilonClosure([nfa.startState]);
  const initialKey = getSubsetKey(initialSubset);

  const subsetKeyToDfaId = new Map();
  const dfaIdToSubset = new Map();
  let dfaCounter = 0;

  const initialDfaId = `D${dfaCounter++}`;
  subsetKeyToDfaId.set(initialKey, initialDfaId);
  dfaIdToSubset.set(initialDfaId, initialSubset);

  const unmarkedDfaStates = [initialDfaId];
  const rows = [];
  const transitionMap = new Map();
  const dfaStates = [];
  const acceptingDfaStates = [];

  // 2. Main worklist loop
  while (unmarkedDfaStates.length > 0) {
    const currentDfaId = unmarkedDfaStates.shift();
    dfaStates.push(currentDfaId);

    const currentSubset = dfaIdToSubset.get(currentDfaId);
    const nfaSubsetIds = Array.from(currentSubset)
      .map((s) => s.id)
      .sort();

    const isAccepting = Array.from(currentSubset).some((s) => s.isAccepting);
    if (isAccepting) {
      acceptingDfaStates.push(currentDfaId);
    }

    const stateTransitions = {};

    for (const symbol of sortedAlphabet) {
      // Move on symbol, then compute epsilon-closure
      const moved = nfa.move(currentSubset, symbol);
      const nextSubset = nfa.epsilonClosure(moved);

      if (nextSubset.size > 0) {
        const nextKey = getSubsetKey(nextSubset);
        let nextDfaId = subsetKeyToDfaId.get(nextKey);

        if (!nextDfaId) {
          nextDfaId = `D${dfaCounter++}`;
          subsetKeyToDfaId.set(nextKey, nextDfaId);
          dfaIdToSubset.set(nextDfaId, nextSubset);
          unmarkedDfaStates.push(nextDfaId);
        }

        stateTransitions[symbol] = nextDfaId;
      }
    }

    transitionMap.set(currentDfaId, stateTransitions);
    rows.push({
      dfaState: currentDfaId,
      nfaSubset: nfaSubsetIds,
      transitions: stateTransitions,
      isAccepting,
    });
  }

  const dfa = new DFATransitionTable({
    alphabet: sortedAlphabet,
    states: dfaStates,
    startState: initialDfaId,
    acceptingStates: acceptingDfaStates,
    rows,
    transitionMap,
  });

  return {
    dfa,
    rows,
    stateCount: dfaStates.length,
    alphabet: sortedAlphabet,
  };
}
