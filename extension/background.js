// background.js - Service Worker coordenador de mensagens

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendTranscriptToWebpage") {
    const text = request.text;
    
    // Procura por abas ativas do Simple Psi
    chrome.tabs.query({}, (tabs) => {
      const simplePsiTabs = tabs.filter(tab => 
        tab.url && (
          tab.url.includes("localhost:") || 
          tab.url.includes("simplepsi.com") || 
          tab.url.includes("vercel.app")
        )
      );

      if (simplePsiTabs.length > 0) {
        // Encontra a primeira aba do Simple Psi
        const targetTab = simplePsiTabs[0];

        // Foca na aba e na janela dela
        chrome.tabs.update(targetTab.id, { active: true }, () => {
          chrome.windows.update(targetTab.windowId, { focused: true }, () => {
            // Envia a transcrição para o content script injetar no textarea
            setTimeout(() => {
              chrome.tabs.sendMessage(targetTab.id, { 
                action: "injectTranscriptionText", 
                text: text 
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error("Erro ao enviar mensagem:", chrome.runtime.lastError);
                  sendResponse({ success: false, error: "Certifique-se de que está na aba de Nova Sessão do Simple Psi." });
                } else {
                  sendResponse({ success: true });
                }
              });
            }, 300); // Pequeno atraso para dar tempo da aba carregar o foco
          });
        });
      } else {
        // Nenhuma aba aberta do Simple Psi encontrada
        sendResponse({ 
          success: false, 
          error: "Nenhuma aba do Simple Psi aberta foi encontrada. Abra o site para enviar a transcrição!" 
        });
      }
    });

    return true; // Retorno assíncrono do sendResponse
  }

  if (request.action === "openImportTranscriptPage") {
    // Procura por abas do Simple Psi
    chrome.tabs.query({}, (tabs) => {
      const simplePsiTabs = tabs.filter(tab => 
        tab.url && (
          tab.url.includes("localhost:") || 
          tab.url.includes("simplepsi.com") || 
          tab.url.includes("vercel.app")
        )
      );

      if (simplePsiTabs.length > 0) {
        // Encontra a primeira aba do Simple Psi
        const targetTab = simplePsiTabs[0];
        
        // Constrói a URL para import-transcript preservando o host
        const baseUrl = new URL(targetTab.url).origin;
        const newUrl = `${baseUrl}/?goto=import-transcript`;

        // Foca na aba, na janela dela e atualiza a URL
        chrome.tabs.update(targetTab.id, { url: newUrl, active: true }, () => {
          chrome.windows.update(targetTab.windowId, { focused: true });
        });
      } else {
        // Nenhuma aba aberta do Simple Psi encontrada, abre uma nova
        chrome.tabs.create({ url: "https://simplepsi.com/?goto=import-transcript" });
      }
      sendResponse({ success: true });
    });

    return true; // Canal assíncrono
  }
});

