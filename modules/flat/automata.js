/**
 * Deterministic Finite Automaton (DFA) Model for FLAT.
 * Formally defined as a 5-tuple: M = (Q, Σ, δ, q0, F)
 * - Q: Finite set of states
 * - Σ: Finite alphabet (binary: {'0', '1'})
 * - δ: State transition function Q × Σ → Q
 * - q0: Start state ∈ Q
 * - F: Set of accepting states ⊆ Q
 */

export class DFA {
  /**
   * @param {Object} config
   * @param {string[]} config.states - List of state identifiers
   * @param {string[]} config.alphabet - Valid input symbols, e.g. ['0', '1']
   * @param {Object.<string, Object.<string, string>>} config.transitions - δ(state, symbol) = nextState
   * @param {string} config.initialState - q0
   * @param {string[]} config.acceptingStates - F
   * @param {Object.<string, any>} [config.outputMap] - Optional Moore/Mealy output mapping for accepting states
   */
  constructor({ states, alphabet, transitions, initialState, acceptingStates, outputMap = {} }) {
    this.states = new Set(states);
    this.alphabet = new Set(alphabet);
    this.transitions = transitions;
    this.initialState = initialState;
    this.acceptingStates = new Set(acceptingStates);
    this.outputMap = outputMap;

    this.currentState = initialState;
    this.history = [initialState];
  }

  /**
   * Resets the DFA to its initial state.
   */
  reset() {
    this.currentState = this.initialState;
    this.history = [this.initialState];
    return this.currentState;
  }

  /**
   * Performs a single state transition on the provided input symbol.
   * @param {string} symbol - Symbol from alphabet Σ
   * @returns {string} The new state
   */
  step(symbol) {
    if (!this.alphabet.has(symbol)) {
      throw new Error(`Symbol '${symbol}' is not in alphabet Σ: [${[...this.alphabet].join(', ')}]`);
    }

    const stateTransitions = this.transitions[this.currentState];
    if (!stateTransitions || stateTransitions[symbol] === undefined) {
      throw new Error(`No transition defined for δ(${this.currentState}, ${symbol})`);
    }

    this.currentState = stateTransitions[symbol];
    this.history.push(this.currentState);
    return this.currentState;
  }

  /**
   * Checks if current state is an accepting state.
   * @returns {boolean}
   */
  isAccepting() {
    return this.acceptingStates.has(this.currentState);
  }

  /**
   * Retrieves output associated with the current state (if accepting).
   * @returns {any|null}
   */
  getCurrentOutput() {
    if (this.isAccepting()) {
      return this.outputMap[this.currentState] ?? null;
    }
    return null;
  }

  /**
   * Processes a sequence of symbols through the DFA.
   * @param {string|string[]} stream - Sequence of symbols
   * @returns {{ accepted: boolean, finalState: string, history: string[] }}
   */
  process(stream) {
    this.reset();
    for (const symbol of stream) {
      this.step(symbol);
    }
    return {
      accepted: this.isAccepting(),
      finalState: this.currentState,
      history: [...this.history],
      output: this.getCurrentOutput(),
    };
  }
}
