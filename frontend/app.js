// Initialize Lucide Icons
lucide.createIcons();

// Setup PDF.js Global Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// App State
const state = {
    pdfDoc: null,
    currentScale: 1.2,
    currentPage: 1,
    pdfFile: null,
    pdfFilename: "",
    extractedMarkdown: "",
    extractedPages: [],
    translatedMarkdown: "",
    selectedText: "",
    selectionMode: "text", // "text" or "area"
    activeSelectionBox: null,
    attachedContext: "",
    // ── Chat State ──────────────────────────────────────────────
    chatHistory: [],
    chatSessions: [],
    currentSessionId: "new",
    isAgentWorking: false,
    liveSteps: [],
    config: {
        ocrMode: "fallback",
        datalabKey: "",
        llmProvider: "ollama",
        llmUrl: "http://127.0.0.1:11434",
        llmKey: "",
        llmModel: "",
        customPrompt: "",
        proxyEnabled: false,
        proxyUrl: "127.0.0.1:1080"
    }
};

// Default models for non-Ollama providers
const providerModels = {
    openai: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"],
    gemini: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
    anthropic: ["claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "claude-3-opus-20240229"],
    deepseek: ["deepseek-chat", "deepseek-coder"]
};

// DOM Elements
const elements = {
    btnHelp: document.getElementById("btn-help"),
    helpModal: document.getElementById("help-modal"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    
    ocrStatusBadge: document.getElementById("ocr-status"),
    llmStatusBadge: document.getElementById("llm-status"),
    
    dropzone: document.getElementById("dropzone"),
    pdfFileInput: document.getElementById("pdf-file-input"),
    pdfContainer: document.getElementById("pdf-container"),
    pdfRenderArea: document.getElementById("pdf-render-area"),
    pdfControls: document.getElementById("pdf-controls"),
    
    zoomIn: document.getElementById("zoom-in"),
    zoomOut: document.getElementById("zoom-out"),
    zoomValue: document.getElementById("zoom-value"),
    prevPage: document.getElementById("prev-page"),
    nextPage: document.getElementById("next-page"),
    pageNumDisplay: document.getElementById("page-num-display"),
    btnClosePdf: document.getElementById("btn-close-pdf"),
    btnSelectText: document.getElementById("btn-select-text"),
    btnSelectArea: document.getElementById("btn-select-area"),
    
    tabs: document.querySelectorAll(".tab-btn"),
    tabContents: document.querySelectorAll(".tab-content"),
    
    targetLangSelect: document.getElementById("target-lang-select"),
    btnRunOcr: document.getElementById("btn-run-ocr"),
    btnTranslateDoc: document.getElementById("btn-translate-doc"),
    
    ocrProgressContainer: document.getElementById("ocr-progress-container"),
    progressStatusText: document.getElementById("progress-status-text"),
    progressBarFill: document.getElementById("progress-bar-fill"),
    progressPct: document.getElementById("progress-pct"),
    
    txtDetected: document.getElementById("txt-detected"),
    txtTranslated: document.getElementById("txt-translated"),
    
    btnCopyOcr: document.getElementById("btn-copy-ocr"),
    btnCopyTranslated: document.getElementById("btn-copy-translated"),
    
    
    ocrModeInputs: document.getElementsByName("ocr-mode"),
    groupDatalabKey: document.getElementById("group-datalab-key"),
    datalabApiKey: document.getElementById("datalab-api-key"),
    
    llmProvider: document.getElementById("llm-provider"),
    groupLlmUrl: document.getElementById("group-llm-url"),
    llmApiUrl: document.getElementById("llm-api-url"),
    groupLlmKey: document.getElementById("group-llm-key"),
    llmApiKey: document.getElementById("llm-api-key"),
    llmModelSelect: document.getElementById("llm-model-select"),
    llmModelCustom: document.getElementById("llm-model-custom"),
    btnRefreshModels: document.getElementById("btn-refresh-models"),
    customInstructions: document.getElementById("custom-instructions"),
    
    enableProxy: document.getElementById("enable-proxy"),
    groupProxyConfig: document.getElementById("group-proxy-config"),
    proxyUrl: document.getElementById("proxy-url"),
    
    selectionTooltip: document.getElementById("selection-tooltip"),
    btnTooltipTranslate: document.getElementById("btn-tooltip-translate"),
    btnTooltipChat: document.getElementById("btn-tooltip-chat"),

    // New Downloader & Tester Elements
    localInstallerCard: document.getElementById("local-installer-card"),
    instStatusLabel: document.getElementById("inst-status-label"),
    instProgressBar: document.getElementById("inst-progress-bar"),
    instFileName: document.getElementById("inst-file-name"),
    instPctSpeed: document.getElementById("inst-pct-speed"),
    btnInstStart: document.getElementById("btn-inst-start"),
    btnInstPause: document.getElementById("btn-inst-pause"),
    btnInstCancel: document.getElementById("btn-inst-cancel"),
    btnTestConnection: document.getElementById("btn-test-connection"),
    connectionTestResult: document.getElementById("connection-test-result"),

    // Custom Provider Elements
    btnAddCustomProvider: document.getElementById("btn-add-custom-provider"),
    btnDeleteCustomProvider: document.getElementById("btn-delete-custom-provider"),
    customProviderModal: document.getElementById("custom-provider-modal"),
    btnCloseCustomProviderModal: document.getElementById("btn-close-custom-provider-modal"),
    btnCancelCustomProvider: document.getElementById("btn-cancel-custom-provider"),
    btnSaveCustomProvider: document.getElementById("btn-save-custom-provider"),
    customProviderName: document.getElementById("custom-provider-name"),
    customProviderUrl: document.getElementById("custom-provider-url"),

    // Translation Progress & Rate Limit Elements
    translationProgressContainer: document.getElementById("translation-progress-container"),
    transProgressStatusText: document.getElementById("trans-progress-status-text"),
    transProgressBarFill: document.getElementById("trans-progress-bar-fill"),
    transProgressPct: document.getElementById("trans-progress-pct"),
    btnCancelTranslation: document.getElementById("btn-cancel-translation"),
    translationChunkSize: document.getElementById("translation-chunk-size"),
    translationDelay: document.getElementById("translation-delay"),

    // Saved Chat Elements (legacy hidden select kept for compatibility)
    chatSessionsSelect: document.getElementById("chat-sessions-select"),
    btnClearChat: document.getElementById("btn-clear-chat"),
    // ── New Chat UI Elements ──────────────────────────────────────
    chatBox: document.getElementById("chat-box"),
    chatInput: document.getElementById("chat-input"),
    btnSendChat: document.getElementById("btn-send-chat"),
    chatContextBanner: document.getElementById("chat-context-banner"),
    btnClearContext: document.getElementById("btn-clear-context"),
    btnNewChatHeader: document.getElementById("btn-new-chat-header"),
    btnExportChat: document.getElementById("btn-export-chat"),
    btnToggleHistory: document.getElementById("btn-toggle-history"),
    historyDrawer: document.getElementById("history-drawer"),
    historySessionList: document.getElementById("history-session-list"),
    btnNewChatDrawer: document.getElementById("btn-new-chat-drawer"),
    chatActiveTitle: document.getElementById("chat-active-title"),
    agentStepsLive: document.getElementById("agent-steps-live"),
    stepsSpinner: document.getElementById("steps-spinner"),
    stepsLabel: document.getElementById("steps-label"),
    stepsList: document.getElementById("steps-list"),
    stepsHeaderToggle: document.getElementById("steps-header-toggle"),
    panelResizeHandle: document.getElementById("panel-resize-handle"),
    panelPdf: document.getElementById("panel-pdf"),
    panelControls: document.getElementById("panel-controls"),
    appLayout: document.getElementById("app-layout")
};

// Load saved configuration from LocalStorage
function loadConfig() {
    // Read custom providers list
    state.customProviders = JSON.parse(localStorage.getItem("lingo_pdf_custom_providers") || "[]");
    
    // Re-populate provider dropdown options
    repopulateProviderDropdown();
    
    // Read saved chat sessions (v2 key — unlimited)
    state.chatSessions = JSON.parse(localStorage.getItem("lingo_pdf_chat_sessions_v2") || "[]");
    state.currentSessionId = "new";
    state.chatHistory = [];
    setTimeout(() => {
        initChatUI();
    }, 100);
    
    const saved = localStorage.getItem("lingo_pdf_config");
    if (saved) {
        try {
            state.config = { ...state.config, ...JSON.parse(saved) };
        } catch (e) {
            console.error("Error loading config", e);
        }
    }
    
    // Bind config values to UI elements
    elements.ocrModeInputs.forEach(radio => {
        if (radio.value === state.config.ocrMode) {
            radio.checked = true;
        }
    });
    toggleOcrFields(state.config.ocrMode);
    
    elements.datalabApiKey.value = state.config.datalabKey;
    elements.llmProvider.value = state.config.llmProvider;
    elements.llmApiUrl.value = state.config.llmUrl;
    elements.llmApiKey.value = state.config.llmKey;
    elements.customInstructions.value = state.config.customPrompt;
    
    // Load chunking & rate limit configuration defaults
    elements.translationChunkSize.value = state.config.chunkSize || 100000;
    elements.translationDelay.value = state.config.requestDelay || 1.0;
    
    elements.enableProxy.checked = state.config.proxyEnabled;
    elements.proxyUrl.value = state.config.proxyUrl;
    toggleProxyFields(state.config.proxyEnabled);
    
    toggleLlmFields(state.config.llmProvider);
    updateModelsDropdown();
}

// Save current configuration to LocalStorage
function saveConfig() {
    state.config.ocrMode = document.querySelector('input[name="ocr-mode"]:checked').value;
    state.config.datalabKey = elements.datalabApiKey.value;
    state.config.llmProvider = elements.llmProvider.value;
    state.config.llmUrl = elements.llmApiUrl.value;
    state.config.llmKey = elements.llmApiKey.value;
    state.config.customPrompt = elements.customInstructions.value;
    
    state.config.chunkSize = parseInt(elements.translationChunkSize.value) || 100000;
    state.config.requestDelay = parseFloat(elements.translationDelay.value) || 1.0;
    
    state.config.proxyEnabled = elements.enableProxy.checked;
    state.config.proxyUrl = elements.proxyUrl.value;
    
    // Save model
    if (elements.llmModelSelect.value === "custom") {
        state.config.llmModel = elements.llmModelCustom.value;
    } else {
        state.config.llmModel = elements.llmModelSelect.value;
    }
    
    localStorage.setItem("lingo_pdf_config", JSON.stringify(state.config));
    updateStatusIndicators();
}

// Update backend connection statuses in the header
function updateStatusIndicators() {
    const ocrMode = state.config.ocrMode;
    const modeName = ocrMode === "fallback" ? "PyMuPDF" : ocrMode === "datalab" ? "Datalab" : ocrMode === "local" ? "Marker (Local)" : "Unlimited-OCR (Baidu)";
    elements.ocrStatusBadge.innerHTML = `<span class="status-dot"></span> OCR Backend: ${modeName}`;
    elements.ocrStatusBadge.className = "status-badge connected";
    
    // LLM connection check
    if (state.config.llmProvider === "ollama") {
        elements.llmStatusBadge.innerHTML = `<span class="status-dot"></span> LLM API: Checking...`;
        elements.llmStatusBadge.className = "status-badge";
        
        fetch("/api/ollama/models?api_url=" + encodeURIComponent(state.config.llmUrl))
            .then(res => res.json())
            .then(data => {
                if (data.models && data.models.length > 0) {
                    elements.llmStatusBadge.innerHTML = `<span class="status-dot"></span> LLM API: Connected`;
                    elements.llmStatusBadge.className = "status-badge connected";
                } else {
                    elements.llmStatusBadge.innerHTML = `<span class="status-dot"></span> LLM API: Offline`;
                    elements.llmStatusBadge.className = "status-badge btn-danger";
                }
            })
            .catch(() => {
                elements.llmStatusBadge.innerHTML = `<span class="status-dot"></span> LLM API: Offline`;
                elements.llmStatusBadge.className = "status-badge btn-danger";
            });
    } else {
        // For cloud providers, assume ready if API key is provided
        const hasKey = !!state.config.llmKey;
        elements.llmStatusBadge.innerHTML = `<span class="status-dot"></span> LLM API: ${hasKey ? "Configured" : "Needs Key"}`;
        elements.llmStatusBadge.className = hasKey ? "status-badge connected" : "status-badge btn-danger";
    }
}

// UI Toggles based on selections
function toggleOcrFields(mode) {
    if (mode === "datalab") {
        elements.groupDatalabKey.style.display = "flex";
        elements.localInstallerCard.style.display = "none";
    } else if (mode === "local" || mode === "unlimited-ocr") {
        elements.groupDatalabKey.style.display = "none";
        elements.localInstallerCard.style.display = "flex";
        checkInstallerStatus(); // Fetch status immediately
    } else {
        elements.groupDatalabKey.style.display = "none";
        elements.localInstallerCard.style.display = "none";
    }
}

function toggleProxyFields(enabled) {
    if (enabled) {
        elements.groupProxyConfig.style.display = "flex";
    } else {
        elements.groupProxyConfig.style.display = "none";
    }
}

function toggleLlmFields(provider) {
    if (provider === "ollama") {
        elements.groupLlmUrl.style.display = "flex";
        elements.groupLlmKey.style.display = "none";
        elements.btnRefreshModels.style.display = "flex";
        elements.btnDeleteCustomProvider.style.display = "none";
    } else if (provider.startsWith("custom-")) {
        elements.groupLlmUrl.style.display = "flex";
        elements.groupLlmKey.style.display = "flex";
        elements.btnRefreshModels.style.display = "flex";
        elements.btnDeleteCustomProvider.style.display = "flex";
    } else {
        elements.groupLlmUrl.style.display = "none";
        elements.groupLlmKey.style.display = "flex";
        elements.btnRefreshModels.style.display = "none";
        elements.btnDeleteCustomProvider.style.display = "none";
    }
}

// Update LLM model select options
async function updateModelsDropdown() {
    const provider = state.config.llmProvider;
    elements.llmModelSelect.innerHTML = "";
    
    // Loading option
    const loadingOpt = document.createElement("option");
    loadingOpt.text = "Loading models online...";
    loadingOpt.value = "";
    elements.llmModelSelect.add(loadingOpt);
    
    const apiProvider = provider.startsWith("custom-") ? "openai" : provider;
    const queryParams = new URLSearchParams({
        provider: apiProvider,
        api_key: state.config.llmKey,
        api_url: state.config.llmUrl,
        proxy: state.config.proxyEnabled ? state.config.proxyUrl : ""
    });
    
    try {
        const res = await fetch("/api/llm/models?" + queryParams.toString());
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        
        elements.llmModelSelect.innerHTML = "";
        
        if (data.models && data.models.length > 0) {
            let modelList = data.models;
            if (provider === "openai") {
                // Filter out non-main models to avoid cluttering
                modelList = data.models.filter(m => m.includes("gpt") || m.includes("o1") || m.includes("davinci") || m.includes("curie"));
                if (modelList.length === 0) modelList = data.models;
            }
            
            modelList.forEach(model => {
                const opt = document.createElement("option");
                opt.value = model;
                opt.text = model;
                elements.llmModelSelect.add(opt);
            });
            
            // Add custom option
            const customOpt = document.createElement("option");
            customOpt.value = "custom";
            customOpt.text = "Custom Model...";
            elements.llmModelSelect.add(customOpt);
            
            // Set selected
            if (modelList.includes(state.config.llmModel)) {
                elements.llmModelSelect.value = state.config.llmModel;
                elements.llmModelCustom.style.display = "none";
            } else if (state.config.llmModel) {
                elements.llmModelSelect.value = "custom";
                elements.llmModelCustom.value = state.config.llmModel;
                elements.llmModelCustom.style.display = "block";
            }
            saveConfig();
        } else {
            throw new Error("Empty list");
        }
    } catch (err) {
        // Fallback to hardcoded defaults
        elements.llmModelSelect.innerHTML = "";
        const models = providerModels[provider] || ["gpt-4o-mini", "llama3"];
        models.forEach(model => {
            const opt = document.createElement("option");
            opt.value = model;
            opt.text = model;
            elements.llmModelSelect.add(opt);
        });
        
        const customOpt = document.createElement("option");
        customOpt.value = "custom";
        customOpt.text = "Custom Model...";
        elements.llmModelSelect.add(customOpt);
        
        if (models.includes(state.config.llmModel)) {
            elements.llmModelSelect.value = state.config.llmModel;
        } else if (state.config.llmModel) {
            elements.llmModelSelect.value = "custom";
            elements.llmModelCustom.value = state.config.llmModel;
            elements.llmModelCustom.style.display = "block";
        }
        saveConfig();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Tabs Navigation
    elements.tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            elements.tabs.forEach(t => t.classList.remove("active"));
            elements.tabContents.forEach(c => c.classList.remove("active"));
            
            tab.classList.add("active");
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    // Configuration Inputs
    elements.ocrModeInputs.forEach(radio => {
        radio.addEventListener("change", (e) => {
            toggleOcrFields(e.target.value);
            saveConfig();
        });
    });
    
    elements.datalabApiKey.addEventListener("input", saveConfig);
    elements.llmProvider.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val.startsWith("custom-")) {
            const provider = state.customProviders.find(p => p.id === val);
            if (provider) {
                elements.llmApiUrl.value = provider.url;
            }
        } else if (val === "ollama") {
            elements.llmApiUrl.value = "http://127.0.0.1:11434";
        }
        toggleLlmFields(val);
        saveConfig();
        updateModelsDropdown();
    });
    elements.llmApiUrl.addEventListener("change", () => {
        const val = elements.llmProvider.value;
        if (val.startsWith("custom-")) {
            const provider = state.customProviders.find(p => p.id === val);
            if (provider) {
                provider.url = elements.llmApiUrl.value;
                localStorage.setItem("lingo_pdf_custom_providers", JSON.stringify(state.customProviders));
            }
        }
        saveConfig();
        updateModelsDropdown();
    });
    elements.llmApiKey.addEventListener("input", saveConfig);
    elements.customInstructions.addEventListener("input", saveConfig);
    
    elements.llmModelSelect.addEventListener("change", (e) => {
        if (e.target.value === "custom") {
            elements.llmModelCustom.style.display = "block";
        } else {
            elements.llmModelCustom.style.display = "none";
        }
        saveConfig();
    });
    elements.llmModelCustom.addEventListener("input", saveConfig);
    
    elements.enableProxy.addEventListener("change", (e) => {
        toggleProxyFields(e.target.checked);
        saveConfig();
    });
    elements.proxyUrl.addEventListener("input", saveConfig);
    
    // Chunking and Delay listeners
    elements.translationChunkSize.addEventListener("input", saveConfig);
    elements.translationDelay.addEventListener("input", saveConfig);
    elements.btnCancelTranslation.addEventListener("click", () => {
        cancelTranslationFlag = true;
        elements.transProgressStatusText.innerText = "Cancelling translation...";
    });
    
    elements.btnRefreshModels.addEventListener("click", updateModelsDropdown);
    
    // Connection tester and model installer actions
    elements.btnTestConnection.addEventListener("click", testConnection);
    elements.btnInstStart.addEventListener("click", startInstaller);
    elements.btnInstPause.addEventListener("click", pauseInstaller);
    elements.btnInstCancel.addEventListener("click", cancelInstaller);
    
    // Custom Provider actions
    elements.btnAddCustomProvider.addEventListener("click", () => {
        elements.customProviderName.value = "";
        elements.customProviderUrl.value = "";
        elements.customProviderModal.style.display = "flex";
    });
    
    elements.btnCloseCustomProviderModal.addEventListener("click", () => {
        elements.customProviderModal.style.display = "none";
    });
    
    elements.btnCancelCustomProvider.addEventListener("click", () => {
        elements.customProviderModal.style.display = "none";
    });
    
    elements.btnSaveCustomProvider.addEventListener("click", () => {
        const name = elements.customProviderName.value.trim();
        const url = elements.customProviderUrl.value.trim();
        
        if (!name || !url) {
            alert("Please fill in both Provider Name and API Base URL.");
            return;
        }
        
        const newProvider = {
            id: "custom-" + Date.now(),
            name: name,
            url: url
        };
        
        state.customProviders.push(newProvider);
        localStorage.setItem("lingo_pdf_custom_providers", JSON.stringify(state.customProviders));
        
        repopulateProviderDropdown();
        elements.llmProvider.value = newProvider.id;
        elements.llmApiUrl.value = newProvider.url;
        
        elements.customProviderModal.style.display = "none";
        
        toggleLlmFields(newProvider.id);
        saveConfig();
        updateModelsDropdown();
    });
    
    elements.btnDeleteCustomProvider.addEventListener("click", () => {
        const val = elements.llmProvider.value;
        if (!val.startsWith("custom-")) return;
        
        if (!confirm("Are you sure you want to delete this custom LLM provider?")) {
            return;
        }
        
        state.customProviders = state.customProviders.filter(p => p.id !== val);
        localStorage.setItem("lingo_pdf_custom_providers", JSON.stringify(state.customProviders));
        
        repopulateProviderDropdown();
        elements.llmProvider.value = "openai";
        elements.llmApiUrl.value = "";
        
        toggleLlmFields("openai");
        saveConfig();
        updateModelsDropdown();
    });
    
    // Help modal toggle
    elements.btnHelp.addEventListener("click", () => {
        elements.helpModal.style.display = "flex";
    });
    elements.btnCloseModal.addEventListener("click", () => {
        elements.helpModal.style.display = "none";
    });
    window.addEventListener("click", (e) => {
        if (e.target === elements.helpModal) {
            elements.helpModal.style.display = "none";
        }
    });
    
    // Help Modal Tab switching
    const modalTabBtns = document.querySelectorAll(".modal-tab-btn");
    const modalTabContents = document.querySelectorAll(".modal-tab-content");
    modalTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            modalTabBtns.forEach(b => b.classList.remove("active"));
            modalTabContents.forEach(c => c.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(btn.dataset.modaltab).classList.add("active");
        });
    });

    // File selection / drag and drop
    elements.dropzone.addEventListener("click", () => {
        elements.pdfFileInput.click();
    });
    elements.pdfFileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handlePdfFile(e.target.files[0]);
        }
    });
    
    elements.dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        elements.dropzone.classList.add("dragover");
    });
    elements.dropzone.addEventListener("dragleave", () => {
        elements.dropzone.classList.remove("dragover");
    });
    elements.dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        elements.dropzone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            handlePdfFile(e.dataTransfer.files[0]);
        }
    });

    // Zooming PDF
    elements.zoomIn.addEventListener("click", () => {
        if (state.currentScale < 3.0) {
            state.currentScale += 0.2;
            elements.zoomValue.innerText = Math.round(state.currentScale * 100) + "%";
            renderPdfDoc();
        }
    });
    elements.zoomOut.addEventListener("click", () => {
        if (state.currentScale > 0.6) {
            state.currentScale -= 0.2;
            elements.zoomValue.innerText = Math.round(state.currentScale * 100) + "%";
            renderPdfDoc();
        }
    });

    // Page Navigation
    elements.prevPage.addEventListener("click", () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            scrollToPage(state.currentPage);
        }
    });
    elements.nextPage.addEventListener("click", () => {
        if (state.pdfDoc && state.currentPage < state.pdfDoc.numPages) {
            state.currentPage++;
            scrollToPage(state.currentPage);
        }
    });

    // Close PDF File
    elements.btnClosePdf.addEventListener("click", () => {
        state.pdfDoc = null;
        state.pdfFile = null;
        state.pdfFilename = "";
        state.extractedMarkdown = "";
        state.extractedPages = [];
        clearActiveSelectionBox();
        elements.pdfRenderArea.style.display = "none";
        elements.pdfControls.style.display = "none";
        elements.dropzone.style.display = "flex";
        elements.btnRunOcr.disabled = false;
        elements.btnTranslateDoc.disabled = true;
        elements.txtDetected.value = "";
        elements.txtTranslated.value = "";
        elements.selectedText = "";
        hideSelectionTooltip();
    });

    // Select Mode Toggle Logic
    elements.btnSelectText.addEventListener("click", () => {
        state.selectionMode = "text";
        elements.btnSelectText.classList.add("active");
        elements.btnSelectArea.classList.remove("active");
        elements.pdfRenderArea.classList.remove("area-select-active");
        clearActiveSelectionBox();
    });
    
    elements.btnSelectArea.addEventListener("click", () => {
        state.selectionMode = "area";
        elements.btnSelectArea.classList.add("active");
        elements.btnSelectText.classList.remove("active");
        elements.pdfRenderArea.classList.add("area-select-active");
        
        // Clear standard browser text selection
        window.getSelection().removeAllRanges();
        hideSelectionTooltip();
    });

    // Area Selection Mode mouse listeners
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let activeBox = null;
    let activePageContainer = null;

    elements.pdfRenderArea.addEventListener("mousedown", (e) => {
        if (state.selectionMode !== "area") return;
        
        // Find which pdf-page-container the click occurred in
        activePageContainer = e.target.closest(".pdf-page-container");
        if (!activePageContainer) return;
        
        isDrawing = true;
        clearActiveSelectionBox();
        hideSelectionTooltip();
        
        // Coordinates relative to the page container
        const rect = activePageContainer.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        
        activeBox = document.createElement("div");
        activeBox.className = "active-selection-box";
        activeBox.style.left = startX + "px";
        activeBox.style.top = startY + "px";
        activeBox.style.width = "0px";
        activeBox.style.height = "0px";
        
        activePageContainer.appendChild(activeBox);
        state.activeSelectionBox = activeBox;
    });

    elements.pdfRenderArea.addEventListener("mousemove", (e) => {
        if (!isDrawing || !activeBox || !activePageContainer) return;
        
        const rect = activePageContainer.getBoundingClientRect();
        const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);
        const w = Math.abs(currentX - startX);
        const h = Math.abs(currentY - startY);
        
        activeBox.style.left = x + "px";
        activeBox.style.top = y + "px";
        activeBox.style.width = w + "px";
        activeBox.style.height = h + "px";
    });

    window.addEventListener("mouseup", (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        
        if (!activeBox || !activePageContainer) return;
        
        const boxRect = activeBox.getBoundingClientRect();
        
        // If it is a tiny drag/click, dismiss selection
        if (boxRect.width < 6 && boxRect.height < 6) {
            clearActiveSelectionBox();
            return;
        }
        
        // Determine page number
        const pageContainers = Array.from(elements.pdfRenderArea.querySelectorAll(".pdf-page-container"));
        const pageIndex = pageContainers.indexOf(activePageContainer);
        const pageNum = pageIndex + 1;
        
        // Extract text inside the selection box bounds
        const text = getTextInRect(activePageContainer, boxRect);
        if (text) {
            state.selectedText = text;
            
            // Position floating selection tooltip above the selection box
            elements.selectionTooltip.style.left = `${boxRect.left + window.scrollX + (boxRect.width/2) - 100}px`;
            elements.selectionTooltip.style.top = `${Math.max(10, boxRect.top + window.scrollY - 45)}px`;
            elements.selectionTooltip.style.display = "flex";
        } else {
            clearActiveSelectionBox();
            hideSelectionTooltip();
        }
    });

    // PDF Pages Selection listeners
    elements.pdfRenderArea.addEventListener("mouseup", handleTextSelection);
    elements.pdfRenderArea.addEventListener("touchend", handleTextSelection);
    
    // Floating tooltip actions
    elements.btnTooltipTranslate.addEventListener("click", translateSelectedText);
    elements.btnTooltipChat.addEventListener("click", sendSelectionToChat);
    
    // Global mouse clicks to dismiss selection tooltip immediately on mousedown
    document.addEventListener("mousedown", (e) => {
        if (!elements.selectionTooltip.contains(e.target)) {
            hideSelectionTooltip();
            if (state.selectionMode !== "area" && !e.target.closest("#pdf-controls")) {
                clearActiveSelectionBox();
            }
        }
    });

    // Dismiss selection tooltip when scrolling the PDF area
    elements.pdfRenderArea.addEventListener("scroll", hideSelectionTooltip);

    // Copy actions
    elements.btnCopyOcr.addEventListener("click", () => {
        copyToClipboard(elements.txtDetected.value, "Extracted layout text copied!");
    });
    elements.btnCopyTranslated.addEventListener("click", () => {
        copyToClipboard(elements.txtTranslated.value, "Translated text copied!");
    });

    // Run OCR button
    elements.btnRunOcr.addEventListener("click", runLayoutExtraction);
    
    // Full translate button
    elements.btnTranslateDoc.addEventListener("click", translateDocument);


    // ── New Chat UI event listeners ─────────────────────────────────
    if (elements.btnNewChatHeader) elements.btnNewChatHeader.addEventListener("click", startNewSession);
    if (elements.btnNewChatDrawer) elements.btnNewChatDrawer.addEventListener("click", startNewSession);
    if (elements.btnExportChat) elements.btnExportChat.addEventListener("click", exportChatToMarkdown);
    if (elements.btnToggleHistory) elements.btnToggleHistory.addEventListener("click", toggleHistoryDrawer);
    if (elements.stepsHeaderToggle) elements.stepsHeaderToggle.addEventListener("click", toggleStepsCollapse);

    // Context banner clear
    if (elements.btnClearContext) elements.btnClearContext.addEventListener("click", () => {
        state.attachedContext = "";
        if (elements.chatContextBanner) elements.chatContextBanner.style.display = "none";
    });

    // Drag-Resize panel
    initPanelResize();

    // Auto-grow textarea + Enter/Shift+Enter
    if (elements.chatInput) {
        elements.chatInput.addEventListener("input", autoGrowTextarea);
        elements.chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
        // Restore draft from localStorage
        const draft = localStorage.getItem(`chat_draft_${state.currentSessionId}`);
        if (draft) elements.chatInput.value = draft;
        elements.chatInput.addEventListener("input", () => {
            localStorage.setItem(`chat_draft_${state.currentSessionId}`, elements.chatInput.value);
            autoGrowTextarea();
        });
    }

    if (elements.btnSendChat) elements.btnSendChat.addEventListener("click", sendChatMessage);
}

