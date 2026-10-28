import sys
from pathlib import Path

# Add project root and backend to python path for Vercel Serverless
_base = Path(__file__).resolve().parent.parent
_backend = _base / "backend"

for p in (str(_base), str(_backend)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app.main import app
except ImportError:
    from app.main import app

