# CLAUDE.md

## Build & Run Commands

### Backend
- **Install Dependencies**: `pip install -r requirements.txt` (or `uv pip install -r requirements.txt`)
- **Run FastAPI Server**: `python run.py`
  - The script checks if `.venv` exists and automatically runs Python inside it.
  - Launches uvicorn on `127.0.0.1:8000` with hot-reloading enabled.
  - Automatically opens the default web browser to the dashboard URL.

### Frontend
- Served directly by FastAPI's `StaticFiles` mapping from `frontend/` directory.
- No build steps or packaging required. Updates in `frontend/` are immediately reflected when reloading the browser.

---

## Project Structure

- [run.py](file:///c:/Projects/pdf-translator/run.py): Main entrypoint and self-correcting launcher.
- [backend/main.py](file:///c:/Projects/pdf-translator/backend/main.py): FastAPI web application routing and request handlers.
- [backend/services/pdf_service.py](file:///c:/Projects/pdf-translator/backend/services/pdf_service.py): Layout extraction via Cloud Datalab API, local `marker_single` CLI tool, or fallback `PyMuPDF` rendering.
- [backend/services/llm_service.py](file:///c:/Projects/pdf-translator/backend/services/llm_service.py): LLM connections (OpenAI, Gemini, Anthropic Claude, DeepSeek, Ollama) and proxy handlers.
- [backend/services/installer_service.py](file:///c:/Projects/pdf-translator/backend/services/installer_service.py): Background downloads manager for HuggingFace model files (`vikp/surya_layout` and `vikp/texify`).
- [frontend/index.html](file:///c:/Projects/pdf-translator/frontend/index.html): Glassmorphic client dashboard structure.
- [frontend/index.css](file:///c:/Projects/pdf-translator/frontend/index.css): Core design token, layouts, and custom glassmorphism styles.
- [frontend/app.js](file:///c:/Projects/pdf-translator/frontend/app.js): Application state, event bindings, PDF.js rendering, and LLM polling/chat logic.

---

## Coding Guidelines

- **Style Guidelines**:
  - **Python**: Follow PEP 8 style. Use type annotations (`Optional`, `Dict`, `List`, `Any`). Use asynchronous handlers (`async def`) for backend routes.
  - **JavaScript**: Follow ES6+ standards. Use clean async/await patterns for API requests. Maintain local state within the global `state` object.
  - **CSS**: Stick to vanilla CSS, custom variables, HSL color declarations, responsive flex/grid layouts, and glassmorphic designs. Avoid frameworks.
- **Error Handling**:
  - Always validate incoming client payloads with Pydantic models.
  - Raise clear `HTTPException` codes in FastAPI routes with a descriptive details field.
  - Catch network errors during LLM or PDF parsing API connections and report them gracefully to the client.
- **State Management**:
  - Frontend state is managed in the client browser inside `app.js` and persistent configuration is saved to `LocalStorage` under `lingo_pdf_config` and `lingo_pdf_custom_providers`.
