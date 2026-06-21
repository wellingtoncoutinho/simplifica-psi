// content_meet.js - Executado em meet.google.com com Proteção Defensiva Total (Anti-Invalidation)

console.log("[Simple Psi] Extensão carregada na aba do Google Meet! Proteção defensiva ativa.");

let isCapturing = false;
let sessionTranscript = []; // Array de { sender: string, text: string, timestamp: number }
let finalizedTranscripts = []; // Array de { sender: string, text: string, timestamp: number }
let activeBlocks = {}; // Objeto de blockId -> { sender: string, text: string, timestamp: number }
let lastSender = "";
let lastText = "";
let observer = null;
let backupInterval = null;
let autoStartCheckInterval = null;
let ccButtonRetryInterval = null;
let hasAutoStarted = false; // Evita re-iniciar automático se pausar manualmente

// Função auxiliar ultra-segura para verificar se o contexto do Chrome e APIs estão vivos
function isContextValid() {
  try {
    return typeof chrome !== "undefined" && 
           typeof chrome.runtime !== "undefined" && 
           !!chrome.runtime && 
           !!chrome.runtime.id && 
           typeof chrome.storage !== "undefined" && 
           !!chrome.storage && 
           !!chrome.storage.local;
  } catch (e) {
    return false;
  }
}

// Limpeza de pânico caso o contexto tenha sido invalidado no meio da chamada
function cleanAllProcessIfInvalid() {
  if (!isContextValid()) {
    console.log("[Simple Psi] Contexto invalidado detectado. Limpando processos silenciosamente...");
    if (ccButtonRetryInterval) { clearInterval(ccButtonRetryInterval); ccButtonRetryInterval = null; }
    if (backupInterval) { clearInterval(backupInterval); backupInterval = null; }
    if (autoStartCheckInterval) { clearInterval(autoStartCheckInterval); autoStartCheckInterval = null; }
    if (observer) {
      try { observer.disconnect(); } catch(e){}
      observer = null;
    }
    return true; // Invalidado e limpo
  }
  return false; // Contexto ainda é válido
}

// Wrapper seguro para chrome.storage.local.set com dupla checagem de parâmetro
function safeStorageSet(data, callback) {
  if (cleanAllProcessIfInvalid()) return;
  
  try {
    if (callback && typeof callback === "function") {
      chrome.storage.local.set(data, callback);
    } else {
      chrome.storage.local.set(data);
    }
  } catch (e) {
    console.log("[Simple Psi] Erro silenciado ao gravar dados no storage.");
  }
}

// Wrapper seguro para chrome.storage.local.get com dupla checagem de parâmetro
function safeStorageGet(keys, callback) {
  if (cleanAllProcessIfInvalid()) return;

  try {
    if (callback && typeof callback === "function") {
      chrome.storage.local.get(keys, callback);
    } else {
      chrome.storage.local.get(keys);
    }
  } catch (e) {
    console.log("[Simple Psi] Erro silenciado ao ler dados no storage.");
  }
}

// Inicialização segura
safeStorageGet([
  "isCapturing"
], (result) => {
  if (!isContextValid()) return;
  
  // SEMPRE limpa a transcrição, dados do paciente e estados anteriores ao carregar a página do Meet (nova aba/chamada)
  isCapturing = false;
  sessionTranscript = [];
  finalizedTranscripts = [];
  activeBlocks = {};
  lastSender = "";
  lastText = "";
  hasAutoStarted = false;
  
  safeStorageSet({ 
    isCapturing: false,
    sessionTranscript: [],
    currentPatientId: "",
    currentPatientName: "",
    pendingTranscriptText: "",
    pendingTranscriptPatientId: "",
    pendingTranscriptPatientName: ""
  });
  
  console.log("[Simple Psi] Novo carregamento da página do Meet. Gravação resetada e histórico anterior limpo para segurança!");
  startAutoStartCheck();
});

// Escuta comandos vindos do popup ou background de forma segura
if (isContextValid()) {
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (cleanAllProcessIfInvalid()) return;
      console.log("[Simple Psi] Comando recebido:", request.action);
      
      try {
        if (request.action === "startCapture") {
          startCapture();
          sendResponse({ success: true });
        } else if (request.action === "pauseCapture") {
          pauseCapture();
          sendResponse({ success: true });
        } else if (request.action === "clearCapture") {
          clearCapture();
          sendResponse({ success: true });
        } else if (request.action === "getTranscript") {
          sendResponse({ transcript: formatTranscript() });
        } else if (request.action === "updateCaptionVisibility") {
          applyCaptionVisibility(!request.hide);
          sendResponse({ success: true });
        } else if (request.action === "triggerSendAndRedirect") {
          handleCallEnded();
          sendResponse({ success: true });
        }
      } catch (err) {
        console.log("[Simple Psi] Erro ignorado no processamento de comando:", err.message);
      }
      return true; // Mantém o canal aberto
    });
  } catch (e) {
    console.log("[Simple Psi] Falha ao registrar onMessage.");
  }
}

