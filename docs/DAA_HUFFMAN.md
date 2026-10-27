# DAA: Design and Analysis of Algorithms

## Greedy Huffman Compression for Micro-Architectural Instruction Memory

This document provides the theoretical foundation, mathematical proofs, complexity analysis, and algorithmic design for the **Design and Analysis of Algorithms (DAA)** subsystem.

---

## 1. Problem Statement & Motivation

In standard microprocessors, instruction control words are stored in fixed-width control stores (e.g., 16-bit, 32-bit, or 64-bit words). While fixed-width encoding simplifies fetch logic and address alignment, program instruction traces exhibit extreme frequency skew:

* Primitive data transfer and control instructions (`LOAD`, `ADD`, `NOP`, `BRANCH`) account for up to **$70\text{--}80\%$** of all executed cycles in typical benchmark routines.
* Complex ALU, system, or peripheral instructions (`OUT`, `XOR`, `DEC`) execute with exponentially lower probabilities.

By assigning variable-length binary prefix codes—where frequent instructions receive short codewords and rare instructions receive longer codewords—we dramatically minimize the total bit footprint required to store program memory, reducing control memory area and instruction bus bandwidth requirements.

---

## 2. Theoretical Background & Proofs

### A. Prefix-Free Code Property
A code $C$ is **prefix-free** (or an instantaneous code) if and only if no codeword is a prefix of any other codeword:
$$\forall x, y \in \Sigma, \quad x \ne y \implies C(x) \text{ is not a prefix of } C(y)$$

**Theorem:** Any prefix-free code can be uniquely represented as a binary tree where each symbol resides exclusively at a leaf node. An incoming bitstream can be decoded unambiguously from left to right with **zero lookahead** and **zero backtracking**.

---

### B. Greedy Choice Property
**Theorem (Huffman, 1952):** Let $C$ be an alphabet with symbol frequencies $f[c]$. Let $x, y \in C$ be two symbols with the lowest frequencies. Then there exists an optimal prefix-free code for $C$ in which $x$ and $y$ are sibling leaves of maximum depth in the tree.

