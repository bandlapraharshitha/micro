import sys
from pathlib import Path

# Ensure both backend directory and root directory are in sys.path
_app_dir = Path(__file__).resolve().parent
_backend_dir = _app_dir.parent
_workspace_dir = _backend_dir.parent

for _p in (str(_backend_dir), str(_workspace_dir)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from app.core.config import settings
    from app.api.routes import router as api_router
except ImportError:
    from backend.app.core.config import settings
    from backend.app.api.routes import router as api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Python FastAPI backend powering the DAA (Design and Analysis of Algorithms) Huffman compression engine for micro-architecture instruction memory simulation.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration to enable communication with the Next.js frontend (local and deployed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
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
