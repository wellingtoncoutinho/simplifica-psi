// popup.js - Controlador do Popup da Extensão

document.addEventListener("DOMContentLoaded", () => {
  const statusBadge = document.getElementById("status-badge");
  const wordCount = document.getElementById("word-count");
  const preview = document.getElementById("preview");
  const btnToggle = document.getElementById("btn-toggle");
  const toggleIcon = document.getElementById("toggle-icon");
  const toggleText = document.getElementById("toggle-text");
  const btnClear = document.getElementById("btn-clear");
  const btnSend = document.getElementById("btn-send");
  const alertBox = document.getElementById("alert-box");
  
  // Novos checkboxes de preferência (mantidos ocultos no html)
  const chkAutoStart = document.getElementById("chk-auto-start");
  const chkHideCaptions = document.getElementById("chk-hide-captions");

  let activeMeetTab = null;

  // Força autoStartCapture e hideMeetCaptions como true no storage local para manter a funcionalidade sempre automática
  chrome.storage.local.set({ autoStartCapture: true, hideMeetCaptions: true }, () => {
    if (chkAutoStart) chkAutoStart.checked = true;
    if (chkHideCaptions) chkHideCaptions.checked = true;
  });

  // Salva a alteração do Auto-Iniciar (mantido apenas por compatibilidade com elementos do DOM)
  if (chkAutoStart) {
    chkAutoStart.addEventListener("change", () => {
      chrome.storage.local.set({ autoStartCapture: chkAutoStart.checked });
    });
  }

  // Salva e notifica a aba sobre Ocultar Legendas (mantido apenas por compatibilidade com elementos do DOM)
  if (chkHideCaptions) {
    chkHideCaptions.addEventListener("change", () => {
      const hide = chkHideCaptions.checked;
      chrome.storage.local.set({ hideMeetCaptions: hide }, () => {
        // Se estiver em uma aba do Meet, avisa o content script para aplicar/remover o CSS na hora
        if (activeMeetTab) {
          chrome.tabs.sendMessage(activeMeetTab.id, { 
            action: "updateCaptionVisibility", 
            hide: hide 
          });
        }
      });
    });
  }

  // 2. Verifica se a aba ativa é o Google Meet
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.url && activeTab.url.includes("meet.google.com")) {
      activeMeetTab = activeTab;
      
      // Conecta com o content script do Meet para carregar dados iniciais
      loadStatusFromMeet();
      
      // Cria uma atualização periódica da visualização (a cada 1 segundo)
      setInterval(loadStatusFromMeet, 1000);
    } else {
      // O usuário abriu o popup fora do Google Meet
      disableMeetControls("Abra o Google Meet para iniciar a captura.");
    }
  });

  // Carrega e atualiza os status e o texto coletado do Google Meet
  function loadStatusFromMeet() {
    if (!activeMeetTab) return;

    // Recupera informações salvas localmente
    chrome.storage.local.get(["isCapturing", "sessionTranscript", "currentPatientName"], (result) => {
      const isCapturing = result.isCapturing || false;
      const sessionTranscript = result.sessionTranscript || [];
      const currentPatientName = result.currentPatientName || "";

      // Atualiza Status Badge
      if (isCapturing) {
        statusBadge.innerText = currentPatientName ? `Gravando (${currentPatientName})` : "Gravando";
        statusBadge.className = "status-badge active";
        toggleIcon.innerText = "⏸";
        toggleText.innerText = "Pausar";
        btnToggle.className = "btn-secondary";
      } else {
        statusBadge.innerText = currentPatientName ? `Pausado (${currentPatientName})` : "Pausado";
        statusBadge.className = "status-badge inactive";
        toggleIcon.innerText = "▶";
        toggleText.innerText = "Capturar";
        btnToggle.className = "btn-primary";
      }

      // Conta palavras
      let text = "";
      if (sessionTranscript.length > 0) {
        text = sessionTranscript.map(e => `${e.sender}: ${e.text}`).join("\n\n");
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCount.innerText = words;
        
        // Atualiza a caixa de visualização
        preview.innerText = text;
        preview.scrollTop = preview.scrollHeight; // Rola para o fim
      } else {
        wordCount.innerText = "0";
        preview.innerHTML = `<div class="preview-placeholder">Nenhuma fala capturada ainda. Inicie a captura e certifique-se de que a legenda do Google Meet está ativa.</div>`;
      }
    });
  }

  // Desativa os botões do Meet se não estiver na aba do Meet
  function disableMeetControls(message) {
    statusBadge.innerText = "Sem Conexão";
    statusBadge.className = "status-badge inactive";
    btnToggle.disabled = true;
    btnToggle.style.opacity = "0.5";
    btnClear.disabled = true;
    btnClear.style.opacity = "0.5";
    
    // Tenta pelo menos carregar a prévia do storage local se houver alguma anterior
    chrome.storage.local.get(["sessionTranscript"], (result) => {
      const sessionTranscript = result.sessionTranscript || [];
      if (sessionTranscript.length > 0) {
        const text = sessionTranscript.map(e => `${e.sender}: ${e.text}`).join("\n\n");
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCount.innerText = words;
        preview.innerText = text;
      } else {
        preview.innerHTML = `<div class="preview-placeholder" style="color: #ff9800;">${message}</div>`;
      }
    });
  }

  // Evento: Botão Iniciar/Pausar Captura
  btnToggle.addEventListener("click", () => {
    if (!activeMeetTab) return;

    chrome.storage.local.get(["isCapturing"], (result) => {
      const isCapturing = result.isCapturing || false;
      const newAction = isCapturing ? "pauseCapture" : "startCapture";

      chrome.tabs.sendMessage(activeMeetTab.id, { action: newAction }, (response) => {
        loadStatusFromMeet();
      });
    });
  });

  // Evento: Botão Limpar Histórico
  btnClear.addEventListener("click", () => {
    if (!confirm("Deseja mesmo limpar todo o histórico de falas capturado?")) return;

    chrome.storage.local.set({ sessionTranscript: [] }, () => {
      if (activeMeetTab) {
        chrome.tabs.sendMessage(activeMeetTab.id, { action: "clearCapture" }, () => {
          loadStatusFromMeet();
        });
      } else {
        loadStatusFromMeet();
      }
    });
  });

  // Evento: Botão Enviar para o Simple Psi
  btnSend.addEventListener("click", () => {
    showAlert("", false); // Limpa alertas anteriores

    chrome.storage.local.get(["sessionTranscript", "currentPatientId", "currentPatientName"], (result) => {
      const sessionTranscript = result.sessionTranscript || [];
      const patientId = result.currentPatientId || "";
      const patientName = result.currentPatientName || "";

      if (sessionTranscript.length === 0) {
        showAlert("Erro: Nenhuma palavra capturada para enviar.", true);
        return;
      }

      btnSend.disabled = true;
      btnSend.innerText = "Enviando...";

      const formattedText = sessionTranscript
        .map(entry => `${entry.sender}: ${entry.text}`)
        .join("\n\n");

      // Salva diretamente no storage local de forma persistente
      chrome.storage.local.set({
        pendingTranscriptText: formattedText,
        pendingTranscriptPatientId: patientId,
        pendingTranscriptPatientName: patientName,
        [`transcript_${patientId}`]: sessionTranscript,
        isCapturing: false // Pausa a gravação
      }, () => {
        // Avisa a aba do Meet (se ativa) para pausar seus observers
        if (activeMeetTab) {
          chrome.tabs.sendMessage(activeMeetTab.id, { action: "pauseCapture" });
        }

        // Envia mensagem ao background.js para abrir/focar o SimplePsi
        chrome.runtime.sendMessage({
          action: "openImportTranscriptPage",
          patientId: patientId,
          patientName: patientName
        }, () => {
          btnSend.disabled = false;
          btnSend.innerText = "🚀 Enviar para o Simple Psi";
          window.close(); // Fecha o popup
        });
      });
    });
  });

  // Exibe caixas de alerta na tela
  function showAlert(msg, isError = true, isSuccess = false) {
    if (!msg) {
      alertBox.style.display = "none";
      return;
    }

    alertBox.innerText = msg;
    alertBox.style.display = "block";

    if (isError) {
      alertBox.className = "alert alert-error";
    } else if (isSuccess) {
      alertBox.className = "alert alert-success";
      setTimeout(() => {
        alertBox.style.display = "none";
      }, 3000);
    }
  }
});
