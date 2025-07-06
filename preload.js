const { contextBridge, ipcRenderer } = require('electron');

// ===== API BRIDGE SICURO =====
contextBridge.exposeInMainWorld('electronAPI', {
  // ===== CONTROLLI FINESTRA =====
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  toggleMaximize: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  
  // ===== GESTIONE DATI BASE =====
  
  // Offerte
  loadQuotes: () => ipcRenderer.invoke('load-quotes'),
  saveQuotes: (quotes) => ipcRenderer.invoke('save-quotes', quotes),
  
  // Prodotti
  loadProducts: () => ipcRenderer.invoke('load-products'),
  saveProducts: (products) => ipcRenderer.invoke('save-products', products),
  
  // Clienti
  loadClients: () => ipcRenderer.invoke('load-clients'),
  saveClients: (clients) => ipcRenderer.invoke('save-clients', clients),
  
  // Impostazioni
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Analytics
  loadAnalytics: () => ipcRenderer.invoke('load-analytics'),
  saveAnalytics: (analytics) => ipcRenderer.invoke('save-analytics', analytics),
  
  // ===== GESTIONE FILE =====
  
  // PDF
  savePDF: (pdfData, fileName, options) => ipcRenderer.invoke('save-pdf', pdfData, fileName, options),
  
  // Export/Import
  exportData: (data, fileName, format) => ipcRenderer.invoke('export-data', data, fileName, format),
  importData: (type) => ipcRenderer.invoke('import-data', type),
  
  // ===== BACKUP E RIPRISTINO =====
  createBackup: () => ipcRenderer.invoke('create-backup'),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  
  // ===== DIALOG E NOTIFICHE =====
  showError: (title, message) => ipcRenderer.invoke('show-error', title, message),
  showInfo: (title, message, detail) => ipcRenderer.invoke('show-info', title, message, detail),
  showQuestion: (title, message, buttons) => ipcRenderer.invoke('show-question', title, message, buttons),
  
  // ===== INFORMAZIONI SISTEMA =====
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // ===== UTILITÀ SISTEMA =====
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  
  // ===== EVENTI DA MENU =====
  onNewQuote: (callback) => ipcRenderer.on('new-quote', callback),
  onSaveQuote: (callback) => ipcRenderer.on('save-quote', callback),
  onExportPDF: (callback) => ipcRenderer.on('export-pdf', callback),
  onNavigateTo: (callback) => ipcRenderer.on('navigate-to', callback),
  onShowChat: (callback) => ipcRenderer.on('show-chat', callback),
  onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),
  onShowCalculator: (callback) => ipcRenderer.on('show-calculator', callback),
  onGenerateReport: (callback) => ipcRenderer.on('generate-report', callback),
  onImportData: (callback) => ipcRenderer.on('import-data', callback),
  onRestoreBackup: (callback) => ipcRenderer.on('restore-backup', callback),
  
  // ===== CLEANUP LISTENERS =====
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // ===== GESTIONE PERFORMANCE =====
  getMemoryUsage: () => process.memoryUsage(),
  getCPUUsage: () => process.cpuUsage(),
});

