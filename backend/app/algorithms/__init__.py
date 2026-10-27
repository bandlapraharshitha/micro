"""DAA Huffman Compression Package."""

from .min_heap import HuffmanNode, MinHeap
from .huffman import count_frequencies, build_huffman_tree, generate_huffman_codes, HuffmanModel
from .encoder import encode, EncodedPayload
from .decoder import decode, decode_to_string
from .metrics import calculate_compression_metrics, CompressionMetrics, verify_round_trip

__all__ = [
    "HuffmanNode",
    "MinHeap",
    "count_frequencies",
    "build_huffman_tree",
    "generate_huffman_codes",
    "HuffmanModel",
    "encode",
    "EncodedPayload",
    "decode",
    "decode_to_string",
    "calculate_compression_metrics",
    "CompressionMetrics",
    "verify_round_trip",
]