*Proof Sketch:*
Assume an optimal tree $T$ where the two lowest-frequency symbols $x$ and $y$ are not siblings at maximum depth. Let $a$ and $b$ be sibling leaves at maximum depth in $T$. Without loss of generality, assume $f[x] \le f[y]$ and $f[a] \le f[b]$.
By swapping $x$ with $a$ and $y$ with $b$, we form a new tree $T'$. The difference in weighted path length is:
$$B(T) - B(T') = \sum f[c] d_T(c) - \sum f[c] d_{T'}(c) = (f[a] - f[x])(d_T(a) - d_T(x)) + (f[b] - f[y])(d_T(b) - d_T(y))$$
Because $f[a] \ge f[x]$, $f[b] \ge f[y]$, and $d_T(a), d_T(b)$ are maximum depths, both terms are non-negative. Therefore $B(T') \le B(T)$. Since $T$ was optimal, $T'$ must also be optimal. Hence, the greedy choice of pairing the two lowest-frequency symbols first yields an optimal solution.

---

### C. Optimal Substructure
**Theorem:** Let $T$ be an optimal prefix tree for alphabet $C$. If we replace siblings $x$ and $y$ with a composite symbol $z$ having frequency $f[z] = f[x] + f[y]$, the resulting tree $T'$ is an optimal prefix tree for $C' = (C \setminus \{x, y\}) \cup \{z\}$.

*Consequence:* The problem of constructing an optimal prefix tree of size $N$ can be solved recursively by solving a subproblem of size $N - 1$.

---

## 3. Algorithmic Steps & Pseudocode

```
Algorithm BUILD-HUFFMAN-TREE(C)
  n = |C|
  Q = MinPriorityQueue()
  
  for each symbol c in C do
    node = AllocateNode(symbol=c, freq=f[c])
    INSERT(Q, node)
  
  for i = 1 to n - 1 do
    x = EXTRACT-MIN(Q)
    y = EXTRACT-MIN(Q)
    z = AllocateNode(symbol=null, freq=x.freq + y.freq)
    z.left = x
    z.right = y
    INSERT(Q, z)
    
  return EXTRACT-MIN(Q)  // Root of the optimal prefix tree
```

### Deterministic Tie-Breaking
Standard min-heaps produce arbitrary codebooks when multiple nodes have identical frequencies. To guarantee 100% reproducible tree structures across all platforms, our `HuffmanNode` implements a strict 3-tuple comparison:
$$\text{Node}_1 < \text{Node}_2 \iff (\text{freq}_1, \text{order}_1, \text{min\_symbol}_1) < (\text{freq}_2, \text{order}_2, \text{min\_symbol}_2)$$

---

## 4. Complexity Analysis

| Operation | Time Complexity | Space Complexity | Explanation |
| :--- | :--- | :--- | :--- |
| **Frequency Counting** | $O(M)$ | $O(N)$ | Linear pass over $M$ input tokens with $N$ unique symbols. |
| **Min-Heap Initialization** | $O(N)$ | $O(N)$ | Python `heapq.heapify()` runs in linear time. |
| **Tree Construction** | $O(N \log N)$ | $O(N)$ | Exactly $N - 1$ merge iterations, each performing two `heappop` and one `heappush` ($O(\log N)$). |
| **Code Extraction** | $O(N)$ | $O(N)$ | Depth-First Search (DFS) traversing all $2N - 1$ tree nodes. |
| **Encoding Stream** | $O(M)$ | $O(M \cdot \bar{L})$ | Hash map lookup for each token and bitstring concatenation. |
| **Decoding Stream** | $O(B)$ | $O(M)$ | Single bit-by-bit tree traversal consuming $B$ bits to emit $M$ symbols. |

---

## 5. Mathematical Metrics & Storage Formulas

### Shannon Entropy ($H(X)$)
Theoretical lower bound on the average number of bits per symbol:
$$H(X) = -\sum_{i=1}^{n} p_i \log_2(p_i) \quad \text{(bits/symbol)}$$

### Average Code Length ($\bar{L}$)
Empirical weighted average code length achieved by the codebook:
$$\bar{L} = \sum_{i=1}^{n} p_i l_i \quad \text{(bits/symbol)}$$
Shannon's Source Coding Theorem guarantees:
$$H(X) \le \bar{L} < H(X) + 1$$

### Coding Efficiency ($\eta$)
$$\eta = \frac{H(X)}{\bar{L}} \times 100\%$$

### Storage Overhead & Compression Ratios
Let $W_{\text{baseline}}$ be the uncompressed bit-width per instruction (e.g. 12 bits for control words, 16 bits for microcode):
* **Original Uncompressed Bits:**
  $$B_{\text{orig}} = M \times W_{\text{baseline}}$$
* **Compressed Payload Bits:**
  $$B_{\text{payload}} = \sum_{i=1}^n f_i \cdot l_i$$
* **Tree Serialization Overhead:**
  Each leaf node requires 1 bit (leaf marker) + symbol encoding bits. Each internal node requires 1 bit (branch marker).
  $$B_{\text{metadata}} = (2N - 1) + N \cdot W_{\text{symbol}}$$
* **Payload Compression Ratio:**
  $$CR_{\text{payload}} = \frac{B_{\text{orig}}}{B_{\text{payload}}}$$
* **Total Compression Ratio (including stored tree):**
  $$CR_{\text{total}} = \frac{B_{\text{orig}}}{B_{\text{payload}} + B_{\text{metadata}}}$$
* **Payload Space Savings %:**
  $$\text{Savings}_{\text{payload}} = \left(1 - \frac{B_{\text{payload}}}{B_{\text{orig}}}\right) \times 100\%$$
