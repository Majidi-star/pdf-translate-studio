import os
import time
import asyncio
import threading
import httpx
from typing import Optional, Dict, Any
from backend.services.pdf_service import get_async_client

# Installer global state
INSTALL_STATE = {
    "status": "idle",          # "idle", "fetching", "downloading", "paused", "completed", "failed", "busy"
    "progress": 0,             # 0 to 100
    "model": "",               # active model being downloaded
    "current_repo": "",
    "current_file": "",
    "downloaded_bytes": 0,
    "total_bytes": 0,
    "speed": "0 KB/s",
    "error": ""
}

# Control flags
PAUSE_FLAG = False
CANCEL_FLAG = False
download_thread = None
state_lock = threading.Lock()

# Models configurations
MODEL_REPOS = {
    "marker": [
        {
            "repo": "vikp/surya_layout",
            "files": ["config.json", "model.safetensors", "preprocessor_config.json"]
        },
        {
            "repo": "vikp/texify",
            "files": ["config.json", "model.safetensors", "preprocessor_config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json"]
        }
    ],
    "unlimited-ocr": [
        {
            "repo": "baidu/Unlimited-OCR",
            "files": [
                "config.json",
                "configuration_deepseek_v2.py",
                "conversation.py",
                "deepencoder.py",
                "model-00001-of-000001.safetensors",
                "model.safetensors.index.json",
                "modeling_deepseekv2.py",
                "modeling_unlimitedocr.py",
                "processor_config.json",
                "special_tokens_map.json",
                "tokenizer.json",
                "tokenizer_config.json"
            ]
        }
    ]
}

def get_download_status(model_name: str = "marker") -> Dict[str, Any]:
    with state_lock:
        current_status = INSTALL_STATE["status"]
        current_model = INSTALL_STATE.get("model", "")
        
        # If the installer is currently active downloading this specific model
        if current_status in ("fetching", "downloading", "paused") and current_model == model_name:
            return INSTALL_STATE.copy()
            
        # If installer is downloading another model
        if current_status in ("fetching", "downloading", "paused") and current_model != model_name:
            return {
                "status": "busy",
                "progress": 0,
                "model": model_name,
                "current_repo": f"Another model ({current_model}) is downloading",
                "current_file": "",
                "downloaded_bytes": 0,
                "total_bytes": 0,
                "speed": "0 KB/s",
                "error": f"Downloader is busy with model '{current_model}'."
            }
            
        # Otherwise (idle, completed, failed), check disk installation
        installed = is_model_installed(model_name)
        if installed:
            return {
                "status": "completed",
                "progress": 100,
                "model": model_name,
                "current_repo": model_name,
                "current_file": "All files verified on disk.",
                "downloaded_bytes": 0,
                "total_bytes": 0,
                "speed": "0 KB/s",
                "error": ""
            }
        else:
            # Return state but make sure it is idle/failed for this model
            res = INSTALL_STATE.copy()
            if res["status"] == "completed" or res.get("model") != model_name:
                res["status"] = "idle"
                res["progress"] = 0
                res["model"] = model_name
                res["current_repo"] = ""
                res["current_file"] = ""
                res["speed"] = "0 KB/s"
            return res

def pause_download():
    global PAUSE_FLAG
    with state_lock:
        if INSTALL_STATE["status"] == "downloading":
            PAUSE_FLAG = True
            INSTALL_STATE["status"] = "paused"
            print("[Installer] Pause requested.")

def cancel_download():
    global CANCEL_FLAG
    with state_lock:
        CANCEL_FLAG = True
        INSTALL_STATE["status"] = "idle"
        INSTALL_STATE["progress"] = 0
        INSTALL_STATE["downloaded_bytes"] = 0
        INSTALL_STATE["current_repo"] = ""
        INSTALL_STATE["current_file"] = ""
        INSTALL_STATE["speed"] = "0 KB/s"
        INSTALL_STATE["error"] = ""
        print("[Installer] Cancel requested.")

