import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALU_OPS,
  CONDITIONS,
  MEM_OPS,
  PC_OPS,
  REG_ID,
  createMicroinstruction,
} from '../src/lib/coa/microinstructions.js';
import { RegisterFile, DataMemory } from '../src/lib/coa/registers.js';
import { ControlMemory } from '../src/lib/coa/controlMemory.js';
import { ExecutionEngine, ENGINE_STATUS } from '../src/lib/coa/executionEngine.js';

// ============================================================================
// 1. Register File and Arithmetic Tests
// ============================================================================

test('COA - Register file read and write operations', () => {
  const rf = new RegisterFile();
  assert.equal(rf.read('R0'), 0);

  rf.write('R0', 0x1234);
  assert.equal(rf.read('R0'), 0x1234);

  // Masking to 16 bits
  rf.write('R1', 0x1ffff);
  assert.equal(rf.read('R1'), 0xffff);

  // Special registers
  rf.write('PC', 0x0100);
  rf.write('MAR', 0x0040);
  rf.write('MDR', 0xabcd);
  assert.equal(rf.read('PC'), 0x0100);
  assert.equal(rf.read('MAR'), 0x0040);
  assert.equal(rf.read('MDR'), 0xabcd);

  // Invalid register read/write
  assert.throws(() => rf.read('R99'), /unknown register/);
  assert.throws(() => rf.write('R99', 10), /unknown register/);
});

test('COA - Arithmetic execution and flag updates', () => {
  const engine = new ExecutionEngine();
  const program = [
    // 1. R0 <- 100
    createMicroinstruction({
      label: 'INIT_R0',
      aluOp: ALU_OPS.PASS_B,
      imm: 100,
      dest: REG_ID.R0,
    }),
    // 2. R1 <- 100
    createMicroinstruction({
      label: 'INIT_R1',
      aluOp: ALU_OPS.PASS_B,
      imm: 100,
      dest: REG_ID.R1,
    }),
    // 3. R2 <- R0 - R1 (100 - 100 = 0 -> Z flag must be set!)
    createMicroinstruction({
      label: 'SUB_TO_ZERO',
      aluOp: ALU_OPS.SUB,
      srcA: REG_ID.R0,
      srcB: REG_ID.R1,
      dest: REG_ID.R2,
    }),
    // 4. R3 <- R2 - 1 (0 - 1 = -1 -> 0xFFFF, S flag and Carry/Borrow must be set!)
    createMicroinstruction({
      label: 'SUB_UNDERFLOW',
      aluOp: ALU_OPS.DEC,
      srcA: REG_ID.R2,
      dest: REG_ID.R3,
    }),
    // 5. HALT
    createMicroinstruction({
      label: 'HALT',
      isHalt: true,
    }),
  ];

  engine.controlMemory.loadMicroprogram(program);

  // Step 1: R0 <- 100
  engine.step();
  assert.equal(engine.registers.R0, 100);
  assert.equal(engine.registers.flags.Z, 0);

  // Step 2: R1 <- 100
  engine.step();
  assert.equal(engine.registers.R1, 100);

  // Step 3: R2 <- R0 - R1 = 0
  engine.step();
  assert.equal(engine.registers.R2, 0);
  assert.equal(engine.registers.flags.Z, 1); // Zero flag set
  assert.equal(engine.registers.flags.S, 0);

  // Step 4: R3 <- 0 - 1 = 0xFFFF
  engine.step();
  assert.equal(engine.registers.R3, 0xffff);
  assert.equal(engine.registers.flags.Z, 0);
  assert.equal(engine.registers.flags.S, 1); // Negative / Sign flag set (bit 15 = 1)
  assert.equal(engine.registers.flags.C, 1); // Borrow occurred

  // Step 5: HALT
  engine.step();
  assert.equal(engine.status, ENGINE_STATUS.HALTED);
});

// ============================================================================
// 2. Memory Operations Tests
// ============================================================================

