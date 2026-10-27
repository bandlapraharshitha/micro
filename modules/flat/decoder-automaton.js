import { DFA } from './automata.js';

/**
 * Builds a Decoder DFA from a Huffman codebook.
 * In hardware micro-architectures, a prefix code can be decoded by a state machine:
 * Each bit shifts state along the prefix path; reaching a leaf emits the symbol
 * and transitions back to state q0 for the next instruction.
 */
export class HuffmanDecoderAutomaton {
  /**
   * @param {Object.<string, string>} codebook - Map of symbol -> binary code, e.g. { 'ADD': '0', 'SUB': '10', 'LOAD': '110' }
   */
  constructor(codebook) {
    this.codebook = codebook;
    this.dfa = this._constructDFA(codebook);
  }

  /**
   * Internal constructor to translate prefix tree paths into DFA states.
   * @private
   */
  _constructDFA(codebook) {
    const states = new Set(['q0']);
    const alphabet = ['0', '1'];
    const transitions = { q0: {} };
    const acceptingStates = new Set();
    const outputMap = {};

    let stateCounter = 1;
    const prefixToState = { '': 'q0' };

    for (const [symbol, code] of Object.entries(codebook)) {
      let currentPrefix = '';
      for (let i = 0; i < code.length; i++) {
        const bit = code[i];
        const nextPrefix = currentPrefix + bit;

        if (!prefixToState[nextPrefix]) {
          const stateId = `q${stateCounter++}`;
          prefixToState[nextPrefix] = stateId;
          states.add(stateId);
          transitions[stateId] = {};
        }

        const fromState = prefixToState[currentPrefix];
        const toState = prefixToState[nextPrefix];
        if (!transitions[fromState]) {
          transitions[fromState] = {};
        }
        transitions[fromState][bit] = toState;

        currentPrefix = nextPrefix;
      }

      // The state for full code is an accepting state that outputs the symbol
      const finalState = prefixToState[code];
      acceptingStates.add(finalState);
      outputMap[finalState] = symbol;
    }

    return new DFA({
      states: Array.from(states),
      alphabet,
      transitions,
      initialState: 'q0',
      acceptingStates: Array.from(acceptingStates),
      outputMap,
    });
  }

  /**
   * Decodes a stream of bits by driving the automaton.
   * When an accepting state is reached, the decoded symbol is recorded
   * and the automaton resets to q0 for the next bit.
   * 
   * @param {string} bitStream - String of '0' and '1'
   * @returns {{ decoded: string[], bitCount: number, stateTrace: string[] }}
   */
  decodeStream(bitStream) {
    const decoded = [];
    const stateTrace = ['q0'];
    this.dfa.reset();

    for (let i = 0; i < bitStream.length; i++) {
      const bit = bitStream[i];
      const nextState = this.dfa.step(bit);
      stateTrace.push(nextState);

      if (this.dfa.isAccepting()) {
        const symbol = this.dfa.getCurrentOutput();
        decoded.push(symbol);
        // Instantaneous reset to q0 for prefix-free code streaming
        this.dfa.reset();
        stateTrace.push('q0(reset)');
      }
    }

    return {
      decoded,
      bitCount: bitStream.length,
      stateTrace,
      isCleanTermination: this.dfa.currentState === 'q0',
    };
  }

  /**
   * Returns formal DFA description for visualization or verification.
   */
  getSpecification() {
    return {
      states: Array.from(this.dfa.states),
      alphabet: Array.from(this.dfa.alphabet),
      transitions: this.dfa.transitions,
      initialState: this.dfa.initialState,
      acceptingStates: Array.from(this.dfa.acceptingStates),
      outputMap: this.dfa.outputMap,
    };
  }
}
