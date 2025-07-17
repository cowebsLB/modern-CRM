// IndexedDB Storage Manager
class Storage {
    static dbName = 'CowebsCRM';
    static dbVersion = 1;
    static db = null;

    static async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                this.createStores();
            };
        });
    }

    static createStores() {
        // Clients store
        if (!this.db.objectStoreNames.contains('clients')) {
            const clientStore = this.db.createObjectStore('clients', { keyPath: 'id' });
            clientStore.createIndex('name', 'name', { unique: false });
            clientStore.createIndex('email', 'email', { unique: false });
            clientStore.createIndex('status', 'status', { unique: false });
            clientStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Projects store
        if (!this.db.objectStoreNames.contains('projects')) {
            const projectStore = this.db.createObjectStore('projects', { keyPath: 'id' });
            projectStore.createIndex('name', 'name', { unique: false });
            projectStore.createIndex('clientId', 'clientId', { unique: false });
            projectStore.createIndex('status', 'status', { unique: false });
            projectStore.createIndex('dueDate', 'dueDate', { unique: false });
            projectStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Invoices store
        if (!this.db.objectStoreNames.contains('invoices')) {
            const invoiceStore = this.db.createObjectStore('invoices', { keyPath: 'id' });
            invoiceStore.createIndex('number', 'number', { unique: true });
            invoiceStore.createIndex('clientId', 'clientId', { unique: false });
            invoiceStore.createIndex('projectId', 'projectId', { unique: false });
            invoiceStore.createIndex('status', 'status', { unique: false });
            invoiceStore.createIndex('date', 'date', { unique: false });
            invoiceStore.createIndex('dueDate', 'dueDate', { unique: false });
        }

        // Tasks store
        if (!this.db.objectStoreNames.contains('tasks')) {
            const taskStore = this.db.createObjectStore('tasks', { keyPath: 'id' });
            taskStore.createIndex('title', 'title', { unique: false });
            taskStore.createIndex('projectId', 'projectId', { unique: false });
            taskStore.createIndex('status', 'status', { unique: false });
            taskStore.createIndex('priority', 'priority', { unique: false });
            taskStore.createIndex('dueDate', 'dueDate', { unique: false });
        }

        // Settings store
        if (!this.db.objectStoreNames.contains('settings')) {
            this.db.createObjectStore('settings', { keyPath: 'key' });
        }

        console.log('Object stores created successfully');
    }

    static async add(storeName, data) {
        return new Promise((resolve, reject) => {
            // Add timestamps
            const now = new Date().toISOString();
            data.id = data.id || Utils.generateId();
            data.createdAt = data.createdAt || now;
            data.updatedAt = now;

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => {
                resolve(data);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    static async update(storeName, data) {
        return new Promise((resolve, reject) => {
            // Update timestamp
            data.updatedAt = new Date().toISOString();

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                resolve(data);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    static async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    static async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    static async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    static async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    static async search(storeName, searchTerm, fields = ['name']) {
        const allItems = await this.getAll(storeName);
        const searchLower = searchTerm.toLowerCase();

        return allItems.filter(item => {
            return fields.some(field => {
                const value = item[field];
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(searchLower);
                }
                if (Array.isArray(value)) {
                    return value.some(v => 
                        typeof v === 'string' && v.toLowerCase().includes(searchLower)
                    );
                }
                return false;
            });
        });
    }

    static async filter(storeName, filters) {
        let items = await this.getAll(storeName);

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value !== null && value !== undefined && value !== '') {
                items = items.filter(item => {
                    if (Array.isArray(item[key])) {
                        return item[key].includes(value);
                    }
                    return item[key] === value;
                });
            }
        });

        return items;
    }

    // Client-specific methods
    static async getClientProjects(clientId) {
        return this.getByIndex('projects', 'clientId', clientId);
    }

    static async getClientInvoices(clientId) {
        return this.getByIndex('invoices', 'clientId', clientId);
    }

    // Project-specific methods
    static async getProjectTasks(projectId) {
        return this.getByIndex('tasks', 'projectId', projectId);
    }

    static async getProjectInvoices(projectId) {
        return this.getByIndex('invoices', 'projectId', projectId);
    }

    // Invoice-specific methods
    static async getNextInvoiceNumber() {
        const invoices = await this.getAll('invoices');
        const numbers = invoices
            .map(inv => parseInt(inv.number.replace(/\D/g, ''), 10))
            .filter(num => !isNaN(num));
        
        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        return `INV-${String(maxNumber + 1).padStart(4, '0')}`;
    }

    // Backup and restore
    static async exportData() {
        const data = {};
        const storeNames = ['clients', 'projects', 'invoices', 'tasks', 'settings'];

        for (const storeName of storeNames) {
            data[storeName] = await this.getAll(storeName);
        }

        return {
            version: this.dbVersion,
            exportDate: new Date().toISOString(),
            data
        };
    }

    static async importData(backupData) {
        if (!backupData.data) {
            throw new Error('Invalid backup data format');
        }

        const storeNames = ['clients', 'projects', 'invoices', 'tasks', 'settings'];
        
        for (const storeName of storeNames) {
            if (backupData.data[storeName]) {
                // Clear existing data
                await this.clearStore(storeName);
                
                // Import new data
                for (const item of backupData.data[storeName]) {
                    await this.add(storeName, item);
                }
            }
        }
    }

    static async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Settings management
    static async getSetting(key, defaultValue = null) {
        try {
            const setting = await this.get('settings', key);
            return setting ? setting.value : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }

    static async setSetting(key, value) {
        return this.update('settings', { key, value });
    }

    // Data validation
    static validateClient(client) {
        const errors = [];

        if (!client.name || client.name.trim() === '') {
            errors.push('Client name is required');
        }

        if (!client.email || !Utils.validateEmail(client.email)) {
            errors.push('Valid email is required');
        }

        return errors;
    }

    static validateProject(project) {
        const errors = [];

        if (!project.name || project.name.trim() === '') {
            errors.push('Project name is required');
        }

        if (!project.clientId) {
            errors.push('Client is required');
        }

        if (project.dueDate && new Date(project.dueDate) < new Date()) {
            errors.push('Due date cannot be in the past');
        }

        return errors;
    }

    static validateInvoice(invoice) {
        const errors = [];

        if (!invoice.clientId) {
            errors.push('Client is required');
        }

        if (!invoice.amount || invoice.amount <= 0) {
            errors.push('Valid amount is required');
        }

        if (invoice.dueDate && new Date(invoice.dueDate) < new Date(invoice.date)) {
            errors.push('Due date cannot be before invoice date');
        }

        return errors;
    }

    // Analytics helpers
    static async getAnalytics() {
        const [clients, projects, invoices] = await Promise.all([
            this.getAll('clients'),
            this.getAll('projects'),
            this.getAll('invoices')
        ]);

        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        return {
            clients: {
                total: clients.length,
                active: clients.filter(c => c.status === 'active').length,
                thisMonth: clients.filter(c => {
                    const date = new Date(c.createdAt);
                    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
                }).length
            },
            projects: {
                total: projects.length,
                active: projects.filter(p => p.status === 'in-progress').length,
                completed: projects.filter(p => p.status === 'completed').length,
                thisMonth: projects.filter(p => {
                    const date = new Date(p.createdAt);
                    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
                }).length
            },
            invoices: {
                total: invoices.length,
                paid: invoices.filter(i => i.status === 'paid').length,
                unpaid: invoices.filter(i => i.status === 'unpaid').length,
                overdue: invoices.filter(i => {
                    return i.status === 'unpaid' && new Date(i.dueDate) < now;
                }).length,
                thisMonthRevenue: invoices
                    .filter(i => {
                        const date = new Date(i.date);
                        return i.status === 'paid' && 
                               date.getMonth() === thisMonth && 
                               date.getFullYear() === thisYear;
                    })
                    .reduce((sum, inv) => sum + inv.amount, 0),
                lastMonthRevenue: invoices
                    .filter(i => {
                        const date = new Date(i.date);
                        return i.status === 'paid' && 
                               date.getMonth() === lastMonth && 
                               date.getFullYear() === lastMonthYear;
                    })
                    .reduce((sum, inv) => sum + inv.amount, 0)
            }
        };
    }

    // Invoice numbering
    static async getNextInvoiceNumber() {
        try {
            const invoices = await this.getAll('invoices');
            const currentYear = new Date().getFullYear();
            const yearPrefix = currentYear.toString();
            
            // Find the highest invoice number for this year
            const thisYearInvoices = invoices.filter(inv => 
                inv.number && inv.number.startsWith(yearPrefix)
            );
            
            if (thisYearInvoices.length === 0) {
                return `${yearPrefix}0001`;
            }
            
            // Extract sequence numbers and find the highest
            const sequences = thisYearInvoices.map(inv => {
                const parts = inv.number.split(yearPrefix);
                return parseInt(parts[1]) || 0;
            });
            
            const nextSequence = Math.max(...sequences) + 1;
            return `${yearPrefix}${nextSequence.toString().padStart(4, '0')}`;
            
        } catch (error) {
            console.error('Error generating invoice number:', error);
            const currentYear = new Date().getFullYear();
            return `${currentYear}0001`;
        }
    }
}
