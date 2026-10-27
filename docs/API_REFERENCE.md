# REST API Reference Manual

The **DAA Huffman Compression Subsystem** exposes high-performance analytical endpoints via FastAPI.

- **Base URL:** `http://127.0.0.1:8000`
- **Interactive OpenAPI Documentation:** `http://127.0.0.1:8000/docs`
- **Specification Format:** JSON / REST (Pydantic v2 validated)

---

## 📋 Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Operational health probe of backend service and algorithm subsystems. |
| `GET` | `/api/daa/sample` | Curated sample datasets for instruction and text compression. |
| `POST` | `/api/daa/frequencies` | Calculates symbol frequency distribution and vocabulary size. |
| `POST` | `/api/daa/compress` | Builds min-heap Huffman tree, encodes data into bitstream, and returns metrics. |
| `POST` | `/api/daa/decompress` | Traverses prefix tree or codebook to losslessly reconstruct original symbols. |
| `POST` | `/api/daa/roundtrip` | Performs compression and immediate decompression with lossless verification. |

---

## 1. Health Probe

### `GET /api/health`
Returns service status, subsystem health, version, and server timestamp.

#### Example Request
```bash
curl -X GET http://127.0.0.1:8000/api/health
```

#### Example Response (`200 OK`)
```json
{
  "status": "healthy",
  "service": "daa-backend",
  "description": "Huffman-Compressed Micro-Architecture Simulator - DAA Engine",
  "version": "1.0.0",
  "timestamp": "2026-10-27T12:00:00Z"
}
```

---

## 2. Sample Datasets

### `GET /api/daa/sample`
Provides pre-configured datasets demonstrating various frequency skew characteristics.

#### Example Request
```bash
curl -X GET http://127.0.0.1:8000/api/daa/sample
```

#### Example Response (`200 OK`)
```json
{
  "samples": {
    "assembly_program": {
      "title": "Assembly Loop Sequence (Instruction Redundancy)",
      "description": "Repetitive assembly instruction sequence with skewed frequency distribution.",
      "data": [
        "LOAD_R0", "LOAD_R1", "ADD_R0_R1", "STORE_R0",
        "LOAD_R0", "ADD_R0_R1", "SUB_R0_R1", "BRANCH_ZERO",
        "LOAD_R0", "ADD_R0_R1", "STORE_R0", "HALT"
      ]
    },
    "skewed_instructions": {
      "title": "Highly Skewed Opcode Stream (Maximum Compression)",
      "description": "Heavy dominance of NOP and ADD instructions demonstrating high compression ratios.",
      "data": [
        "NOP", "NOP", "NOP", "NOP", "NOP", "NOP", "NOP", "NOP",
        "ADD", "ADD", "ADD", "LOAD", "STORE", "HALT"
      ]
    },
    "text_benchmark": {
      "title": "Canonical Huffman Benchmark Text",
      "description": "Standard algorithmic test string with variable letter distribution.",
      "data": "HUFFMAN_COMPRESSION_ALGORITHM_MICRO_ARCHITECTURE"
    }
  }
}
```

---

## 3. Calculate Frequencies

### `POST /api/daa/frequencies`
Counts symbol frequencies across the input sequence.

#### Request Schema (`DataRequest`)
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `data` | `string` or `string[]` | **Yes** | Input text string or list of assembly tokens. |

#### Example Request
```bash
curl -X POST http://127.0.0.1:8000/api/daa/frequencies \
  -H "Content-Type: application/json" \
  -d '{"data": ["LOAD_R0", "ADD_R0_R1", "LOAD_R0", "HALT"]}'
```

#### Example Response (`200 OK`)
```json
{
  "frequencies": {
    "LOAD_R0": 2,
    "ADD_R0_R1": 1,
    "HALT": 1
  },
  "total_symbols": 4,
  "unique_symbols": 3
}
```

---

## 4. Huffman Compression

### `POST /api/daa/compress`
Executes greedy min-heap tree construction, derives variable-length codes, encodes the bitstream, and calculates compression metrics.

#### Request Schema (`CompressRequest`)
| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `data` | `string` or `string[]` | *Required* | Input text or sequence of assembly instruction tokens. |
| `bits_per_symbol` | `integer` ($1 \le x \le 64$) | `8` | Baseline uncompressed bits per symbol (e.g. 8 for ASCII, 12 for control words, 16/32 for instructions). |

