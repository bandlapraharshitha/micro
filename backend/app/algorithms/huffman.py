"""Greedy Huffman Coding Algorithm for DAA.

Implements frequency profiling, min-heap-based greedy tree construction,
and deterministic prefix codebook generation.
"""

from __future__ import annotations
from collections import Counter
from typing import Dict, Optional, Sequence, Union
from .min_heap import HuffmanNode, MinHeap


def count_frequencies(data: Union[str, Sequence[str]]) -> Dict[str, int]:
    """Calculates frequency counts of symbols in the input data.

    Args:
        data: A string of characters or a sequence of instruction tokens.

    Returns:
        A dictionary mapping each symbol to its frequency, sorted deterministically
        by symbol name.
    """
    if not data:
        return {}

    counter = Counter(data)
    # Sort deterministically by symbol key
    return {k: counter[k] for k in sorted(counter.keys())}


def build_huffman_tree(frequencies: Dict[str, int]) -> Optional[HuffmanNode]:
    """Constructs an optimal binary Huffman prefix tree using a min-heap.

    Guarantees deterministic tree structure through:
    1. Lexicographically ordered initial leaf node insertion.
    2. Deterministic node comparison (frequency -> min_symbol -> insertion_order).

    Args:
        frequencies: Mapping of symbols to their integer frequencies.

    Returns:
        The root HuffmanNode of the tree, or None if frequencies is empty.
    """
    if not frequencies:
        return None

    # Handle single-symbol case: return a single leaf node
    if len(frequencies) == 1:
        symbol, freq = next(iter(frequencies.items()))
        return HuffmanNode(symbol=symbol, frequency=freq, order=0)

    # Multi-symbol case: initialize min-heap with deterministic order
    heap = MinHeap()
    order_counter = 0

    for symbol in sorted(frequencies.keys()):
        freq = frequencies[symbol]
        node = HuffmanNode(
            symbol=symbol,
            frequency=freq,
            min_symbol=symbol,
            order=order_counter,
        )
        heap.push(node)
        order_counter += 1

    # Greedy extraction and merge loop
    while len(heap) > 1:
        left = heap.pop()
        right = heap.pop()

        parent = HuffmanNode(
            symbol=None,
            frequency=left.frequency + right.frequency,
            left=left,
            right=right,
            order=order_counter,
        )
        order_counter += 1
        heap.push(parent)

    return heap.pop()


def generate_huffman_codes(root: Optional[HuffmanNode]) -> Dict[str, str]:
    """Traverses the Huffman tree to generate prefix-free binary codes.

    Conventions:
    - Left branch assigns bit '0'.
    - Right branch assigns bit '1'.
    - Single-symbol tree assigns code '0'.
    - Empty tree returns an empty dictionary.

    Args:
        root: The root of the Huffman tree.

    Returns:
        A dictionary mapping each symbol to its variable-length binary code string.
    """
    if root is None:
        return {}

    # Handle single-symbol alphabet: standard convention assigns '0'
    if root.is_leaf():
        assert root.symbol is not None
        return {root.symbol: "0"}

    codes: Dict[str, str] = {}

    def _traverse(node: Optional[HuffmanNode], current_code: str) -> None:
        if node is None:
            return
        if node.is_leaf():
            assert node.symbol is not None
            codes[node.symbol] = current_code
            return
        _traverse(node.left, current_code + "0")
        _traverse(node.right, current_code + "1")

    _traverse(root, "")
    # Sort deterministically by symbol key
    return {k: codes[k] for k in sorted(codes.keys())}


class HuffmanModel:
    """Encapsulates the complete Huffman model for an alphabet.

    Holds the frequency table, binary prefix tree, and generated codebook.
    """

    def __init__(
        self,
        frequencies: Dict[str, int],
        tree: Optional[HuffmanNode],
        codebook: Dict[str, str],
    ) -> None:
        self.frequencies: Dict[str, int] = frequencies
        self.tree: Optional[HuffmanNode] = tree
        self.codebook: Dict[str, str] = codebook
        self.reverse_codebook: Dict[str, str] = {v: k for k, v in codebook.items()}

    @classmethod
    def from_data(cls, data: Union[str, Sequence[str]]) -> HuffmanModel:
        """Constructs a HuffmanModel directly from raw data or instruction tokens."""
        frequencies = count_frequencies(data)
        tree = build_huffman_tree(frequencies)
        codebook = generate_huffman_codes(tree)
        return cls(frequencies, tree, codebook)

    @classmethod
    def from_frequencies(cls, frequencies: Dict[str, int]) -> HuffmanModel:
        """Constructs a HuffmanModel from a pre-calculated frequency table."""
        clean_freqs = {k: int(v) for k, v in sorted(frequencies.items()) if v > 0}
        tree = build_huffman_tree(clean_freqs)
        codebook = generate_huffman_codes(tree)
        return cls(clean_freqs, tree, codebook)

    def is_empty(self) -> bool:
        return self.tree is None

    def is_single_symbol(self) -> bool:
        return self.tree is not None and self.tree.is_leaf()