// Tentativas repetidas de ativar legendas ao carregar a página (Polling Resiliente)
function retryToggleAndVisibility(retriesLeft) {
  if (ccButtonRetryInterval) clearInterval(ccButtonRetryInterval);

  let attempts = 0;
  ccButtonRetryInterval = setInterval(() => {
    if (cleanAllProcessIfInvalid()) return;

    attempts++;
    console.log(`[Simple Psi] Tentando ativar legendas na página (Tentativa ${attempts}/${retriesLeft})...`);
    
    const activated = toggleMeetCaptions(true);
    if (activated) {
      clearInterval(ccButtonRetryInterval);
      ccButtonRetryInterval = null;
      console.log("[Simple Psi] Legendas ativadas com sucesso!");
      applyCaptionVisibility(false); // Sempre oculta as legendas na tela
    }

    if (attempts >= retriesLeft) {
      clearInterval(ccButtonRetryInterval);
      ccButtonRetryInterval = null;
      console.log("[Simple Psi] Esgotadas as tentativas de ativação automática do CC.");
    }
  }, 1000);
}

function startCapture() {
  console.log("[Simple Psi] Iniciando gravação de sessão...");
  isCapturing = true;
  hasAutoStarted = true; // Marca que já iniciou para evitar loop automático de reinício se pausado
  safeStorageSet({ isCapturing: true });
  retryToggleAndVisibility(15);
  startObserver();
}

function pauseCapture() {
  console.log("[Simple Psi] Gravação pausada.");
  isCapturing = false;
  safeStorageSet({ isCapturing: false });
  stopObserver();
}

function clearCapture() {
  console.log("[Simple Psi] Histórico de falas limpo.");
  sessionTranscript = [];
  finalizedTranscripts = [];
  activeBlocks = {};
  lastSender = "";
  lastText = "";
  safeStorageSet({ sessionTranscript: [] });
}

function startAutoStartCheck() {
  if (autoStartCheckInterval) return;

  autoStartCheckInterval = setInterval(() => {
    if (cleanAllProcessIfInvalid()) return;

    if (!hasAutoStarted) {
      safeStorageGet(["isCapturing"], (result) => {
        const isCapturingNow = result && result.isCapturing;
        if (!isCapturingNow) {
          const ccButton = findCCButton();
          if (ccButton) {
            console.log("[Simple Psi] Auto-início automático. Chamada detectada!");
            hasAutoStarted = true;
            clearCapture();
            startCapture();
          }
        } else {
          hasAutoStarted = true;
        }
      });
    }
  }, 1500);
}

function findCCButton() {
  return document.querySelector('button[aria-label*="legenda" i]') || 
         document.querySelector('button[aria-label*="caption" i]') || 
         document.querySelector('button[aria-label*="subtitle" i]') || 
         document.querySelector('button[aria-label*="subtítulo" i]') || 
         document.querySelector('[data-tooltip*="legenda" i]') ||
         document.querySelector('[data-tooltip*="caption" i]') ||
         document.querySelector('button[jscontroller="C47Gbd"]') ||
         document.querySelector('button[data-tooltip*="legenda" i]') ||
         document.querySelector('button[data-tooltip*="caption" i]') ||
         document.querySelector('button[aria-label*="fechar legendas" i]') || 
         document.querySelector('button[aria-label*="ativar legendas" i]') ||
         document.querySelector('button[aria-label*="ativar legenda" i]') ||
         Array.from(document.querySelectorAll('button')).find(btn => {
           const label = (btn.getAttribute('aria-label') || '').toLowerCase();
           const tooltip = (btn.getAttribute('data-tooltip') || '').toLowerCase();
           return label.includes('cc') || tooltip.includes('cc') || label.includes('legenda') || tooltip.includes('legenda');
         });
}

function toggleMeetCaptions(turnOn) {
  const ccButton = findCCButton();
  if (!ccButton) {
    return false;
  }

  const isPressed = ccButton.getAttribute("aria-pressed") === "true" || 
                    ccButton.classList.contains("j0n75e");

  if (turnOn && !isPressed) {
    ccButton.click();
    console.log("[Simple Psi] Clicou no botão de CC para ligar legendas.");
  } else if (!turnOn && isPressed) {
    ccButton.click();
    console.log("[Simple Psi] Clicou no botão de CC para desligar legendas.");
  }
  return true;
}