// Clipboard Helper
function copyToClipboard(text, message) {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text).then(() => {
        alert(message);
    }).catch(err => {
        console.error("Could not copy text: ", err);
    });
}

// PDF Document Loading & Parsing
function handlePdfFile(file) {
    if (file.type !== "application/pdf") {
        alert("Please upload a valid PDF document.");
        return;
    }
    
    state.pdfFile = file;
    state.pdfFilename = file.name;
    state.extractedMarkdown = "";
    state.extractedPages = [];
    state.translatedMarkdown = "";
    clearActiveSelectionBox();
    elements.dropzone.style.display = "none";
    elements.pdfRenderArea.innerHTML = "<div class='loading-spinner'>Loading PDF Pages...</div>";
    elements.pdfRenderArea.style.display = "flex";
    elements.pdfControls.style.display = "flex";
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const typedarray = new Uint8Array(e.target.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            state.pdfDoc = pdf;
            state.currentPage = 1;
            elements.pageNumDisplay.innerText = `Page 1 / ${pdf.numPages}`;
            renderPdfDoc();
        }).catch(err => {
            alert("Error loading PDF: " + err.message);
            elements.btnClosePdf.click();
        });
    };
    reader.readAsArrayBuffer(file);
}

// Render PDF Page Canvas + Text Layer overlay
async function renderPdfDoc() {
    if (!state.pdfDoc) return;
    
    elements.pdfRenderArea.innerHTML = "";
    
    // Render first 5 pages for preview scrolling (or all if short PDF)
    const renderLimit = Math.min(state.pdfDoc.numPages, 10);
    
    for (let pageNo = 1; pageNo <= renderLimit; pageNo++) {
        const pageContainer = document.createElement("div");
        pageContainer.className = "pdf-page-container";
        elements.pdfRenderArea.appendChild(pageContainer);
        
        try {
            const page = await state.pdfDoc.getPage(pageNo);
            const viewport = page.getViewport({ scale: state.currentScale });
            
            pageContainer.style.width = viewport.width + "px";
            pageContainer.style.height = viewport.height + "px";
            
            // Canvas element
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = viewport.width + "px";
            canvas.style.height = viewport.height + "px";
            pageContainer.appendChild(canvas);
            
            const context = canvas.getContext("2d");
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            // Text layer element (transparent overlay for text selection)
            const textLayerDiv = document.createElement("div");
            textLayerDiv.className = "textLayer";
            textLayerDiv.style.width = viewport.width + "px";
            textLayerDiv.style.height = viewport.height + "px";
            textLayerDiv.style.setProperty("--scale-factor", viewport.scale); // Fix PDF.js text layer warning
            pageContainer.appendChild(textLayerDiv);
            
            const textContent = await page.getTextContent();
            await pdfjsLib.renderTextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            }).promise;
            
            // Inject layout-extracted OCR text layer overlay if available
            applyOcrOverlayForPage(pageNo, textLayerDiv);
            
        } catch (err) {
            console.error(`Error rendering page ${pageNo}:`, err);
            const errorDiv = document.createElement("div");
            errorDiv.className = "page-render-error";
            errorDiv.innerText = `Failed to render page ${pageNo}`;
            pageContainer.appendChild(errorDiv);
        }
    }
    
    if (state.pdfDoc.numPages > 10) {
        const noticeDiv = document.createElement("div");
        noticeDiv.className = "pdf-limit-notice";
        noticeDiv.innerHTML = `<p style="padding: 10px; color: var(--color-text-muted); font-size:12px;">Only displaying first 10 pages in viewer. Full file will be parsed during extraction.</p>`;
        elements.pdfRenderArea.appendChild(noticeDiv);
    }
}

