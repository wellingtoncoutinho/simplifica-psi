// content_simplepsi.js - Executado nas abas do Simple Psi

if (window.location.search.includes('goto=import-transcript')) {
  window.history.replaceState({}, '', '/import-transcript');
}

console.log("[Simple Psi] Integrador de Extensão ativo.");

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

let lastCheckedPatientId = null;

function checkPendingTranscriptions() {
  if (!isContextValid()) return;
  const activePatientEl = document.getElementById("simplepsi-active-patient");
  const textarea = document.getElementById("transcription-textarea");

  if (!activePatientEl || !textarea) {
    removeImportBanner();
    lastCheckedPatientId = null;
    return;
  }

  const patientId = activePatientEl.getAttribute("data-id");
  const patientName = activePatientEl.getAttribute("data-name") || "Paciente";

  if (patientId === lastCheckedPatientId) return;
  lastCheckedPatientId = patientId;

  // Busca no chrome.storage local se há transcrição gravada para este paciente específico
  chrome.storage.local.get([`transcript_${patientId}`], (result) => {
    const transcript = result[`transcript_${patientId}`] || [];
    
    if (transcript.length > 0) {
      showImportBanner(patientId, patientName, transcript, textarea);
    } else {
      removeImportBanner();
    }
  });
}

function showImportBanner(patientId, patientName, transcript, textarea) {
  removeImportBanner();

  const formattedText = transcript
    .map(entry => `${entry.sender}: ${entry.text}`)
    .join("\n\n");

  const words = formattedText.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Cria o elemento do banner com estilo super premium combinando com o SimplePsi
  const banner = document.createElement("div");
  banner.id = "simplepsi-extension-import-banner";
  banner.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(95, 125, 92, 0.1);
    border: 1px solid rgba(95, 125, 92, 0.25);
    border-radius: 16px;
    padding: 12px 20px;
    margin-bottom: 16px;
    font-family: system-ui, -apple-system, sans-serif;
    animation: slideDown 0.3s ease-out;
  `;

  const style = document.createElement("style");
  style.id = "simplepsi-banner-style";
  style.innerHTML = `
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  banner.innerHTML = `
    <div style="text-align: left;">
      <p style="margin: 0; font-size: 13px; font-weight: bold; color: var(--text-main, #333);">
        ✨ Transcrição do Google Meet encontrada (${words} palavras)
      </p>
      <p style="margin: 2px 0 0 0; font-size: 11px; color: var(--text-muted, #666);">
        Detectamos as falas gravadas da chamada online de <strong>${patientName}</strong>. Deseja importar?
      </p>
    </div>
    <div style="display: flex; gap: 8px; flex-shrink: 0;">
      <button id="simplepsi-btn-clear-transcript" style="
        background: transparent;
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #ef4444;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
      ">Descartar</button>
      <button id="simplepsi-btn-import-transcript" style="
        background: #5f7d5c;
        border: none;
        color: white;
        padding: 6px 16px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(95, 125, 92, 0.15);
        transition: all 0.2s;
      ">Sim, Importar</button>
    </div>
  `;

  textarea.parentNode.insertBefore(banner, textarea);

  document.getElementById("simplepsi-btn-import-transcript").addEventListener("click", () => {
    if (!isContextValid()) {
      alert("A conexão com a extensão foi atualizada. Por favor, recarregue a página para continuar!");
      return;
    }
    try {
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 
        "value"
      ).set;
      
      nativeValueSetter.call(textarea, formattedText);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.focus();
      
      const keysToRemove = [`transcript_${patientId}`, "sessionTranscript"];
      chrome.storage.local.remove(keysToRemove, () => {
        removeImportBanner();
        console.log("[Simple Psi] Transcrição importada e limpa do storage.");
      });
    } catch (e) {
      textarea.value = formattedText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      removeImportBanner();
    }
  });

  document.getElementById("simplepsi-btn-clear-transcript").addEventListener("click", () => {
    if (confirm("Deseja mesmo descartar esta transcrição?")) {
      if (!isContextValid()) {
        alert("A conexão com a extensão foi atualizada. Por favor, recarregue a página para continuar!");
        return;
      }
      const keysToRemove = [`transcript_${patientId}`, "sessionTranscript"];
      chrome.storage.local.remove(keysToRemove, () => {
        removeImportBanner();
        console.log("[Simple Psi] Transcrição descartada e limpa.");
      });
    }
  });
}

function removeImportBanner() {
  const banner = document.getElementById("simplepsi-extension-import-banner");
  if (banner) banner.remove();
  
  const style = document.getElementById("simplepsi-banner-style");
  if (style) style.remove();
}

function checkImportTranscriptPage() {
  if (!isContextValid()) return;
  if (!window.location.pathname.includes('/import-transcript')) return;

  const input = document.getElementById("simplepsi-pending-transcript-input");
  const inputPatientId = document.getElementById("simplepsi-pending-patient-id-input");
  const triggerBtn = document.getElementById("simplepsi-trigger-import");

  chrome.storage.local.get(["pendingTranscriptText", "pendingTranscriptPatientId"], (result) => {
    const text = result.pendingTranscriptText || "";
    const patientId = result.pendingTranscriptPatientId || "";

    console.log("[Simple Psi Content Script] checkImportTranscriptPage: text length =", text.length, "patientId =", patientId, "inputs found:", !!input, !!triggerBtn);

    if (text) {
      // 1. Envia via postMessage para o React (Mais moderno e seguro contra race conditions de renderização)
      window.postMessage({
        type: 'SIMPLEPSI_IMPORT_TRANSCRIPT',
        text: text,
        patientId: patientId
      }, "*");

      // 2. Fallback via DOM tradicional se os elementos já estiverem montados
      if (input && triggerBtn && input.getAttribute("data-imported") !== "true") {
        input.value = text;
        if (inputPatientId) {
          inputPatientId.value = patientId;
        }
        input.setAttribute("data-imported", "true");
        triggerBtn.click();
        console.log("[Simple Psi] Transcrição e Paciente importados via DOM fallback.");
      }
    }
  });
}

// Inicia verificação periódica
setInterval(checkPendingTranscriptions, 1000);
setInterval(checkImportTranscriptPage, 1000);

// Mantém suporte para injeção direta de popup
if (isContextValid()) {
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!isContextValid()) return;
      if (request.action === "injectTranscriptionText") {
        const text = request.text;
        const textarea = document.getElementById("transcription-textarea");

        if (textarea) {
          try {
            const nativeValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype, 
              "value"
            ).set;
            nativeValueSetter.call(textarea, text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.focus();
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sendResponse({ success: true });
          } catch (err) {
            textarea.value = text;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            sendResponse({ success: true });
          }
        } else {
          sendResponse({ 
            success: false, 
            error: "Por favor, abra a tela 'Registrar Nova Sessão' do paciente para enviar a transcrição!" 
          });
        }
      }
    });
  } catch (e) {
    console.log("[Simple Psi] Falha ao registrar onMessage.");
  }
}

// Listener para limpar o storage de forma confiável sob demanda da aplicação React (Save/Cancel)
window.addEventListener("simplepsi-clear-transcript", () => {
  if (!isContextValid()) return;
  chrome.storage.local.remove(["pendingTranscriptText", "pendingTranscriptPatientId", "sessionTranscript"], () => {
    console.log("[Simple Psi] Storage local limpo sob demanda do App.");
  });
});