function applyCaptionVisibility(visible) {
  let styleEl = document.getElementById("simplepsi-hide-captions-style");
  
  if (!visible) {
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "simplepsi-hide-captions-style";
      styleEl.innerHTML = `
        .gV33Sb,
        div[jscontroller="D17x9c"],
        [jsname="vS77Sc"],
        .iT38sc,
        .XT8r9b,
        .j832df,
        div[jsname="j33Gae"],
        div[jsname="Ys4ryb"],
        .McS51c,
        .bh44bd,
        .aG755c,
        .TqC2Xe,
        .BHsPP,
        .nMcdL,
        .bj4p3b,
        .ygicle,
        .VbkSUe,
        div[jsname="dsyhDe"],
        [role="region"][aria-label*="caption" i],
        [role="region"][aria-label*="legenda" i],
        [role="region"][aria-label*="subtitle" i],
        [role="region"][aria-label*="subtítulo" i],
        [aria-live="polite"] {
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
          width: 1px !important;
          height: 1px !important;
          opacity: 0.001 !important;
          pointer-events: none !important;
          z-index: -9999 !important;
          overflow: hidden !important;
          display: block !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }
      `;
      document.head.appendChild(styleEl);
      console.log("[Simple Psi] Aplicado estilo de ocultação de legendas (posicionado fora de tela).");
    }
  } else {
    if (styleEl) {
      styleEl.remove();
      console.log("[Simple Psi] Estilo de ocultação removido.");
    }
  }
}

// 🎯 SCANNER DIAGNÓSTICO EM TEMPO REAL
setInterval(() => {
  if (cleanAllProcessIfInvalid() || !isCapturing) return;

  const allElements = document.querySelectorAll('span, div, p');
  allElements.forEach(el => {
    if (el.children.length === 0 && el.innerText) {
      const text = el.innerText.trim();
      
      if (
        text.includes("preguiça") || 
        text.includes("cemith") || 
        text.includes("capturando") ||
        text.includes("legenda") ||
        text === "Você"
      ) {
        console.log("%c[Simple Psi DIAGNOSTICS] ACHEI A LEGENDA NA TELA! 🎯", "color: #10b981; font-weight: bold; font-size: 14px;");
        console.log("Texto detectado:", text);
        console.log("Tag Name:", el.tagName);
        console.log("Class Name:", el.className);
        console.log("JSName:", el.getAttribute("jsname"));
      }
    }
  });
}, 1500);

function normalizeText(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "") // Remove pontuação
    .replace(/\s+/g, " ") // Colapsa múltiplos espaços
    .trim();
}

function getOrCreateBlockId(element) {
  let id = element.getAttribute("data-simplepsi-block-id");
  if (!id) {
    id = "block_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    element.setAttribute("data-simplepsi-block-id", id);
  }
  return id;
}

function finalizeMissingBlocks(currentDomIds) {
  let changed = false;
  for (const blockId in activeBlocks) {
    if (!currentDomIds.has(blockId)) {
      const finalized = activeBlocks[blockId];
      if (finalized.text && finalized.text !== "...") {
        const alreadyExists = finalizedTranscripts.some(t => t.timestamp === finalized.timestamp && t.text === finalized.text);
        if (!alreadyExists) {
          finalizedTranscripts.push(finalized);
          changed = true;
        }
      }
      delete activeBlocks[blockId];
    }
  }
  
  const combined = [...finalizedTranscripts, ...Object.values(activeBlocks)];
  combined.sort((a, b) => a.timestamp - b.timestamp);
  sessionTranscript = combined;

  safeStorageGet(["currentPatientId"], (res) => {
    if (cleanAllProcessIfInvalid()) return;
    const patientId = res?.currentPatientId;
    const dataToSave = { sessionTranscript };
    if (patientId) {
      dataToSave[`transcript_${patientId}`] = sessionTranscript;
    }
    safeStorageSet(dataToSave);
  });
}