// Text Selection Handlers
function handleTextSelection(e) {
    if (state.selectionMode === "area") return;
    
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedStr = selection.toString().trim();
        
        if (selectedStr) {
            state.selectedText = selectedStr;
            
            // Calculate coordinates of the selected text
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Position floating tooltip above selection
            elements.selectionTooltip.style.left = `${rect.left + window.scrollX + (rect.width/2) - 100}px`;
            elements.selectionTooltip.style.top = `${Math.max(10, rect.top + window.scrollY - 45)}px`;
            elements.selectionTooltip.style.display = "flex";
        } else {
            hideSelectionTooltip();
        }
    }, 100);
}

function hideSelectionTooltip() {
    elements.selectionTooltip.style.display = "none";
}

// Helper to parse markdown string into page-by-page objects if pages array is not present in API response
function parseMarkdownIntoPages(markdown) {
    if (!markdown) return [];
    const pages = [];
    
    // Try splitting by ## Page X (standard format for fallback)
    const pageRegex = /## Page (\d+)\n+/gi;
    let match;
    const pagePositions = [];
    
    while ((match = pageRegex.exec(markdown)) !== null) {
        pagePositions.push({
            page: parseInt(match[1], 10),
            index: match.index,
            headerLength: match[0].length
        });
    }
    
    if (pagePositions.length > 0) {
        for (let i = 0; i < pagePositions.length; i++) {
            const start = pagePositions[i].index + pagePositions[i].headerLength;
            const end = (i + 1 < pagePositions.length) ? pagePositions[i + 1].index : markdown.length;
            pages.push({
                page: pagePositions[i].page,
                text: markdown.slice(start, end).trim()
            });
        }
    } else {
        // If no ## Page matches, check for standard Marker/Markdown page breaks (---)
        let parts = [];
        if (markdown.includes("\n\n---\n\n")) {
            parts = markdown.split("\n\n---\n\n");
        } else if (markdown.includes("\n---\n")) {
            parts = markdown.split("\n---\n");
        }
        
        if (parts.length > 0) {
            parts.forEach((text, index) => {
                pages.push({
                    page: index + 1,
                    text: text.trim()
                });
            });
        } else {
            // Fallback to putting all text on page 1
            pages.push({
                page: 1,
                text: markdown.trim()
            });
        }
    }
    return pages;
}

