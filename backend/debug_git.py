import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from utils import git_utils

print(f"Dataset Dir: {git_utils.DATASET_DIR}")
print(f"Exists: {git_utils.DATASET_DIR.exists()}")
print(f"Git Dir Exists: {(git_utils.DATASET_DIR / '.git').exists()}")

try:
    print("Attempting to get remote URL...")
    url = git_utils.get_remote_url()
    print(f"Current Remote URL: {url}")
except Exception as e:
    print(f"Get URL failed: {e}")

try:
    print("Attempting to set remote URL to https://github.com/polydevs-uk/polythink-instruct-dataset...")
    git_utils.set_remote_url("https://github.com/polydevs-uk/polythink-instruct-dataset")
    print("Set URL success")
    
    print("Verifying...")
    new_url = git_utils.get_remote_url()
    print(f"New Remote URL: {new_url}")
    
    # Revert to SSH for user
    print("Reverting to SSH...")
    git_utils.set_remote_url("git@github.com:polydevs-uk/polythink-instruct-dataset.git")
    print("Revert success")
    
except Exception as e:
    print(f"Set URL failed: {e}")
