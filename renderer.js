// ===== SYNEXA - BUSINESS SUITE =====
// Clean, Secure & Performant JavaScript

'use strict';

// ===== APPLICATION STATE =====
const AppState = {
    currentQuote: {
        meta: {
            clientName: '',
            quoteNumber: '',
            date: new Date().toISOString().split('T')[0],
            currency: 'EUR',
            notes: ''
        },
        items: [],
        discounts: []
    },
    productDatabase: [],
    clientDatabase: [],
    savedQuotes: [],
    appSettings: {
        defaultCurrency: 'EUR',
        language: 'it',
        company: {
            name: '',
            vat: ''
        }
    },
    currentSection: 'dashboard',
    nextId: 1
};

// ===== CURRENCY SYMBOLS =====
const CURRENCY_SYMBOLS = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
};

// ===== UTILITY FUNCTIONS =====
const Utils = {
    // Safe DOM element selection
    $(selector) {
        return document.querySelector(selector);
    },

    $$(selector) {
        return document.querySelectorAll(selector);
    },

    // Safe event listener
    on(element, event, handler) {
        if (element && typeof handler === 'function') {
            element.addEventListener(event, handler);
        }
    },

    // Input validation
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validateNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value) && value > 0;
    },

    // Safe data access
    safeGet(obj, path, defaultValue = null) {
        try {
            return path.split('.').reduce((o, p) => o && o[p], obj) || defaultValue;
        } catch {
            return defaultValue;
        }
    },

    // Format currency
    formatCurrency(amount, currency = 'EUR') {
        try {
            return `${CURRENCY_SYMBOLS[currency] || '€'}${parseFloat(amount || 0).toFixed(2)}`;
        } catch {
            return '€0.00';
        }
    },

    // Generate unique ID
    generateId() {
        return `synexa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Sanitize HTML
    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ===== DATA PERSISTENCE =====
const DataManager = {
    // Local storage with error handling
    save(key, data) {
        try {
            localStorage.setItem(`synexa_${key}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Save error:', error);
            return false;
        }
    },

    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(`synexa_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Load error:', error);
            return defaultValue;
        }
    },

    // Electron API integration
    async saveToElectron(type, data) {
        try {
            if (window.electronAPI) {
                switch (type) {
                    case 'quotes':
                        return await window.electronAPI.saveQuotes(data);
                    case 'products':
                        return await window.electronAPI.saveProducts(data);
                    case 'clients':
                        return await window.electronAPI.saveClients(data);
                    default:
                        return false;
                }
            }
            return false;
        } catch (error) {
            console.error('Electron save error:', error);
            return false;
        }
    },

    async loadFromElectron(type) {
        try {
            if (window.electronAPI) {
                switch (type) {
                    case 'quotes':
                        return await window.electronAPI.loadQuotes() || [];
                    case 'products':
                        return await window.electronAPI.loadProducts() || [];
                    case 'clients':
                        return await window.electronAPI.loadClients() || [];
                    default:
                        return [];
                }
            }
            return [];
        } catch (error) {
            console.error('Electron load error:', error);
            return [];
        }
    }
};

// ===== NOTIFICATIONS =====
const NotificationManager = {
    show(message, type = 'success', duration = 3000) {
        const notification = Utils.$('#notification');
        const text = Utils.$('#notification-text');
        const icon = notification.querySelector('i');
        
        if (!notification || !text || !icon) return;

        text.textContent = Utils.sanitizeHTML(message);
        
        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle text-green-500',
            error: 'fas fa-exclamation-circle text-red-500',
            warning: 'fas fa-exclamation-triangle text-yellow-500',
            info: 'fas fa-info-circle text-blue-500'
        };
        
        icon.className = `${icons[type] || icons.success} mr-3`;
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
};

// ===== NAVIGATION =====
const Navigation = {
    setActiveSection(sectionName) {
        try {
            // Validate section name
            const validSections = ['dashboard', 'quotes', 'clients', 'products', 'analytics', 'settings'];
            if (!validSections.includes(sectionName)) {
                console.warn('Invalid section:', sectionName);
                return;
            }

            // Update sidebar
            Utils.$$('.sidebar-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const activeItem = Utils.$(`[data-section="${sectionName}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }

            // Update content
            Utils.$$('.section').forEach(section => {
                section.classList.add('hidden');
            });
            
            const activeSection = Utils.$(`#${sectionName}`);
            if (activeSection) {
                activeSection.classList.remove('hidden');
                activeSection.classList.add('fade-in');
            }

            AppState.currentSection = sectionName;
            
            // Update section-specific data
            this.updateSectionData(sectionName);
            
        } catch (error) {
            console.error('Navigation error:', error);
            NotificationManager.show('Errore nella navigazione', 'error');
        }
    },

    updateSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                Dashboard.update();
                break;
            case 'clients':
                ClientManager.updateDisplay();
                break;
            case 'products':
                ProductManager.updateDisplay();
                break;
            case 'analytics':
                Analytics.update();
                break;
        }
    },

    init() {
        // Setup navigation event listeners
        Utils.$$('.sidebar-item').forEach(item => {
            Utils.on(item, 'click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) {
                    this.setActiveSection(section);
                }
            });
        });
    }
};

