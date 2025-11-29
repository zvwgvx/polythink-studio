import subprocess
import os
from pathlib import Path

DATASET_DIR = Path(__file__).parent.parent.parent / "dataset"

def run_git_command(args, cwd=DATASET_DIR):
    """Run a git command in the dataset directory."""
    if not DATASET_DIR.exists():
        DATASET_DIR.mkdir(parents=True, exist_ok=True)
    
    # Auto-init if .git is missing and we aren't trying to init
    if not (DATASET_DIR / ".git").exists() and "init" not in args:
        subprocess.run(["git", "init"], cwd=str(cwd), check=True, capture_output=True)
        # Configure default user
        subprocess.run(["git", "config", "user.email", "admin@polythink.studio"], cwd=str(cwd), check=True, capture_output=True)
        subprocess.run(["git", "config", "user.name", "PolyThink Admin"], cwd=str(cwd), check=True, capture_output=True)

    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        raise Exception(f"Git command failed: {e.stderr}")

def init_repo_if_needed():
    """Initialize git repo if .git doesn't exist."""
    if not (DATASET_DIR / ".git").exists():
        run_git_command(["init"])
        # Configure user for commits
        run_git_command(["config", "user.email", "admin@polythink.studio"])
        run_git_command(["config", "user.name", "PolyThink Admin"])
        return "Initialized new git repository"
    return "Repository already initialized"

def get_remote_url():
    """Get the 'origin' remote URL."""
    try:
        return run_git_command(["remote", "get-url", "origin"])
    except:
        return ""

def set_remote_url(url):
    """Set the 'origin' remote URL."""
    try:
        run_git_command(["remote", "get-url", "origin"])
        # Remote exists, set-url
        run_git_command(["remote", "set-url", "origin", url])
    except:
        # Remote doesn't exist, add it
        run_git_command(["remote", "add", "origin", url])

def git_pull():
    """Pull from origin main."""
    # Fetch first
    run_git_command(["fetch", "origin"])
    # Reset hard to origin/main to force sync (be careful!)
    # Or just pull? Pull might have conflicts.
    # For this use case, "Sync" usually implies "Get latest from remote".
    # If we want to keep local changes, we should commit them first.
    
    # Let's try a standard pull
    try:
        # Try pulling main
        return run_git_command(["pull", "origin", "main"])
    except Exception as e:
        # If pull fails, it might be because the branch doesn't exist locally or upstream isn't set
        # Try fetching and checking out
        try:
            run_git_command(["fetch", "origin"])
            return run_git_command(["checkout", "-B", "main", "origin/main"])
        except Exception as e2:
             raise Exception(f"Pull failed: {str(e)}. Checkout failed: {str(e2)}")

def git_push():
    """Commit all changes and push to origin main."""
    run_git_command(["add", "."])
    
    status = run_git_command(["status", "--porcelain"])
    if not status:
        # Check if we are ahead of remote
        # If not ahead, then truly nothing to push
        try:
            run_git_command(["fetch", "origin"])
            ahead = run_git_command(["rev-list", "origin/main..HEAD", "--count"])
            if int(ahead) == 0:
                return "No changes to push. (Did you Merge the PR?)"
        except:
            pass

    try:
        run_git_command(["commit", "-m", "Update dataset from PolyThink Studio"])
    except:
        pass # Nothing to commit, but might have previous commits to push
        
    return run_git_command(["push", "-u", "origin", "main"])

def git_status():
    """Get status."""
    return run_git_command(["status", "-s"])