function captureCaptions() {
  if (cleanAllProcessIfInvalid() || !isCapturing) return;

  const scannedBlockIds = new Set();

  // PIPELINE 1: Busca baseada em seletores de spans e classes clássicas e novas do Google Meet
  const textEls = document.querySelectorAll('[jsname="vS77Sc"], .iT38sc, .XT8r9b, .j832df, .ygicle, .VbkSUe, .ygicle.VbkSUe');
  
  textEls.forEach(el => {
    let block = null;
    let parent = el.parentElement;
    for (let i = 0; i < 6; i++) {
      if (!parent) break;
      if (parent.hasAttribute("data-sender-name") || 
          parent.getAttribute("jsname") === "j33Gae" || 
          parent.getAttribute("jsname") === "dsyhDe" || 
          parent.classList.contains("McS51c") || 
          parent.classList.contains("bh44bd") ||
          parent.classList.contains("nMcdL") ||
          parent.classList.contains("bj4p3b")) {
        block = parent;
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!block) {
      block = el.parentElement;
    }
    
    if (block && block.tagName !== "BODY" && block.tagName !== "HTML") {
      const blockId = getOrCreateBlockId(block);
      scannedBlockIds.add(blockId);
      
      // Get sender
      let sender = block.getAttribute("data-sender-name") || "";
      let nameEl = null;
      if (!sender) {
        nameEl = block.querySelector('.NWpY1d') ||
                 block.querySelector('[jsname="r4nke"]') || 
                 block.querySelector('.zs18rf') || 
                 block.querySelector('.zg34fc') || 
                 block.querySelector('.Vbk1fd') ||
                 block.querySelector('div:first-child');
        if (nameEl && nameEl.innerText && nameEl.innerText.trim().length < 50) {
          sender = nameEl.innerText.trim();
        }
      }
      if (!sender) {
        const imgEl = block.querySelector('img[alt]');
        if (imgEl && imgEl.getAttribute("alt")) {
          sender = imgEl.getAttribute("alt").trim();
        }
      }
      if (!sender) sender = "Orador";

      // Concatenate all text inside the block (excluding sender name elements)
      const spans = block.querySelectorAll('.ygicle, .VbkSUe, [jsname="vS77Sc"], .iT38sc, .XT8r9b, .j832df, span');
      let text = "";
      spans.forEach(spanEl => {
        // Exclude elements that are or are inside the speaker name element to avoid duplicating speaker name in text
        if (nameEl && (spanEl === nameEl || nameEl.contains(spanEl))) {
          return;
        }
        if (spanEl.closest('.NWpY1d') || spanEl.closest('[jsname="r4nke"]') || spanEl.closest('.zs18rf') || spanEl.closest('.zg34fc') || spanEl.closest('.Vbk1fd')) {
          return;
        }
        if (spanEl.children.length === 0 && spanEl.innerText) {
          text += " " + spanEl.innerText.trim();
        }
      });
      text = text.trim();
      
      if (text && text !== "...") {
        activeBlocks[blockId] = {
          sender: sender,
          text: text,
          timestamp: activeBlocks[blockId] ? activeBlocks[blockId].timestamp : Date.now()
        };
      }
    }
  });

  // PIPELINE 2: Escaneamento Agnóstico (Garante captura mesmo com redesign de classes)
  safeStorageGet(["currentPatientName"], (res) => {
    if (cleanAllProcessIfInvalid() || !isCapturing) return;
    const patientName = res?.currentPatientName || "";
    const elements = document.querySelectorAll('span, div, p');
    const speakerCandidates = [];

    elements.forEach(el => {
      if (el.children.length === 0 && el.innerText) {
        const text = el.innerText.trim();
        if (
          text === "Você" || 
          text === "You" || 
          (patientName && text.toLowerCase().includes(patientName.toLowerCase()))
        ) {
          speakerCandidates.push({ el, name: text });
        }
      }
    });

    speakerCandidates.forEach(({ el: nameEl, name }) => {
      let parent = nameEl.parentElement;
      let blockContainer = null;
      let depth = 0;
      
      // Find the specific speaker block container
      while (parent && depth < 4) {
        if (
          parent.getAttribute("jsname") === "j33Gae" || 
          parent.getAttribute("jsname") === "dsyhDe" || 
          parent.classList.contains("McS51c") || 
          parent.classList.contains("bh44bd") ||
          parent.classList.contains("nMcdL") ||
          parent.classList.contains("bj4p3b") ||
          parent.hasAttribute("data-sender-name")
        ) {
          blockContainer = parent;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
      
      // Fallback if no specific container matches
      if (!blockContainer) {
        blockContainer = nameEl.parentElement;
      }

      if (blockContainer) {
        const textNodes = Array.from(blockContainer.querySelectorAll('span, div, p'))
          .filter(node => node.children.length === 0 && node.innerText && node !== nameEl);
        
        textNodes.forEach(node => {
          const speechText = node.innerText.trim();
          if (
            speechText.length > 2 && 
            !speechText.includes(":") && 
            speechText !== "Você" && 
            speechText !== "You" &&
            (!patientName || !speechText.toLowerCase().includes(patientName.toLowerCase())) &&
            !speechText.includes("Sua reunião está segura") &&
            !speechText.includes("Adicionar outras pessoas")
          ) {
            const blockId = getOrCreateBlockId(blockContainer);
            scannedBlockIds.add(blockId);
            
            activeBlocks[blockId] = {
              sender: name === "You" ? "Você" : name,
              text: speechText,
              timestamp: activeBlocks[blockId] ? activeBlocks[blockId].timestamp : Date.now()
            };
          }
        });
      }
    });

    finalizeMissingBlocks(scannedBlockIds);
  });
}

function startObserver() {
  if (observer) return;

  console.log("[Simple Psi] Iniciando observers de diagnóstico...");
  captureCaptions();

  observer = new MutationObserver(() => {
    captureCaptions();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  backupInterval = setInterval(captureCaptions, 600);
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
  applyCaptionVisibility(true);
}

function formatTranscript() {
  if (sessionTranscript.length === 0) return "";
  return sessionTranscript
    .map(entry => `${entry.sender}: ${entry.text}`)
    .join("\n\n");
}

// Sincroniza informações de paciente presentes no hash da URL (patientId / patientName)
function syncPatientFromURL() {
  if (cleanAllProcessIfInvalid()) return;
  try {
    const hash = window.location.hash || "";
    const patientId = hash.match(/patientId=([^&]+)/)?.[1];
    const patientName = hash.match(/patientName=([^&]+)/)?.[1];
    
    if (patientId) {
      const decodedId = decodeURIComponent(patientId);
      const decodedName = patientName ? decodeURIComponent(patientName) : "Paciente";
      
      safeStorageGet(["currentPatientId"], (res) => {
        if (!res || res.currentPatientId !== decodedId) {
          safeStorageSet({ 
            currentPatientId: decodedId,
            currentPatientName: decodedName
          });
          console.log("[Simple Psi] Sincronizado paciente da URL:", decodedName, decodedId);
        }
      });
    }
  } catch (e) {
    console.error("[Simple Psi] Erro ao ler paciente da URL:", e);
  }
}

// Agenda a sincronização periódica do paciente a partir do hash da URL
setInterval(syncPatientFromURL, 2000);

function handleCallEnded() {
  if (sessionTranscript.length === 0) {
    console.log("[Simple Psi] Chamada encerrada, mas a transcrição está vazia. Nenhuma ação necessária.");
    return;
  }
  
  console.log("[Simple Psi] Processando encerramento de chamada...");
  
  // 1. Pausa a captura
  isCapturing = false;
  safeStorageSet({ isCapturing: false });
  stopObserver();
  
  // 2. Formata e salva a transcrição no storage local como pendente
  const formattedText = formatTranscript();
  safeStorageGet(["currentPatientId", "currentPatientName"], (res) => {
    const patientId = res?.currentPatientId || "";
    const patientName = res?.currentPatientName || "";
    
    safeStorageSet({
      pendingTranscriptText: formattedText,
      pendingTranscriptPatientId: patientId,
      pendingTranscriptPatientName: patientName
    }, () => {
      console.log("[Simple Psi] Transcrição pendente salva com sucesso!");
      
      // 3. Envia mensagem ao background.js para abrir a página de importação
      if (isContextValid()) {
        try {
          chrome.runtime.sendMessage({
            action: "openImportTranscriptPage",
            patientId: patientId,
            patientName: patientName
          });
        } catch (e) {
          console.error("[Simple Psi] Falha ao enviar mensagem openImportTranscriptPage:", e);
        }
      }
    });
  });
}

// Sincroniza e detecta o fim da chamada por clique no botão de sair
document.addEventListener("click", (event) => {
  if (!isCapturing) return; // Só importa se estiver capturando ativamente

  const btn = event.target.closest('button[aria-label*="Sair da chamada" i]') || 
              event.target.closest('button[aria-label*="Leave call" i]') || 
              event.target.closest('button[jsname="V6Eaeb"]') ||
              event.target.closest('[data-tooltip*="Sair da chamada" i]') ||
              event.target.closest('[data-tooltip*="Leave call" i]') ||
              event.target.closest('button[aria-label*="Sair" i]') ||
              event.target.closest('button[aria-label*="sair" i]');
  if (btn) {
    console.log("[Simple Psi] Clique no botão de encerrar chamada detectado!");
    handleCallEnded();
  }
});

