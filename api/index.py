import os
import sys
import shutil
from pathlib import Path

# Add project root and backend to python path for clean module resolution
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "backend"))

# Mark environment as Vercel serverless
os.environ["VERCEL"] = "1"

# Prepare writable /tmp directory for serverless runtime
data_dir = Path("/tmp/data")
data_dir.mkdir(parents=True, exist_ok=True)
tmp_db = Path("/tmp/ordinance.db")

# If local database exists in repo, copy it to /tmp so data is pre-populated
local_db = ROOT_DIR / "data" / "ordinance.db"
if local_db.exists() and not tmp_db.exists():
    try:
        shutil.copyfile(local_db, tmp_db)
    except Exception as e:
        print(f"Notice: initial db copy: {e}")

from backend.app.main import app

# Export app for Vercel Serverless Function
handler = app
