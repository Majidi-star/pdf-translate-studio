# Graph Report - .  (2026-07-28)

## Corpus Check
- Corpus is ~5,509 words - fits in a single context window. You may not need a graph.

## Summary
- 56 nodes · 105 edges · 9 communities (7 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- PDF Extraction Service
- Frontend State & Chat UI
- Frontend Interactive Logic
- Backend REST API Controllers
- LLM Completion Service
- Frontend Configuration Handler
- Ollama Model Discovery API
- App Entrypoint Launcher
- PDF.js Document Viewer

## God Nodes (most connected - your core abstractions)
1. `setupEventListeners()` - 16 edges
2. `execute_llm_call()` - 7 edges
3. `convert_pdf_datalab()` - 7 edges
4. `api_convert_pdf()` - 6 edges
5. `translate_text()` - 5 edges
6. `get_async_client()` - 5 edges
7. `convert_pdf_local()` - 5 edges
8. `extract_pdf_fallback()` - 5 edges
9. `loadConfig()` - 5 edges
10. `hideSelectionTooltip()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `api_translate_text()` --calls--> `translate_text()`  [EXTRACTED]
  backend/main.py → backend/services/llm_service.py
- `api_chat()` --calls--> `execute_llm_call()`  [EXTRACTED]
  backend/main.py → backend/services/llm_service.py
- `execute_llm_call()` --calls--> `get_async_client()`  [EXTRACTED]
  backend/services/llm_service.py → backend/services/pdf_service.py
- `api_convert_pdf()` --calls--> `convert_pdf_datalab()`  [EXTRACTED]
  backend/main.py → backend/services/pdf_service.py
- `api_convert_pdf()` --calls--> `convert_pdf_local()`  [EXTRACTED]
  backend/main.py → backend/services/pdf_service.py

## Import Cycles
- None detected.

## Communities (9 total, 2 thin omitted)

### Community 0 - "PDF Extraction Service"
Cohesion: 0.26
Nodes (11): Any, AsyncClient, api_convert_pdf(), convert_pdf_datalab(), convert_pdf_local(), extract_pdf_fallback(), get_async_client(), High-quality text layout extraction using PyMuPDF (fitz) (+3 more)

### Community 1 - "Frontend State & Chat UI"
Cohesion: 0.31
Nodes (8): elements, escapeHtml(), providerModels, renderChatMessages(), saveConfig(), sendChatMessage(), state, updateStatusIndicators()

### Community 2 - "Frontend Interactive Logic"
Cohesion: 0.36
Nodes (8): copyToClipboard(), handleTextSelection(), hideSelectionTooltip(), runLayoutExtraction(), sendSelectionToChat(), setupEventListeners(), translateDocument(), translateSelectedText()

### Community 3 - "Backend REST API Controllers"
Cohesion: 0.48
Nodes (6): api_chat(), api_translate_text(), ChatRequest, TranslationRequest, BaseModel, post

### Community 4 - "LLM Completion Service"
Cohesion: 0.47
Nodes (5): execute_llm_call(), is_local_url(), Translates a piece of text to the target language using custom prompt instructio, Core function that handles standard chat completion for different LLM providers., translate_text()

### Community 5 - "Frontend Configuration Handler"
Cohesion: 0.40
Nodes (5): loadConfig(), toggleLlmFields(), toggleOcrFields(), toggleProxyFields(), updateModelsDropdown()

### Community 6 - "Ollama Model Discovery API"
Cohesion: 0.50
Nodes (4): api_ollama_models(), fetch_ollama_models(), Fetches the available models from the local Ollama instance., get

## Knowledge Gaps
- **3 isolated node(s):** `state`, `providerModels`, `elements`
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `convert_pdf_datalab()` connect `PDF Extraction Service` to `Backend REST API Controllers`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `setupEventListeners()` connect `Frontend Interactive Logic` to `PDF.js Document Viewer`, `Frontend State & Chat UI`, `Frontend Configuration Handler`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `execute_llm_call()` connect `LLM Completion Service` to `PDF Extraction Service`, `Backend REST API Controllers`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `setupEventListeners()` (e.g. with `handleTextSelection()` and `runLayoutExtraction()`) actually correct?**
  _`setupEventListeners()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `state`, `providerModels`, `elements` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._