import os
import time
import shutil
import tempfile
import subprocess
import httpx
import fitz
from typing import Optional, Dict, Any

# Helper to create httpx.AsyncClient with proxy configuration
def get_async_client(proxy_url: Optional[str] = None) -> httpx.AsyncClient:
    if not proxy_url:
        return httpx.AsyncClient(timeout=120.0)
    
    proxy_url = proxy_url.strip()
    if not proxy_url:
        return httpx.AsyncClient(timeout=120.0)
        
    # Check if a scheme is provided, otherwise default to socks5
    if not (proxy_url.startswith("http://") or proxy_url.startswith("https://") or 
            proxy_url.startswith("socks5://") or proxy_url.startswith("socks4://")):
        proxy_url = f"socks5://{proxy_url}"
        
    if "socks" in proxy_url:
        proxies = {"all://": proxy_url}
    else:
        proxies = {
            "http://": proxy_url,
            "https://": proxy_url
        }
    
    return httpx.AsyncClient(proxies=proxies, timeout=120.0)

async def convert_pdf_datalab(file_bytes: bytes, filename: str, api_key: str, proxy: Optional[str] = None) -> Dict[str, Any]:
    """
    Submits a PDF to Datalab API and polls for the Markdown output.
    """
    if not api_key:
        raise ValueError("Datalab API key is required.")

    # 1. Submit conversion request
    submit_url = "https://www.datalab.to/api/v1/convert"
    headers = {"X-API-Key": api_key}
    files = {"file": (filename, file_bytes, "application/pdf")}
    data = {
        "output_format": "markdown",
        "mode": "balanced"
    }

    async with get_async_client(proxy) as client:
        try:
            response = await client.post(submit_url, headers=headers, files=files, data=data)
            if response.status_code != 200:
                raise Exception(f"Datalab upload failed ({response.status_code}): {response.text}")
            
            res_data = response.json()
            if not res_data.get("success"):
                raise Exception(f"Datalab API error: {res_data.get('error', 'Unknown error')}")
            
            check_url = res_data.get("request_check_url")
            if not check_url:
                raise Exception("Did not receive checking URL from Datalab API.")
            
            # 2. Poll for completion
            max_attempts = 150  # 5 minutes max
            for attempt in range(max_attempts):
                check_response = await client.get(check_url, headers=headers)
                if check_response.status_code != 200:
                    raise Exception(f"Polling failed ({check_response.status_code}): {check_response.text}")
                
                check_data = check_response.json()
                status = check_data.get("status")
                
                if status == "complete":
                    if check_data.get("success"):
                        return {
                            "markdown": check_data.get("markdown", ""),
                            "pages": check_data.get("pages", []),
                            "source": "datalab"
                        }
                    else:
                        raise Exception(f"Datalab conversion failed: {check_data.get('error', 'Unknown error')}")
                elif status == "failed":
                    raise Exception(f"Datalab conversion failed: {check_data.get('error', 'Unknown error')}")
                
                # Wait 2 seconds before checking again
                await httpx.AsyncClient().get("http://localhost:8000")  # Brief async yields
                time.sleep(2)
            
            raise Exception("Timeout waiting for Datalab conversion to complete.")
            
        except Exception as e:
            raise Exception(f"Error communicating with Datalab API: {str(e)}")

def convert_pdf_local(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Tries to execute local marker installation via command line 'marker_single'
    """
    marker_cmd = shutil.which("marker_single")
    if not marker_cmd:
        raise FileNotFoundError("Local 'marker_single' CLI tool not found in system path. Please install marker-pdf.")

    with tempfile.TemporaryDirectory() as tmp_dir:
        input_path = os.path.join(tmp_dir, filename)
        output_dir = os.path.join(tmp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        
        with open(input_path, "wb") as f:
            f.write(file_bytes)
            
        try:
            # Run local marker command
            # marker_single input.pdf --output_format markdown --output_dir output
            cmd = [
                marker_cmd,
                input_path,
                "--output_format", "markdown",
                "--output_dir", output_dir
            ]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            
            # Find the markdown output in the output directory
            markdown_file = None
            for root, dirs, files in os.walk(output_dir):
                for file in files:
                    if file.endswith(".md"):
                        markdown_file = os.path.join(root, file)
                        break
            
            if not markdown_file or not os.path.exists(markdown_file):
                raise Exception(f"Local marker finished but no markdown file was found in output. Stderr: {result.stderr}")
                
            with open(markdown_file, "r", encoding="utf-8") as f:
                md_content = f.read()
                
            # Split markdown into pages for frontend overlay
            import re
            parts = []
            if "\n\n---\n\n" in md_content:
                parts = md_content.split("\n\n---\n\n")
            elif "\n---\n" in md_content:
                parts = md_content.split("\n---\n")
            else:
                parts = re.split(r'## Page \d+\n+', md_content)
                if len(parts) > 1 and not parts[0].strip():
                    parts = parts[1:]
            
            pages = []
            if parts:
                for idx, part in enumerate(parts):
                    pages.append({
                        "page": idx + 1,
                        "text": part.strip()
                    })
            else:
                pages.append({
                    "page": 1,
                    "text": md_content
                })

            return {
                "markdown": md_content,
                "pages": pages,
                "source": "local_marker"
            }
        except subprocess.CalledProcessError as e:
            raise Exception(f"Local marker command failed: {e.stderr or e.stdout}")

def extract_pdf_fallback(file_bytes: bytes) -> Dict[str, Any]:
    """
    High-quality text layout extraction using PyMuPDF (fitz)
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    markdown_content = []
    
    for page_idx, page in enumerate(doc):
        # Retrieve text blocks
        blocks = page.get_text("blocks")
        # Sort blocks: primary sorting by vertical position, secondary by horizontal
        blocks.sort(key=lambda b: (b[1], b[0]))
        
        page_text = []
        for block in blocks:
            text = block[4].strip()
            if text:
                page_text.append(text)
                
        page_md = "\n\n".join(page_text)
        markdown_content.append(f"## Page {page_idx + 1}\n\n{page_md}")
        pages.append({
            "page": page_idx + 1,
            "text": page_md
        })
        
    full_markdown = "\n\n".join(markdown_content)
    return {
        "markdown": full_markdown,
        "pages": pages,
        "source": "pymupdf_fallback"
    }
