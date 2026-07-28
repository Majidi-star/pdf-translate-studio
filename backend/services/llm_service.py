import os
import httpx
from typing import Optional, List, Dict, Any
from backend.services.pdf_service import get_async_client

# Helper to verify if an API URL is local (Ollama)
def is_local_url(url: str) -> bool:
    if not url:
        return True
    url_lower = url.lower()
    return "localhost" in url_lower or "127.0.0.1" in url_lower or "::1" in url_lower or "192.168." in url_lower or "10." in url_lower

FALLBACK_MODELS = {
    "ollama": ["llama3", "mistral", "phi3", "gemma"],
    "openai": ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    "gemini": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
    "anthropic": ["claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
    "deepseek": ["deepseek-chat", "deepseek-coder"]
}

async def fetch_ollama_models(api_url: str) -> List[str]:
    """
    Deprecated: use fetch_provider_models instead.
    """
    return await fetch_provider_models("ollama", api_url=api_url)

async def fetch_provider_models(
    provider: str,
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    proxy: Optional[str] = None
) -> List[str]:
    """
    Fetches the available models from the provider's API online.
    """
    provider = provider.lower()
    
    if provider == "ollama":
        url = (api_url or "http://127.0.0.1:11434").rstrip("/")
        client_proxy = None if is_local_url(url) else proxy
        async with get_async_client(client_proxy) as client:
            try:
                resp = await client.get(f"{url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    return [model["name"] for model in data.get("models", [])]
            except Exception as e:
                print(f"Error fetching Ollama models: {e}")
        return FALLBACK_MODELS["ollama"]
        
    elif provider == "openai":
        url = (api_url or "https://api.openai.com/v1").rstrip("/")
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        async with get_async_client(proxy) as client:
            try:
                resp = await client.get(f"{url}/models", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    # Return all IDs for custom openai endpoints compatibility
                    return [model["id"] for model in data.get("data", [])]
            except Exception as e:
                print(f"Error fetching OpenAI models: {e}")
        return FALLBACK_MODELS["openai"]
        
    elif provider == "gemini":
        if not api_key:
            return FALLBACK_MODELS["gemini"]
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        async with get_async_client(proxy) as client:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    models = []
                    for m in data.get("models", []):
                        name = m.get("name", "")
                        if name.startswith("models/"):
                            models.append(name.split("models/")[1])
                    return models
            except Exception as e:
                print(f"Error fetching Gemini models: {e}")
        return FALLBACK_MODELS["gemini"]
        
    elif provider == "anthropic":
        if not api_key:
            return FALLBACK_MODELS["anthropic"]
        url = "https://api.anthropic.com/v1/models"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        async with get_async_client(proxy) as client:
            try:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return [m["model_id"] for m in data.get("data", [])]
            except Exception as e:
                print(f"Error fetching Anthropic models: {e}")
        return FALLBACK_MODELS["anthropic"]
        
    elif provider == "deepseek":
        url = (api_url or "https://api.deepseek.com").rstrip("/")
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        async with get_async_client(proxy) as client:
            try:
                # DeepSeek has an OpenAI compatible models endpoint
                resp = await client.get(f"{url}/models", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return [model["id"] for model in data.get("data", [])]
            except Exception as e:
                print(f"Error fetching DeepSeek models: {e}")
        return FALLBACK_MODELS["deepseek"]
        
    return []

async def test_llm_connection(
    provider: str,
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    model: Optional[str] = None,
    proxy: Optional[str] = None
) -> Dict[str, Any]:
    """
    Tests the connection credentials for a given LLM provider.
    """
    provider = provider.lower()
    try:
        if provider == "ollama":
            url = (api_url or "http://127.0.0.1:11434").rstrip("/")
            client_proxy = None if is_local_url(url) else proxy
            async with get_async_client(client_proxy) as client:
                resp = await client.get(f"{url}/api/tags")
                if resp.status_code == 200:
                    return {"success": True, "message": "Ollama connection successful!"}
                raise Exception(f"Ollama returned status code {resp.status_code}: {resp.text}")
                
        elif provider == "openai":
            url = (api_url or "https://api.openai.com/v1").rstrip("/")
            headers = {}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            async with get_async_client(proxy) as client:
                resp = await client.get(f"{url}/models", headers=headers)
                if resp.status_code == 200:
                    return {"success": True, "message": "OpenAI connection successful!"}
                raise Exception(f"OpenAI returned status code {resp.status_code}: {resp.text}")
                
        elif provider == "gemini":
            if not api_key:
                raise Exception("Gemini API key is required.")
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            async with get_async_client(proxy) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return {"success": True, "message": "Gemini connection successful!"}
                raise Exception(f"Gemini returned status code {resp.status_code}: {resp.text}")
                
        elif provider == "anthropic":
            if not api_key:
                raise Exception("Anthropic API key is required.")
            url = "https://api.anthropic.com/v1/models"
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            async with get_async_client(proxy) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return {"success": True, "message": "Anthropic connection successful!"}
                raise Exception(f"Anthropic returned status code {resp.status_code}: {resp.text}")
                
        elif provider == "deepseek":
            url = (api_url or "https://api.deepseek.com").rstrip("/")
            headers = {}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            async with get_async_client(proxy) as client:
                # Try DeepSeek completions test or models list
                resp = await client.get(f"{url}/models", headers=headers)
                if resp.status_code == 200:
                    return {"success": True, "message": "DeepSeek connection successful!"}
                raise Exception(f"DeepSeek returned status code {resp.status_code}: {resp.text}")
                
    except Exception as e:
        return {"success": False, "message": f"Connection test failed: {str(e)}"}
        
    return {"success": False, "message": f"Unknown LLM provider: {provider}"}


async def execute_llm_call(
    messages: List[Dict[str, str]],
    provider: str,
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    model: Optional[str] = None,
    proxy: Optional[str] = None
) -> str:
    """
    Core function that handles standard chat completion for different LLM providers.
    """
    provider = provider.lower()
    
    # 1. Ollama (Local)
    if provider == "ollama":
        url = (api_url or "http://127.0.0.1:11434").rstrip("/") + "/api/chat"
        payload = {
            "model": model or "llama3",
            "messages": messages,
            "stream": False
        }
        # Local host bypasses proxy
        client_proxy = None if is_local_url(url) else proxy
        async with get_async_client(client_proxy) as client:
            try:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    raise Exception(f"Ollama error ({response.status_code}): {response.text}")
                res_data = response.json()
                return res_data.get("message", {}).get("content", "")
            except Exception as e:
                raise Exception(f"Ollama connection failed: {str(e)}")

    # 2. OpenAI / Custom OpenAI endpoint
    elif provider == "openai":
        url = (api_url or "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
        headers = {
            "Content-Type": "application/json"
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        payload = {
            "model": model or "gpt-4o-mini",
            "messages": messages
        }
        async with get_async_client(proxy) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise Exception(f"OpenAI error ({response.status_code}): {response.text}")
                res_data = response.json()
                return res_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            except Exception as e:
                raise Exception(f"OpenAI API failed: {str(e)}")

    # 3. Gemini
    elif provider == "gemini":
        target_model = model or "gemini-1.5-flash"
        # Google API url
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={api_key or ''}"
        
        # Convert messages to Gemini format: roles must be 'user' or 'model'
        gemini_contents = []
        system_instruction = None
        
        for msg in messages:
            role = msg["role"]
            if role == "system":
                system_instruction = {"parts": [{"text": msg["content"]}]}
            else:
                gemini_role = "model" if role == "assistant" else "user"
                gemini_contents.append({
                    "role": gemini_role,
                    "parts": [{"text": msg["content"]}]
                })
        
        payload = {
            "contents": gemini_contents
        }
        if system_instruction:
            payload["systemInstruction"] = system_instruction

        async with get_async_client(proxy) as client:
            try:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    raise Exception(f"Gemini error ({response.status_code}): {response.text}")
                res_data = response.json()
                
                # Extract text response
                candidates = res_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
                raise Exception(f"Invalid Gemini response format: {res_data}")
            except Exception as e:
                raise Exception(f"Gemini API failed: {str(e)}")

    # 4. Anthropic Claude
    elif provider == "anthropic":
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": api_key or "",
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        # Claude expects system prompt separately
        system_prompt = ""
        claude_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            else:
                role = "assistant" if msg["role"] == "assistant" else "user"
                claude_messages.append({
                    "role": role,
                    "content": msg["content"]
                })
                
        payload = {
            "model": model or "claude-3-5-sonnet-20240620",
            "max_tokens": 4096,
            "messages": claude_messages
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        async with get_async_client(proxy) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise Exception(f"Claude error ({response.status_code}): {response.text}")
                res_data = response.json()
                content = res_data.get("content", [])
                if content and content[0].get("type") == "text":
                    return content[0].get("text", "")
                raise Exception(f"Invalid Claude response format: {res_data}")
            except Exception as e:
                raise Exception(f"Claude API failed: {str(e)}")

    # 5. DeepSeek
    elif provider == "deepseek":
        url = "https://api.deepseek.com/chat/completions"
        headers = {
            "Content-Type": "application/json"
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        payload = {
            "model": model or "deepseek-chat",
            "messages": messages
        }
        async with get_async_client(proxy) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise Exception(f"DeepSeek error ({response.status_code}): {response.text}")
                res_data = response.json()
                return res_data.get("choices", [{}])[0].get("message", {}).get("content", "")
            except Exception as e:
                raise Exception(f"DeepSeek API failed: {str(e)}")
                
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")

async def translate_text(
    text: str,
    target_lang: str,
    provider: str,
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    model: Optional[str] = None,
    custom_prompt: Optional[str] = None,
    proxy: Optional[str] = None
) -> str:
    """
    Translates a piece of text to the target language using custom prompt instructions.
    """
    system_instruction = (
        "You are an expert translator. Translate the user's text into the requested target language. "
        "Maintain the original formatting, paragraph breaks, and any code blocks, Markdown elements, or LaTeX mathematical formulas exactly. "
        "Do not include any greeting, introduction, meta-explanation, or summary in your response. "
        "Only output the direct translation."
    )
    
    if custom_prompt:
        system_instruction += f"\nAdditional translation rules to strictly follow: {custom_prompt}"
        
    user_message = f"Translate the following text into {target_lang}:\n\n{text}"
    
    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_message}
    ]
    
    return await execute_llm_call(
        messages=messages,
        provider=provider,
        api_key=api_key,
        api_url=api_url,
        model=model,
        proxy=proxy
    )