test('COA - Memory read and write operations via MAR and MDR', () => {
  const engine = new ExecutionEngine();
  const program = [
    // 1. MAR <- 0x42
    createMicroinstruction({
      aluOp: ALU_OPS.PASS_B,
      imm: 0x42,
      dest: REG_ID.MAR,
    }),
    // 2. MDR <- 0x7777
    createMicroinstruction({
      aluOp: ALU_OPS.PASS_B,
      imm: 0x7777,
      dest: REG_ID.MDR,
    }),
    // 3. Write MDR to Memory[MAR]
    createMicroinstruction({
      memOp: MEM_OPS.WRITE,
    }),
    // 4. MDR <- 0 (clear MDR)
    createMicroinstruction({
      aluOp: ALU_OPS.PASS_B,
      imm: 0,
      dest: REG_ID.MDR,
    }),
    // 5. Read Memory[MAR] back into MDR
    createMicroinstruction({
      memOp: MEM_OPS.READ,
    }),
    // 6. R0 <- MDR
    createMicroinstruction({
      aluOp: ALU_OPS.PASS_A,
      srcA: REG_ID.MDR,
      dest: REG_ID.R0,
      isHalt: true,
    }),
  ];

  engine.controlMemory.loadMicroprogram(program);
  const result = engine.run();

  assert.equal(result.finalStatus, ENGINE_STATUS.HALTED);
  assert.equal(engine.dataMemory.read(0x42), 0x7777);
  assert.equal(engine.registers.R0, 0x7777);
});

test('COA - Data memory out-of-bounds error handling', () => {
  const engine = new ExecutionEngine();
  const program = [
    // MAR <- 9999 (out of 256 size bounds)
    createMicroinstruction({
      aluOp: ALU_OPS.PASS_B,
      imm: 9999,
      dest: REG_ID.MAR,
    }),
    // Attempt memory read
    createMicroinstruction({
      memOp: MEM_OPS.READ,
    }),
  ];

  engine.controlMemory.loadMicroprogram(program);
  engine.step(); // Step 1: sets MAR
  const errStep = engine.step(); // Step 2: triggers out-of-bounds error

  assert.equal(engine.status, ENGINE_STATUS.ERROR);
  assert.match(errStep.error, /out-of-bounds/);
  assert.equal(engine.lastError, errStep.error);
});

// ============================================================================
// 3. Execution Sequencing & Conditional Branching Tests
// ============================================================================

test('COA - Execution sequencing and conditional branching (IF_ZERO)', () => {
  const engine = new ExecutionEngine();
  const program = [
    // 0: R0 <- 5
    createMicroinstruction({
      aluOp: ALU_OPS.PASS_B,
      imm: 5,
      dest: REG_ID.R0,
    }),
    // 1: R0 <- R0 - 5 (Result = 0, Z flag set)
    createMicroinstruction({
      aluOp: ALU_OPS.SUB,
      srcA: REG_ID.R0,
      imm: 5,
      dest: REG_ID.R0,
    }),
    // 2: If Z == 1, branch to address 4 (skip address 3)
    createMicroinstruction({
      condition: CONDITIONS.IF_ZERO,
      nextAddress: 4,
    }),
    // 3: SHOULD BE SKIPPED: R1 <- 999
    createMicroinstruction({
      aluOp: ALU_OPS.PASS_B,
      imm: 999,
      dest: REG_ID.R1,
    }),
    // 4: TARGET: R1 <- 42
    createMicroinstruction({
      aluOp: ALU_OPS.PASS_B,
      imm: 42,
      dest: REG_ID.R1,
      isHalt: true,
    }),
  ];

  engine.controlMemory.loadMicroprogram(program);
  engine.run();

  assert.equal(engine.status, ENGINE_STATUS.HALTED);
  // Address 3 was skipped, so R1 must be 42, not 999!
  assert.equal(engine.registers.R1, 42);
  assert.equal(engine.registers.R0, 0);
});

