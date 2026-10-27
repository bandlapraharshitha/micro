"""Compression metrics, storage reduction, and round-trip verification for DAA.

Calculates theoretical Shannon entropy, average code length, payload vs total
storage overhead, compression ratios, and verifies lossless integrity.
"""

from __future__ import annotations
import math
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional, Sequence, Union


@dataclass
class StorageBreakdown:
    """Detailed breakdown of storage components in bits and bytes."""
    payload_bits: int
    payload_bytes: int
    tree_overhead_bits: int
    tree_overhead_bytes: int
    total_bits: int
    total_bytes: int
    original_bits: int
    original_bytes: int
    bits_per_original_symbol: int


@dataclass
class CompressionMetrics:
    """Comprehensive performance and theoretical compression metrics."""
    symbol_count: int
    unique_symbol_count: int
    bits_per_symbol_baseline: int
    original_bits: int
    payload_bits: int
    metadata_bits: int
    total_compressed_bits: int
    payload_compression_ratio: float
    total_compression_ratio: float
    payload_space_savings_percent: float
    total_space_savings_percent: float
    shannon_entropy: float
    average_code_length: float
    coding_efficiency_percent: float
    storage: StorageBreakdown

    def to_dict(self) -> dict:
        return asdict(self)


def estimate_tree_storage_overhead(
    unique_symbols: Sequence[str],
    symbol_bits: int = 8,
) -> int:
    """Estimates the storage overhead in bits for transmitting the Huffman tree.

    Canonical binary tree serialization model:
    - Internal nodes: 1 bit ('0')
    - Leaf nodes: 1 bit ('1') + raw symbol bit representation (symbol_bits)
    - For N leaf symbols:
      * Internal nodes = N - 1
      * Total tree structure bits = (N - 1) + N = 2N - 1
      * Total symbol payload bits = N * symbol_bits
      * Total metadata bits = (2N - 1) + (N * symbol_bits)
    - For N = 1 (single symbol):
      * 1 flag bit + symbol_bits
    - For N = 0 (empty):
      * 0 bits

    Args:
        unique_symbols: List or collection of distinct symbols.
        symbol_bits: Baseline bits required to store a single uncompressed symbol.

    Returns:
        Estimated overhead in bits.
    """
    n = len(unique_symbols)
    if n == 0:
        return 0
    if n == 1:
        return 1 + symbol_bits
    return (2 * n - 1) + (n * symbol_bits)