// OCR Text Overlay Handlers (Transparent selection overlay for scanned pages / pictures)
function applyOcrOverlayForPage(pageNum, textLayerDiv) {
    // If pages is empty, try to parse from the markdown
    if ((!state.extractedPages || state.extractedPages.length === 0) && state.extractedMarkdown) {
        state.extractedPages = parseMarkdownIntoPages(state.extractedMarkdown);
    }
    
    if (!state.extractedPages || state.extractedPages.length === 0) return;
    
    // Check if page already has significant native selectable text.
    // If it does, we skip adding the OCR overlay to avoid double selection/conflicts.
    const nativeSpans = textLayerDiv.querySelectorAll("span:not(.ocr-text-overlay-line)");
    let nativeTextLength = 0;
    nativeSpans.forEach(span => {
        nativeTextLength += span.textContent.trim().length;
    });
    
    if (nativeTextLength > 50) {
        console.log(`Page ${pageNum} already has native text (${nativeTextLength} chars). Skipping OCR overlay.`);
        return;
    }

    const pageData = state.extractedPages.find(p => p.page === pageNum);
    if (!pageData || !pageData.text) return;
    
    let ocrOverlay = textLayerDiv.querySelector(".ocr-text-overlay");
    if (!ocrOverlay) {
        ocrOverlay = document.createElement("div");
        ocrOverlay.className = "ocr-text-overlay";
        textLayerDiv.appendChild(ocrOverlay);
    }
    
    // Split text by lines and clean them up
    const lines = pageData.text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    ocrOverlay.innerHTML = "";
    
    // Distribute lines vertically across the page to match coordinate coordinates for selection box
    const L = lines.length;
    lines.forEach((line, i) => {
        const lineSpan = document.createElement("span");
        lineSpan.className = "ocr-text-overlay-line";
        lineSpan.textContent = line;
        
        // Distribute lines proportionally
        lineSpan.style.position = "absolute";
        lineSpan.style.left = "5%";
        lineSpan.style.width = "90%";
        lineSpan.style.top = ((i / L) * 100) + "%";
        lineSpan.style.height = (100 / L) + "%";
        lineSpan.style.display = "flex";
        lineSpan.style.alignItems = "center";
        
        ocrOverlay.appendChild(lineSpan);
    });
}

function applyOcrTextOverlays() {
    if (!state.extractedPages || state.extractedPages.length === 0) return;
    
    const containers = elements.pdfRenderArea.querySelectorAll(".pdf-page-container");
    containers.forEach((container, index) => {
        const pageNum = index + 1;
        const textLayer = container.querySelector(".textLayer");
        if (textLayer) {
            applyOcrOverlayForPage(pageNum, textLayer);
        }
    });
}

// Clear currently drawn selection box
function clearActiveSelectionBox() {
    if (state.activeSelectionBox) {
        try {
            state.activeSelectionBox.remove();
        } catch(e) {}
        state.activeSelectionBox = null;
    }
}

// Extract text within coordinates
function getTextInRect(pageContainer, selectRect) {
    const textLayer = pageContainer.querySelector(".textLayer");
    if (!textLayer) return "";
    
    const spans = textLayer.querySelectorAll("span");
    let selectedSpans = [];
    
    spans.forEach(span => {
        const rect = span.getBoundingClientRect();
        // Check if bounding box intersects with selectRect
        const intersects = !(rect.right < selectRect.left || 
                             rect.left > selectRect.right || 
                             rect.bottom < selectRect.top || 
                             rect.top > selectRect.bottom);
        
        if (intersects && span.textContent.trim().length > 0) {
            selectedSpans.push({
                text: span.textContent,
                rect: rect
            });
        }
    });
    
    // Sort selected spans primarily by top offset (with 6px line tolerance), secondary by left offset
    selectedSpans.sort((a, b) => {
        const dy = a.rect.top - b.rect.top;
        if (Math.abs(dy) < 6) {
            return a.rect.left - b.rect.left;
        }
        return dy;
    });
    
    let text = "";
    let lastTop = 0;
    selectedSpans.forEach((item, index) => {
        if (index > 0) {
            if (Math.abs(item.rect.top - lastTop) >= 6) {
                text += "\n";
            } else {
                text += " ";
            }
        }
        text += item.text;
        lastTop = item.rect.top;
    });
    
    return text.trim();
}

// Translate Selected Text from selection tooltip
async function translateSelectedText() {
    if (!state.selectedText) return;
    
    hideSelectionTooltip();
    
    // Switch to Translate tab
    elements.tabs[0].click();
    
    // Put selection in detected textbox as preview
    elements.txtDetected.value = `[Selection Translate Request]:\n${state.selectedText}`;
    elements.txtTranslated.value = "Translating selection...";
    
    // Prepare API request payload
    const payload = {
        text: state.selectedText,
        target_lang: elements.targetLangSelect.value,
        provider: state.config.llmProvider.startsWith("custom-") ? "openai" : state.config.llmProvider,
        api_key: state.config.llmKey,
        api_url: state.config.llmUrl,
        model: state.config.llmModel,
        custom_prompt: state.config.customPrompt,
        proxy: state.config.proxyEnabled ? state.config.proxyUrl : null
    };
    
    try {
        const res = await fetch("/api/translate-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Translation request failed");
        }
        
        const data = await res.json();
        elements.txtTranslated.value = data.translated_text;
    } catch (err) {
        elements.txtTranslated.value = `Error translating selection: ${err.message}`;
    }
}

// Send Selected PDF Text directly to LLM Chat tab
function sendSelectionToChat() {
    if (!state.selectedText) return;
    
    hideSelectionTooltip();
    
    // Switch to Chat tab
    elements.tabs[1].click();
    
    // Attach context state
    state.attachedContext = state.selectedText;
    elements.chatContextBanner.style.display = "flex";
    
    elements.chatInput.focus();
}