// ===== API CLAUDE AVANZATA =====
contextBridge.exposeInMainWorld('claude', {
  complete: async (prompt, options = {}) => {
    try {
      // Configurazione avanzata per diversi tipi di richieste
      const {
        maxTokens = 1000,
        temperature = 0.7,
        context = 'general',
        language = 'it'
      } = options;

      // Analisi del tipo di richiesta per risposta personalizzata
      const lowerPrompt = prompt.toLowerCase();
      
      // ===== ANALISI PREZZI E COSTI =====
      if (lowerPrompt.includes('prezzo') || lowerPrompt.includes('costo') || lowerPrompt.includes('tariff')) {
        return await handlePricingQuery(prompt);
      }
      
      // ===== GESTIONE SCONTI =====
      if (lowerPrompt.includes('sconto') || lowerPrompt.includes('discount') || lowerPrompt.includes('promozione')) {
        return await handleDiscountQuery(prompt);
      }
      
      // ===== STRATEGIE COMMERCIALI =====
      if (lowerPrompt.includes('strategia') || lowerPrompt.includes('vendita') || lowerPrompt.includes('marketing')) {
        return await handleSalesStrategy(prompt);
      }
      
      // ===== GESTIONE CLIENTI =====
      if (lowerPrompt.includes('cliente') || lowerPrompt.includes('customer') || lowerPrompt.includes('segmentazione')) {
        return await handleClientQuery(prompt);
      }
      
      // ===== ANALISI DATI =====
      if (lowerPrompt.includes('analisi') || lowerPrompt.includes('report') || lowerPrompt.includes('trend')) {
        return await handleAnalyticsQuery(prompt);
      }
      
      // ===== GESTIONE PRODOTTI =====
      if (lowerPrompt.includes('prodotto') || lowerPrompt.includes('servizio') || lowerPrompt.includes('catalogo')) {
        return await handleProductQuery(prompt);
      }
      
      // ===== OFFERTE E PREVENTIVI =====
      if (lowerPrompt.includes('offerta') || lowerPrompt.includes('preventivo') || lowerPrompt.includes('proposta')) {
        return await handleQuoteQuery(prompt);
      }
      
      // ===== ASPETTI LEGALI E FISCALI =====
      if (lowerPrompt.includes('fattura') || lowerPrompt.includes('tasse') || lowerPrompt.includes('iva')) {
        return await handleLegalQuery(prompt);
      }
      
      // ===== SUPPORTO TECNICO =====
      if (lowerPrompt.includes('problema') || lowerPrompt.includes('errore') || lowerPrompt.includes('aiuto')) {
        return await handleSupportQuery(prompt);
      }
      
      // ===== RISPOSTA GENERICA =====
      return await handleGeneralQuery(prompt);
      
    } catch (error) {
      console.error('Errore Claude API:', error);
      return "Mi dispiace, c'è stato un errore tecnico. Per favore riprova o contatta il supporto se il problema persiste.";
    }
  }
});

// ===== FUNZIONI HELPER PER CLAUDE =====

