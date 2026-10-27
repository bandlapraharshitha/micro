/**
 * Formal Languages and Automata Theory (FLAT) - NFA Engine.
 *
 * Implements Non-Deterministic Finite Automata (NFA) with:
 * - Explicit state representation: Q
 * - Finite input alphabet: Σ
 * - Transition relation: Δ: Q × (Σ ∪ {ε}) → P(Q)
 * - Initial state: q0 ∈ Q
 * - Accepting states: F ⊆ Q
 * - Epsilon-closure computation via DFS worklist algorithm.
 */

export const EPSILON = 'ε';

export class NFAState {
  /**
   * @param {string} id - Unique state identifier
   * @param {boolean} [isAccepting=false] - Whether this is a final/accepting state
   */
  constructor(id, isAccepting = false) {
    this.id = id;
    this.isAccepting = isAccepting;
    /** @type {Map<string, Set<NFAState>>} */
    this.transitions = new Map();
    /** @type {Set<NFAState>} */
    this.epsilonTransitions = new Set();
  }

  /**
   * Adds a transition on a symbol or epsilon to targetState.
   * @param {string} symbol
   * @param {NFAState} targetState
   */
  addTransition(symbol, targetState) {
    if (symbol === EPSILON || symbol === '' || symbol === 'epsilon') {
      this.epsilonTransitions.add(targetState);
    } else {
      if (!this.transitions.has(symbol)) {
        this.transitions.set(symbol, new Set());
      }
      this.transitions.get(symbol).add(targetState);
    }
  }

  /**
   * Retrieves all target states reachable on a specific symbol.
   * @param {string} symbol
   * @returns {Set<NFAState>}
   */
  getTransitions(symbol) {
    return this.transitions.get(symbol) || new Set();
  }
}

export class NFA {
  constructor() {
    /** @type {Map<string, NFAState>} */
    this.states = new Map();
    /** @type {Set<string>} */
    this.alphabet = new Set();
    /** @type {NFAState|null} */
    this.startState = null;
  }

  /**
   * Creates or registers a state in the NFA.
   * @param {string} id
   * @param {boolean} [isAccepting=false]
   * @returns {NFAState}
   */
  createState(id, isAccepting = false) {
    if (this.states.has(id)) {
      const existing = this.states.get(id);
      if (isAccepting) existing.isAccepting = true;
      return existing;
    }
    const state = new NFAState(id, isAccepting);
    this.states.set(id, state);
    if (!this.startState) {
      this.startState = state;
    }
    return state;
  }

  /**
   * Sets the initial/start state of the NFA.
   * @param {string} id
   */
  setStartState(id) {
    const state = this.states.get(id) || this.createState(id);
    this.startState = state;
  }

  /**
   * Adds an input symbol transition from fromId to toId.
   * @param {string} fromId
   * @param {string} symbol
   * @param {string} toId
   */
  addTransition(fromId, symbol, toId) {
    const fromState = this.states.get(fromId) || this.createState(fromId);
    const toState = this.states.get(toId) || this.createState(toId);

    if (symbol !== EPSILON && symbol !== '' && symbol !== 'epsilon') {
      this.alphabet.add(symbol);
    }
    fromState.addTransition(symbol, toState);
  }

  /**
   * Adds an epsilon (ε) transition from fromId to toId.
   * @param {string} fromId
   * @param {string} toId
   */
  addEpsilonTransition(fromId, toId) {
    this.addTransition(fromId, EPSILON, toId);
  }

  /**
   * Computes the ε-closure of a given set of NFA states.
   * ε-closure(T) is the set of states reachable from T using only ε-transitions.
   *
   * @param {Set<NFAState>|NFAState[]|NFAState} states
   * @returns {Set<NFAState>}
   */
  epsilonClosure(states) {
    const stateArray = states instanceof Set 
      ? Array.from(states) 
      : Array.isArray(states) 
        ? states 
        : [states];

    const closure = new Set(stateArray);
    const stack = [...stateArray];

    while (stack.length > 0) {
      const current = stack.pop();
      for (const nextState of current.epsilonTransitions) {
        if (!closure.has(nextState)) {
          closure.add(nextState);
          stack.push(nextState);
        }
      }
    }

    return closure;
  }

  /**
   * Calculates the set of states reachable from `states` on `symbol` without ε.
   * move(T, a) = ⋃ { δ(s, a) | s ∈ T }
   *
   * @param {Set<NFAState>} states
   * @param {string} symbol
   * @returns {Set<NFAState>}
   */
  move(states, symbol) {
    const result = new Set();
    for (const state of states) {
      const targets = state.getTransitions(symbol);
      for (const target of targets) {
        result.add(target);
      }
    }
    return result;
  }

  /**
   * Simulates NFA execution on an input string, capturing step-by-step state sets.
   * @param {string} inputString
   * @returns {{ accepted: boolean, trace: Array<{ step: number, symbol: string|null, states: string[] }> }}
   */
  simulate(inputString) {
    if (!this.startState) {
      return { accepted: false, trace: [] };
    }

    let currentStates = this.epsilonClosure([this.startState]);
    const trace = [
      {
        step: 0,
        symbol: null,
        states: Array.from(currentStates).map((s) => s.id).sort(),
      },
    ];

    for (let i = 0; i < inputString.length; i++) {
      const symbol = inputString[i];
      const moved = this.move(currentStates, symbol);
      currentStates = this.epsilonClosure(moved);

      trace.push({
        step: i + 1,
        symbol,
        states: Array.from(currentStates).map((s) => s.id).sort(),
      });

      if (currentStates.size === 0) {
        break; // Trapped in dead set
      }
    }

    const accepted = Array.from(currentStates).some((s) => s.isAccepting);
    return { accepted, trace };
  }
}
