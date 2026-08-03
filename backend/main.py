import os
import json
import asyncio
import re
import uuid
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.services.pdf_service import convert_pdf_datalab, convert_pdf_local, extract_pdf_fallback, convert_pdf_unlimited_ocr
from backend.services.llm_service import translate_text, execute_llm_call, execute_llm_call_stream, fetch_provider_models, test_llm_connection
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
    model: str = "marker"
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
        elif method == "unlimited-ocr":
            try:
                result = await convert_pdf_unlimited_ocr(file_bytes, filename)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Unlimited-OCR execution failed: {str(e)}")
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


@app.post("/api/chat/stream")
async def api_chat_stream(req: ChatRequest):
    """
    SSE streaming endpoint for agentic chat.
    Streams step annotations first, then LLM response chunks.
    Format: data: {json}\n\n per SSE spec.
    """
    async def event_generator():
        try:
            # ── Step 1: Detect likely agent actions from system message ─────
            system_content = ""
            for msg in req.messages:
                if msg.get("role") == "system":
                    system_content = msg.get("content", "")
                    break

            # Emit "Thinking" step
            yield f"data: {json.dumps({'type': 'step', 'status': 'active', 'text': 'Thinking...'})}\n\n"
            await asyncio.sleep(0.4)

            # Parse user message to detect if a tool call is pending
            last_user_msg = ""
            for msg in reversed(req.messages):
                if msg.get("role") == "user":
                    last_user_msg = msg.get("content", "")
                    break

            # Emit analysis step
            yield f"data: {json.dumps({'type': 'step', 'status': 'active', 'text': 'Analyzing request...'})}\n\n"
            await asyncio.sleep(0.3)

            # Check if document context available
            has_doc_context = "Active PDF Document" in system_content or "Attached Reference" in last_user_msg
            if has_doc_context:
                yield f"data: {json.dumps({'type': 'step', 'status': 'active', 'text': 'Reading document context...'})}\n\n"
                await asyncio.sleep(0.35)

            # Emit LLM call step
            model_label = req.model or "LLM"
            yield f"data: {json.dumps({'type': 'step', 'status': 'active', 'text': f'Calling {req.provider} ({model_label})...'})}\n\n"
            await asyncio.sleep(0.25)

            # ── Stream LLM response ──────────────────────────────────────────
            full_response = ""
            tool_call_pattern = re.compile(r'```json\s*(\{[\s\S]*?"tool_call"[\s\S]*?\})\s*```')
            tool_found = False

            async for chunk in execute_llm_call_stream(
                messages=req.messages,
                provider=req.provider,
                api_key=req.api_key,
                api_url=req.api_url,
                model=req.model,
                proxy=req.proxy
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

                # Check for tool call as response builds
                if not tool_found and "tool_call" in full_response and "```" in full_response:
                    match = tool_call_pattern.search(full_response)
                    if match:
                        tool_found = True
                        try:
                            tool_block = json.loads(match.group(1))
                            tool_name = tool_block.get("tool_call", {}).get("name", "unknown")
                            # Delay before emitting tool execution step
                            await asyncio.sleep(0.6)
                            yield f"data: {json.dumps({'type': 'step', 'status': 'active', 'text': f'Calling tool: {tool_name}'})}\n\n"
                            await asyncio.sleep(0.4)
                            yield f"data: {json.dumps({'type': 'step', 'status': 'done', 'text': f'Tool {tool_name} executed'})}\n\n"
                        except Exception:
                            pass

            # ── Done ─────────────────────────────────────────────────────────
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'text': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

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
def api_local_models_status(model: str = "marker"):
    return get_download_status(model)

@app.post("/api/local-models/download")
def api_local_models_download(req: DownloadRequest):
    start_download(req.model, req.proxy)
    return {"status": "started"}

@app.post("/api/local-models/pause")
def api_local_models_pause():
    pause_download()
    return {"status": "paused"}

@app.post("/api/local-models/cancel")
def api_local_models_cancel():
    cancel_download()
    return {"status": "cancelled"}

# --- MCP WebSockets and Agents Bridge ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.pending_calls: Dict[str, asyncio.Future] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def execute_tool(self, tool_name: str, arguments: dict, timeout: float = 30.0) -> Any:
        if not self.active_connections:
            raise HTTPException(status_code=503, detail="No active browser session connected.")
        
        call_id = str(uuid.uuid4())
        future = asyncio.get_event_loop().create_future()
        self.pending_calls[call_id] = future
        
        ws = self.active_connections[0] # Use the first connected client
        await ws.send_json({
            "type": "tool_call",
            "call_id": call_id,
            "name": tool_name,
            "arguments": arguments
        })
        
        try:
            # Wait for response from frontend
            result = await asyncio.wait_for(future, timeout=timeout)
            return result
        except asyncio.TimeoutError:
            if call_id in self.pending_calls:
                del self.pending_calls[call_id]
            raise HTTPException(status_code=504, detail="Browser tool execution timed out.")

manager = ConnectionManager()

@app.websocket("/api/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "tool_response":
                call_id = data.get("call_id")
                if call_id in manager.pending_calls:
                    future = manager.pending_calls[call_id]
                    if not future.done():
                        future.set_result(data.get("result", {}))
                    del manager.pending_calls[call_id]
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)

class MCPExecutionRequest(BaseModel):
    tool_name: str
    arguments: dict

@app.post("/api/mcp/execute")
async def api_mcp_execute(req: MCPExecutionRequest):
    result = await manager.execute_tool(req.tool_name, req.arguments)
    return {"result": result}

# Mount frontend files (creates frontend dir if needed when running)
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
os.makedirs(frontend_dir, exist_ok=True)

# Serves HTML frontend
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
