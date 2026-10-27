import test from 'node:test';
import assert from 'node:assert/strict';
import {
  instructionToControlWord,
  parseInstructionToken,
  controlWordToMicroinstruction,
  SIMULATION_PRESETS,
} from '../src/lib/simulation/bridge.js';
import { validateControlWord } from '../src/lib/flat/validator.js';
import { ControlMemory } from '../src/lib/coa/controlMemory.js';
import { ExecutionEngine, ENGINE_STATUS } from '../src/lib/coa/executionEngine.js';
import { apiClient } from '../src/lib/api.js';

test('Bridge - instructionToControlWord format conversion', () => {
  // ADD R0, R1, 5 -> Opcode ADD (0011), Dest R0 (00), Src R1 (01), Imm 5 (0101)
  const bitstring = instructionToControlWord({ mnemonic: 'ADD', dest: 'R0', src: 'R1', imm: 5 });
  assert.equal(bitstring, '001100010101');
  assert.equal(bitstring.length, 12);

  // LOAD R2, R0, 10 -> Opcode LOAD (0001), Dest R2 (10), Src R0 (00), Imm 10 (1010)
  const loadBits = instructionToControlWord({ mnemonic: 'LOAD', dest: 'R2', src: 'R0', imm: 10 });
  assert.equal(loadBits, '000110001010');

  // HALT -> Opcode HALT (1111), Dest R0 (00), Src R0 (00), Imm 0 (0000)
  const haltBits = instructionToControlWord({ mnemonic: 'HALT', dest: 'R0', src: 'R0', imm: 0 });
  assert.equal(haltBits, '111100000000');
});

test('Bridge - parseInstructionToken extracts assembly operands', () => {
  const parsed = parseInstructionToken('ADD R0, R1, 5');
  assert.equal(parsed.mnemonic, 'ADD');
  assert.equal(parsed.dest, 'R0');
  assert.equal(parsed.src, 'R1');
  assert.equal(parsed.imm, 5);

  const parsedUnderscore = parseInstructionToken('LOAD_R2_R3_12');
  assert.equal(parsedUnderscore.mnemonic, 'LOAD');
  assert.equal(parsedUnderscore.dest, 'R2');
  assert.equal(parsedUnderscore.src, 'R3');
  assert.equal(parsedUnderscore.imm, 12);
});

test('Bridge - controlWordToMicroinstruction creates valid COA microinstruction', () => {
  // Valid ADD R0, R1, 0 (0011 00 01 0000)
  const uinst = controlWordToMicroinstruction('001100010000', 0);
  assert.equal(uinst.address, 0);
  assert.equal(uinst.aluOp, 'ADD');
  assert.equal(uinst.dest, 'R0');
  assert.equal(uinst.srcB, 'R1');

  // Valid HALT (1111 00 00 0000)
  const haltInst = controlWordToMicroinstruction('111100000000', 1);
  assert.equal(haltInst.isHalt, true);

  // Invalid word length should throw
  assert.throws(() => {
    controlWordToMicroinstruction('00110001', 0);
  }, /Control word validation failed/);
});

test('Bridge - Full End-to-End Pipeline Execution (Stages 1 through 10)', async () => {
  const preset = SIMULATION_PRESETS[0]; // arithmetic_store
  const originalTokens = preset.sequence.map((s) => s.token);

  // Stage 2: Huffman Compression via backend
  const compressRes = await apiClient.compress(originalTokens, 12);
  assert.equal(compressRes.success, true);
  const { bitstring, codebook, metrics } = compressRes.data;
  assert.ok(bitstring.length > 0);
  assert.ok(metrics.payload_compression_ratio > 1.0);

  // Stage 4: Huffman Decompression via backend
  const decompressRes = await apiClient.decompress(bitstring, codebook, false);
  assert.equal(decompressRes.success, true);
  const decodedTokens = decompressRes.data.decoded;

  // Stage 5: Lossless Verification
  assert.equal(decodedTokens.length, originalTokens.length);
  for (let i = 0; i < originalTokens.length; i++) {
    assert.equal(decodedTokens[i], originalTokens[i]);
  }

  // Stage 6: Control-Word Binary Translation
  const controlWords = decodedTokens.map((tok) => {
    const parsed = parseInstructionToken(tok);
    return instructionToControlWord(parsed);
  });
  assert.equal(controlWords.length, originalTokens.length);

  // Stage 7: FLAT DFA Validation
  for (const word of controlWords) {
    const val = validateControlWord(word);
    assert.equal(val.isValid, true, `Word ${word} must pass DFA validation`);
    assert.equal(val.syntax.isValid, true);
    assert.equal(val.semantics.isValid, true);
  }

  // Stage 8: Load into COA Control Memory
  const microprogram = controlWords.map((word, idx) =>
    controlWordToMicroinstruction(word, idx)
  );
  const controlMemory = new ControlMemory(microprogram);
  assert.equal(controlMemory.size(), microprogram.length);

  // Stage 9: Execute via COA ExecutionEngine
  const engine = new ExecutionEngine({ controlMemory });
  const result = engine.run();

  assert.equal(result.finalStatus, ENGINE_STATUS.HALTED);
  assert.ok(result.stepsExecuted > 0);

  // Initial R0 was 10, R1 was 5. R0 = 10 + 5 = 15. R0 stored to Mem[4].
  // R1 incremented to 6. R0 = 15 + 6 = 21. HALT.
  assert.equal(engine.registers.read('R0'), 21);
  assert.equal(engine.registers.read('R1'), 6);
  assert.equal(engine.dataMemory.read(4), 15);
});

test('Bridge - Fault Injection Stops Dependent Stages', () => {
  const faultWord = '00110001010X99'; // Invalid non-binary and wrong length
  const val = validateControlWord(faultWord);

  assert.equal(val.isValid, false);
  assert.equal(val.syntax.isValid, false);

  // Verify that controlWordToMicroinstruction rejects it
  assert.throws(() => {
    controlWordToMicroinstruction(faultWord, 0);
  });
});
