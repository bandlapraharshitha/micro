"""Comprehensive test suite for Phase 2: DAA Huffman Compression.

Tests cover:
- Frequency counting (empty, single, repeated, assembly tokens)
- Min-heap priority queue and deterministic tie-breaking
- Huffman tree construction and prefix codebook generation
- Lossless encoding and decoding
- Round-trip integrity verification
- Edge cases: empty input, single symbol, repeated symbols, invalid bitstrings, incomplete codes
- Storage calculations: original vs payload vs total (including metadata overhead)
- Compression ratio, space savings, Shannon entropy, and coding efficiency
"""

import math
import pytest
from app.algorithms.min_heap import HuffmanNode, MinHeap
from app.algorithms.huffman import (
    count_frequencies,
    build_huffman_tree,
    generate_huffman_codes,
    HuffmanModel,
)
from app.algorithms.encoder import encode, EncodedPayload
from app.algorithms.decoder import decode, decode_to_string
from app.algorithms.metrics import (
    calculate_compression_metrics,
    estimate_tree_storage_overhead,
    verify_round_trip,
)


# ---------------------------------------------------------------------------
# 1. Frequency Counting Tests
# ---------------------------------------------------------------------------


def test_frequency_counting_empty():
    assert count_frequencies("") == {}
    assert count_frequencies([]) == {}


def test_frequency_counting_single_and_repeated():
    assert count_frequencies("A") == {"A": 1}
    assert count_frequencies("AAAAA") == {"A": 5}
    assert count_frequencies(["NOP", "NOP", "NOP"]) == {"NOP": 3}


def test_frequency_counting_multichar_and_tokens():
    freqs = count_frequencies("BBAAC")
    assert freqs == {"A": 2, "B": 2, "C": 1}

    instructions = ["LOAD", "ADD", "LOAD", "STORE", "ADD", "LOAD"]
    inst_freqs = count_frequencies(instructions)
    assert inst_freqs == {"ADD": 2, "LOAD": 3, "STORE": 1}


# ---------------------------------------------------------------------------
# 2. Min-Heap and Deterministic Tie-Breaking Tests
# ---------------------------------------------------------------------------


def test_min_heap_operations():
    heap = MinHeap()
    assert heap.is_empty()
    assert len(heap) == 0

    n1 = HuffmanNode(symbol="C", frequency=10, min_symbol="C", order=0)
    n2 = HuffmanNode(symbol="A", frequency=2, min_symbol="A", order=1)
    n3 = HuffmanNode(symbol="B", frequency=5, min_symbol="B", order=2)

    heap.push(n1)
    heap.push(n2)
    heap.push(n3)

    assert len(heap) == 3
    assert heap.peek() == n2
    assert heap.pop() == n2
    assert heap.pop() == n3
    assert heap.pop() == n1
    assert heap.is_empty()

    with pytest.raises(IndexError):
        heap.pop()


def test_deterministic_tie_breaking():
    """Nodes with identical frequency must break ties deterministically by canonical min_symbol."""
    node_b = HuffmanNode(symbol="B", frequency=5, min_symbol="B", order=0)
    node_a = HuffmanNode(symbol="A", frequency=5, min_symbol="A", order=1)
    node_c = HuffmanNode(symbol="C", frequency=5, min_symbol="C", order=2)

    heap = MinHeap([node_b, node_a, node_c])
    # Should pop 'A', then 'B', then 'C' regardless of insertion order
    assert heap.pop().symbol == "A"
    assert heap.pop().symbol == "B"
    assert heap.pop().symbol == "C"


def test_deterministic_reproducibility():
    """Running tree construction and code generation multiple times on the same input
    must produce strictly identical codebooks every time.
    """
    text = "ABBCCCDDDDEEEEE"
    codes_first = HuffmanModel.from_data(text).codebook

    for _ in range(50):
        codes_repeat = HuffmanModel.from_data(text).codebook
        assert codes_first == codes_repeat


# ---------------------------------------------------------------------------
# 3. Huffman Tree Construction & Codebook Generation Tests
# ---------------------------------------------------------------------------


def test_huffman_tree_empty():
    tree = build_huffman_tree({})
    assert tree is None
    codes = generate_huffman_codes(tree)
    assert codes == {}