// PDF Document extraction using Marker/Datalab API/PyMuPDF
async function runLayoutExtraction() {
    if (!state.pdfFile) {
        alert("Please upload a PDF file first.");
        return;
    }
    
    elements.btnRunOcr.disabled = true;
    elements.ocrProgressContainer.style.display = "block";
    elements.txtDetected.value = "Extracting layout text and running text-detection algorithms... Please wait.";
    elements.txtTranslated.value = "";
    
    const formData = new FormData();
    formData.append("file", state.pdfFile);
    formData.append("method", state.config.ocrMode);
    
    if (state.config.ocrMode === "datalab") {
        formData.append("api_key", state.config.datalabKey);
    }
    if (state.config.proxyEnabled) {
        formData.append("proxy", state.config.proxyUrl);
    }
    
    // Set a progress timer for visual effect
    let progress = 0;
    elements.progressBarFill.style.width = "0%";
    elements.progressPct.innerText = "0%";
    elements.progressStatusText.innerText = "Uploading document...";
    
    const progressTimer = setInterval(() => {
        if (progress < 95) {
            progress += (state.config.ocrMode === "datalab") ? 1 : 15; // Datalab is async/polls, fallback is instant
            if (progress > 95) progress = 95;
            
            elements.progressBarFill.style.width = `${progress}%`;
            elements.progressPct.innerText = `${progress}%`;
            
            if (progress > 30 && progress < 70) {
                elements.progressStatusText.innerText = "Parsing layout structure...";
            } else if (progress >= 70) {
                elements.progressStatusText.innerText = "Extracting content...";
            }
        }
    }, 400);
    
    try {
        const response = await fetch("/api/convert-pdf", {
            method: "POST",
            body: formData
        });
        
        clearInterval(progressTimer);
        
        if (!response.ok) {
            const errText = await response.text();
            let parsedErr = errText;
            try { parsedErr = JSON.parse(errText).detail; } catch(e) {}
            throw new Error(parsedErr || "Extraction failed");
        }
        
        const data = await response.json();
        
        elements.progressBarFill.style.width = "100%";
        elements.progressPct.innerText = "100%";
        elements.progressStatusText.innerText = "Extraction Complete!";
        
        state.extractedMarkdown = data.markdown;
        state.extractedPages = data.pages || [];
        
        if ((!state.extractedPages || state.extractedPages.length === 0) && state.extractedMarkdown) {
            state.extractedPages = parseMarkdownIntoPages(state.extractedMarkdown);
        }
        
        // Check if the extracted text is empty or very short (meaning no text was found/extracted, e.g. scanned document with fallback method)
        const cleanText = (state.extractedMarkdown || "").replace(/#+ Page \d+/gi, "").trim();
        if (cleanText.length === 0) {
            elements.txtDetected.value = "No text was detected in the document.\n\n" +
                "If this is a scanned PDF, photocopy, or contains text inside images/pictures:\n" +
                "1. Go to the 'Configuration' tab.\n" +
                "2. Under 'PDF Extraction Method', select either 'Datalab API (Cloud)' or 'Marker (Local)'.\n" +
                "3. Re-run the extraction to run layout OCR algorithms.";
            alert("No text detected. If this is a scanned PDF, please configure an OCR-capable method (Datalab or Marker) under the Configuration tab.");
        } else {
            elements.txtDetected.value = state.extractedMarkdown;
        }
        
        // Apply OCR text overlays to the rendered PDF pages
        applyOcrTextOverlays();
        
        // Enable translate button
        elements.btnTranslateDoc.disabled = false;
        
        // Automatically attach full doc to chat background context or save
        state.attachedContext = "Full document extracted context available: \n" + state.extractedMarkdown.slice(0, 1000) + "...";
        
        setTimeout(() => {
            elements.ocrProgressContainer.style.display = "none";
        }, 2000);
        
    } catch (err) {
        clearInterval(progressTimer);
        elements.ocrProgressContainer.style.display = "none";
        elements.btnRunOcr.disabled = false;
        elements.txtDetected.value = `Layout extraction failed: ${err.message}\n\nMake sure your API keys, local packages, or proxies are configured correctly in the settings tab.`;
    }
}

// Full document translation
// Full document translation with paragraph-preserving chunking and rate limits
let cancelTranslationFlag = false;

async function translateDocument() {
    if (!state.extractedMarkdown) {
        alert("Please run Layout Extraction first.");
        return;
    }
    
    cancelTranslationFlag = false;
    state.isTranslating = true;
    elements.btnTranslateDoc.disabled = true;
    elements.translationProgressContainer.style.display = "block";
    elements.txtTranslated.value = "Preparing chunks for translation...";
    
    // Read user configuration
    const maxChunkSize = parseInt(elements.translationChunkSize.value) || 100000;
    const delaySec = parseFloat(elements.translationDelay.value) || 1.0;
    
    // Split into chunks
    const chunks = splitTextIntoChunks(state.extractedMarkdown, maxChunkSize);
    const totalChunks = chunks.length;
    
    let translatedResults = [];
    
    for (let i = 0; i < totalChunks; i++) {
        if (cancelTranslationFlag) {
            elements.txtTranslated.value += "\n\n[Translation Cancelled by User]";
            break;
        }
        
        // Update progress
        const pct = Math.round((i / totalChunks) * 100);
        elements.transProgressStatusText.innerText = `Translating chunk ${i + 1} of ${totalChunks}...`;
        elements.transProgressBarFill.style.width = `${pct}%`;
        elements.transProgressPct.innerText = `${pct}%`;
        
        const chunkText = chunks[i];
        
        // Prepare API request payload
        const payload = {
            text: chunkText,
            target_lang: elements.targetLangSelect.value,
            provider: state.config.llmProvider.startsWith("custom-") ? "openai" : state.config.llmProvider,
            api_key: state.config.llmKey,
            api_url: state.config.llmUrl,
            model: elements.llmModelSelect.value === "custom" ? elements.llmModelCustom.value : elements.llmModelSelect.value,
            custom_prompt: state.config.customPrompt,
            proxy: state.config.proxyEnabled ? state.config.proxyUrl : null
        };
        
        try {
            const response = await fetch("/api/translate-text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Translation request failed");
            }
            
            const data = await response.json();
            translatedResults.push(data.translated_text);
            
            // Update textbox in real-time
            elements.txtTranslated.value = translatedResults.join("\n\n");
            elements.txtTranslated.scrollTop = elements.txtTranslated.scrollHeight;
            
        } catch (err) {
            console.error(err);
            elements.txtTranslated.value += `\n\n[Error on chunk ${i + 1}]: ${err.message}\nContinuing with next chunks...`;
            translatedResults.push(`[Translation Error for Chunk ${i + 1}]`);
        }
        
        // Delay if not the last chunk and not cancelled
        if (i < totalChunks - 1 && !cancelTranslationFlag && delaySec > 0) {
            let delayRemaining = delaySec;
            while (delayRemaining > 0 && !cancelTranslationFlag) {
                elements.transProgressStatusText.innerText = `Rate-limiting: waiting ${delayRemaining.toFixed(1)}s before next request...`;
                await new Promise(resolve => setTimeout(resolve, 200));
                delayRemaining -= 0.2;
            }
        }
    }
    
    // Complete
    elements.transProgressBarFill.style.width = "100%";
    elements.transProgressPct.innerText = "100%";
    elements.transProgressStatusText.innerText = cancelTranslationFlag ? "Translation Cancelled" : "Translation Complete!";
    elements.btnTranslateDoc.disabled = false;
    state.isTranslating = false;
    
    setTimeout(() => {
        if (!state.isTranslating) {
            elements.translationProgressContainer.style.display = "none";
        }
    }, 4000);
}

// ════════════════════════════════════════════════════════════════════════
//  PREMIUM AGENTIC CHAT SYSTEM
// ════════════════════════════════════════════════════════════════════════

