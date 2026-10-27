"""Huffman Encoder for DAA.

Encodes input sequences of symbols/instructions into contiguous bitstreams
based on the generated prefix codebook.
"""

from __future__ import annotations
import math
from typing import Dict, Sequence, Tuple, Union


def encode(data: Union[str, Sequence[str]], codebook: Dict[str, str]) -> str:
    """Encodes a string or sequence of symbols into a contiguous bitstring.

    Args:
        data: A string or sequence of symbols/instruction tokens.
        codebook: Mapping of symbol -> binary code string.

    Returns:
        A string composed exclusively of '0' and '1' characters.

    Raises:
        ValueError: If data contains symbols not present in the codebook.
    """
    if not data:
        return ""

    if not codebook:
        raise ValueError("Cannot encode non-empty data with an empty codebook.")

    bit_parts = []
    for item in data:
        if item not in codebook:
            raise ValueError(f"Symbol {item!r} not found in Huffman codebook.")
        bit_parts.append(codebook[item])

    return "".join(bit_parts)


class EncodedPayload:
    """Represents the results of encoding an input dataset."""

    def __init__(
        self,
        bitstring: str,
        symbol_count: int,
        codebook: Dict[str, str],
    ) -> None:
        self.bitstring: str = bitstring
        self.bit_count: int = len(bitstring)
        self.symbol_count: int = symbol_count
        self.codebook: Dict[str, str] = codebook
        self.byte_count: int = math.ceil(self.bit_count / 8) if self.bit_count > 0 else 0

    @classmethod
    def create(
        cls,
        data: Union[str, Sequence[str]],
        codebook: Dict[str, str],
    ) -> EncodedPayload:
        """Encodes data and wraps into EncodedPayload."""
        bitstring = encode(data, codebook)
        return cls(bitstring=bitstring, symbol_count=len(data), codebook=codebook)

    def to_bytes(self) -> Tuple[bytes, int]:
        """Packs the bitstring into raw bytes, returning the byte payload and pad bit count.

        Returns:
            A tuple of (bytes_object, pad_bits_count) where pad_bits_count is the number
            of zero bits appended to align the stream to the nearest byte boundary.
        """
        if not self.bitstring:
            return b"", 0

        pad_bits = (8 - (len(self.bitstring) % 8)) % 8
        padded_bitstring = self.bitstring + ("0" * pad_bits)

        byte_arr = bytearray()
        for i in range(0, len(padded_bitstring), 8):
            byte_chunk = padded_bitstring[i : i + 8]
            byte_arr.append(int(byte_chunk, 2))

        return bytes(byte_arr), pad_bits

    @staticmethod
    def unpack_bytes(raw_bytes: bytes, pad_bits: int) -> str:
        """Unpacks raw bytes and trailing pad count back into a bitstring."""
        if not raw_bytes:
            return ""

        bits = "".join(f"{b:08b}" for b in raw_bytes)
        if pad_bits > 0:
            bits = bits[:-pad_bits]
        return bits
