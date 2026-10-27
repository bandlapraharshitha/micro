"""Huffman Decoder for DAA.

Losslessly decodes bitstreams back into the original symbol sequences,
with strict verification for incomplete codes and corrupted data.
"""

from __future__ import annotations
from typing import Dict, List, Optional, Union
from .min_heap import HuffmanNode


def _build_tree_from_codebook(codebook: Dict[str, str]) -> Optional[HuffmanNode]:
    """Reconstructs a prefix tree from a codebook dictionary for decoding."""
    if not codebook:
        return None

    # Single-symbol codebook
    if len(codebook) == 1:
        symbol, code = next(iter(codebook.items()))
        return HuffmanNode(symbol=symbol, frequency=1)

    root = HuffmanNode(symbol=None, frequency=0)
    for symbol, code in codebook.items():
        curr = root
        for bit in code:
            if bit == "0":
                if curr.left is None:
                    curr.left = HuffmanNode(symbol=None, frequency=0)
                curr = curr.left
            elif bit == "1":
                if curr.right is None:
                    curr.right = HuffmanNode(symbol=None, frequency=0)
                curr = curr.right
            else:
                raise ValueError(f"Invalid bit {bit!r} in code for {symbol!r}")
        curr.symbol = symbol

    return root


def decode(
    bitstring: str,
    tree_or_codebook: Union[HuffmanNode, Dict[str, str], None],
) -> List[str]:
    """Losslessly decodes a binary bitstring into a list of symbols.

    Args:
        bitstring: A string of '0' and '1' characters.
        tree_or_codebook: The root HuffmanNode or a codebook dictionary.

    Returns:
        A list of decoded symbol strings.

    Raises:
        ValueError: If bitstring contains invalid characters, is incomplete,
                    or cannot be resolved in the prefix tree.
    """
    # 1. Validate empty bitstream
    if not bitstring:
        return []

    # 2. Validate bitstring content
    for ch in bitstring:
        if ch not in ("0", "1"):
            raise ValueError(f"Invalid encoded data: non-binary character {ch!r} in bitstring.")

    # 3. Resolve tree representation
    root: Optional[HuffmanNode]
    if isinstance(tree_or_codebook, dict):
        # Check single-symbol codebook optimization
        if len(tree_or_codebook) == 1:
            sym, expected_bit = next(iter(tree_or_codebook.items()))
            decoded: List[str] = []
            for bit in bitstring:
                if bit != expected_bit:
                    raise ValueError(f"Invalid bit {bit!r} for single-symbol codebook (expected {expected_bit!r}).")
                decoded.append(sym)
            return decoded
        root = _build_tree_from_codebook(tree_or_codebook)
    else:
        root = tree_or_codebook

    if root is None:
        raise ValueError("Cannot decode bitstream with an empty Huffman tree/codebook.")

    # 4. Handle single-symbol tree
    if root.is_leaf():
        assert root.symbol is not None
        decoded = []
        for bit in bitstring:
            if bit != "0":
                raise ValueError(f"Invalid bit {bit!r} for single-symbol tree (expected '0').")
            decoded.append(root.symbol)
        return decoded

    # 5. General multi-symbol prefix tree traversal
    decoded_symbols: List[str] = []
    curr: HuffmanNode = root

    for idx, bit in enumerate(bitstring):
        if bit == "0":
            if curr.left is None:
                raise ValueError(
                    f"Invalid encoded data: undefined transition on bit '0' at bit index {idx}."
                )
            curr = curr.left
        else:  # bit == "1"
            if curr.right is None:
                raise ValueError(
                    f"Invalid encoded data: undefined transition on bit '1' at bit index {idx}."
                )
            curr = curr.right

        # If arrived at a leaf, emit the decoded symbol and reset to root
        if curr.is_leaf():
            assert curr.symbol is not None
            decoded_symbols.append(curr.symbol)
            curr = root

    # 6. Check for incomplete trailing codes
    if curr is not root:
        raise ValueError(
            "Incomplete trailing code in bitstream: bitstream terminated on an incomplete codeword."
        )

    return decoded_symbols


def decode_to_string(
    bitstring: str,
    tree_or_codebook: Union[HuffmanNode, Dict[str, str], None],
    delimiter: str = "",
) -> str:
    """Decodes a bitstring and joins the symbols into a single string.

    Args:
        bitstring: Contiguous bitstring.
        tree_or_codebook: Huffman tree root or codebook dictionary.
        delimiter: Separator used between symbols (empty string for character data).

    Returns:
        Decoded string.
    """
    tokens = decode(bitstring, tree_or_codebook)
    return delimiter.join(tokens)