// ── Utility: Simple Markdown to HTML renderer ────────────────────────
function renderMarkdown(text) {
    // Strip STEPS_JSON hidden blocks before display
    text = text.replace(/<!--STEPS_JSON:.*?STEPS_JSON_END-->/gs, '').trim();
    // Escape HTML first
    let html = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`);
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Blockquote
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    // HR
    html = html.replace(/^---$/gm, '<hr>');
    // Unordered list items
    html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    // Ordered list items
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    // Line breaks (double newline → paragraph break)
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

// ── Utility: Levenshtein similarity ──────────────────────────────────
function levenshteinSimilarity(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    const m = a.length, n = b.length;
    if (m === 0 || n === 0) return 0;
    const dp = Array.from({length: m+1}, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
    }
    return 1 - dp[m][n] / Math.max(m, n);
}

function tokenIntersection(a, b) {
    const ta = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
    const tb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
    if (!ta.size || !tb.size) return 0;
    let inter = 0;
    ta.forEach(t => { if (tb.has(t)) inter++; });
    return inter / Math.max(ta.size, tb.size);
}

function isSimilar(a, b, threshold = 0.75) {
    return levenshteinSimilarity(a, b) >= threshold || tokenIntersection(a, b) >= threshold;
}

// ── Auto-grow textarea ────────────────────────────────────────────────
function autoGrowTextarea() {
    const ta = elements.chatInput;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(Math.max(ta.scrollHeight, 48), 160) + 'px';
}

// ── Panel Drag Resize ─────────────────────────────────────────────────
function initPanelResize() {
    const handle = elements.panelResizeHandle;
    const layout = elements.appLayout;
    const controlsPanel = elements.panelControls;
    if (!handle || !layout || !controlsPanel) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = controlsPanel.getBoundingClientRect().width;
        layout.classList.add('is-resizing');
        handle.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const delta = startX - e.clientX;
        const newWidth = Math.min(720, Math.max(280, startWidth + delta));
        document.documentElement.style.setProperty('--right-panel-width', newWidth + 'px');
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        layout.classList.remove('is-resizing');
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// ── Session Management ────────────────────────────────────────────────
const WELCOME_MSG = { role: "assistant", content: "Hello! I'm your LingoPDF Agent. Upload a PDF, extract the text, or select any passage and ask me questions about it!" };

function initChatUI() {
    state.chatHistory = [{ ...WELCOME_MSG }];
    renderChatMessages();
    renderHistoryDrawer();
}

function startNewSession() {
    // Save current chat first if it has content
    if (state.chatHistory.length > 1) saveActiveChatSession();
    state.currentSessionId = "new";
    state.chatHistory = [{ ...WELCOME_MSG }];
    state.liveSteps = [];
    clearDraftText();
    if (elements.chatActiveTitle) elements.chatActiveTitle.textContent = 'LingoPDF Agent';
    if (elements.historyDrawer) elements.historyDrawer.classList.remove('open');
    if (elements.btnToggleHistory) elements.btnToggleHistory.classList.remove('active');
    renderChatMessages();
    renderHistoryDrawer();
}

function saveActiveChatSession() {
    if (state.chatHistory.length <= 1) return;

    // Auto-title: first user message, 25 chars
    const firstUser = state.chatHistory.find(m => m.role === 'user');
    let title = firstUser ? firstUser.content.replace(/<!--STEPS_JSON:.*?STEPS_JSON_END-->/gs, '').substring(0, 25) : '';
    if (!title) title = 'Session ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    else if (firstUser && firstUser.content.length > 25) title += '…';

    const now = Date.now();
    if (state.currentSessionId === 'new') {
        const newSession = {
            id: 'session-' + now,
            title,
            createdAt: now,
            messages: [...state.chatHistory]
        };
        state.currentSessionId = newSession.id;
        state.chatSessions.unshift(newSession);
    } else {
        const sess = state.chatSessions.find(s => s.id === state.currentSessionId);
        if (sess) {
            sess.messages = [...state.chatHistory];
            sess.title = title;
        } else {
            state.chatSessions.unshift({ id: state.currentSessionId, title, createdAt: now, messages: [...state.chatHistory] });
        }
    }
    localStorage.setItem('lingo_pdf_chat_sessions_v2', JSON.stringify(state.chatSessions));
    renderHistoryDrawer();
    if (elements.chatActiveTitle) elements.chatActiveTitle.textContent = title;
}

function loadChatSession(sessionId) {
    if (state.chatHistory.length > 1) saveActiveChatSession();
    const sess = state.chatSessions.find(s => s.id === sessionId);
    if (!sess) return;
    state.currentSessionId = sess.id;
    state.chatHistory = [...sess.messages];
    state.liveSteps = [];
    if (elements.chatActiveTitle) elements.chatActiveTitle.textContent = sess.title;
    // Restore draft
    const draft = localStorage.getItem(`chat_draft_${sess.id}`);
    if (elements.chatInput) elements.chatInput.value = draft || '';
    if (elements.historyDrawer) elements.historyDrawer.classList.remove('open');
    if (elements.btnToggleHistory) elements.btnToggleHistory.classList.remove('active');
    renderChatMessages();
    renderHistoryDrawer();
}

function deleteChatSession(sessionId) {
    state.chatSessions = state.chatSessions.filter(s => s.id !== sessionId);
    localStorage.setItem('lingo_pdf_chat_sessions_v2', JSON.stringify(state.chatSessions));
    if (state.currentSessionId === sessionId) startNewSession();
    else renderHistoryDrawer();
}

function clearDraftText() {
    if (elements.chatInput) elements.chatInput.value = '';
    localStorage.removeItem(`chat_draft_${state.currentSessionId}`);
}

// ── History Drawer ────────────────────────────────────────────────────
function toggleHistoryDrawer() {
    const drawer = elements.historyDrawer;
    const btn = elements.btnToggleHistory;
    if (!drawer) return;
    const isOpen = drawer.classList.toggle('open');
    if (btn) btn.classList.toggle('active', isOpen);
}

function renderHistoryDrawer() {
    const list = elements.historySessionList;
    if (!list) return;
    if (!state.chatSessions.length) {
        list.innerHTML = '<p class="history-empty">No saved conversations yet.</p>';
        return;
    }
    list.innerHTML = state.chatSessions.map(sess => {
        const isActive = sess.id === state.currentSessionId;
        const date = new Date(sess.createdAt).toLocaleDateString([], {month:'short', day:'numeric'});
        return `
        <div class="history-session-item${isActive ? ' active' : ''}" data-id="${sess.id}">
            <span class="history-session-title">${escapeHtml(sess.title)}</span>
            <span class="history-session-date">${date}</span>
            <button class="btn-delete-session" data-id="${sess.id}" title="Delete">
                <i data-lucide="trash-2"></i>
            </button>
        </div>`;
    }).join('');
    lucide.createIcons();
    list.querySelectorAll('.history-session-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete-session')) return;
            loadChatSession(item.dataset.id);
        });
    });
    list.querySelectorAll('.btn-delete-session').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this conversation?')) deleteChatSession(btn.dataset.id);
        });
    });
}

// ── Steps Checklist ───────────────────────────────────────────────────
function showStepsContainer() {
    const box = elements.chatBox;
    if (!box) return;
    
    // Remove any existing active steps message bubble
    const existing = document.getElementById('active-steps-message');
    if (existing) existing.remove();

    const activeMsg = document.createElement('div');
    activeMsg.className = 'chat-message assistant active-steps-bubble';
    activeMsg.id = 'active-steps-message';
    activeMsg.innerHTML = `
        <div class="msg-avatar"><i data-lucide="bot"></i></div>
        <div class="msg-bubble">
            <div class="active-steps-card">
                <div class="active-steps-header">
                    <div class="window-controls">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                    <span class="active-steps-title">LingoPDF Agent is active...</span>
                </div>
                <ul class="active-steps-list" id="active-steps-list-element">
                </ul>
            </div>
        </div>
    `;
    box.appendChild(activeMsg);
    lucide.createIcons();
    box.scrollTop = box.scrollHeight;
}

function addStep(text, status = 'active') {
    const list = document.getElementById('active-steps-list-element');
    const li = document.createElement('li');
    li.className = `step-item ${status}`;
    
    const iconHtml = status === 'done'
        ? `<span class="step-icon done"><i data-lucide="check"></i></span>`
        : `<span class="step-icon active"></span>`;
        
    li.innerHTML = `${iconHtml}<span class="step-text">${escapeHtml(text)}</span>`;
    li.dataset.stepText = text;
    
    if (list) {
        list.appendChild(li);
        lucide.createIcons();
        const box = elements.chatBox;
        if (box) box.scrollTop = box.scrollHeight;
    }
    state.liveSteps.push({ text, status });
    return li;
}

function updateStep(li, status) {
    if (!li) return;
    li.className = `step-item ${status}`;
    const iconEl = li.querySelector('.step-icon');
    if (iconEl) {
        iconEl.className = `step-icon ${status}`;
        if (status === 'done') {
            iconEl.innerHTML = '<i data-lucide="check"></i>';
        }
    }
    lucide.createIcons();
}

function finalizeStepsContainer() {
    // No-op here since we remove the active-steps-message and insert the collapsed card on 'done'
}

function hideStepsContainer() {
    const activeMsg = document.getElementById('active-steps-message');
    if (activeMsg) activeMsg.remove();
    state.liveSteps = [];
}

function toggleStepsCollapse() {
    // No-op
}

// ── Render Chat Messages ──────────────────────────────────────────────
function renderChatMessages() {
    const box = elements.chatBox;
    if (!box) return;
    box.innerHTML = '';

    if (!state.chatHistory.length) {
        state.chatHistory = [{ ...WELCOME_MSG }];
    }

    state.chatHistory.forEach((msg, index) => {
        // If msg is a step log message, render as collapsed actions card
        if (msg.type === 'steps') {
            let steps = [];
            try { steps = JSON.parse(msg.content); } catch(e) {}
            if (!steps.length) return;

            const stepItems = steps.map(s => `
                <li class="step-item">
                    <i data-lucide="check"></i>
                    <span class="step-text">${escapeHtml(s.text)}</span>
                </li>
            `).join('');

            const stepsDiv = document.createElement('div');
            stepsDiv.className = 'chat-message assistant collapsed-steps-bubble';
            stepsDiv.dataset.index = index;
            stepsDiv.innerHTML = `
                <div class="msg-avatar"><i data-lucide="bot"></i></div>
                <div class="msg-bubble">
                    <div class="collapsed-steps-card">
                        <div class="collapsed-steps-header" onclick="this.parentElement.classList.toggle('open')">
                            <div class="collapsed-steps-header-left">
                                <span class="status-dot-green"></span>
                                <span class="collapsed-steps-title">Agent Actions (${steps.length})</span>
                            </div>
                            <i data-lucide="chevron-right" class="chevron"></i>
                        </div>
                        <ul class="collapsed-steps-list">
                            ${stepItems}
                        </ul>
                    </div>
                </div>
            `;
            box.appendChild(stepsDiv);
            return;
        }

        const div = document.createElement('div');
        div.className = `chat-message ${msg.role}`;
        div.dataset.index = index;

        const avatarIcon = msg.role === 'assistant' ? 'bot' : 'user';
        const avatar = `<div class="msg-avatar"><i data-lucide="${avatarIcon}"></i></div>`;

        // Extract steps JSON hidden in message content (legacy fallback)
        const stepsMatch = msg.content.match(/<!--STEPS_JSON:(.*?)STEPS_JSON_END-->/s);
        const displayContent = msg.role === 'assistant'
            ? renderMarkdown(msg.content)
            : `<span>${escapeHtml(msg.content.replace(/<!--STEPS_JSON:.*?STEPS_JSON_END-->/gs, '').trim())}</span>`;

        // Stored steps legacy rendering
        let stepsHtml = '';
        if (stepsMatch && msg.role === 'assistant') {
            try {
                const steps = JSON.parse(stepsMatch[1]);
                if (steps.length) {
                    const stepItems = steps.map(s =>
                        `<li class="step-item done"><span class="step-icon done"><i data-lucide="check-circle-2"></i></span><span class="step-text">${escapeHtml(s.text)}</span></li>`
                    ).join('');
                    stepsHtml = `
                    <div class="agent-steps-container collapsed" style="margin:4px 0 6px 0;">
                        <div class="steps-header" onclick="this.parentElement.classList.toggle('collapsed')">
                            <div class="steps-header-left">
                                <span style="color:var(--step-done);font-size:11px;">✓</span>
                                <span>Agent Steps (${steps.length})</span>
                            </div>
                            <div class="steps-chevron"><i data-lucide="chevron-down"></i></div>
                        </div>
                        <ul class="steps-list">${stepItems}</ul>
                    </div>`;
                }
            } catch(e) {}
        }

        // Action buttons
        let actionsHtml = '';
        if (msg.role === 'user') {
            actionsHtml = `
            <div class="msg-actions">
                <button class="msg-action-btn" data-action="edit" data-index="${index}" title="Edit">
                    <i data-lucide="pencil"></i> Edit
                </button>
                <button class="msg-action-btn" data-action="retry" data-index="${index}" title="Retry">
                    <i data-lucide="rotate-ccw"></i> Retry
                </button>
            </div>`;
        } else if (msg.role === 'assistant' && index > 0) {
            actionsHtml = `
            <div class="msg-actions">
                <button class="msg-action-btn" data-action="copy" data-index="${index}" title="Copy">
                    <i data-lucide="copy"></i> Copy
                </button>
            </div>`;
        }

        div.innerHTML = msg.role === 'user'
            ? `${avatar}<div class="msg-bubble">${actionsHtml}<div class="msg-content">${displayContent}</div></div>`
            : `${avatar}<div class="msg-bubble"><div class="msg-content">${stepsHtml}${displayContent}</div>${actionsHtml}</div>`;

        box.appendChild(div);
    });

    lucide.createIcons();
    box.scrollTop = box.scrollHeight;

    // Wire action buttons
    box.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const idx = parseInt(btn.dataset.index);
            if (action === 'edit') startInlineEdit(idx);
            else if (action === 'retry') retryMessage(idx);
            else if (action === 'copy') {
                const content = state.chatHistory[idx]?.content
                    .replace(/<!--STEPS_JSON:.*?STEPS_JSON_END-->/gs, '').trim();
                navigator.clipboard.writeText(content || '');
            }
        });
    });
}

// ── Inline Edit ───────────────────────────────────────────────────────
function startInlineEdit(index) {
    const box = elements.chatBox;
    const msgDiv = box.querySelector(`[data-index="${index}"]`);
    if (!msgDiv) return;
    const content = state.chatHistory[index].content.trim();
    const bubble = msgDiv.querySelector('.msg-bubble');
    if (!bubble) return;

    bubble.innerHTML = `
        <textarea class="msg-edit-textarea" id="inline-edit-ta">${escapeHtmlAttr(content)}</textarea>
        <div class="msg-edit-actions">
            <button class="btn-confirm-edit" id="btn-confirm-edit"><i data-lucide="check"></i> Confirm</button>
            <button class="btn-cancel-edit" id="btn-cancel-edit"><i data-lucide="x"></i> Cancel</button>
        </div>`;
    lucide.createIcons();
    const ta = document.getElementById('inline-edit-ta');
    ta.focus();
    ta.selectionStart = ta.value.length;

    document.getElementById('btn-confirm-edit').addEventListener('click', () => {
        const newContent = ta.value.trim();
        if (!newContent) return;
        // Truncate state at this index and resend
        state.chatHistory = state.chatHistory.slice(0, index);
        state.chatHistory.push({ role: 'user', content: newContent });
        renderChatMessages();
        sendChatMessageFromContent(newContent);
    });
    document.getElementById('btn-cancel-edit').addEventListener('click', renderChatMessages);
}

function retryMessage(index) {
    // Find the user message at or before this index
    const userMsg = state.chatHistory[index];
    if (!userMsg || userMsg.role !== 'user') return;
    // Truncate everything from this user message onward and resend
    const content = userMsg.content.trim();
    state.chatHistory = state.chatHistory.slice(0, index);
    state.chatHistory.push({ role: 'user', content });
    renderChatMessages();
    sendChatMessageFromContent(content);
}

function escapeHtmlAttr(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Send Chat Message (SSE streaming) ────────────────────────────────
async function sendChatMessage() {
    const userText = elements.chatInput ? elements.chatInput.value.trim() : '';
    if (!userText || state.isAgentWorking) return;
    elements.chatInput.value = '';
    autoGrowTextarea();
    clearDraftText();
    state.chatHistory.push({ role: 'user', content: userText });
    renderChatMessages();
    await sendChatMessageFromContent(userText);
}

async function sendChatMessageFromContent(userText) {
    if (state.isAgentWorking) return;
    state.isAgentWorking = true;

    // Doc context
    let docContext = state.extractedMarkdown;
    if (!docContext && state.pdfDoc) {
        try { docContext = await extractPdfTextClientSide(); } catch(e) {}
    }

    // Prompt with context
    let promptWithContext = userText;
    if (state.attachedContext) {
        promptWithContext = `Attached Reference Context:\n"""\n${state.attachedContext}\n"""\n\nUser Question: ${userText}`;
        state.attachedContext = '';
        if (elements.chatContextBanner) elements.chatContextBanner.style.display = 'none';
    }

    // System prompt
    let systemPrompt = `You are LingoPDF Agent, an intelligent assistant inside the LingoPDF application.
You can answer questions about the active document and control the application using Tools.

Available Tools:
- switch_tab(tab_name: string) - Valid values: workspace, agent, config
- extract_layout() - Runs OCR and text extraction on the PDF.
- translate_document() - Translates the document.
- set_target_language(lang: string) - Sets the translation target language.
- select_text(text_snippet: string) - Selects text in the document.

To use a tool, output a JSON block:
\`\`\`json
{ "tool_call": { "name": "switch_tab", "arguments": { "tab_name": "config" } } }
\`\`\`
Only ONE tool per response. Do NOT use a tool if just answering a question.

Current Application State:
${JSON.stringify(window.agentTools ? window.agentTools.getAppState() : { error: 'Tools disconnected' }, null, 2)}`;
    if (docContext) systemPrompt += `\n\nActive PDF Document Text Content:\n${docContext.substring(0, 8000)}`;

    // Build messages payload (filter out steps logs)
    const messagesPayload = [
        { role: 'system', content: systemPrompt },
        ...state.chatHistory
            .filter(msg => msg.type !== 'steps')
            .map((msg, i, arr) => {
                if (i === arr.length - 1 && msg.role === 'user')
                    return { role: 'user', content: promptWithContext };
                return { role: msg.role, content: msg.content.replace(/<!--STEPS_JSON:.*?STEPS_JSON_END-->/gs, '').trim() };
            }).slice(-10)
    ];

    const payload = {
        messages: messagesPayload,
        provider: state.config.llmProvider.startsWith('custom-') ? 'openai' : state.config.llmProvider,
        api_key: state.config.llmKey,
        api_url: state.config.llmUrl,
        model: state.config.llmModel,
        proxy: state.config.proxyEnabled ? state.config.proxyUrl : null
    };

    // Add typing bubble
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant typing';
    typingDiv.innerHTML = `
        <div class="msg-avatar"><i data-lucide="bot"></i></div>
        <div class="msg-bubble"><div class="msg-content">
            <span style="opacity:0.7;">Agent is thinking</span>
            <span class="typing-dots"><span></span><span></span><span></span></span>
        </div></div>`;
    lucide.createIcons();
    if (elements.chatBox) {
        elements.chatBox.appendChild(typingDiv);
        elements.chatBox.scrollTop = elements.chatBox.scrollHeight;
    }

    // Show steps container
    showStepsContainer();
    state.liveSteps = [];

    let fullResponse = '';
    let currentStepLi = null;

    try {
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Stream request failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line

            for (const line of lines) {
                if (!line.startsWith('data:')) continue;
                const jsonStr = line.slice(5).trim();
                if (!jsonStr) continue;
                try {
                    const evt = JSON.parse(jsonStr);

                    if (evt.type === 'step') {
                        // Complete previous step
                        if (currentStepLi) updateStep(currentStepLi, 'done');
                        currentStepLi = addStep(evt.text, evt.status === 'done' ? 'done' : 'active');
                        if (evt.status === 'done') { updateStep(currentStepLi, 'done'); currentStepLi = null; }

                    } else if (evt.type === 'chunk') {
                        fullResponse += evt.text;
                        // Update typing bubble with streamed content
                        const bubble = typingDiv.querySelector('.msg-content');
                        if (bubble) bubble.innerHTML = renderMarkdown(fullResponse);
                        if (elements.chatBox) elements.chatBox.scrollTop = elements.chatBox.scrollHeight;

                    } else if (evt.type === 'done') {
                        fullResponse = evt.full_response || fullResponse;

                        // Complete last step
                        if (currentStepLi) updateStep(currentStepLi, 'done');

                        // Remove active steps bubble and typing bubble from DOM
                        const activeMsg = document.getElementById('active-steps-message');
                        if (activeMsg) activeMsg.remove();
                        if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);

                        // Execute tool call if present
                        const toolMatch = fullResponse.match(/```json\s*(\{[\s\S]*?"tool_call"[\s\S]*?\})\s*```/);
                        if (toolMatch && window.agentTools) {
                            try {
                                const tb = JSON.parse(toolMatch[1]);
                                const name = tb.tool_call?.name;
                                const args = tb.tool_call?.arguments || {};
                                if (name === 'switch_tab') window.agentTools.switchTab(args.tab_name);
                                else if (name === 'extract_layout') window.agentTools.extractLayout();
                                else if (name === 'translate_document') window.agentTools.translateDocument();
                                else if (name === 'set_target_language') window.agentTools.setTargetLanguage(args.lang);
                                else if (name === 'select_text') window.agentTools.selectText(args.text_snippet);
                                fullResponse = fullResponse.replace(toolMatch[0], `\n*[Executed: ${name}]*\n`);
                            } catch(e) { console.error('Tool exec error', e); }
                        }

                        // Split steps and text response into two separate assistant messages!
                        // Message 1: Collapsed checklist actions
                        const stepsJson = JSON.stringify(state.liveSteps);
                        state.chatHistory.push({
                            role: 'assistant',
                            type: 'steps',
                            content: stepsJson
                        });

                        // Message 2: LLM Text Response
                        state.chatHistory.push({
                            role: 'assistant',
                            content: fullResponse
                        });

                        saveActiveChatSession();
                        renderChatMessages();

                    } else if (evt.type === 'error') {
                        throw new Error(evt.text);
                    }
                } catch(parseErr) { /* ignore malformed SSE */ }
            }
        }

    } catch (err) {
        if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);
        state.chatHistory.push({ role: 'assistant', content: `❌ Error: ${err.message}` });
        saveActiveChatSession();
        hideStepsContainer();
        renderChatMessages();
    } finally {
        state.isAgentWorking = false;
        if (elements.btnSendChat) elements.btnSendChat.disabled = false;
    }
}