def calculate_compression_metrics(
    frequencies: Dict[str, int],
    codebook: Dict[str, str],
    bits_per_symbol: int = 8,
) -> CompressionMetrics:
    """Computes full DAA compression metrics.

    Distinguishes:
    - Raw payload compression (encoded bitstream only)
    - Total storage compression (payload + tree/codebook metadata overhead)

    Args:
        frequencies: Map of symbol -> occurrence count.
        codebook: Map of symbol -> variable-length binary code.
        bits_per_symbol: Uncompressed representation baseline (default: 8 bits for
                         ASCII/bytes, or 16/32 bits for micro-architecture instructions).

    Returns:
        A CompressionMetrics instance with all calculated theoretical and empirical values.
    """
    total_symbols = sum(frequencies.values())
    unique_symbols = list(frequencies.keys())
    unique_count = len(unique_symbols)

    if total_symbols == 0:
        empty_storage = StorageBreakdown(0, 0, 0, 0, 0, 0, 0, 0, bits_per_symbol)
        return CompressionMetrics(
            symbol_count=0,
            unique_symbol_count=0,
            bits_per_symbol_baseline=bits_per_symbol,
            original_bits=0,
            payload_bits=0,
            metadata_bits=0,
            total_compressed_bits=0,
            payload_compression_ratio=1.0,
            total_compression_ratio=1.0,
            payload_space_savings_percent=0.0,
            total_space_savings_percent=0.0,
            shannon_entropy=0.0,
            average_code_length=0.0,
            coding_efficiency_percent=100.0,
            storage=empty_storage,
        )

    # 1. Original Representation Calculation
    original_bits = total_symbols * bits_per_symbol
    original_bytes = math.ceil(original_bits / 8)

    # 2. Payload and Shannon Entropy Calculation
    payload_bits = 0
    shannon_entropy = 0.0
    average_code_length = 0.0

    for symbol, count in frequencies.items():
        prob = count / total_symbols
        # Shannon entropy: -sum(p * log2(p))
        if prob > 0:
            shannon_entropy -= prob * math.log2(prob)

        code_len = len(codebook.get(symbol, ""))
        payload_bits += count * code_len
        average_code_length += prob * code_len

    payload_bytes = math.ceil(payload_bits / 8)

    # 3. Tree/Codebook Storage Overhead
    metadata_bits = estimate_tree_storage_overhead(unique_symbols, symbol_bits=bits_per_symbol)
    metadata_bytes = math.ceil(metadata_bits / 8)

    total_compressed_bits = payload_bits + metadata_bits
    total_compressed_bytes = math.ceil(total_compressed_bits / 8)

    # 4. Compression Ratios
    payload_compression_ratio = (
        round(original_bits / max(payload_bits, 1), 3) if payload_bits > 0 else 1.0
    )
    total_compression_ratio = (
        round(original_bits / max(total_compressed_bits, 1), 3)
        if total_compressed_bits > 0
        else 1.0
    )

    # 5. Space Savings Percentages
    payload_space_savings_percent = (
        round(((original_bits - payload_bits) / original_bits) * 100, 2)
        if original_bits > 0
        else 0.0
    )
    total_space_savings_percent = (
        round(((original_bits - total_compressed_bits) / original_bits) * 100, 2)
        if original_bits > 0
        else 0.0
    )

    # 6. Coding Efficiency: (H(X) / L) * 100
    if average_code_length > 0 and shannon_entropy > 0:
        coding_efficiency_percent = round((shannon_entropy / average_code_length) * 100, 2)
    elif shannon_entropy == 0.0:
        # Single symbol distribution has 0 entropy and optimal 1-bit code
        coding_efficiency_percent = 100.0
    else:
        coding_efficiency_percent = 100.0

    storage = StorageBreakdown(
        payload_bits=payload_bits,
        payload_bytes=payload_bytes,
        tree_overhead_bits=metadata_bits,
        tree_overhead_bytes=metadata_bytes,
        total_bits=total_compressed_bits,
        total_bytes=total_compressed_bytes,
        original_bits=original_bits,
        original_bytes=original_bytes,
        bits_per_original_symbol=bits_per_symbol,
    )

    return CompressionMetrics(
        symbol_count=total_symbols,
        unique_symbol_count=unique_count,
        bits_per_symbol_baseline=bits_per_symbol,
        original_bits=original_bits,
        payload_bits=payload_bits,
        metadata_bits=metadata_bits,
        total_compressed_bits=total_compressed_bits,
        payload_compression_ratio=payload_compression_ratio,
        total_compression_ratio=total_compression_ratio,
        payload_space_savings_percent=payload_space_savings_percent,
        total_space_savings_percent=total_space_savings_percent,
        shannon_entropy=round(shannon_entropy, 4),
        average_code_length=round(average_code_length, 4),
        coding_efficiency_percent=coding_efficiency_percent,
        storage=storage,
    )


def verify_round_trip(
    original_data: Union[str, Sequence[str]],
    decoded_data: Union[str, Sequence[str]],
) -> bool:
    """Verifies that decoding exactly matches the original input data (lossless round-trip).

    Args:
        original_data: The original input string or sequence.
        decoded_data: The reconstructed string or sequence from decoding.

    Returns:
        True if original and decoded data are strictly identical.
    """
    if isinstance(original_data, str) and isinstance(decoded_data, list):
        return original_data == "".join(decoded_data)
    if isinstance(original_data, list) and isinstance(decoded_data, list):
        return list(original_data) == list(decoded_data)
    return original_data == decoded_data