def test_huffman_tree_single_symbol():
    freqs = {"X": 42}
    tree = build_huffman_tree(freqs)
    assert tree is not None
    assert tree.is_leaf()
    assert tree.symbol == "X"

    codes = generate_huffman_codes(tree)
    assert codes == {"X": "0"}


def test_huffman_prefix_property():
    """Verify that no code in a generated codebook is a prefix of any other code."""
    freqs = {"A": 45, "B": 13, "C": 12, "D": 16, "E": 9, "F": 5}
    tree = build_huffman_tree(freqs)
    codes = generate_huffman_codes(tree)

    for sym1, code1 in codes.items():
        for sym2, code2 in codes.items():
            if sym1 != sym2:
                assert not code2.startswith(code1), f"Prefix violation: {code1} is prefix of {code2}"


# ---------------------------------------------------------------------------
# 4. Lossless Encoding & Decoding Tests
# ---------------------------------------------------------------------------


def test_lossless_round_trip_text():
    sample_text = "HUFFMAN COMPRESSION IN MICRO ARCHITECTURE INSTRUCTION MEMORY"
    model = HuffmanModel.from_data(sample_text)

    encoded_bits = encode(sample_text, model.codebook)
    decoded_chars = decode(encoded_bits, model.tree)
    decoded_string = "".join(decoded_chars)

    assert decoded_string == sample_text
    assert verify_round_trip(sample_text, decoded_chars)


def test_lossless_round_trip_assembly_instructions():
    instructions = [
        "LOAD_R0",
        "LOAD_R1",
        "ADD_R0_R1",
        "LOAD_R0",
        "SUB_R0_R1",
        "BRANCH_EQ",
        "ADD_R0_R1",
        "HALT",
    ]
    model = HuffmanModel.from_data(instructions)

    encoded_bits = encode(instructions, model.codebook)
    # Decode using codebook dictionary
    decoded_instructions = decode(encoded_bits, model.codebook)

    assert decoded_instructions == instructions
    assert verify_round_trip(instructions, decoded_instructions)


def test_byte_packing_payload():
    text = "TEST_BIT_PACKING_12345"
    model = HuffmanModel.from_data(text)
    payload = EncodedPayload.create(text, model.codebook)

    raw_bytes, pad_bits = payload.to_bytes()
    unpacked_bits = EncodedPayload.unpack_bytes(raw_bytes, pad_bits)

    assert unpacked_bits == payload.bitstring
    decoded = decode(unpacked_bits, model.tree)
    assert "".join(decoded) == text


# ---------------------------------------------------------------------------
# 5. Edge Cases & Error Handling Tests
# ---------------------------------------------------------------------------


def test_empty_input_handling():
    model = HuffmanModel.from_data("")
    assert model.codebook == {}
    assert encode("", model.codebook) == ""
    assert decode("", model.tree) == []
    assert decode_to_string("", model.tree) == ""


def test_single_symbol_round_trip():
    data = "AAAAAAAAAA"  # 10 'A's
    model = HuffmanModel.from_data(data)
    assert model.codebook == {"A": "0"}

    bits = encode(data, model.codebook)
    assert bits == "0" * 10

    decoded = decode(bits, model.tree)
    assert "".join(decoded) == data
    assert verify_round_trip(data, decoded)


def test_encoding_missing_symbol_error():
    model = HuffmanModel.from_data("ABC")
    with pytest.raises(ValueError, match="not found in Huffman codebook"):
        encode("ABCD", model.codebook)


def test_decoding_invalid_binary_characters():
    model = HuffmanModel.from_data("ABC")
    with pytest.raises(ValueError, match="non-binary character"):
        decode("01021", model.codebook)


def test_decoding_undefined_transition():
    # Codebook with 'A': '0', 'B': '1'
    codebook = {"A": "0", "B": "1"}
    # Construct a tree where branch '10' is undefined
    tree = build_huffman_tree({"A": 10, "B": 20})
    # If bitstring contains invalid transitions in custom tree:
    node = HuffmanNode(symbol="X", frequency=1)
    with pytest.raises(ValueError, match="Invalid bit"):
        decode("1", node)


