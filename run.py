import os
import sys
import time
import threading
import webbrowser

def open_browser():
    """
    Waits briefly for the FastAPI server to initialize, then opens the app in the browser.
    """
    time.sleep(1.5)
    print("\n[LingoPDF] Launching browser to http://127.0.0.1:8000 ...")
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    # Check for local virtual environment Python executable
    venv_py = None
    if sys.platform == "win32":
        win_venv = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "Scripts", "python.exe")
        if os.path.exists(win_venv):
            venv_py = win_venv
    else:
        unix_venv = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "bin", "python")
        if os.path.exists(unix_venv):
            venv_py = unix_venv

    # If the virtual environment exists and we are not using it, re-execute the script
    if venv_py and os.path.abspath(sys.executable) != os.path.abspath(venv_py):
        print(f"[LingoPDF] Redirecting execution to virtual environment: {venv_py}")
        import subprocess
        res = subprocess.run([venv_py] + sys.argv)
        sys.exit(res.returncode)

    # Safe to import packages installed only inside the venv
    try:
        import uvicorn
    except ImportError:
        print("[LingoPDF] Error: uvicorn is not installed in the virtual environment.")
        print("Please run: uv pip install -r requirements.txt")
        sys.exit(1)
        
    print("[LingoPDF] Starting Layout PDF Translation Web Server...")
    
    # Run browser auto-opening in a background thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Boot server using Uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
