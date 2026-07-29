# LingoPDF Workspace Customization Rules

These rules apply specifically to developer agents working inside the LingoPDF codebase:

## Architecture and Styling Guidelines
- **No Build Tools**: The frontend is strictly built with vanilla, server-served static files. Do not configure webpack, vite, gulp, or other bundlers. Do not rewrite JS imports using modules if it breaks standard browser loading.
- **Glassmorphic Design System**: Any UI additions must adhere to the existing layout token rules inside `frontend/index.css` (e.g. glass-like transparency, Outfit and JetBrains Mono fonts, and dark-theme variables).
- **Asynchronous Flow**: Maintain asynchronous backend controllers in `backend/main.py`. Heavy tasks (like Marker downloading) must run in background threads to avoid blocking FastAPI's main event loop.

## Integration Guidelines
- **HTTP client**: Always use `httpx.AsyncClient` with the helper `get_async_client(proxy)` inside `pdf_service.py` to route external API requests. This ensures compatibility with user proxy configurations.
- **Dependency boundaries**: Avoid adding heavy deep learning/OCR packages directly into `requirements.txt` unless absolutely necessary. Keep the core installation lightweight, and rely on external binaries (such as `marker_single`) or external REST APIs.