def test_incomplete_trailing_code_error():
    """If bitstream terminates on a partial prefix codeword, must raise ValueError."""
    # Codebook where symbols have multi-bit codes
    freqs = {"A": 1, "B": 1, "C": 2}
    model = HuffmanModel.from_frequencies(freqs)
    # Get a valid code and truncate the last bit
    longest_code = max(model.codebook.values(), key=len)
    incomplete_bits = longest_code[:-1]

    with pytest.raises(ValueError, match="Incomplete trailing code"):
        decode(incomplete_bits, model.tree)


# ---------------------------------------------------------------------------
# 6. Storage Calculations & Metrics Tests
# ---------------------------------------------------------------------------


def test_storage_and_metadata_overhead_distinction():
    """Verify that storage calculations clearly distinguish payload bits from
    total bits including serialized tree/codebook metadata overhead.
    """
    data = "AAABBC"  # 3 'A's, 2 'B's, 1 'C'
    model = HuffmanModel.from_data(data)
    metrics = calculate_compression_metrics(model.frequencies, model.codebook, bits_per_symbol=8)

    # 6 symbols * 8 bits = 48 original bits
    assert metrics.original_bits == 6 * 8
    assert metrics.symbol_count == 6
    assert metrics.unique_symbol_count == 3

    # Payload bits: sum(freq * code_len)
    expected_payload = sum(model.frequencies[s] * len(model.codebook[s]) for s in model.frequencies)
    assert metrics.payload_bits == expected_payload
    assert metrics.payload_bits < metrics.original_bits

    # Tree overhead: 3 symbols -> (2*3 - 1) + 3*8 = 5 + 24 = 29 bits
    assert metrics.metadata_bits == 29
    assert metrics.total_compressed_bits == metrics.payload_bits + metrics.metadata_bits

    # Check ratios
    assert metrics.payload_compression_ratio == round(metrics.original_bits / metrics.payload_bits, 3)
    assert metrics.total_compression_ratio == round(metrics.original_bits / metrics.total_compressed_bits, 3)

    # Space savings
    assert metrics.payload_space_savings_percent > 0
    assert metrics.storage.payload_bits == metrics.payload_bits
    assert metrics.storage.tree_overhead_bits == metrics.metadata_bits


def test_entropy_and_shannon_bounds():
    """Verifies that average code length satisfies Shannon's Source Coding Theorem:
    H(X) <= L < H(X) + 1
    """
    text = "THIS IS A DETAILED ENTROPY AND COMPRESSION RATIO VERIFICATION TEST"
    model = HuffmanModel.from_data(text)
    metrics = calculate_compression_metrics(model.frequencies, model.codebook, bits_per_symbol=8)

    h_x = metrics.shannon_entropy
    l_avg = metrics.average_code_length

    # Shannon lower bound: L >= H(X)
    assert l_avg >= h_x - 1e-6, f"Average length {l_avg} was less than entropy {h_x}"
    # Shannon upper bound: L < H(X) + 1
    assert l_avg < h_x + 1.0, f"Average length {l_avg} exceeded entropy + 1 ({h_x + 1.0})"
    # Coding efficiency should be high (> 90%)
    assert metrics.coding_efficiency_percent > 90.0


def test_custom_bits_per_symbol_instruction_baseline():
    """Verify metrics work with 16-bit and 32-bit micro-architecture word baselines."""
    instructions = ["ADD", "SUB", "LOAD", "STORE", "ADD", "LOAD", "ADD", "NOP"]
    model = HuffmanModel.from_data(instructions)

    # 16-bit baseline
    metrics_16 = calculate_compression_metrics(model.frequencies, model.codebook, bits_per_symbol=16)
    assert metrics_16.original_bits == 8 * 16  # 128 bits
    assert metrics_16.bits_per_symbol_baseline == 16
    assert metrics_16.payload_space_savings_percent > 70.0

    # 32-bit baseline
    metrics_32 = calculate_compression_metrics(model.frequencies, model.codebook, bits_per_symbol=32)
    assert metrics_32.original_bits == 8 * 32  # 256 bits
    assert metrics_32.bits_per_symbol_baseline == 32
    assert metrics_32.payload_space_savings_percent > 85.0