// ============================================================================
// 4. Program Counter (PC) Updates
// ============================================================================

test('COA - Program counter increment and load operations', () => {
  const engine = new ExecutionEngine();
  const program = [
    // 1. PC increment: PC <- 0 + 1 = 1
    createMicroinstruction({ pcOp: PC_OPS.INCREMENT }),
    // 2. PC increment: PC <- 1 + 1 = 2
    createMicroinstruction({ pcOp: PC_OPS.INCREMENT }),
    // 3. Load PC with immediate address 0x0080
    createMicroinstruction({ pcOp: PC_OPS.LOAD_IMM, imm: 0x0080 }),
    // 4. PC increment: PC <- 0x0080 + 1 = 0x0081
    createMicroinstruction({ pcOp: PC_OPS.INCREMENT, isHalt: true }),
  ];

  engine.controlMemory.loadMicroprogram(program);
  engine.run();

  assert.equal(engine.status, ENGINE_STATUS.HALTED);
  assert.equal(engine.registers.PC, 0x0081);
});

// ============================================================================
// 5. Run, Pause, Resume, and Reset Controls
// ============================================================================

test('COA - Run, pause, resume, and reset engine controls', () => {
  const engine = new ExecutionEngine();
  const program = ControlMemory.createDefaultMicroprogram();
  engine.controlMemory.loadMicroprogram(program);

  // Execute 3 steps manually
  engine.step();
  engine.step();
  engine.step();
  assert.equal(engine.cycleCount, 3);
  assert.equal(engine.registers.R0, 35); // 10 + 25

  // Run remaining steps to completion
  const runResult = engine.run();
  assert.equal(runResult.finalStatus, ENGINE_STATUS.HALTED);
  assert.equal(engine.dataMemory.read(0x20), 35);

  // Reset engine
  engine.reset();
  assert.equal(engine.cycleCount, 0);
  assert.equal(engine.uPC, 0);
  assert.equal(engine.status, ENGINE_STATUS.IDLE);
  assert.equal(engine.registers.R0, 0);
  assert.equal(engine.dataMemory.read(0x20), 0);
  assert.equal(engine.getHistory().length, 0);
});

// ============================================================================
// 6. Maximum-Step Protection & Infinite Loop Guard
// ============================================================================

test('COA - Maximum-step protection halts runaway microprogram loop', () => {
  const engine = new ExecutionEngine();
  // An intentional infinite microprogram loop: address 0 branches to address 0
  const loopProgram = [
    createMicroinstruction({
      label: 'INFINITE_LOOP',
      aluOp: ALU_OPS.INC,
      srcA: REG_ID.R0,
      dest: REG_ID.R0,
      condition: CONDITIONS.UNCONDITIONAL,
      nextAddress: 0,
    }),
  ];

  engine.controlMemory.loadMicroprogram(loopProgram);
  const result = engine.run(50); // limit to 50 max steps

  assert.equal(result.exceededMaxSteps, true);
  assert.equal(result.stepsExecuted, 50);
  assert.equal(engine.status, ENGINE_STATUS.PAUSED);
  assert.equal(engine.registers.R0, 50);
});

// ============================================================================
// 7. Invalid Micro-Operations Handling
// ============================================================================

test('COA - Invalid micro-operation raises error and halts execution', () => {
  const engine = new ExecutionEngine();
  const program = [
    createMicroinstruction({
      aluOp: 'UNKNOWN_MAGIC_OP', // Invalid ALU operation
      dest: REG_ID.R0,
    }),
  ];

  engine.controlMemory.loadMicroprogram(program);
  const stepResult = engine.step();

  assert.equal(engine.status, ENGINE_STATUS.ERROR);
  assert.match(stepResult.error, /unsupported ALU operation/);
  assert.equal(engine.lastError, stepResult.error);
});
