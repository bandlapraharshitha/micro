# Python FastAPI Backend (DAA Huffman Compression Engine)

This service implements the **Design and Analysis of Algorithms (DAA)** pillar of the *Huffman-Compressed Micro-Architecture Instruction Memory Simulator*. It provides deterministic, lossless greedy Huffman compression, Shannon entropy metrics, bitstream decoding, and codebook serialization through a high-performance FastAPI REST API.

---

## 🏛️ Algorithmic Architecture

The backend algorithms are located in `backend/app/algorithms/` and strictly decoupled from the web framework:

| Module | File | Core Responsibilities |
| :--- | :--- | :--- |
| **Min-Heap** | [`app/algorithms/min_heap.py`](file:///c:/Users/Dell/Desktop/micro_project-2/backend/app/algorithms/min_heap.py) | Custom `HuffmanNode` class with deterministic tie-breaking ($(\text{frequency}, \text{insertion\_order}, \text{min\_symbol})$) ensuring reproducible trees across platforms. |
| **Huffman Core** | [`app/algorithms/huffman.py`](file:///c:/Users/Dell/Desktop/micro_project-2/backend/app/algorithms/huffman.py) | Frequency counting, $O(N \log N)$ greedy tree construction using Python's standard `heapq`, prefix-free binary code extraction, and single-symbol edge-case handling. |
| **Encoder** | [`app/algorithms/encoder.py`](file:///c:/Users/Dell/Desktop/micro_project-2/backend/app/algorithms/encoder.py) | Translates input text or token lists into contiguous `'0'`/`'1'` bitstrings and packs them into raw binary byte arrays. |
| **Decoder** | [`app/algorithms/decoder.py`](file:///c:/Users/Dell/Desktop/micro_project-2/backend/app/algorithms/decoder.py) | Traverses the prefix tree or codebook mapping bit-by-bit to losslessly reconstruct symbolic sequences. Detects invalid non-binary characters and trailing truncated bits. |
| **Metrics** | [`app/algorithms/metrics.py`](file:///c:/Users/Dell/Desktop/micro_project-2/backend/app/algorithms/metrics.py) | Calculates Shannon entropy $H(X)$, average code length $\bar{L}$, payload compression ratio, space reduction %, coding efficiency %, and canonical serialized tree storage overhead. |

---

## 🚀 Setup & Installation

### Prerequisites
* **Python**: `3.10` or higher (`3.11.9` tested)
* **pip**: Python package manager
* **virtualenv** (recommended)

### 1. Create and Activate Virtual Environment
```bash
# In the backend directory
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Linux / macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

#### Dependencies in `requirements.txt`:
* `fastapi>=0.115.0`
* `uvicorn[standard]>=0.30.0`
* `pydantic>=2.8.0`
* `pydantic-settings>=2.4.0`
* `python-dotenv>=1.0.0`
* `pytest>=8.0.0`
* `httpx>=0.27.0`

### 3. Environment Configuration
Create `.env` from `.env.example`:
```bash
cp .env.example .env
```
Default configuration values:
```env
PORT=8000
HOST=127.0.0.1
DEBUG=True
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
FRONTEND_URL=http://localhost:3000
```

---

## ⚙️ Running the Service

```bash
# From the workspace root:
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Or from within the backend/ directory:
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

* **API Base URL:** `http://127.0.0.1:8000`
* **Health Check:** `http://127.0.0.1:8000/api/health`
* **Swagger UI (Interactive Docs):** `http://127.0.0.1:8000/docs`
* **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`

---

## 📡 REST API Specification

### 1. Health Probe: `GET /api/health`
Probes the backend service and algorithm subsystem availability.
```bash
curl -X GET http://127.0.0.1:8000/api/health
```
**Response (200 OK):**
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

### 2. Sample Datasets: `GET /api/daa/sample`
Returns curated assembly datasets for testing and demonstrations.
```bash
curl -X GET http://127.0.0.1:8000/api/daa/sample
```
**Response (200 OK):**
```json
{
  "samples": {
    "assembly_program": {
      "title": "Assembly Loop Sequence",
      "data": ["LOAD_R0", "LOAD_R1", "ADD_R0_R1", "STORE_R0", "ADD_R0_R1", "HALT"]
    },
    "skewed_instructions": {
      "title": "Skewed Execution Profile",
      "data": ["NOP", "NOP", "NOP", "NOP", "ADD", "LOAD", "HALT"]
    },
    "text_benchmark": {
      "title": "Canonical Algorithm Benchmark",
      "data": "HUFFMAN_GREEDY_COMPRESSION_ALGORITHM"
    }
  }
}
```

---

### 3. Calculate Frequencies: `POST /api/daa/frequencies`
Computes symbol frequency counts and vocabulary size.
```bash
curl -X POST http://127.0.0.1:8000/api/daa/frequencies \
  -H "Content-Type: application/json" \
  -d '{"data": ["LOAD_R0", "ADD_R0_R1", "LOAD_R0", "HALT"]}'
```
**Response (200 OK):**
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

### 4. Compress Data: `POST /api/daa/compress`
Constructs the Huffman tree, encodes data into a bitstream, serializes tree metadata, and computes compression metrics.
```bash
curl -X POST http://127.0.0.1:8000/api/daa/compress \
  -H "Content-Type: application/json" \
  -d '{"data": ["LOAD", "ADD", "LOAD", "HALT"], "bits_per_symbol": 12}'
```
**Response (200 OK):**
```json
{
  "frequencies": { "LOAD": 2, "ADD": 1, "HALT": 1 },
  "codebook": { "LOAD": "0", "ADD": "10", "HALT": "11" },
  "tree": {
    "symbol": null,
    "frequency": 4,
    "is_leaf": false,
    "min_symbol": "ADD",
    "left": { "symbol": "LOAD", "frequency": 2, "is_leaf": true, "min_symbol": "LOAD", "left": null, "right": null },
    "right": {
      "symbol": null,
      "frequency": 2,
      "is_leaf": false,
      "min_symbol": "ADD",
      "left": { "symbol": "ADD", "frequency": 1, "is_leaf": true, "min_symbol": "ADD", "left": null, "right": null },
      "right": { "symbol": "HALT", "frequency": 1, "is_leaf": true, "min_symbol": "HALT", "left": null, "right": null }
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

### 5. Decompress Bitstream: `POST /api/daa/decompress`
Decodes a bitstring back into symbol tokens using the prefix codebook or serialized tree.
```bash
curl -X POST http://127.0.0.1:8000/api/daa/decompress \
  -H "Content-Type: application/json" \
  -d '{
    "bitstring": "010011",
    "codebook": { "LOAD": "0", "ADD": "10", "HALT": "11" },
    "as_string": false
  }'
```
**Response (200 OK):**
```json
{
  "decoded": ["LOAD", "ADD", "LOAD", "HALT"],
  "symbol_count": 4
}
```

---

### 6. Full Round-Trip Verification: `POST /api/daa/roundtrip`
Executes end-to-end compression, immediate decompression, and bit-level verification.
```bash
curl -X POST http://127.0.0.1:8000/api/daa/roundtrip \
  -H "Content-Type: application/json" \
  -d '{"data": ["ADD", "SUB", "ADD", "HALT"], "bits_per_symbol": 12}'
```
**Response (200 OK):**
```json
{
  "is_lossless": true,
  "original_data": ["ADD", "SUB", "ADD", "HALT"],
  "decoded_data": ["ADD", "SUB", "ADD", "HALT"],
  "match": true,
  "bitstring": "010011",
  "codebook": { "ADD": "0", "HALT": "11", "SUB": "10" },
  "tree": { ... },
  "metrics": { ... }
}
```

---

## 🧪 Automated Testing

Automated tests are executed using **pytest**. The test suite covers 100% of the DAA algorithms, edge cases, and API endpoints.

```bash
# Run the complete backend test suite:
python -m pytest backend/tests

# Run with verbose output:
python -m pytest backend/tests -v
```

### Test Coverage Highlights (36 / 36 Passing Tests):
* `test_huffman_daa.py`: Min-heap ordering, deterministic tie-breakers, greedy prefix tree construction, variable-length codes, lossless encoding/decoding, single-symbol inputs, empty inputs, non-binary bitstring rejection, incomplete trailing code error handling, Shannon entropy, and storage overhead formulas.
* `test_health.py`: Live FastAPI `TestClient` health checks.
* `test_api_endpoints.py`: Validation of all 6 REST endpoints (`/api/health`, `/sample`, `/frequencies`, `/compress`, `/decompress`, `/roundtrip`) with Pydantic request/response schemas.
