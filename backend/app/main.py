import sys
from pathlib import Path

# Ensure backend directory is in sys.path for unified import resolution
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.routes import router as api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Python FastAPI backend powering the DAA (Design and Analysis of Algorithms) Huffman compression engine for micro-architecture instruction memory simulation.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration to enable communication with the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes under /api (master requirement) and /api/v1 (legacy/versioned alias)
app.include_router(api_router, prefix="/api", tags=["DAA & Subsystems"])
app.include_router(api_router, prefix="/api/v1", tags=["Versioned Aliases"])

# Direct health endpoint for simple ping/liveness probes
@app.get("/health", tags=["Health"])
async def root_health_check():
    from datetime import datetime, timezone
    return {
        "status": "healthy",
        "service": "daa-backend",
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Huffman-Compressed Instruction Memory Simulator Backend (DAA Engine) is running.",
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": {
            "sample_data": "/api/daa/sample",
            "frequencies": "/api/daa/frequencies",
            "compress": "/api/daa/compress",
            "decompress": "/api/daa/decompress",
            "roundtrip": "/api/daa/roundtrip"
        }
    }
