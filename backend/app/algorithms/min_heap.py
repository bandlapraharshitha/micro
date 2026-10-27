"""Min-heap and Huffman Node implementation with deterministic tie-breaking.

Uses Python's standard `heapq` module to provide an optimal priority queue
for greedy Huffman tree construction.
"""

from __future__ import annotations
import heapq
from typing import Optional, List


class HuffmanNode:
    """Represents a node in a binary Huffman prefix tree.

    Supports deterministic tie-breaking through strict three-tiered comparison:
    1. Frequency count (ascending)
    2. Canonical minimum symbol in subtree (alphabetical tie-breaker)
    3. Insertion order sequence (deterministic stability)
    """

    def __init__(
        self,
        symbol: Optional[str],
        frequency: int,
        left: Optional[HuffmanNode] = None,
        right: Optional[HuffmanNode] = None,
        min_symbol: Optional[str] = None,
        order: int = 0,
    ) -> None:
        self.symbol: Optional[str] = symbol
        self.frequency: int = frequency
        self.left: Optional[HuffmanNode] = left
        self.right: Optional[HuffmanNode] = right
        self.order: int = order

        # Canonical minimum symbol for deterministic tie-breaking
        if min_symbol is not None:
            self.min_symbol: str = min_symbol
        elif symbol is not None:
            self.min_symbol = symbol
        else:
            # Internal node: compute min of left and right subtrees
            candidates = []
            if left is not None and left.min_symbol is not None:
                candidates.append(left.min_symbol)
            if right is not None and right.min_symbol is not None:
                candidates.append(right.min_symbol)
            self.min_symbol = min(candidates) if candidates else ""

    def is_leaf(self) -> bool:
        """Returns True if the node is a leaf (contains a symbol and has no children)."""
        return self.left is None and self.right is None and self.symbol is not None

    def __lt__(self, other: HuffmanNode) -> bool:
        """Deterministic total ordering for min-heap priority queue."""
        if not isinstance(other, HuffmanNode):
            return NotImplemented

        # 1. Primary criterion: Frequency (ascending)
        if self.frequency != other.frequency:
            return self.frequency < other.frequency

        # 2. Secondary criterion: Canonical minimum symbol (lexicographical)
        if self.min_symbol != other.min_symbol:
            return self.min_symbol < other.min_symbol

        # 3. Tertiary criterion: Insertion order counter (stability)
        return self.order < other.order

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, HuffmanNode):
            return False
        return (
            self.frequency == other.frequency
            and self.symbol == other.symbol
            and self.min_symbol == other.min_symbol
            and self.order == other.order
        )

    def __repr__(self) -> str:
        if self.is_leaf():
            return f"Leaf({self.symbol!r}, freq={self.frequency})"
        return f"Node(freq={self.frequency}, min={self.min_symbol!r})"


class MinHeap:
    """Object-oriented wrapper around Python's `heapq` priority queue.

    Manages HuffmanNode instances during greedy tree construction.
    """

    def __init__(self, initial_nodes: Optional[List[HuffmanNode]] = None) -> None:
        self._heap: List[HuffmanNode] = []
        if initial_nodes:
            for node in initial_nodes:
                self.push(node)

    def push(self, node: HuffmanNode) -> None:
        """Pushes a node onto the min-heap."""
        heapq.heappush(self._heap, node)

    def pop(self) -> HuffmanNode:
        """Pops and returns the node with the lowest frequency from the min-heap."""
        if not self._heap:
            raise IndexError("pop from empty min-heap")
        return heapq.heappop(self._heap)

    def peek(self) -> Optional[HuffmanNode]:
        """Returns the minimum node without removing it, or None if empty."""
        return self._heap[0] if self._heap else None

    def __len__(self) -> int:
        return len(self._heap)

    def is_empty(self) -> bool:
        return len(self._heap) == 0