def start_download(model_name: str = "marker", proxy_url: Optional[str] = None):
    global download_thread, PAUSE_FLAG, CANCEL_FLAG
    
    with state_lock:
        if INSTALL_STATE["status"] in ("downloading", "fetching"):
            return  # Already running
            
        PAUSE_FLAG = False
        CANCEL_FLAG = False
        INSTALL_STATE["status"] = "fetching"
        INSTALL_STATE["model"] = model_name
        INSTALL_STATE["error"] = ""
        
    def worker():
        try:
            asyncio.run(download_process(model_name, proxy_url))
        except Exception as e:
            with state_lock:
                INSTALL_STATE["status"] = "failed"
                INSTALL_STATE["error"] = str(e)
                print(f"[Installer] Error during download: {str(e)}")

    download_thread = threading.Thread(target=worker, daemon=True)
    download_thread.start()

async def download_process(model_name: str, proxy_url: Optional[str]):
    global PAUSE_FLAG, CANCEL_FLAG
    
    # 1. Fetch metadata and file sizes
    cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
    repos = MODEL_REPOS.get(model_name, [])
    if not repos:
        raise Exception(f"Unknown model name: {model_name}")
        
    with state_lock:
        INSTALL_STATE["current_repo"] = "Metadata fetching..."
        INSTALL_STATE["current_file"] = ""
        INSTALL_STATE["progress"] = 0
        
    async with get_async_client(proxy_url) as client:
        # Check files and calculate total size
        manifest = []
        total_size = 0
        
        for item in repos:
            repo = item["repo"]
            files = item["files"]
            
            # Fetch latest commit sha
            info_url = f"https://huggingface.co/api/models/{repo}"
            try:
                resp = await client.get(info_url)
                if resp.status_code != 200:
                    raise Exception(f"Failed to load repo info for {repo}: {resp.text}")
                repo_info = resp.json()
                sha = repo_info.get("sha")
                if not sha:
                    raise Exception(f"No commit hash found for repo {repo}")
            except Exception as e:
                # If offline/timeout, use a mock sha to test/resume local files
                sha = "0000000000000000000000000000000000000000"
                print(f"[Installer] Offline metadata fallback for {repo}: {str(e)}")
                
            for filename in files:
                if CANCEL_FLAG:
                    return
                # Get file size using HEAD request
                file_size = 0
                dl_url = f"https://huggingface.co/{repo}/resolve/main/{filename}"
                try:
                    head_resp = await client.head(dl_url, follow_redirects=True)
                    if head_resp.status_code == 200:
                        file_size = int(head_resp.headers.get("content-length", 0))
                except Exception:
                    # Default sizes for fallback
                    if "safetensors" in filename:
                        file_size = 6670000000 if "Unlimited-OCR" in repo else 1200000000
                    else:
                        file_size = 2048
                    
                total_size += file_size
                manifest.append({
                    "repo": repo,
                    "sha": sha,
                    "filename": filename,
                    "size": file_size,
                    "url": f"https://huggingface.co/{repo}/resolve/{sha}/{filename}"
                })
        
        # Determine already downloaded bytes
        downloaded_so_far = 0
        for task in manifest:
            repo_normalized = f"models--{task['repo'].replace('/', '--')}"
            target_path = os.path.join(cache_dir, repo_normalized, "snapshots", task["sha"], task["filename"])
            if os.path.exists(target_path):
                file_size = os.path.getsize(target_path)
                # If size matches, it's fully downloaded
                if file_size >= task["size"]:
                    downloaded_so_far += task["size"]
                else:
                    downloaded_so_far += file_size
                    
        with state_lock:
            INSTALL_STATE["total_bytes"] = total_size
            INSTALL_STATE["downloaded_bytes"] = downloaded_so_far
            INSTALL_STATE["status"] = "downloading"
            
        # 2. Sequential download loop
        chunk_size = 128 * 1024  # 128 KB chunks
        
        for task in manifest:
            if PAUSE_FLAG or CANCEL_FLAG:
                return
                
            repo_normalized = f"models--{task['repo'].replace('/', '--')}"
            snap_dir = os.path.join(cache_dir, repo_normalized, "snapshots", task["sha"])
            refs_dir = os.path.join(cache_dir, repo_normalized, "refs")
            
            os.makedirs(snap_dir, exist_ok=True)
            os.makedirs(refs_dir, exist_ok=True)
            
            # Write refs/main version file
            with open(os.path.join(refs_dir, "main"), "w") as f:
                f.write(task["sha"])
                
            target_path = os.path.join(snap_dir, task["filename"])
            partial_path = target_path + ".incomplete"
            
            # Check if already completed
            if os.path.exists(target_path) and os.path.getsize(target_path) >= task["size"]:
                continue
                
            # Resume check
            start_byte = 0
            if os.path.exists(partial_path):
                start_byte = os.path.getsize(partial_path)
                if start_byte >= task["size"]:
                    # Rename and skip
                    try:
                        os.replace(partial_path, target_path)
                    except OSError:
                        pass
                    continue
                    
            with state_lock:
                INSTALL_STATE["current_repo"] = task["repo"]
                INSTALL_STATE["current_file"] = task["filename"]
                
            headers = {}
            if start_byte > 0:
                headers["Range"] = f"bytes={start_byte}-"
                
            # Perform stream request
            try:
                async with client.stream("GET", task["url"], headers=headers, follow_redirects=True) as response:
                    if response.status_code not in (200, 206):
                        # If range fails, restart download
                        start_byte = 0
                        response = await client.stream("GET", task["url"], follow_redirects=True)
                        
                    mode = "ab" if start_byte > 0 else "wb"
                    
                    # Track download speed
                    start_time = time.time()
                    bytes_since_check = 0
                    last_check_time = start_time
                    
                    with open(partial_path, mode) as out_file:
                        async for chunk in response.aiter_bytes(chunk_size=chunk_size):
                            if PAUSE_FLAG:
                                print(f"[Installer] Pausing on file: {task['filename']}")
                                return
                            if CANCEL_FLAG:
                                print("[Installer] Cancelling download.")
                                try:
                                    out_file.close()
                                    os.remove(partial_path)
                                except OSError:
                                    pass
                                return
                                
                            out_file.write(chunk)
                            chunk_len = len(chunk)
                            bytes_since_check += chunk_len
                            
                            with state_lock:
                                INSTALL_STATE["downloaded_bytes"] += chunk_len
                                # Calculate percentage
                                if INSTALL_STATE["total_bytes"] > 0:
                                    pct = int((INSTALL_STATE["downloaded_bytes"] / INSTALL_STATE["total_bytes"]) * 100)
                                    INSTALL_STATE["progress"] = min(pct, 99)
                                    
                            # Update speed every 0.5s
                            now = time.time()
                            elapsed = now - last_check_time
                            if elapsed >= 0.5:
                                speed_val = bytes_since_check / elapsed
                                speed_str = format_speed(speed_val)
                                with state_lock:
                                    INSTALL_STATE["speed"] = speed_str
                                bytes_since_check = 0
                                last_check_time = now
                                
                    # Once file finishes, rename it
                    try:
                        if os.path.exists(target_path):
                            os.remove(target_path)
                        os.rename(partial_path, target_path)
                    except OSError:
                        pass
                        
            except Exception as e:
                # Fail gracefully if single request breaks
                raise Exception(f"Failed downloading {task['filename']}: {str(e)}")
                
        # Loop finished successfully
        with state_lock:
            INSTALL_STATE["status"] = "completed"
            INSTALL_STATE["progress"] = 100
            INSTALL_STATE["speed"] = "0 KB/s"
            INSTALL_STATE["current_file"] = "All models installed successfully."
            
