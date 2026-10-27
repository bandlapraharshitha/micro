from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    from app.algorithms.min_heap import HuffmanNode
    from app.algorithms.huffman import count_frequencies, build_huffman_tree, generate_huffman_codes, HuffmanModel
    from app.algorithms.encoder import encode, EncodedPayload
    from app.algorithms.decoder import decode, decode_to_string
    from app.algorithms.metrics import calculate_compression_metrics, verify_round_trip
except ImportError:
    from backend.app.algorithms.min_heap import HuffmanNode
    from backend.app.algorithms.huffman import count_frequencies, build_huffman_tree, generate_huffman_codes, HuffmanModel
    from backend.app.algorithms.encoder import encode, EncodedPayload
    from backend.app.algorithms.decoder import decode, decode_to_string
    from backend.app.algorithms.metrics import calculate_compression_metrics, verify_round_trip

router = APIRouter()


# ============================================================================
# Pydantic Schemas for Request & Response Validation
# ============================================================================

class DataRequest(BaseModel):
    data: Union[str, List[str]] = Field(
        ...,
        description="Input text string or sequence of assembly instruction tokens."
    )


class CompressRequest(BaseModel):
    data: Union[str, List[str]] = Field(
        ...,
        description="Input text string or sequence of assembly instruction tokens."
    )
    bits_per_symbol: int = Field(
        default=8,
        ge=1,
        le=64,
        description="Baseline uncompressed bits per symbol (e.g. 8 for ASCII, 12/16/32 for instructions)."
    )


class DecompressRequest(BaseModel):
    bitstring: str = Field(
        ...,
        description="Contiguous binary bitstream containing only '0' and '1'."
    )
    codebook: Optional[Dict[str, str]] = Field(
        default=None,
        description="Prefix codebook mapping symbols to binary codes."
    )
    tree: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Serialized Huffman prefix tree."
    )
    as_string: bool = Field(
        default=True,
        description="Whether to join decoded symbols into a single string or return list of tokens."
    )


class FrequenciesResponse(BaseModel):
    frequencies: Dict[str, int]
    total_symbols: int
    unique_symbols: int


class CompressResponse(BaseModel):
    frequencies: Dict[str, int]
    codebook: Dict[str, str]
    tree: Optional[Dict[str, Any]]
    bitstring: str
    bit_count: int
    byte_count: int
    metrics: Dict[str, Any]


class DecompressResponse(BaseModel):
    decoded: Union[str, List[str]]
    symbol_count: int


class RoundTripResponse(BaseModel):
    is_lossless: bool
    original_data: Union[str, List[str]]
    decoded_data: Union[str, List[str]]
    match: bool
    bitstring: str
    codebook: Dict[str, str]
    tree: Optional[Dict[str, Any]]
    metrics: Dict[str, Any]


# ============================================================================
# Tree Serialization Helper
# ============================================================================

def serialize_tree_node(node: Optional[HuffmanNode]) -> Optional[Dict[str, Any]]:
    """Recursively serializes a binary HuffmanNode into a clean JSON dictionary."""
    if node is None:
        return None
    return {
        "symbol": node.symbol,
        "frequency": node.frequency,
        "is_leaf": node.is_leaf(),
        "min_symbol": node.min_symbol,
        "left": serialize_tree_node(node.left),
        "right": serialize_tree_node(node.right),
    }


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/health", summary="Health check endpoint")
async def health_check():
    """Returns the operational status of the DAA backend and its subsystems."""
    return {
        "status": "healthy",
        "service": "daa-backend",
        "description": "Huffman-Compressed Micro-Architecture Instruction Memory Simulator - DAA Engine",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "subsystems": {
            "daa_huffman_engine": "ready",
            "frequency_analyzer": "ready",
            "codebook_generator": "ready",
            "metrics_engine": "ready"
        }
    }


@router.get("/daa/sample", summary="Retrieve curated sample micro-architecture datasets")
async def get_samples():
    """Provides sample assembly instruction streams and benchmark text datasets."""
    return {
        "samples": {
            "assembly_program": {
                "title": "Assembly Loop Sequence (Instruction Redundancy)",
                "description": "Typical micro-architecture assembly loop exhibiting high frequency of arithmetic and load instructions.",
                "data": [
                    "LOAD_R0", "LOAD_R1", "ADD_R0_R1", "STORE_R0",
                    "LOAD_R0", "ADD_R0_R1", "SUB_R0_R1", "BRANCH_ZERO",
                    "LOAD_R0", "ADD_R0_R1", "STORE_R0", "HALT"
                ],
                "recommended_bits_per_symbol": 12,
            },
            "skewed_instructions": {
                "title": "Highly Skewed Instruction Frequency",
                "description": "Extreme instruction imbalance (80% NOPs) illustrating maximum entropy reduction and compression savings.",
                "data": [
                    "NOP", "NOP", "NOP", "NOP", "NOP", "NOP", "NOP", "NOP",
                    "ADD_R0_R1", "LOAD_R0", "STORE_R0", "HALT"
                ],
                "recommended_bits_per_symbol": 12,
            },
            "text_benchmark": {
                "title": "Microprogram Architecture Text Benchmark",
                "description": "Standard character sequence containing repeated architectural terms.",
                "data": "MICROPROGRAMMED_HUFFMAN_INSTRUCTION_MEMORY_SIMULATOR",
                "recommended_bits_per_symbol": 8,
            }
        }
    }


