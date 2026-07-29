# AGENT.md

Welcome, Agent! This guide describes how to understand, navigate, and develop in the **PDF Translate Studio (LingoPDF)** codebase.

## 🤖 General Agent Guidelines

1. **Keep Frontend Simple & Standalone**:
   - The frontend is served directly as static files. **Do not** add bundlers, npm compilers (Vite, Webpack), TypeScript, or Babel. Maintain vanilla JS (`app.js`) and CSS (`index.css`).
2. **Uvicorn Hot-Reload**:
   - FastAPI is set to hot-reload (`reload=True`). Running `python run.py` will boot the server and listen for changes. When you modify python or frontend files, uvicorn automatically restarts or serves the updated static assets.
3. **Local Models Storage**:
   - Local layout-aware translation relies on Marker which downloads model files to `~/.cache/huggingface/hub`. Be careful of space constraints on the user's system.
4. **Proxy Compatibility**:
   - Both `pdf_service.py` and `llm_service.py` support routing outbound HTTP requests (to OpenAI, Datalab, Anthropic, Gemini, etc.) through HTTP/HTTPS and SOCKS4/SOCKS5 proxies via `httpx[socks]`. Ensure any new network requests reuse the `get_async_client(proxy)` helper.

---

## 🗺️ Codebase Graph (Graphify)

This workspace contains pre-built graph files in `graphify-out/` representing the structural and semantic relationships in this repository.

- **Manifest**: Check [manifest.json](file:///c:/Projects/pdf-translator/graphify-out/manifest.json) to see tracked source files.
- **Graph Report**: Check the plain-language [GRAPH_REPORT.md](file:///c:/Projects/pdf-translator/graphify-out/GRAPH_REPORT.md) to review god nodes, communities, and dependency structures.
- **Querying the codebase**:
  - You can run query commands using the `graphify` CLI:
    ```bash
    graphify query "<question>"
    ```
  - For example, to find out how PDF text extraction flows:
    ```bash
    graphify query "How does convert_pdf_datalab work?"
    ```
  - If the CLI command is unavailable, you can parse [graph.json](file:///c:/Projects/pdf-translator/graphify-out/graph.json) or run a standard search across the codebase.

---

## 🛠️ Typical Development Workflow

1. **Verify Sandbox/Environment**:
   - Verify dependencies are installed inside `.venv`.
   - Run `python run.py` to start uvicorn and open the browser.
2. **Manual Verification**:
   - As there are no unit tests, manually verify UI changes or backend API changes by loading `http://127.0.0.1:8000` in the browser or making calls directly using tools like `curl`/`Invoke-RestMethod`.
