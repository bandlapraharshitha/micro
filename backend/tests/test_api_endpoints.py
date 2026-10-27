"""Comprehensive tests for Phase 5: FastAPI DAA REST API Integration."""

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Health and Sample Data Endpoints
# ---------------------------------------------------------------------------


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "daa-backend"
    assert "timestamp" in data
    assert data["subsystems"]["daa_huffman_engine"] == "ready"


def test_api_daa_sample():
    response = client.get("/api/daa/sample")
    assert response.status_code == 200
    data = response.json()
    assert "samples" in data
    samples = data["samples"]

    assert "assembly_program" in samples
    assert "skewed_instructions" in samples
    assert "text_benchmark" in samples

    asm_sample = samples["assembly_program"]
    assert isinstance(asm_sample["data"], list)
    assert len(asm_sample["data"]) > 0
    assert asm_sample["recommended_bits_per_symbol"] == 12


# ---------------------------------------------------------------------------
# 2. Frequency Calculation Endpoint
# ---------------------------------------------------------------------------


def test_api_daa_frequencies_string_and_tokens():
    # String input
    res_str = client.post("/api/daa/frequencies", json={"data": "AABBC"})
    assert res_str.status_code == 200
    data_str = res_str.json()
    assert data_str["frequencies"] == {"A": 2, "B": 2, "C": 1}
    assert data_str["total_symbols"] == 5
    assert data_str["unique_symbols"] == 3

    # Instruction tokens input
    res_tokens = client.post(
        "/api/daa/frequencies",
        json={"data": ["ADD", "SUB", "ADD", "LOAD", "ADD"]}
    )
    assert res_tokens.status_code == 200
    data_tokens = res_tokens.json()
    assert data_tokens["frequencies"] == {"ADD": 3, "LOAD": 1, "SUB": 1}
    assert data_tokens["total_symbols"] == 5
    assert data_tokens["unique_symbols"] == 3


def test_api_daa_frequencies_empty():
    res_empty = client.post("/api/daa/frequencies", json={"data": ""})
    assert res_empty.status_code == 200
    data = res_empty.json()
    assert data["frequencies"] == {}
    assert data["total_symbols"] == 0
    assert data["unique_symbols"] == 0


# ---------------------------------------------------------------------------
# 3. Compression Endpoint & Tree Serialization
# ---------------------------------------------------------------------------


def test_api_daa_compress_with_tree_serialization():
    payload = {
        "data": "ABRACADABRA",
        "bits_per_symbol": 8
    }
    response = client.post("/api/daa/compress", json=payload)
    assert response.status_code == 200
    res = response.json()

    assert "frequencies" in res
    assert "codebook" in res
    assert "tree" in res
    assert "bitstring" in res
    assert "metrics" in res

    # Check tree structure serialization
    tree = res["tree"]
    assert tree is not None
    assert "is_leaf" in tree
    assert "frequency" in tree
    assert "left" in tree
    assert "right" in tree

    # Check metrics serialization
    metrics = res["metrics"]
    assert metrics["symbol_count"] == 11
    assert metrics["payload_bits"] == len(res["bitstring"])
    assert metrics["payload_compression_ratio"] > 1.0
    assert metrics["shannon_entropy"] > 0.0
    assert "storage" in metrics


def test_api_daa_compress_sample_assembly():
    # Use the sample dataset from GET /api/daa/sample
    sample_res = client.get("/api/daa/sample").json()
    asm_data = sample_res["samples"]["assembly_program"]["data"]

    response = client.post(
        "/api/daa/compress",
        json={"data": asm_data, "bits_per_symbol": 12}
    )
    assert response.status_code == 200
    res = response.json()

    assert res["bit_count"] > 0
    assert res["metrics"]["original_bits"] == len(asm_data) * 12
    assert res["metrics"]["payload_space_savings_percent"] > 60.0


def test_api_daa_compress_empty():
    response = client.post("/api/daa/compress", json={"data": "", "bits_per_symbol": 8})
    assert response.status_code == 200
    res = response.json()
    assert res["bitstring"] == ""
    assert res["bit_count"] == 0
    assert res["tree"] is None


# ---------------------------------------------------------------------------
# 4. Decompression Endpoint & Error Handling
# ---------------------------------------------------------------------------


def test_api_daa_decompress_valid():
    codebook = {"A": "0", "B": "110", "C": "1110", "D": "1111", "R": "10"}
    bitstring = "01101001110011110110100"  # A B R A C A D A B R A

    response = client.post(
        "/api/daa/decompress",
        json={"bitstring": bitstring, "codebook": codebook, "as_string": True}
    )
    assert response.status_code == 200
    assert response.json()["decoded"] == "ABRACADABRA"
    assert response.json()["symbol_count"] == 11


def test_api_daa_decompress_tokens():
    codebook = {"ADD": "0", "SUB": "10", "HALT": "11"}
    bitstring = "01011"

    response = client.post(
        "/api/daa/decompress",
        json={"bitstring": bitstring, "codebook": codebook, "as_string": False}
    )
    assert response.status_code == 200
    assert response.json()["decoded"] == ["ADD", "SUB", "HALT"]


def test_api_daa_decompress_empty():
    response = client.post(
        "/api/daa/decompress",
        json={"bitstring": "", "codebook": {"A": "0"}, "as_string": True}
    )
    assert response.status_code == 200
    assert response.json()["decoded"] == ""


def test_api_daa_decompress_errors():
    # Non-binary character
    err1 = client.post(
        "/api/daa/decompress",
        json={"bitstring": "01021", "codebook": {"A": "0", "B": "1"}}
    )
    assert err1.status_code == 400
    assert "non-binary character" in err1.json()["detail"]

    # Incomplete code
    err2 = client.post(
        "/api/daa/decompress",
        json={"bitstring": "1", "codebook": {"A": "0", "B": "10", "C": "11"}}
    )
    assert err2.status_code == 400
    assert "Incomplete trailing code" in err2.json()["detail"]

    # Missing codebook
    err3 = client.post(
        "/api/daa/decompress",
        json={"bitstring": "01"}
    )
    assert err3.status_code == 400


# ---------------------------------------------------------------------------
# 5. Round-Trip Verification Endpoint
# ---------------------------------------------------------------------------


def test_api_daa_roundtrip_text_and_tokens():
    # Text round-trip
    res_text = client.post(
        "/api/daa/roundtrip",
        json={"data": "ROUND_TRIP_VERIFICATION_TEST", "bits_per_symbol": 8}
    )
    assert res_text.status_code == 200
    data_text = res_text.json()
    assert data_text["is_lossless"] is True
    assert data_text["match"] is True
    assert data_text["decoded_data"] == "ROUND_TRIP_VERIFICATION_TEST"
    assert data_text["metrics"]["symbol_count"] == len("ROUND_TRIP_VERIFICATION_TEST")

    # Tokens round-trip
    sample_tokens = ["LOAD_R0", "ADD_R0_R1", "STORE_R0", "HALT"]
    res_tokens = client.post(
        "/api/daa/roundtrip",
        json={"data": sample_tokens, "bits_per_symbol": 12}
    )
    assert res_tokens.status_code == 200
    data_tokens = res_tokens.json()
    assert data_tokens["is_lossless"] is True
    assert data_tokens["match"] is True
    assert data_tokens["decoded_data"] == sample_tokens