#### Example Request
```bash
curl -X POST http://127.0.0.1:8000/api/daa/compress \
  -H "Content-Type: application/json" \
  -d '{
    "data": ["LOAD", "ADD", "LOAD", "HALT"],
    "bits_per_symbol": 12
  }'
```

#### Example Response (`200 OK`)
```json
{
  "frequencies": {
    "LOAD": 2,
    "ADD": 1,
    "HALT": 1
  },
  "codebook": {
    "LOAD": "0",
    "ADD": "10",
    "HALT": "11"
  },
  "tree": {
    "symbol": null,
    "frequency": 4,
    "is_leaf": false,
    "min_symbol": "ADD",
    "left": {
      "symbol": "LOAD",
      "frequency": 2,
      "is_leaf": true,
      "min_symbol": "LOAD",
      "left": null,
      "right": null
    },
    "right": {
      "symbol": null,
      "frequency": 2,
      "is_leaf": false,
      "min_symbol": "ADD",
      "left": {
        "symbol": "ADD",
        "frequency": 1,
        "is_leaf": true,
        "min_symbol": "ADD",
        "left": null,
        "right": null
      },
      "right": {
        "symbol": "HALT",
        "frequency": 1,
        "is_leaf": true,
        "min_symbol": "HALT",
        "left": null,
        "right": null
      }
    }
  },
  "bitstring": "010011",
  "bit_count": 6,
  "byte_count": 1,
  "metrics": {
    "symbol_count": 4,
    "unique_symbol_count": 3,
    "bits_per_symbol_baseline": 12,
    "original_bits": 48,
    "payload_bits": 6,
    "metadata_bits": 35,
    "total_compressed_bits": 41,
    "payload_compression_ratio": 8.0,
    "total_compression_ratio": 1.171,
    "payload_space_savings_percent": 87.5,
    "total_space_savings_percent": 14.58,
    "shannon_entropy": 1.5,
    "average_code_length": 1.5,
    "coding_efficiency_percent": 100.0,
    "storage": {
      "payload_bits": 6,
      "payload_bytes": 1,
      "tree_overhead_bits": 35,
      "tree_overhead_bytes": 5,
      "total_bits": 41,
      "total_bytes": 6,
      "original_bits": 48,
      "original_bytes": 6,
      "bits_per_original_symbol": 12
    }
  }
}
```

---

## 5. Huffman Decompression

### `POST /api/daa/decompress`
Decodes a binary bitstream using the prefix codebook or serialized tree.

#### Request Schema (`DecompressRequest`)
| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `bitstring` | `string` | *Required* | Contiguous binary bitstream containing only `'0'` and `'1'`. |
| `codebook` | `object` | `null` | Prefix codebook mapping symbol $\to$ binary code. |
| `tree` | `object` | `null` | Serialized nested tree JSON (used if codebook is omitted). |
| `as_string` | `boolean` | `true` | If true, returns joined string; if false, returns list of symbol tokens. |

#### Example Request
```bash
curl -X POST http://127.0.0.1:8000/api/daa/decompress \
  -H "Content-Type: application/json" \
  -d '{
    "bitstring": "010011",
    "codebook": { "LOAD": "0", "ADD": "10", "HALT": "11" },
    "as_string": false
  }'
```

#### Example Response (`200 OK`)
```json
{
  "decoded": ["LOAD", "ADD", "LOAD", "HALT"],
  "symbol_count": 4
}
```

#### Error Response (`400 Bad Request` - Invalid Bitstream Character)
```json
{
  "detail": "Invalid bitstring: contains non-binary character '2' at position 3"
}
```

---

## 6. Round-Trip Verification

### `POST /api/daa/roundtrip`
Performs end-to-end compression, immediate decompression, and bit-level lossless verification.

#### Example Request
```bash
curl -X POST http://127.0.0.1:8000/api/daa/roundtrip \
  -H "Content-Type: application/json" \
  -d '{
    "data": ["ADD", "SUB", "ADD", "HALT"],
    "bits_per_symbol": 12
  }'
```

#### Example Response (`200 OK`)
```json
{
  "is_lossless": true,
  "original_data": ["ADD", "SUB", "ADD", "HALT"],
  "decoded_data": ["ADD", "SUB", "ADD", "HALT"],
  "match": true,
  "bitstring": "010011",
  "codebook": {
    "ADD": "0",
    "HALT": "11",
    "SUB": "10"
  },
  "tree": { ... },
  "metrics": { ... }
}
```
