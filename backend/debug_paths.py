from pathlib import Path
import os

# Mimic the logic in datasets.py (which is in backend/routers/datasets.py)
# If this script is in backend/, then project root is parent.
PROJECT_ROOT = Path(__file__).parent.parent
REPO_ROOT = PROJECT_ROOT / "dataset"
BASE_DIR = REPO_ROOT / "dataset" if (REPO_ROOT / "dataset").exists() else REPO_ROOT

print(f"Project Root: {PROJECT_ROOT}")

print(f"Current Working Directory: {os.getcwd()}")
print(f"File Location: {Path(__file__)}")
print(f"REPO_ROOT: {REPO_ROOT}, Exists: {REPO_ROOT.exists()}")
print(f"BASE_DIR: {BASE_DIR}, Exists: {BASE_DIR.exists()}")

for turn_type in ['multi-turn', 'single-turn']:
    turn_dir = BASE_DIR / turn_type
    print(f"Checking {turn_type} dir: {turn_dir}, Exists: {turn_dir.exists()}")
    if turn_dir.exists():
        files = list(turn_dir.glob('*.json'))
        print(f"Found {len(files)} files in {turn_type}: {[f.name for f in files]}")