@router.post("/daa/frequencies", response_model=FrequenciesResponse, summary="Calculate symbol frequencies")
async def compute_frequencies_endpoint(req: DataRequest):
    """Calculates symbol counts and vocabulary statistics for the input."""
    try:
        freqs = count_frequencies(req.data)
        total = sum(freqs.values())
        return FrequenciesResponse(
            frequencies=freqs,
            total_symbols=total,
            unique_symbols=len(freqs)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/daa/compress", response_model=CompressResponse, summary="Compress data using DAA Huffman algorithm")
async def compress_endpoint(req: CompressRequest):
    """Executes frequency counting, min-heap tree construction, encoding, and metrics computation."""
    try:
        # Handle empty input gracefully
        if not req.data:
            empty_metrics = calculate_compression_metrics({}, {}, bits_per_symbol=req.bits_per_symbol)
            return CompressResponse(
                frequencies={},
                codebook={},
                tree=None,
                bitstring="",
                bit_count=0,
                byte_count=0,
                metrics=empty_metrics.to_dict()
            )

        model = HuffmanModel.from_data(req.data)
        encoded_bits = encode(req.data, model.codebook)
        payload = EncodedPayload(encoded_bits, symbol_count=len(req.data), codebook=model.codebook)
        metrics = calculate_compression_metrics(
            model.frequencies,
            model.codebook,
            bits_per_symbol=req.bits_per_symbol
        )

        return CompressResponse(
            frequencies=model.frequencies,
            codebook=model.codebook,
            tree=serialize_tree_node(model.tree),
            bitstring=encoded_bits,
            bit_count=payload.bit_count,
            byte_count=payload.byte_count,
            metrics=metrics.to_dict()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/daa/decompress", response_model=DecompressResponse, summary="Decompress Huffman bitstream")
async def decompress_endpoint(req: DecompressRequest):
    """Decodes a binary bitstream back into original symbols using the codebook."""
    try:
        if not req.bitstring:
            return DecompressResponse(
                decoded="" if req.as_string else [],
                symbol_count=0
            )

        if not req.codebook and not req.tree:
            raise HTTPException(
                status_code=400,
                detail="Either 'codebook' or 'tree' must be provided for decompression."
            )

        codebook = req.codebook or {}
        if req.as_string:
            result = decode_to_string(req.bitstring, codebook)
            count = len(result)
        else:
            result = decode(req.bitstring, codebook)
            count = len(result)

        return DecompressResponse(
            decoded=result,
            symbol_count=count
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/daa/roundtrip", response_model=RoundTripResponse, summary="Execute lossless round-trip compression and verification")
async def roundtrip_endpoint(req: CompressRequest):
    """Compresses, decompresses, and validates that the reconstructed data is bit-for-bit lossless."""
    try:
        if not req.data:
            empty_metrics = calculate_compression_metrics({}, {}, bits_per_symbol=req.bits_per_symbol)
            return RoundTripResponse(
                is_lossless=True,
                original_data=req.data,
                decoded_data="" if isinstance(req.data, str) else [],
                match=True,
                bitstring="",
                codebook={},
                tree=None,
                metrics=empty_metrics.to_dict()
            )

        model = HuffmanModel.from_data(req.data)
        encoded_bits = encode(req.data, model.codebook)
        
        is_str = isinstance(req.data, str)
        if is_str:
            decoded_result = decode_to_string(encoded_bits, model.codebook)
        else:
            decoded_result = decode(encoded_bits, model.codebook)

        is_match = verify_round_trip(req.data, decoded_result)
        metrics = calculate_compression_metrics(
            model.frequencies,
            model.codebook,
            bits_per_symbol=req.bits_per_symbol
        )

        return RoundTripResponse(
            is_lossless=is_match,
            original_data=req.data,
            decoded_data=decoded_result,
            match=is_match,
            bitstring=encoded_bits,
            codebook=model.codebook,
            tree=serialize_tree_node(model.tree),
            metrics=metrics.to_dict()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Backward Compatibility Aliases for Phase 1/2 tests
# ============================================================================

@router.post("/huffman/compress", summary="Alias for /daa/compress")
async def legacy_compress_endpoint(req: CompressRequest):
    return await compress_endpoint(req)


@router.post("/huffman/decompress", summary="Alias for /daa/decompress")
async def legacy_decompress_endpoint(req: DecompressRequest):
    return await decompress_endpoint(req)