// ===== DASHBOARD =====
const Dashboard = {
    update() {
        try {
            this.updateMetrics();
            this.updateCharts();
        } catch (error) {
            console.error('Dashboard update error:', error);
        }
    },

    updateMetrics() {
        const totalQuotes = AppState.savedQuotes.length;
        const totalRevenue = AppState.savedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
        const activeClients = AppState.clientDatabase.length;
        const conversionRate = totalQuotes > 0 ? ((totalQuotes * 0.65).toFixed(1)) : '0';

        const elements = {
            'total-quotes': totalQuotes,
            'total-revenue': Utils.formatCurrency(totalRevenue),
            'active-clients': activeClients,
            'conversion-rate': `${conversionRate}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = Utils.$(`#${id}`);
            if (element) {
                element.textContent = value;
            }
        });
    },

    updateCharts() {
        try {
            this.createRevenueChart();
            this.createProductsChart();
        } catch (error) {
            console.error('Charts error:', error);
        }
    },

    createRevenueChart() {
        const canvas = Utils.$('#revenue-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (window.revenueChart) {
            window.revenueChart.destroy();
        }

        window.revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
                datasets: [{
                    label: 'Fatturato',
                    data: this.generateRevenueData(),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => Utils.formatCurrency(value)
                        }
                    }
                }
            }
        });
    },

    createProductsChart() {
        const canvas = Utils.$('#products-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (window.productsChart) {
            window.productsChart.destroy();
        }

        const topProducts = AppState.productDatabase.slice(0, 5);
        
        window.productsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topProducts.map(p => p.code || 'N/A'),
                datasets: [{
                    data: topProducts.map((p, i) => i + 1),
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#f59e0b', 
                        '#ef4444', '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    generateRevenueData() {
        const data = [];
        let baseValue = 5000;
        
        for (let i = 0; i < 6; i++) {
            baseValue += Math.random() * 3000 - 1000;
            data.push(Math.max(0, baseValue));
        }
        
        return data;
    }
};

// ===== QUOTE MANAGEMENT =====
const QuoteManager = {
    init() {
        this.setupEventListeners();
        this.updateDisplay();
    },

    setupEventListeners() {
        // Meta data inputs
        Utils.on(Utils.$('#client-name'), 'input', (e) => {
            AppState.currentQuote.meta.clientName = e.target.value;
        });

        Utils.on(Utils.$('#quote-number'), 'input', (e) => {
            AppState.currentQuote.meta.quoteNumber = e.target.value;
        });

        Utils.on(Utils.$('#quote-date'), 'change', (e) => {
            AppState.currentQuote.meta.date = e.target.value;
        });

        Utils.on(Utils.$('#currency'), 'change', (e) => {
            AppState.currentQuote.meta.currency = e.target.value;
            this.updateDisplay();
        });

        // Product management
        Utils.on(Utils.$('#add-product-btn'), 'click', () => this.addProduct());
        Utils.on(Utils.$('#product-code'), 'input', this.handleProductCodeInput.bind(this));

        // Actions
        Utils.on(Utils.$('#new-quote-btn'), 'click', () => this.newQuote());
        Utils.on(Utils.$('#save-quote-btn'), 'click', () => this.saveQuote());
        Utils.on(Utils.$('#export-pdf-btn'), 'click', () => this.exportToPDF());
        Utils.on(Utils.$('#load-quote-btn'), 'click', () => this.showQuotesList());

        // Keyboard shortcuts
        ['product-code', 'product-description', 'product-price', 'product-quantity'].forEach(id => {
            Utils.on(Utils.$(`#${id}`), 'keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addProduct();
                }
            });
        });
    },

    handleProductCodeInput: Utils.debounce(function(e) {
        const code = e.target.value;
        const suggestionsDiv = Utils.$('#suggestions');
        
        if (!suggestionsDiv) return;

        if (code.length < 2) {
            suggestionsDiv.classList.add('hidden');
            return;
        }

        const suggestions = AppState.productDatabase.filter(product => 
            product.code && product.code.toLowerCase().includes(code.toLowerCase()) ||
            product.description && product.description.toLowerCase().includes(code.toLowerCase())
        );

        if (suggestions.length === 0) {
            suggestionsDiv.classList.add('hidden');
            return;
        }

        suggestionsDiv.innerHTML = suggestions.map(product => `
            <div class="suggestion-item p-3 cursor-pointer border-b hover:bg-gray-50" 
                 data-code="${Utils.sanitizeHTML(product.code)}"
                 data-description="${Utils.sanitizeHTML(product.description)}"
                 data-price="${product.unitPrice || 0}"
                 data-service="${product.isService || false}">
                <div class="font-medium">${Utils.sanitizeHTML(product.code)}</div>
                <div class="text-sm text-gray-600">${Utils.sanitizeHTML(product.description)}</div>
                <div class="text-sm text-green-600">${Utils.formatCurrency(product.unitPrice)}</div>
            </div>
        `).join('');

        suggestionsDiv.classList.remove('hidden');

        // Setup click handlers for suggestions
        Utils.$$('.suggestion-item').forEach(item => {
            Utils.on(item, 'click', () => {
                this.selectProductSuggestion({
                    code: item.dataset.code,
                    description: item.dataset.description,
                    unitPrice: parseFloat(item.dataset.price) || 0,
                    isService: item.dataset.service === 'true'
                });
            });
        });
    }, 300),

    selectProductSuggestion(product) {
        const elements = {
            'product-code': product.code,
            'product-description': product.description,
            'product-price': product.unitPrice.toString(),
            'product-quantity': '1'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = Utils.$(`#${id}`);
            if (element) element.value = value;
        });

        const serviceCheckbox = Utils.$('#is-service');
        if (serviceCheckbox) {
            serviceCheckbox.checked = product.isService;
        }

        Utils.$('#suggestions').classList.add('hidden');
        Utils.$('#product-quantity').focus();
    },

    addProduct() {
        try {
            const code = Utils.$('#product-code').value.trim();
            const description = Utils.$('#product-description').value.trim();
            const price = parseFloat(Utils.$('#product-price').value) || 0;
            const quantity = parseFloat(Utils.$('#product-quantity').value) || 0;
            const isService = Utils.$('#is-service').checked;

            // Validation
            if (!code || !description) {
                NotificationManager.show('Inserisci codice e descrizione', 'warning');
                return;
            }

            if (!Utils.validateNumber(price) || !Utils.validateNumber(quantity)) {
                NotificationManager.show('Inserisci prezzo e quantità validi', 'warning');
                return;
            }

            const item = {
                id: AppState.nextId++,
                code: Utils.sanitizeHTML(code),
                description: Utils.sanitizeHTML(description),
                unitPrice: price,
                quantity: quantity,
                isService: isService
            };

            AppState.currentQuote.items.push(item);

            // Add to product database if new
            const existingProduct = AppState.productDatabase.find(p => p.code === code);
            if (!existingProduct) {
                AppState.productDatabase.push({
                    id: AppState.nextId++,
                    code: item.code,
                    description: item.description,
                    unitPrice: item.unitPrice,
                    isService: item.isService,
                    salesCount: 1
                });
            }

            this.clearProductForm();
            this.updateDisplay();
            this.saveData();
            
            NotificationManager.show('Prodotto aggiunto!', 'success');

        } catch (error) {
            console.error('Add product error:', error);
            NotificationManager.show('Errore aggiunta prodotto', 'error');
        }
    },

    removeProduct(itemId) {
        try {
            AppState.currentQuote.items = AppState.currentQuote.items.filter(item => item.id !== itemId);
            this.updateDisplay();
            NotificationManager.show('Prodotto rimosso', 'success');
        } catch (error) {
            console.error('Remove product error:', error);
            NotificationManager.show('Errore rimozione prodotto', 'error');
        }
    },

    clearProductForm() {
        const fields = ['product-code', 'product-description', 'product-price', 'product-quantity'];
        fields.forEach(id => {
            const element = Utils.$(`#${id}`);
            if (element) element.value = '';
        });

        const serviceCheckbox = Utils.$('#is-service');
        if (serviceCheckbox) serviceCheckbox.checked = false;

        Utils.$('#suggestions').classList.add('hidden');
        Utils.$('#product-code').focus();
    },

    updateDisplay() {
        this.updateProductsTable();
        this.updateTotals();
        this.updateStatistics();
        this.updateBadges();
    },

    updateProductsTable() {
        const tbody = Utils.$('#products-table');
        if (!tbody) return;

        if (AppState.currentQuote.items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
                        <i class="fas fa-inbox text-4xl mb-4 block" style="opacity: 0.3;"></i>
                        <p>Nessun prodotto aggiunto ancora</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = AppState.currentQuote.items.map(item => `
            <tr>
                <td>${Utils.sanitizeHTML(item.code)}</td>
                <td>${Utils.sanitizeHTML(item.description)}</td>
                <td>
                    <span class="status-badge ${item.isService ? 'warning' : 'success'}">
                        <i class="fas ${item.isService ? 'fa-clock' : 'fa-box'} mr-1"></i>
                        ${item.isService ? 'Servizio' : 'Prodotto'}
                    </span>
                </td>
                <td style="text-align: right;">${Utils.formatCurrency(item.unitPrice)}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right; font-weight: 600; color: #059669;">
                    ${Utils.formatCurrency(this.calculateItemTotal(item))}
                </td>
                <td style="text-align: center;">
                    <button onclick="window.QuoteManager.removeProduct(${item.id})" 
                            class="text-red-600 hover:text-red-800 p-1">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    updateTotals() {
        const subtotal = this.calculateSubtotal();
        const total = subtotal; // No discounts for now

        const elements = {
            'subtotal': Utils.formatCurrency(subtotal),
            'total-discount': Utils.formatCurrency(0),
            'final-total': Utils.formatCurrency(total)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = Utils.$(`#${id}`);
            if (element) element.textContent = value;
        });
    },

    updateStatistics() {
        const totalItems = AppState.currentQuote.items.length;
        const totalQuantity = AppState.currentQuote.items.reduce((sum, item) => sum + item.quantity, 0);

        const elements = {
            'total-items': totalItems,
            'total-quantity': totalQuantity,
            'items-count': `${totalItems} elementi`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = Utils.$(`#${id}`);
            if (element) element.textContent = value;
        });
    },

    updateBadges() {
        const badges = {
            'quotes-badge': AppState.savedQuotes.length,
            'clients-badge': AppState.clientDatabase.length,
            'products-badge': AppState.productDatabase.length
        };

        Object.entries(badges).forEach(([id, count]) => {
            const badge = Utils.$(`#${id}`);
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'block' : 'none';
            }
        });
    },

    calculateItemTotal(item) {
        return (item.unitPrice || 0) * (item.quantity || 0);
    },

    calculateSubtotal() {
        return AppState.currentQuote.items.reduce((sum, item) => sum + this.calculateItemTotal(item), 0);
    },

    newQuote() {
        if (AppState.currentQuote.items.length > 0) {
            if (!confirm('Creare una nuova offerta? I dati non salvati andranno persi.')) {
                return;
            }
        }

        AppState.currentQuote = {
            meta: {
                clientName: '',
                quoteNumber: '',
                date: new Date().toISOString().split('T')[0],
                currency: AppState.appSettings.defaultCurrency,
                notes: ''
            },
            items: [],
            discounts: []
        };

        this.clearProductForm();
        this.updateDisplay();
        NotificationManager.show('Nuova offerta creata', 'success');
    },

    async saveQuote() {
        try {
            if (!AppState.currentQuote.meta.clientName.trim()) {
                NotificationManager.show('Inserisci il nome del cliente', 'warning');
                return;
            }

            const quote = {
                id: Utils.generateId(),
                meta: { ...AppState.currentQuote.meta },
                items: [...AppState.currentQuote.items],
                discounts: [...AppState.currentQuote.discounts],
                total: this.calculateSubtotal(),
                savedAt: new Date().toISOString()
            };

            AppState.savedQuotes.push(quote);
            
            const saved = await this.saveData();
            if (saved) {
                NotificationManager.show('Offerta salvata con successo!', 'success');
                this.updateBadges();
                Dashboard.update();
            } else {
                NotificationManager.show('Errore nel salvataggio', 'error');
            }

        } catch (error) {
            console.error('Save quote error:', error);
            NotificationManager.show('Errore nel salvataggio', 'error');
        }
    },

    async saveData() {
        try {
            // Try Electron first, fallback to localStorage
            const electronSaved = await DataManager.saveToElectron('quotes', AppState.savedQuotes);
            if (electronSaved) {
                await DataManager.saveToElectron('products', AppState.productDatabase);
                await DataManager.saveToElectron('clients', AppState.clientDatabase);
                return true;
            }

            // Fallback to localStorage
            DataManager.save('quotes', AppState.savedQuotes);
            DataManager.save('products', AppState.productDatabase);
            DataManager.save('clients', AppState.clientDatabase);
            return true;

        } catch (error) {
            console.error('Save data error:', error);
            return false;
        }
    },

    showQuotesList() {
        const modal = Utils.$('#quotes-modal');
        const list = Utils.$('#quotes-list');
        
        if (!modal || !list) return;

        if (AppState.savedQuotes.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-file-invoice text-4xl mb-4 block" style="opacity: 0.3;"></i>
                    <p>Nessuna offerta salvata</p>
                </div>
            `;
        } else {
            list.innerHTML = AppState.savedQuotes.map(quote => `
                <div class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                     onclick="window.QuoteManager.loadQuote('${quote.id}')">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-semibold">${Utils.sanitizeHTML(quote.meta.clientName || 'Cliente non specificato')}</h4>
                            <p class="text-sm text-gray-600">
                                Offerta: ${Utils.sanitizeHTML(quote.meta.quoteNumber || 'N/A')} | 
                                ${quote.items.length} prodotti | 
                                ${Utils.formatCurrency(quote.total)}
                            </p>
                            <p class="text-xs text-gray-500">
                                ${new Date(quote.savedAt).toLocaleString('it-IT')}
                            </p>
                        </div>
                        <i class="fas fa-download text-blue-600"></i>
                    </div>
                </div>
            `).join('');
        }

        modal.classList.remove('hidden');
    },

    loadQuote(quoteId) {
        try {
            const quote = AppState.savedQuotes.find(q => q.id === quoteId);
            if (!quote) {
                NotificationManager.show('Offerta non trovata', 'error');
                return;
            }

            AppState.currentQuote = {
                meta: { ...quote.meta },
                items: [...quote.items],
                discounts: [...quote.discounts]
            };

            this.updateMetaFields();
            this.updateDisplay();
            
            const modal = Utils.$('#quotes-modal');
            if (modal) modal.classList.add('hidden');
            
            Navigation.setActiveSection('quotes');
            NotificationManager.show('Offerta caricata!', 'success');

        } catch (error) {
            console.error('Load quote error:', error);
            NotificationManager.show('Errore nel caricamento', 'error');
        }
    },

    updateMetaFields() {
        const fields = {
            'client-name': AppState.currentQuote.meta.clientName,
            'quote-number': AppState.currentQuote.meta.quoteNumber,
            'quote-date': AppState.currentQuote.meta.date,
            'currency': AppState.currentQuote.meta.currency
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = Utils.$(`#${id}`);
            if (element) element.value = value || '';
        });
    },

    async exportToPDF() {
        if (AppState.currentQuote.items.length === 0) {
            NotificationManager.show('Aggiungi almeno un prodotto', 'warning');
            return;
        }

        try {
            // Load jsPDF
            if (!window.jspdf) {
                NotificationManager.show('Caricamento libreria PDF...', 'info');
                await this.loadjsPDF();
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Header
            doc.setFontSize(24);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(59, 130, 246);
            doc.text('OFFERTA COMMERCIALE', 20, 30);

            // Client info
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`Cliente: ${AppState.currentQuote.meta.clientName}`, 20, 50);
            doc.text(`Offerta N°: ${AppState.currentQuote.meta.quoteNumber}`, 20, 60);
            doc.text(`Data: ${new Date(AppState.currentQuote.meta.date).toLocaleDateString('it-IT')}`, 20, 70);

            // Items
            let yPosition = 90;
            doc.text('PRODOTTI/SERVIZI:', 20, yPosition);
            yPosition += 15;

            AppState.currentQuote.items.forEach(item => {
                const line = `${item.code} - ${item.description}`;
                const details = `Qty: ${item.quantity} x ${Utils.formatCurrency(item.unitPrice)} = ${Utils.formatCurrency(this.calculateItemTotal(item))}`;
                
                doc.text(line, 20, yPosition);
                doc.text(details, 30, yPosition + 7);
                yPosition += 20;
            });

            // Total
            yPosition += 20;
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(`TOTALE: ${Utils.formatCurrency(this.calculateSubtotal())}`, 20, yPosition);

            // Save PDF
            if (window.electronAPI && window.electronAPI.savePDF) {
                const pdfData = doc.output('datauristring').split(',')[1];
                const fileName = `offerta_${AppState.currentQuote.meta.quoteNumber || 'nuova'}`;
                
                const result = await window.electronAPI.savePDF(pdfData, fileName);
                
                if (result.success) {
                    NotificationManager.show('PDF salvato con successo!', 'success');
                } else if (!result.canceled) {
                    NotificationManager.show('Errore nel salvataggio PDF', 'error');
                }
            } else {
                // Fallback: download in browser
                doc.save(`offerta_${AppState.currentQuote.meta.quoteNumber || 'nuova'}.pdf`);
                NotificationManager.show('PDF generato!', 'success');
            }

        } catch (error) {
            console.error('PDF export error:', error);
            NotificationManager.show('Errore nella generazione PDF', 'error');
        }
    },

    async loadjsPDF() {
        return new Promise((resolve, reject) => {
            if (window.jspdf) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
};

// ===== CLIENT MANAGEMENT =====
const ClientManager = {
    init() {
        this.setupEventListeners();
        this.updateDisplay();
    },

    setupEventListeners() {
        Utils.on(Utils.$('#new-client-btn'), 'click', () => this.showClientModal());
        Utils.on(Utils.$('#close-client-modal'), 'click', () => this.hideClientModal());
        Utils.on(Utils.$('#cancel-client'), 'click', () => this.hideClientModal());
        Utils.on(Utils.$('#client-form'), 'submit', (e) => this.handleClientSubmit(e));
    },

    showClientModal(clientId = null) {
        const modal = Utils.$('#client-modal');
        if (!modal) return;

        if (clientId) {
            // Edit mode - populate form
            const client = AppState.clientDatabase.find(c => c.id === clientId);
            if (client) {
                Utils.$('#client-form-name').value = client.name || '';
                Utils.$('#client-form-email').value = client.email || '';
                Utils.$('#client-form-phone').value = client.phone || '';
                Utils.$('#client-form-status').value = client.status || 'new';
                
                const form = Utils.$('#client-form');
                if (form) form.dataset.editId = clientId;
            }
        } else {
            // Add mode - clear form
            const form = Utils.$('#client-form');
            if (form) {
                form.reset();
                delete form.dataset.editId;
            }
        }

        modal.classList.remove('hidden');
        Utils.$('#client-form-name').focus();
    },

    hideClientModal() {
        const modal = Utils.$('#client-modal');
        if (modal) modal.classList.add('hidden');
    },

    handleClientSubmit(e) {
        e.preventDefault();

        try {
            const name = Utils.$('#client-form-name').value.trim();
            const email = Utils.$('#client-form-email').value.trim();
            const phone = Utils.$('#client-form-phone').value.trim();
            const status = Utils.$('#client-form-status').value;

            // Validation
            if (!name) {
                NotificationManager.show('Il nome cliente è obbligatorio', 'warning');
                return;
            }

            if (email && !Utils.validateEmail(email)) {
                NotificationManager.show('Email non valida', 'warning');
                return;
            }

            const clientData = {
                name: Utils.sanitizeHTML(name),
                email: Utils.sanitizeHTML(email),
                phone: Utils.sanitizeHTML(phone),
                status: status,
                totalValue: 0,
                quotesCount: 0,
                createdAt: new Date().toISOString()
            };

            const editId = e.target.dataset.editId;

            if (editId) {
                // Update existing
                const index = AppState.clientDatabase.findIndex(c => c.id === editId);
                if (index !== -1) {
                    AppState.clientDatabase[index] = { ...AppState.clientDatabase[index], ...clientData };
                    NotificationManager.show('Cliente aggiornato!', 'success');
                }
            } else {
                // Add new
                clientData.id = Utils.generateId();
                AppState.clientDatabase.push(clientData);
                NotificationManager.show('Cliente aggiunto!', 'success');
            }

            this.hideClientModal();
            this.updateDisplay();
            QuoteManager.updateBadges();
            QuoteManager.saveData();

        } catch (error) {
            console.error('Client submit error:', error);
            NotificationManager.show('Errore nel salvataggio cliente', 'error');
        }
    },

    updateDisplay() {
        this.updateClientsTable();
    },

    updateClientsTable() {
        const tbody = Utils.$('#clients-table');
        if (!tbody) return;

        if (AppState.clientDatabase.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
                        <i class="fas fa-users text-4xl mb-4 block" style="opacity: 0.3;"></i>
                        <p>Nessun cliente ancora</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = AppState.clientDatabase.map(client => `
            <tr>
                <td>
                    <div class="font-medium">${Utils.sanitizeHTML(client.name)}</div>
                </td>
                <td>${Utils.sanitizeHTML(client.email || '-')}</td>
                <td>${Utils.sanitizeHTML(client.phone || '-')}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(client.status)}">
                        ${this.getStatusLabel(client.status)}
                    </span>
                </td>
                <td style="text-align: center;">
                    <button onclick="window.ClientManager.showClientModal('${client.id}')" 
                            class="text-blue-600 hover:text-blue-800 p-1 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.ClientManager.deleteClient('${client.id}')" 
                            class="text-red-600 hover:text-red-800 p-1">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    getStatusClass(status) {
        const classes = {
            'vip': 'warning',
            'standard': 'success',
            'new': 'danger'
        };
        return classes[status] || 'success';
    },

    getStatusLabel(status) {
        const labels = {
            'vip': 'VIP',
            'standard': 'Standard',
            'new': 'Nuovo'
        };
        return labels[status] || status;
    },

    deleteClient(clientId) {
        if (!confirm('Sei sicuro di voler eliminare questo cliente?')) return;

        try {
            AppState.clientDatabase = AppState.clientDatabase.filter(c => c.id !== clientId);
            this.updateDisplay();
            QuoteManager.updateBadges();
            QuoteManager.saveData();
            NotificationManager.show('Cliente eliminato', 'success');
        } catch (error) {
            console.error('Delete client error:', error);
            NotificationManager.show('Errore nella cancellazione', 'error');
        }
    }
};

// ===== PRODUCT MANAGEMENT =====
const ProductManager = {
    init() {
        this.setupEventListeners();
        this.updateDisplay();
    },

    setupEventListeners() {
        Utils.on(Utils.$('#new-product-btn'), 'click', () => this.showProductModal());
        Utils.on(Utils.$('#close-product-modal'), 'click', () => this.hideProductModal());
        Utils.on(Utils.$('#cancel-product'), 'click', () => this.hideProductModal());
        Utils.on(Utils.$('#product-form'), 'submit', (e) => this.handleProductSubmit(e));
    },

    showProductModal(productId = null) {
        const modal = Utils.$('#product-modal');
        if (!modal) return;

        if (productId) {
            const product = AppState.productDatabase.find(p => p.id === productId);
            if (product) {
                Utils.$('#product-form-code').value = product.code || '';
                Utils.$('#product-form-description').value = product.description || '';
                Utils.$('#product-form-price').value = product.unitPrice || '';
                Utils.$('#product-form-service').checked = product.isService || false;
                
                const form = Utils.$('#product-form');
                if (form) form.dataset.editId = productId;
            }
        } else {
            const form = Utils.$('#product-form');
            if (form) {
                form.reset();
                delete form.dataset.editId;
            }
        }

        modal.classList.remove('hidden');
        Utils.$('#product-form-code').focus();
    },

    hideProductModal() {
        const modal = Utils.$('#product-modal');
        if (modal) modal.classList.add('hidden');
    },

    handleProductSubmit(e) {
        e.preventDefault();

        try {
            const code = Utils.$('#product-form-code').value.trim();
            const description = Utils.$('#product-form-description').value.trim();
            const price = parseFloat(Utils.$('#product-form-price').value) || 0;
            const isService = Utils.$('#product-form-service').checked;

            // Validation
            if (!code || !description) {
                NotificationManager.show('Codice e descrizione sono obbligatori', 'warning');
                return;
            }

            if (!Utils.validateNumber(price)) {
                NotificationManager.show('Prezzo non valido', 'warning');
                return;
            }

            const productData = {
                code: Utils.sanitizeHTML(code),
                description: Utils.sanitizeHTML(description),
                unitPrice: price,
                isService: isService,
                salesCount: 0,
                createdAt: new Date().toISOString()
            };

            const editId = e.target.dataset.editId;

            if (editId) {
                const index = AppState.productDatabase.findIndex(p => p.id === editId);
                if (index !== -1) {
                    AppState.productDatabase[index] = { ...AppState.productDatabase[index], ...productData };
                    NotificationManager.show('Prodotto aggiornato!', 'success');
                }
            } else {
                productData.id = Utils.generateId();
                AppState.productDatabase.push(productData);
                NotificationManager.show('Prodotto aggiunto!', 'success');
            }

            this.hideProductModal();
            this.updateDisplay();
            QuoteManager.updateBadges();
            QuoteManager.saveData();

        } catch (error) {
            console.error('Product submit error:', error);
            NotificationManager.show('Errore nel salvataggio prodotto', 'error');
        }
    },

    updateDisplay() {
        this.updateProductsTable();
    },

    updateProductsTable() {
        const tbody = Utils.$('#products-database-table');
        if (!tbody) return;

        if (AppState.productDatabase.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">
                        <i class="fas fa-box text-4xl mb-4 block" style="opacity: 0.3;"></i>
                        <p>Nessun prodotto nel database</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = AppState.productDatabase.map(product => `
            <tr>
                <td class="font-medium">${Utils.sanitizeHTML(product.code)}</td>
                <td>${Utils.sanitizeHTML(product.description)}</td>
                <td>
                    <span class="status-badge ${product.isService ? 'warning' : 'success'}">
                        ${product.isService ? 'Servizio' : 'Prodotto'}
                    </span>
                </td>
                <td style="text-align: right; font-weight: 600;">
                    ${Utils.formatCurrency(product.unitPrice)}
                </td>
                <td style="text-align: center;">
                    <button onclick="window.ProductManager.showProductModal('${product.id}')" 
                            class="text-blue-600 hover:text-blue-800 p-1 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.ProductManager.deleteProduct('${product.id}')" 
                            class="text-red-600 hover:text-red-800 p-1">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    deleteProduct(productId) {
        if (!confirm('Sei sicuro di voler eliminare questo prodotto?')) return;

        try {
            AppState.productDatabase = AppState.productDatabase.filter(p => p.id !== productId);
            this.updateDisplay();
            QuoteManager.updateBadges();
            QuoteManager.saveData();
            NotificationManager.show('Prodotto eliminato', 'success');
        } catch (error) {
            console.error('Delete product error:', error);
            NotificationManager.show('Errore nella cancellazione', 'error');
        }
    }
};

// ===== ANALYTICS =====
const Analytics = {
    update() {
        try {
            this.createSalesChart();
            this.createClientsChart();
        } catch (error) {
            console.error('Analytics update error:', error);
        }
    },

    createSalesChart() {
        const canvas = Utils.$('#sales-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (window.salesChart) {
            window.salesChart.destroy();
        }

        window.salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
                datasets: [{
                    label: 'Vendite',
                    data: [12, 19, 15, 25, 22, 8, 5],
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    },

    createClientsChart() {
        const canvas = Utils.$('#clients-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (window.clientsChart) {
            window.clientsChart.destroy();
        }

        const vipCount = AppState.clientDatabase.filter(c => c.status === 'vip').length;
        const standardCount = AppState.clientDatabase.filter(c => c.status === 'standard').length;
        const newCount = AppState.clientDatabase.filter(c => c.status === 'new').length;

        window.clientsChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['VIP', 'Standard', 'Nuovi'],
                datasets: [{
                    data: [vipCount, standardCount, newCount],
                    backgroundColor: ['#f59e0b', '#3b82f6', '#10b981']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
};

// ===== WINDOW CONTROLS =====
const WindowControls = {
    init() {
        Utils.on(Utils.$('#close-btn'), 'click', () => {
            if (window.electronAPI && window.electronAPI.closeWindow) {
                window.electronAPI.closeWindow();
            } else {
                window.close();
            }
        });

        Utils.on(Utils.$('#minimize-btn'), 'click', () => {
            if (window.electronAPI && window.electronAPI.minimizeWindow) {
                window.electronAPI.minimizeWindow();
            }
        });

        Utils.on(Utils.$('#maximize-btn'), 'click', () => {
            if (window.electronAPI && window.electronAPI.maximizeWindow) {
                window.electronAPI.maximizeWindow();
            }
        });
    }
};

// ===== APPLICATION INITIALIZATION =====
const App = {
    async init() {
        try {
            console.log('🚀 Synexa - Initializing...');

            // Load data
            await this.loadApplicationData();

            // Initialize modules
            Navigation.init();
            QuoteManager.init();
            ClientManager.init();
            ProductManager.init();
            WindowControls.init();

            // Setup global event listeners
            this.setupGlobalEventListeners();

            // Setup modal handlers
            this.setupModalHandlers();

            // Initial display updates
            Dashboard.update();
            QuoteManager.updateDisplay();

            // Set initial date
            const dateInput = Utils.$('#quote-date');
            if (dateInput) {
                dateInput.value = AppState.currentQuote.meta.date;
            }

            // Show success notification
            NotificationManager.show('Synexa inizializzato con successo!', 'success');

            console.log('✅ Synexa - Ready!');

        } catch (error) {
            console.error('❌ Synexa - Initialization error:', error);
            NotificationManager.show('Errore durante l\'inizializzazione', 'error');
        }
    },

    async loadApplicationData() {
        try {
            // Try Electron first
            AppState.savedQuotes = await DataManager.loadFromElectron('quotes');
            AppState.productDatabase = await DataManager.loadFromElectron('products');
            AppState.clientDatabase = await DataManager.loadFromElectron('clients');

            // Fallback to localStorage if Electron fails
            if (AppState.savedQuotes.length === 0) {
                AppState.savedQuotes = DataManager.load('quotes', []);
            }
            if (AppState.productDatabase.length === 0) {
                AppState.productDatabase = DataManager.load('products', []);
            }
            if (AppState.clientDatabase.length === 0) {
                AppState.clientDatabase = DataManager.load('clients', []);
            }

            console.log('📊 Data loaded:', {
                quotes: AppState.savedQuotes.length,
                products: AppState.productDatabase.length,
                clients: AppState.clientDatabase.length
            });

        } catch (error) {
            console.error('Data loading error:', error);
        }
    },

    setupGlobalEventListeners() {
        // Keyboard shortcuts
        Utils.on(document, 'keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        QuoteManager.newQuote();
                        Navigation.setActiveSection('quotes');
                        break;
                    case 's':
                        e.preventDefault();
                        if (AppState.currentSection === 'quotes') {
                            QuoteManager.saveQuote();
                        }
                        break;
                    case 'e':
                        e.preventDefault();
                        if (AppState.currentSection === 'quotes') {
                            QuoteManager.exportToPDF();
                        }
                        break;
                    case '1':
                        e.preventDefault();
                        Navigation.setActiveSection('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        Navigation.setActiveSection('quotes');
                        break;
                    case '3':
                        e.preventDefault();
                        Navigation.setActiveSection('clients');
                        break;
                    case '4':
                        e.preventDefault();
                        Navigation.setActiveSection('products');
                        break;
                }
            }

            if (e.key === 'Escape') {
                // Close all modals
                Utils.$$('.modal-overlay').forEach(modal => {
                    modal.classList.add('hidden');
                });
                // Hide suggestions
                const suggestions = Utils.$('#suggestions');
                if (suggestions) suggestions.classList.add('hidden');
            }
        });

        // Click outside to close suggestions
        Utils.on(document, 'click', (e) => {
            if (!e.target.closest('#product-code') && !e.target.closest('#suggestions')) {
                const suggestions = Utils.$('#suggestions');
                if (suggestions) suggestions.classList.add('hidden');
            }
        });

        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            NotificationManager.show('Si è verificato un errore imprevisto', 'error');
        });

        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            NotificationManager.show('Errore nell\'applicazione', 'error');
        });
    },

    setupModalHandlers() {
        // Close modal when clicking outside
        Utils.$$('.modal-overlay').forEach(modal => {
            Utils.on(modal, 'click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Quotes modal close
        Utils.on(Utils.$('#close-quotes-modal'), 'click', () => {
            Utils.$('#quotes-modal').classList.add('hidden');
        });
    }
};

// ===== EXPOSE GLOBAL FUNCTIONS =====
// Make functions available for onclick handlers
window.Navigation = Navigation;
window.QuoteManager = QuoteManager;
window.ClientManager = ClientManager;
window.ProductManager = ProductManager;

// ===== START APPLICATION =====
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// ===== DEVELOPMENT HELPERS =====
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    window.AppState = AppState;
    window.Utils = Utils;
    window.DataManager = DataManager;
    console.log('🔧 Development mode - Global objects exposed');
}