import test from 'node:test';
import assert from 'node:assert/strict';
import { DaaApiClient, apiClient } from '../src/lib/api.js';

// ============================================================================
// 1. Client Initialization & Loading State Tracking
// ============================================================================

test('API Client - Loading state listener triggers correctly', async () => {
  const client = new DaaApiClient();
  const loadingStates = [];

  const unsubscribe = client.onLoadingChange((isLoading) => {
    loadingStates.push(isLoading);
  });

  // Call health check
  const result = await client.checkHealth();
  assert.equal(result.success, true);

  // Should have toggled true, then false
  assert.deepEqual(loadingStates, [true, false]);
  unsubscribe();
});

test('API Client - Local loading callback executes', async () => {
  const client = new DaaApiClient();
  const localStates = [];

  await client.getSampleData({
    onLoading: (state) => localStates.push(state),
  });

  assert.deepEqual(localStates, [true, false]);
});

// ============================================================================
// 2. Input Validation and Guard Handling
// ============================================================================

test('API Client - Guards against null or undefined inputs before network request', async () => {
  const client = new DaaApiClient();

  const freqRes = await client.calculateFrequencies(null);
  assert.equal(freqRes.success, false);
  assert.match(freqRes.error, /cannot be null or undefined/);

  const compRes = await client.compress(undefined);
  assert.equal(compRes.success, false);
  assert.match(compRes.error, /cannot be null or undefined/);

  const decRes = await client.decompress(null, {});
  assert.equal(decRes.success, false);
  assert.match(decRes.error, /cannot be null or undefined/);

  const decResNoBook = await client.decompress('0101', null);
  assert.equal(decResNoBook.success, false);
  assert.match(decResNoBook.error, /valid prefix codebook/);
});

// ============================================================================
// 3. Backend Unavailable Error Handling
// ============================================================================

test('API Client - Gracefully handles offline / unavailable backend', async () => {
  // Point to a non-existent port
  const offlineClient = new DaaApiClient('http://127.0.0.1:59999');

  const result = await offlineClient.checkHealth();
  assert.equal(result.success, false);
  assert.equal(result.isNetworkError, true);
  assert.match(result.error, /Backend service unavailable/);
});

// ============================================================================
// 4. End-to-End Live Integration Tests with Running Backend
// ============================================================================

test('API Client - Live GET /api/health', async () => {
  const result = await apiClient.checkHealth();
  assert.equal(result.success, true);
  assert.equal(result.data.status, 'healthy');
  assert.equal(result.data.service, 'daa-backend');
});

test('API Client - Live GET /api/daa/sample', async () => {
  const result = await apiClient.getSampleData();
  assert.equal(result.success, true);
  assert.ok(result.data.samples.assembly_program);
  assert.ok(result.data.samples.skewed_instructions);
  assert.ok(result.data.samples.text_benchmark);
});

test('API Client - Live POST /api/daa/frequencies', async () => {
  const tokens = ['LOAD_R0', 'ADD_R0_R1', 'LOAD_R0', 'HALT'];
  const result = await apiClient.calculateFrequencies(tokens);

  assert.equal(result.success, true);
  assert.equal(result.data.total_symbols, 4);
  assert.equal(result.data.frequencies.LOAD_R0, 2);
  assert.equal(result.data.frequencies.ADD_R0_R1, 1);
  assert.equal(result.data.frequencies.HALT, 1);
});

test('API Client - Live POST /api/daa/compress & tree serialization', async () => {
  const sampleText = 'HUFFMAN_COMPRESSION';
  const result = await apiClient.compress(sampleText, 8);

  assert.equal(result.success, true);
  assert.ok(result.data.bitstring.length > 0);
  assert.ok(result.data.codebook);
  assert.ok(result.data.tree); // Serialized tree JSON
  assert.ok(result.data.metrics);
  assert.equal(result.data.metrics.symbol_count, sampleText.length);
  assert.ok(result.data.metrics.payload_compression_ratio > 1);
});

test('API Client - Live POST /api/daa/decompress and error handling', async () => {
  const codebook = { ADD: '0', SUB: '10', HALT: '11' };
  const bitstring = '01011';

  const validRes = await apiClient.decompress(bitstring, codebook, false);
  assert.equal(validRes.success, true);
  assert.deepEqual(validRes.data.decoded, ['ADD', 'SUB', 'HALT']);

  // Invalid non-binary character
  const invalidRes = await apiClient.decompress('01021', codebook, false);
  assert.equal(invalidRes.success, false);
  assert.match(invalidRes.error, /non-binary character/);
});

test('API Client - Live POST /api/daa/roundtrip lossless verification', async () => {
  const tokens = ['LOAD_R0', 'LOAD_R1', 'ADD_R0_R1', 'STORE_R0', 'HALT'];
  const result = await apiClient.verifyRoundTrip(tokens, 12);

  assert.equal(result.success, true);
  assert.equal(result.data.is_lossless, true);
  assert.equal(result.data.match, true);
  assert.deepEqual(result.data.decoded_data, tokens);
  assert.ok(result.data.metrics.payload_space_savings_percent > 60);
});
