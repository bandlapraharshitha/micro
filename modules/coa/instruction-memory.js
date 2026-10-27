/**
 * Instruction Memory Simulator for COA.
 * Models memory hierarchy, instruction fetch buffers, and comparison between
 * uncompressed fixed-width instruction memory and Huffman-compressed memory.
 */

export class InstructionMemory {
  /**
   * @param {Object} config
   * @param {number} [config.wordSize=16] - Standard uncompressed instruction size in bits
   * @param {number} [config.busWidth=32] - Memory data bus width in bits
   */
  constructor({ wordSize = 16, busWidth = 32 } = {}) {
    this.wordSize = wordSize;
    this.busWidth = busWidth;

    this.rawInstructions = [];
    this.compressedBitStream = '';
    this.instructionOffsets = []; // bit offsets for each instruction in compressed stream
    this.accessCount = 0;
  }

  /**
   * Loads program instructions and their corresponding Huffman bit representations.
   * @param {Array<{ opcode: string, operands?: string[], bits: string }>} program
   */
  loadProgram(program) {
    this.rawInstructions = [...program];
    this.instructionOffsets = [];
    let currentOffset = 0;

    let stream = '';
    for (const inst of program) {
      this.instructionOffsets.push(currentOffset);
      stream += inst.bits;
      currentOffset += inst.bits.length;
    }
    this.compressedBitStream = stream;
    this.accessCount = 0;
  }

  /**
   * Returns memory statistics comparing uncompressed vs compressed configurations.
   */
  getMemoryStats() {
    const instructionCount = this.rawInstructions.length;
    const uncompressedBits = instructionCount * this.wordSize;
    const compressedBits = this.compressedBitStream.length;
    const uncompressedBytes = Math.ceil(uncompressedBits / 8);
    const compressedBytes = Math.ceil(compressedBits / 8);

    const compressionRatio = uncompressedBits > 0 
      ? Number((uncompressedBits / Math.max(compressedBits, 1)).toFixed(2)) 
      : 1.0;
    
    const spaceSavingsPercent = uncompressedBits > 0
      ? Number((((uncompressedBits - compressedBits) / uncompressedBits) * 100).toFixed(2))
      : 0.0;

    const uncompressedBusFetches = Math.ceil(uncompressedBits / this.busWidth);
    const compressedBusFetches = Math.ceil(compressedBits / this.busWidth);

    return {
      instructionCount,
      wordSize: this.wordSize,
      busWidth: this.busWidth,
      uncompressedBits,
      compressedBits,
      uncompressedBytes,
      compressedBytes,
      compressionRatio,
      spaceSavingsPercent,
      uncompressedBusFetches,
      compressedBusFetches,
      busBandwidthSavingsPercent: uncompressedBusFetches > 0
        ? Number((((uncompressedBusFetches - compressedBusFetches) / uncompressedBusFetches) * 100).toFixed(2))
        : 0,
    };
  }

  /**
   * Simulates fetching a word (busWidth bits) from memory at a given byte address.
   * @param {number} address - Byte address
   * @returns {string} Bit string representing the fetched bus word
   */
  fetchBusWord(address) {
    this.accessCount++;
    const startBit = address * 8;
    const endBit = Math.min(startBit + this.busWidth, this.compressedBitStream.length);
    if (startBit >= this.compressedBitStream.length) {
      return '0'.repeat(this.busWidth);
    }
    const bits = this.compressedBitStream.slice(startBit, endBit);
    return bits.padEnd(this.busWidth, '0');
  }
}