def format_speed(bytes_per_sec: float) -> str:
    if bytes_per_sec >= 1024 * 1024:
        return f"{bytes_per_sec / (1024 * 1024):.2f} MB/s"
    elif bytes_per_sec >= 1024:
        return f"{bytes_per_sec / 1024:.2f} KB/s"
    return f"{bytes_per_sec:.0f} B/s"

# Check if model files are fully downloaded locally
def is_model_installed(model_name: str) -> bool:
    cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
    repos = MODEL_REPOS.get(model_name, [])
    if not repos:
        return False
    for item in repos:
        repo = item["repo"]
        files = item["files"]
        repo_normalized = f"models--{repo.replace('/', '--')}"
        repo_path = os.path.join(cache_dir, repo_normalized, "snapshots")
        if not os.path.exists(repo_path):
            return False
        
        subdirs = [os.path.join(repo_path, d) for d in os.listdir(repo_path) if os.path.isdir(os.path.join(repo_path, d))]
        if not subdirs:
            return False
            
        found_all_files = False
        for snap_dir in subdirs:
            has_all = True
            for filename in files:
                target_path = os.path.join(snap_dir, filename)
                if not os.path.exists(target_path) or os.path.getsize(target_path) < 100:
                    has_all = False
                    break
            if has_all:
                found_all_files = True
                break
        if not found_all_files:
            return False
    return True