// ── Markdown Export ───────────────────────────────────────────────────
function exportChatToMarkdown() {
    if (state.chatHistory.length <= 1) { alert('No conversation to export.'); return; }

    const lines = [`# LingoPDF Chat Export`, `*Exported: ${new Date().toLocaleString()}*`, ''];

    state.chatHistory.forEach(msg => {
        if (msg.role === 'system') return;
        const stepsMatch = msg.content.match(/<!--STEPS_JSON:(.*?)STEPS_JSON_END-->/s);
        const clean = msg.content.replace(/<!--STEPS_JSON:.*?STEPS_JSON_END-->/gs, '').trim();

        if (msg.role === 'user') {
            lines.push(`## 👤 User`, '', clean, '');
        } else {
            lines.push(`## 🤖 LingoPDF Agent`, '', clean, '');
            if (stepsMatch) {
                try {
                    const steps = JSON.parse(stepsMatch[1]);
                    lines.push('**Agent Steps:**');
                    lines.push('```json');
                    lines.push(JSON.stringify(steps, null, 2));
                    lines.push('```', '');
                } catch(e) {}
            }
        }
        lines.push('---', '');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lingo-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Legacy compatibility shims ────────────────────────────────────────
function clearChat() { startNewSession(); }
function loadChatSessionById(id) { loadChatSession(id); }
function repopulateChatSessionsDropdown() { renderHistoryDrawer(); }

// ── escapeHtml ────────────────────────────────────────────────────────
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Connection Tester & Installer Helpers
let installerInterval = null;



async function testConnection() {
    elements.btnTestConnection.disabled = true;
    elements.connectionTestResult.innerText = "Testing connection...";
    elements.connectionTestResult.className = "connection-test-result success";
    elements.connectionTestResult.style.display = "inline-flex";
    
    const payload = {
        provider: state.config.llmProvider.startsWith("custom-") ? "openai" : state.config.llmProvider,
        api_key: state.config.llmKey,
        api_url: state.config.llmUrl,
        model: state.config.llmModelSelect === "custom" ? state.config.llmModelCustom : state.config.llmModel,
        proxy: state.config.proxyEnabled ? state.config.proxyUrl : null
    };
    
    try {
        const res = await fetch("/api/llm/test-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            elements.connectionTestResult.innerText = data.message;
            elements.connectionTestResult.className = "connection-test-result success";
        } else {
            elements.connectionTestResult.innerText = data.message;
            elements.connectionTestResult.className = "connection-test-result error";
        }
    } catch (err) {
        elements.connectionTestResult.innerText = "Connection failed: " + err.message;
        elements.connectionTestResult.className = "connection-test-result error";
    } finally {
        elements.btnTestConnection.disabled = false;
        updateStatusIndicators();
    }
}

async function startInstaller() {
    elements.btnInstStart.disabled = true;
    let activeModel = "marker";
    const checkedRadio = document.querySelector('input[name="ocr-mode"]:checked');
    if (checkedRadio && checkedRadio.value === "unlimited-ocr") {
        activeModel = "unlimited-ocr";
    }
    const payload = {
        model: activeModel,
        proxy: state.config.proxyEnabled ? state.config.proxyUrl : null
    };
    
    try {
        await fetch("/api/local-models/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        startInstallerPolling();
    } catch (err) {
        console.error("Failed to start downloader:", err);
        elements.btnInstStart.disabled = false;
    }
}

async function pauseInstaller() {
    try {
        await fetch("/api/local-models/pause", { method: "POST" });
        checkInstallerStatus();
    } catch (err) {
        console.error("Failed to pause downloader:", err);
    }
}

async function cancelInstaller() {
    if (!confirm("Are you sure you want to cancel the installation and delete partial files?")) {
        return;
    }
    try {
        await fetch("/api/local-models/cancel", { method: "POST" });
        checkInstallerStatus();
    } catch (err) {
        console.error("Failed to cancel downloader:", err);
    }
}

function startInstallerPolling() {
    if (installerInterval) clearInterval(installerInterval);
    installerInterval = setInterval(checkInstallerStatus, 1000);
}

async function checkInstallerStatus() {
    let activeModel = "marker";
    const checkedRadio = document.querySelector('input[name="ocr-mode"]:checked');
    if (checkedRadio && checkedRadio.value === "unlimited-ocr") {
        activeModel = "unlimited-ocr";
    }
    const labelPrefix = activeModel === "unlimited-ocr" ? "Unlimited-OCR" : "Local Model";

    try {
        const res = await fetch(`/api/local-models/status?model=${activeModel}`);
        const status = await res.json();
        
        elements.instProgressBar.style.width = status.progress + "%";
        
        if (status.status === "idle") {
            elements.instStatusLabel.innerText = `${labelPrefix} Installer (Idle)`;
            elements.instFileName.innerText = "Not downloading";
            elements.instPctSpeed.innerText = "0% (0 KB/s)";
            
            elements.btnInstStart.style.display = "flex";
            elements.btnInstStart.innerHTML = `<i data-lucide="download-cloud"></i> Install Local Models`;
            elements.btnInstStart.disabled = false;
            elements.btnInstPause.style.display = "none";
            elements.btnInstCancel.style.display = "none";
            
            if (installerInterval) {
                clearInterval(installerInterval);
                installerInterval = null;
            }
            lucide.createIcons();
        } 
        else if (status.status === "busy") {
            elements.instStatusLabel.innerText = "Installer (Busy)";
            elements.instFileName.innerText = status.current_repo || "Downloader is currently busy.";
            elements.instPctSpeed.innerText = status.error || "Please wait.";
            
            elements.btnInstStart.style.display = "flex";
            elements.btnInstStart.disabled = true;
            elements.btnInstPause.style.display = "none";
            elements.btnInstCancel.style.display = "none";
            
            if (installerInterval) {
                clearInterval(installerInterval);
                installerInterval = null;
            }
        }
        else if (status.status === "fetching") {
            elements.instStatusLabel.innerText = `${labelPrefix} Installer (Fetching...)`;
            elements.instFileName.innerText = status.current_repo || "Fetching model sizes...";
            elements.instPctSpeed.innerText = "Connecting to Hugging Face...";
            
            elements.btnInstStart.style.display = "none";
            elements.btnInstPause.style.display = "none";
            elements.btnInstCancel.style.display = "flex";
            
            startInstallerPolling();
        } 
        else if (status.status === "downloading") {
            elements.instStatusLabel.innerText = `Downloading ${labelPrefix}...`;
            elements.instFileName.innerText = `${status.current_repo} - ${status.current_file}`;
            
            const mbDownloaded = (status.downloaded_bytes / (1024 * 1024)).toFixed(1);
            const mbTotal = (status.total_bytes / (1024 * 1024)).toFixed(1);
            elements.instPctSpeed.innerText = `${status.progress}% (${status.speed}) - ${mbDownloaded}/${mbTotal} MB`;
            
            elements.btnInstStart.style.display = "none";
            elements.btnInstPause.style.display = "flex";
            elements.btnInstPause.disabled = false;
            elements.btnInstCancel.style.display = "flex";
            
            startInstallerPolling();
        } 
        else if (status.status === "paused") {
            elements.instStatusLabel.innerText = `${labelPrefix} Installer (Paused)`;
            elements.instFileName.innerText = `${status.current_repo} - ${status.current_file}`;
            
            const mbDownloaded = (status.downloaded_bytes / (1024 * 1024)).toFixed(1);
            const mbTotal = (status.total_bytes / (1024 * 1024)).toFixed(1);
            elements.instPctSpeed.innerText = `Paused at ${status.progress}% - ${mbDownloaded}/${mbTotal} MB`;
            
            elements.btnInstStart.style.display = "flex";
            elements.btnInstStart.innerHTML = `<i data-lucide="play"></i> Resume`;
            elements.btnInstStart.disabled = false;
            elements.btnInstPause.style.display = "none";
            elements.btnInstCancel.style.display = "flex";
            
            if (installerInterval) {
                clearInterval(installerInterval);
                installerInterval = null;
            }
            lucide.createIcons();
        } 
        else if (status.status === "completed") {
            elements.instStatusLabel.innerText = `${labelPrefix} Installed!`;
            elements.instFileName.innerText = "All model files verified and cached successfully.";
            elements.instPctSpeed.innerText = "100%";
            
            elements.btnInstStart.style.display = "flex";
            elements.btnInstStart.innerHTML = `<i data-lucide="check"></i> Reinstall`;
            elements.btnInstStart.disabled = false;
            elements.btnInstPause.style.display = "none";
            elements.btnInstCancel.style.display = "none";
            
            if (installerInterval) {
                clearInterval(installerInterval);
                installerInterval = null;
            }
            lucide.createIcons();
        } 
        else if (status.status === "failed") {
            elements.instStatusLabel.innerText = `${labelPrefix} Installer (Failed)`;
            elements.instFileName.innerText = "Error: " + status.error;
            elements.instPctSpeed.innerText = "Retry installation";
            
            elements.btnInstStart.style.display = "flex";
            elements.btnInstStart.innerHTML = `<i data-lucide="refresh-cw"></i> Retry Download`;
            elements.btnInstStart.disabled = false;
            elements.btnInstPause.style.display = "none";
            elements.btnInstCancel.style.display = "none";
            
            if (installerInterval) {
                clearInterval(installerInterval);
                installerInterval = null;
            }
            lucide.createIcons();
        }
    } catch (err) {
        console.error("Error checking installer status:", err);
    }
}

// Split markdown text into paragraph-preserving chunks of maximum character size
function splitTextIntoChunks(text, maxChunkSize = 100000) {
    const paragraphs = text.split("\n\n");
    const chunks = [];
    let currentChunk = "";
    
    for (const para of paragraphs) {
        if (!para.trim()) continue;
        
        // If a single paragraph is larger than maxChunkSize, split it by lines
        if (para.length > maxChunkSize) {
            // Flush current chunk first
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
            }
            
            const lines = para.split("\n");
            for (const line of lines) {
                if (currentChunk.length + line.length + 1 > maxChunkSize) {
                    chunks.push(currentChunk.trim());
                    currentChunk = line;
                } else {
                    currentChunk = currentChunk ? currentChunk + "\n" + line : line;
                }
            }
        } else {
            if (currentChunk.length + para.length + 2 > maxChunkSize) {
                chunks.push(currentChunk.trim());
                currentChunk = para;
            } else {
                currentChunk = currentChunk ? currentChunk + "\n\n" + para : para;
            }
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}



// Scroll PDF render area to specific page block and update toolbar display
function scrollToPage(pageNo) {
    if (!state.pdfDoc) return;
    const containers = elements.pdfRenderArea.querySelectorAll(".pdf-page-container");
    if (containers && containers[pageNo - 1]) {
        containers[pageNo - 1].scrollIntoView({ behavior: "smooth", block: "start" });
        elements.pageNumDisplay.innerText = `Page ${pageNo} / ${state.pdfDoc.numPages}`;
    }
}

// Client-side text extractor fallback for zero-setup document chat
async function extractPdfTextClientSide() {
    if (!state.pdfDoc) return "";
    let fullText = "";
    const numPages = Math.min(state.pdfDoc.numPages, 10);
    for (let i = 1; i <= numPages; i++) {
        try {
            const page = await state.pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        } catch (e) {
            console.error(`Error reading page ${i} text:`, e);
        }
    }
    return fullText.trim();
}

function repopulateProviderDropdown() {
    const currentVal = elements.llmProvider.value;
    elements.llmProvider.innerHTML = `
        <option value="ollama">Ollama (Local Models)</option>
        <option value="openai">OpenAI (ChatGPT)</option>
        <option value="gemini">Google Gemini</option>
        <option value="anthropic">Anthropic Claude</option>
        <option value="deepseek">DeepSeek API</option>
    `;
    state.customProviders.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.text = p.name;
        elements.llmProvider.add(opt);
    });
    const options = Array.from(elements.llmProvider.options).map(o => o.value);
    if (options.includes(currentVal)) {
        elements.llmProvider.value = currentVal;
    }
}

// Initialization on load
window.addEventListener("DOMContentLoaded", () => {
    loadConfig();
    setupEventListeners();
    updateStatusIndicators();
});
