import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.services.pdf_service import convert_pdf_datalab, convert_pdf_local, extract_pdf_fallback
from backend.services.llm_service import translate_text, execute_llm_call, fetch_provider_models, test_llm_connection
from backend.services.installer_service import get_download_status, start_download, pause_download, cancel_download

app = FastAPI(title="PDF Layout Translator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for translation and chat
class TranslationRequest(BaseModel):
    text: str
    target_lang: str
    provider: str
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    model: str
    custom_prompt: Optional[str] = None
    proxy: Optional[str] = None

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    provider: str
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    model: str
    proxy: Optional[str] = None

class ConnectionTestRequest(BaseModel):
    provider: str
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    model: Optional[str] = None
    proxy: Optional[str] = None

class DownloadRequest(BaseModel):
    proxy: Optional[str] = None

@app.post("/api/convert-pdf")
async def api_convert_pdf(
    file: UploadFile = File(...),
    method: str = Form("fallback"),
    api_key: Optional[str] = Form(None),
    proxy: Optional[str] = Form(None)
):
    try:
        file_bytes = await file.read()
        filename = file.filename or "uploaded_doc.pdf"
        
        if method == "datalab":
            if not api_key:
                raise HTTPException(status_code=400, detail="Datalab API Key is required for Datalab conversion.")
            result = await convert_pdf_datalab(file_bytes, filename, api_key, proxy)
        elif method == "local":
            try:
                result = convert_pdf_local(file_bytes, filename)
            except FileNotFoundError as fnfe:
                raise HTTPException(status_code=400, detail=str(fnfe))
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Local Marker execution failed: {str(e)}")
        else:  # fallback using PyMuPDF
            result = extract_pdf_fallback(file_bytes)
            
        return result
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")

@app.post("/api/translate-text")
async def api_translate_text(req: TranslationRequest):
    try:
        translated = await translate_text(
            text=req.text,
            target_lang=req.target_lang,
            provider=req.provider,
            api_key=req.api_key,
            api_url=req.api_url,
            model=req.model,
            custom_prompt=req.custom_prompt,
            proxy=req.proxy
        )
        return {"translated_text": translated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

@app.post("/api/chat")
async def api_chat(req: ChatRequest):
    try:
        response = await execute_llm_call(
            messages=req.messages,
            provider=req.provider,
            api_key=req.api_key,
            api_url=req.api_url,
            model=req.model,
            proxy=req.proxy
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat execution failed: {str(e)}")

@app.get("/api/ollama/models")
async def api_ollama_models(api_url: Optional[str] = None):
    # Deprecated: client should fetch from general endpoint
    models = await fetch_provider_models("ollama", api_url=api_url)
    return {"models": models}

@app.get("/api/llm/models")
async def api_llm_models(
    provider: str,
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    proxy: Optional[str] = None
):
    models = await fetch_provider_models(provider, api_key, api_url, proxy)
    return {"models": models}

@app.post("/api/llm/test-connection")
async def api_test_llm_connection(req: ConnectionTestRequest):
    result = await test_llm_connection(
        provider=req.provider,
        api_key=req.api_key,
        api_url=req.api_url,
        model=req.model,
        proxy=req.proxy
    )
    return result

@app.get("/api/local-models/status")
def api_local_models_status():
    return get_download_status()

@app.post("/api/local-models/download")
def api_local_models_download(req: DownloadRequest):
    start_download(req.proxy)
    return {"status": "started"}

@app.post("/api/local-models/pause")
def api_local_models_pause():
    pause_download()
    return {"status": "paused"}

@app.post("/api/local-models/cancel")
def api_local_models_cancel():
    cancel_download()
    return {"status": "cancelled"}

# Mount frontend files (creates frontend dir if needed when running)
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
os.makedirs(frontend_dir, exist_ok=True)

# Serves HTML frontend
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