async function handlePricingQuery(prompt) {
  const responses = [
    "Per determinare prezzi competitivi, considera questi fattori:\n\n• **Costi diretti**: materiali, manodopera, spese operative\n• **Margine target**: generalmente 20-40% per prodotti, 50-70% per servizi\n• **Analisi competitor**: posizionamento nel mercato\n• **Valore percepito**: benefici unici che offri\n\n💡 **Suggerimento**: Usa la strategia del 'value-based pricing' - prezzi basati sul valore per il cliente, non solo sui costi.",
    
    "Ecco alcune strategie di pricing efficaci:\n\n• **Prezzo psicologico**: €99 invece di €100\n• **Bundle pricing**: pacchetti con sconto\n• **Prezzo dinamico**: variazioni stagionali\n• **Freemium**: base gratuita + premium\n\n🎯 **Pro tip**: Testa sempre 2-3 livelli di prezzo per trovare l'ottimale.",
    
    "Per calcolare il prezzo ottimale:\n\n1. **Costo totale** × 1.3-1.7 (margine)\n2. **Benchmark competitor** ± 10-15%\n3. **Test con clienti** pilota\n4. **Aggiustamenti** in base ai feedback\n\n📊 Il prezzo giusto massimizza profitto × volume vendite."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

async function handleDiscountQuery(prompt) {
  const discountAdvice = [
    "Strategie di sconto intelligenti:\n\n• **Sconto volume**: 5-10% per ordini grandi\n• **Sconto fedeltà**: 3-7% per clienti ricorrenti\n• **Pagamento anticipato**: 2-5% per pagamento immediato\n• **Sconto stagionale**: 10-20% in periodi specifici\n\n⚠️ **Attenzione**: evita sconti superiori al 30% - danneggiano la percezione del valore.",
    
    "Tipi di sconto per massimizzare le vendite:\n\n• **Sconto progressivo**: aumenta con la quantità\n• **Sconto a tempo**: urgenza e scarsità\n• **Sconto combo**: prodotti correlati insieme\n• **Sconto primo acquisto**: acquisizione nuovi clienti\n\n🎯 Obiettivo: aumentare il valore medio dell'ordine, non solo il volume."
  ];
  
  return discountAdvice[Math.floor(Math.random() * discountAdvice.length)];
}

async function handleSalesStrategy(prompt) {
  const strategies = [
    "Strategia di vendita moderna:\n\n1. **Ascolta attivamente** il cliente\n2. **Identifica il problema** reale\n3. **Presenta la soluzione** su misura\n4. **Dimostra il valore** con esempi concreti\n5. **Gestisci le obiezioni** con empatia\n6. **Chiudi** con sicurezza\n\n🚀 Focus sul valore, non sul prezzo!",
    
    "Tecniche di vendita efficaci:\n\n• **SPIN Selling**: Situation, Problem, Implication, Need\n• **Consultative selling**: consulente vs venditore\n• **Social selling**: LinkedIn e networking\n• **Storytelling**: casi di successo concreti\n\n💼 Il 80% delle vendite avviene dopo il 5° contatto - persistenza è chiave!"
  ];
  
  return strategies[Math.floor(Math.random() * strategies.length)];
}

async function handleClientQuery(prompt) {
  const clientAdvice = [
    "Segmentazione clienti efficace:\n\n• **VIP**: >€50k annui, servizio premium\n• **Standard**: €10-50k, servizio regolare\n• **Nuovo**: <€10k, focus acquisizione\n\n📋 **Azioni**:\n- VIP: account manager dedicato\n- Standard: check-in mensili\n- Nuovo: onboarding guidato",
    
    "Gestione relazioni clienti:\n\n• **CRM aggiornato**: ogni interazione tracciata\n• **Follow-up sistematico**: 1-3-7-30 giorni\n• **Feedback attivo**: surveys e chiamate\n• **Valore aggiunto**: contenuti utili, consigli\n\n🎯 Obiettivo: lifetime value, non singola vendita."
  ];
  
  return clientAdvice[Math.floor(Math.random() * clientAdvice.length)];
}

async function handleAnalyticsQuery(prompt) {
  const analyticsAdvice = [
    "Metriche commerciali chiave:\n\n• **Conversion rate**: offerte/vendite chiuse\n• **Average deal size**: valore medio offerta\n• **Sales cycle**: tempo medio chiusura\n• **Customer acquisition cost**: costo acquisizione\n• **Lifetime value**: valore cliente nel tempo\n\n📊 Misura tutto, migliora costantemente!",
    
    "Come interpretare i trend:\n\n• **Trend stagionali**: picchi e cali prevedibili\n• **Trend di crescita**: mese su mese\n• **Performance prodotti**: best e worst sellers\n• **Efficacia canali**: quale porta più vendite\n\n🔍 I dati raccontano sempre una storia - impara a leggerla."
  ];
  
  return analyticsAdvice[Math.floor(Math.random() * analyticsAdvice.length)];
}

async function handleProductQuery(prompt) {
  const productAdvice = [
    "Ottimizzazione catalogo prodotti:\n\n• **Analisi ABC**: 20% prodotti = 80% fatturato\n• **Cross-selling**: prodotti complementari\n• **Up-selling**: versioni premium\n• **Lifecycle management**: introduzione-crescita-declino\n\n💡 Focus sui prodotti ad alto margine e rotazione.",
    
    "Descrizioni prodotti efficaci:\n\n• **Benefici** invece di caratteristiche\n• **Linguaggio cliente** non tecnico\n• **Social proof**: recensioni e casi\n• **Call-to-action** chiara\n\n✨ Racconta come il prodotto migliora la vita del cliente."
  ];
  
  return productAdvice[Math.floor(Math.random() * productAdvice.length)];
}

async function handleQuoteQuery(prompt) {
  const quoteAdvice = [
    "Offerta vincente in 7 punti:\n\n1. **Intestazione professionale** con logo\n2. **Analisi esigenze** del cliente\n3. **Soluzione proposta** dettagliata\n4. **Investimento** (non 'costo')\n5. **Termini e condizioni** chiari\n6. **Garanzie** e supporto post-vendita\n7. **Call-to-action** con scadenza\n\n🏆 Un'offerta è una proposta di valore, non una lista prezzi!",
    
    "Elementi che aumentano il tasso di chiusura:\n\n• **Personalizzazione**: nome e logo cliente\n• **Urgenza controllata**: validità limitata\n• **Opzioni multiple**: basic/standard/premium\n• **Testimonial**: casi di successo simili\n• **FAQ**: anticipa e risolvi dubbi\n\n📈 Offerte personalizzate chiudono 5x di più di quelle generiche."
  ];
  
  return quoteAdvice[Math.floor(Math.random() * quoteAdvice.length)];
}

async function handleLegalQuery(prompt) {
  return "Per questioni legali e fiscali, ti consiglio di consultare sempre un commercialista o consulente legale qualificato. Posso però aiutarti con:\n\n• **Best practices** per contratti\n• **Modelli** di condizioni generali\n• **Promemoria** scadenze fiscali\n• **Organizzazione** documentale\n\n⚖️ La conformità legale è fondamentale per il business!";
}

async function handleSupportQuery(prompt) {
  return "Sono qui per aiutarti! Posso assisterti con:\n\n• **Creazione offerte** ottimizzate\n• **Gestione clienti** e segmentazione\n• **Strategie pricing** competitive\n• **Analisi dati** e trend\n• **Automazione** processi commerciali\n\n🛠️ Descrivi il problema specifico e ti darò una soluzione passo-passo!";
}

async function handleGeneralQuery(prompt) {
  return "Ciao! Sono il tuo assistente commerciale AI 🤖\n\nPosso aiutarti con:\n\n• **Strategie di vendita** e pricing\n• **Gestione clienti** e segmentazione\n• **Analisi performance** e trend\n• **Ottimizzazione processi** commerciali\n• **Creazione contenuti** per offerte\n\n💬 Chiedimi qualsiasi cosa sul tuo business - sono qui per farti crescere!";
}

// ===== UTILITIES E PERFORMANCE =====
contextBridge.exposeInMainWorld('appUtils', {
  // Formatters
  formatCurrency: (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },
  
  formatDate: (date, format = 'it-IT') => {
    return new Date(date).toLocaleDateString(format);
  },
  
  formatNumber: (number, decimals = 2) => {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  },
  
  // Validators
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  validateVAT: (vat) => {
    // Validazione P.IVA italiana semplificata
    return /^[0-9]{11}$/.test(vat);
  },
  
  validatePhone: (phone) => {
    // Validazione telefono italiana semplificata
    return /^[\+]?[(]?[\+]?[0-9\s\-\(\)]{10,}$/.test(phone);
  },
  
  // Data processing
  generateId: () => {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  },
  
  slugify: (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  },
  
  // File utilities
  getFileExtension: (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },
  
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // Performance monitoring
  measurePerformance: (name, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  },
  
  // Local storage helpers (for temporary data)
  setTempData: (key, data) => {
    sessionStorage.setItem(key, JSON.stringify(data));
  },
  
  getTempData: (key) => {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  
  removeTempData: (key) => {
    sessionStorage.removeItem(key);
  },
  
  // Theme utilities
  getSystemTheme: () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  
  watchThemeChanges: (callback) => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', callback);
    return () => mediaQuery.removeEventListener('change', callback);
  }
});

// ===== DEBUG E DEVELOPMENT =====
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('debug', {
    log: (...args) => console.log('[DEBUG]', ...args),
    error: (...args) => console.error('[DEBUG ERROR]', ...args),
    warn: (...args) => console.warn('[DEBUG WARN]', ...args),
    
    // Performance monitoring
    time: (label) => console.time(label),
    timeEnd: (label) => console.timeEnd(label),
    
    // Memory usage
    getMemoryInfo: () => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    },
    
    // Network monitoring
    getConnectionInfo: () => {
      if (navigator.connection) {
        return {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        };
      }
      return null;
    }
  });
}

console.log('🔒 Preload script caricato - API sicure esposte');
console.log('📊 Funzionalità disponibili:', Object.keys(window.electronAPI || {}));