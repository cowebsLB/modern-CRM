// Invoices Management
class InvoicesManager {
    static invoices = [];
    static clients = [];
    static projects = [];
    static filteredInvoices = [];
    static currentFilters = {
        search: '',
        status: '',
        client: ''
    };

    static async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderInvoices();
        this.populateFilters();
    }

    static async loadData() {
        try {
            [this.invoices, this.clients, this.projects] = await Promise.all([
                Storage.getAll('invoices'),
                Storage.getAll('clients'),
                Storage.getAll('projects')
            ]);
            this.filteredInvoices = [...this.invoices];
        } catch (error) {
            console.error('Error loading invoices:', error);
            UI.showToast('Error loading invoices', 'error');
            this.invoices = [];
            this.clients = [];
            this.projects = [];
            this.filteredInvoices = [];
        }
    }

    static setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('invoice-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        // Status filter
        const statusFilter = document.getElementById('invoice-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Client filter
        const clientFilter = document.getElementById('invoice-client-filter');
        if (clientFilter) {
            clientFilter.addEventListener('change', (e) => {
                this.currentFilters.client = e.target.value;
                this.applyFilters();
            });
        }
    }

    static populateFilters() {
        const clientFilter = document.getElementById('invoice-client-filter');
        if (!clientFilter) return;

        const clientOptions = this.clients.map(client => 
            `<option value="${client.id}">${client.name}</option>`
        ).join('');

        clientFilter.innerHTML = `
            <option value="">All Clients</option>
            ${clientOptions}
        `;
    }

    static applyFilters() {
        let filtered = [...this.invoices];

        // Apply search filter
        if (this.currentFilters.search) {
            const search = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(invoice => 
                invoice.number.toLowerCase().includes(search) ||
                this.getClientName(invoice.clientId).toLowerCase().includes(search) ||
                invoice.description?.toLowerCase().includes(search)
            );
        }

        // Apply status filter
        if (this.currentFilters.status) {
            filtered = filtered.filter(invoice => invoice.status === this.currentFilters.status);
        }

        // Apply client filter
        if (this.currentFilters.client) {
            filtered = filtered.filter(invoice => invoice.clientId === this.currentFilters.client);
        }

        this.filteredInvoices = filtered;
        this.renderInvoices();
    }

    static getClientName(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        return client ? client.name : 'Unknown Client';
    }

    static getProjectName(projectId) {
        if (!projectId) return '';
        const project = this.projects.find(p => p.id === projectId);
        return project ? project.name : 'Unknown Project';
    }

    static renderInvoices() {
        const tableBody = document.getElementById('invoices-table-body');
        if (!tableBody) return;

        if (this.filteredInvoices.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8">
                        ${UI.createEmptyState(
                            'No invoices found',
                            'Try adjusting your search or filters, or create a new invoice.',
                            '<button onclick="InvoicesManager.showAddModal()" class="btn-primary">Create First Invoice</button>'
                        )}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.filteredInvoices.map(invoice => this.renderInvoiceRow(invoice)).join('');
    }

    static renderInvoiceRow(invoice) {
        const clientName = this.getClientName(invoice.clientId);
        const statusClass = Utils.getStatusColor(invoice.status, 'invoice');
        const isOverdue = invoice.status === 'unpaid' && new Date(invoice.dueDate) < new Date();
        const finalStatusClass = isOverdue ? 'status-overdue' : statusClass;
        const finalStatus = isOverdue ? 'Overdue' : Utils.capitalize(invoice.status);

        return `
            <tr class="hover:bg-white hover:bg-opacity-5 cursor-pointer" onclick="InvoicesManager.viewInvoice('${invoice.id}')">
                <td class="font-medium">#${invoice.number}</td>
                <td>${clientName}</td>
                <td class="font-medium">${Utils.formatCurrency(invoice.amount)}</td>
                <td>${Utils.formatDate(invoice.date)}</td>
                <td>
                    <span class="status-badge ${finalStatusClass}">${finalStatus}</span>
                </td>
                <td>
                    <div class="flex space-x-2">
                        <button onclick="event.stopPropagation(); InvoicesManager.viewInvoice('${invoice.id}')" 
                                class="text-blue-400 hover:text-blue-300 p-1" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="event.stopPropagation(); InvoicesManager.editInvoice('${invoice.id}')" 
                                class="text-gray-400 hover:text-blue-400 p-1" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="event.stopPropagation(); InvoicesManager.printInvoice('${invoice.id}')" 
                                class="text-gray-400 hover:text-green-400 p-1" title="Print">
                            <i class="fas fa-print"></i>
                        </button>
                        <button onclick="event.stopPropagation(); InvoicesManager.deleteInvoice('${invoice.id}')" 
                                class="text-gray-400 hover:text-red-400 p-1" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    static showAddModal(clientId = null, projectId = null) {
        const clientOptions = this.clients.map(client => 
            `<option value="${client.id}" ${clientId === client.id ? 'selected' : ''}>${client.name}</option>`
        ).join('');

        const projectOptions = this.projects
            .filter(project => !clientId || project.clientId === clientId)
            .map(project => 
                `<option value="${project.id}" ${projectId === project.id ? 'selected' : ''}>${project.name}</option>`
            ).join('');

        const formHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Client *</label>
                        <select name="clientId" class="form-input" required onchange="InvoicesManager.onClientChange(this.value)">
                            <option value="">Select a client</option>
                            ${clientOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Project (Optional)</label>
                        <select name="projectId" class="form-input" id="project-select">
                            <option value="">Select a project</option>
                            ${projectOptions}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Invoice Date *</label>
                        <input type="date" name="date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Due Date *</label>
                        <input type="date" name="dueDate" class="form-input" value="${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
                        <select name="status" class="form-input">
                            <option value="draft">Draft</option>
                            <option value="unpaid" selected>Unpaid</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea name="description" class="form-input" rows="3" placeholder="Invoice description or services provided..."></textarea>
                </div>

                <!-- Invoice Items -->
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <label class="block text-sm font-medium text-gray-300">Invoice Items</label>
                        <button type="button" onclick="InvoicesManager.addInvoiceItem()" class="btn-secondary btn-sm">
                            <i class="fas fa-plus mr-1"></i>Add Item
                        </button>
                    </div>
                    <div id="invoice-items" class="space-y-3">
                        <!-- Invoice items will be added here -->
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Tax Rate (%)</label>
                        <input type="number" name="taxRate" class="form-input" min="0" max="100" step="0.01" value="0" onchange="InvoicesManager.calculateTotal()">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Discount (%)</label>
                        <input type="number" name="discount" class="form-input" min="0" max="100" step="0.01" value="0" onchange="InvoicesManager.calculateTotal()">
                    </div>
                </div>

                <div class="bg-white bg-opacity-5 rounded-lg p-4">
                    <div class="flex justify-between items-center text-lg font-semibold">
                        <span>Total Amount:</span>
                        <span id="total-amount">$0.00</span>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                    <textarea name="notes" class="form-input" rows="3" placeholder="Additional notes for the client..."></textarea>
                </div>
            </div>
        `;

        const modalId = UI.createFormModal('Create New Invoice', formHTML, this.handleAddInvoice.bind(this), {
            size: 'lg',
            onOpen: () => {
                this.addInvoiceItem(); // Add initial item
            }
        });

        // Store modal ID for use in helper functions
        this.currentModalId = modalId;
    }

    static onClientChange(clientId) {
        const projectSelect = document.getElementById('project-select');
        if (!projectSelect) return;

        const clientProjects = this.projects.filter(project => project.clientId === clientId);
        const projectOptions = clientProjects.map(project => 
            `<option value="${project.id}">${project.name}</option>`
        ).join('');

        projectSelect.innerHTML = `
            <option value="">Select a project</option>
            ${projectOptions}
        `;
    }

    static addInvoiceItem() {
        const container = document.getElementById('invoice-items');
        if (!container) return;

        const itemId = Utils.generateId();
        const itemHTML = `
            <div class="grid grid-cols-12 gap-3 items-end" id="item-${itemId}">
                <div class="col-span-5">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <input type="text" name="items[${itemId}][description]" class="form-input" placeholder="Service or product description" required>
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                    <input type="number" name="items[${itemId}][quantity]" class="form-input" min="1" value="1" onchange="InvoicesManager.calculateTotal()" required>
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Rate</label>
                    <input type="number" name="items[${itemId}][rate]" class="form-input" min="0" step="0.01" placeholder="0.00" onchange="InvoicesManager.calculateTotal()" required>
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                    <input type="text" id="amount-${itemId}" class="form-input" readonly value="$0.00">
                </div>
                <div class="col-span-1">
                    <button type="button" onclick="InvoicesManager.removeInvoiceItem('${itemId}')" class="btn-secondary p-2 text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', itemHTML);
        this.calculateTotal();
    }

    static removeInvoiceItem(itemId) {
        const item = document.getElementById(`item-${itemId}`);
        if (item) {
            item.remove();
            this.calculateTotal();
        }
    }

    static calculateTotal() {
        const container = document.getElementById('invoice-items');
        if (!container) return;

        let subtotal = 0;
        const items = container.querySelectorAll('[id^="item-"]');
        
        items.forEach(item => {
            const quantityInput = item.querySelector('input[name$="[quantity]"]');
            const rateInput = item.querySelector('input[name$="[rate]"]');
            const amountInput = item.querySelector('input[id^="amount-"]');
            
            if (quantityInput && rateInput && amountInput) {
                const quantity = parseFloat(quantityInput.value) || 0;
                const rate = parseFloat(rateInput.value) || 0;
                const amount = quantity * rate;
                
                amountInput.value = Utils.formatCurrency(amount);
                subtotal += amount;
            }
        });

        // Apply discount
        const discountInput = document.querySelector('input[name="discount"]');
        const discount = discountInput ? (parseFloat(discountInput.value) || 0) / 100 : 0;
        const discountAmount = subtotal * discount;
        const afterDiscount = subtotal - discountAmount;

        // Apply tax
        const taxInput = document.querySelector('input[name="taxRate"]');
        const taxRate = taxInput ? (parseFloat(taxInput.value) || 0) / 100 : 0;
        const taxAmount = afterDiscount * taxRate;
        const total = afterDiscount + taxAmount;

        // Update total display
        const totalElement = document.getElementById('total-amount');
        if (totalElement) {
            totalElement.textContent = Utils.formatCurrency(total);
        }
    }

    static async handleAddInvoice(formData, modalId) {
        try {
            // Validate required fields
            const errors = Storage.validateInvoice(formData);
            if (errors.length > 0) {
                UI.showToast(errors[0], 'error');
                return;
            }

            // Process invoice items
            const items = [];
            const itemElements = document.querySelectorAll('[id^="item-"]');
            
            itemElements.forEach(element => {
                const description = element.querySelector('input[name$="[description]"]')?.value;
                const quantity = parseFloat(element.querySelector('input[name$="[quantity]"]')?.value) || 0;
                const rate = parseFloat(element.querySelector('input[name$="[rate]"]')?.value) || 0;
                
                if (description && quantity > 0 && rate >= 0) {
                    items.push({
                        description: description.trim(),
                        quantity: quantity,
                        rate: rate,
                        amount: quantity * rate
                    });
                }
            });

            if (items.length === 0) {
                UI.showToast('Please add at least one invoice item', 'error');
                return;
            }

            // Calculate totals
            const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
            const discount = (parseFloat(formData.discount) || 0) / 100;
            const taxRate = (parseFloat(formData.taxRate) || 0) / 100;
            const discountAmount = subtotal * discount;
            const taxableAmount = subtotal - discountAmount;
            const taxAmount = taxableAmount * taxRate;
            const total = taxableAmount + taxAmount;

            // Generate invoice number
            const invoiceNumber = await Storage.getNextInvoiceNumber();

            // Create invoice object
            const invoice = {
                number: invoiceNumber,
                clientId: formData.clientId,
                projectId: formData.projectId || null,
                date: formData.date,
                dueDate: formData.dueDate,
                status: formData.status || 'unpaid',
                description: formData.description?.trim() || '',
                items: items,
                subtotal: subtotal,
                discount: discount * 100, // Store as percentage
                taxRate: taxRate * 100, // Store as percentage
                discountAmount: discountAmount,
                taxAmount: taxAmount,
                amount: total,
                notes: formData.notes?.trim() || ''
            };

            // Save to storage
            const savedInvoice = await Storage.add('invoices', invoice);
            
            // Update local data
            this.invoices.push(savedInvoice);
            this.applyFilters();

            // Close modal and show success
            UI.closeModal(modalId);
            UI.showToast('Invoice created successfully', 'success');

        } catch (error) {
            console.error('Error creating invoice:', error);
            UI.showToast('Error creating invoice', 'error');
        }
    }

    static async viewInvoice(invoiceId) {
        try {
            const invoice = await Storage.get('invoices', invoiceId);
            if (!invoice) {
                UI.showToast('Invoice not found', 'error');
                return;
            }

            const client = this.clients.find(c => c.id === invoice.clientId);
            const project = invoice.projectId ? this.projects.find(p => p.id === invoice.projectId) : null;
            const statusClass = Utils.getStatusColor(invoice.status, 'invoice');
            
            const isOverdue = invoice.status === 'unpaid' && new Date(invoice.dueDate) < new Date();
            const finalStatusClass = isOverdue ? 'status-overdue' : statusClass;
            const finalStatus = isOverdue ? 'Overdue' : Utils.capitalize(invoice.status);

            const content = `
                <div class="space-y-6">
                    <!-- Invoice Header -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Invoice Details</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">Invoice #:</span> ${invoice.number}</p>
                                <p><span class="text-gray-400">Date:</span> ${Utils.formatDate(invoice.date)}</p>
                                <p><span class="text-gray-400">Due Date:</span> ${Utils.formatDate(invoice.dueDate)}</p>
                                <p><span class="text-gray-400">Status:</span> <span class="status-badge ${finalStatusClass}">${finalStatus}</span></p>
                                ${project ? `<p><span class="text-gray-400">Project:</span> ${project.name}</p>` : ''}
                            </div>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Client Information</h4>
                            <div class="space-y-2">
                                <p class="font-medium">${client?.name || 'Unknown Client'}</p>
                                ${client?.email ? `<p class="text-gray-400">${client.email}</p>` : ''}
                                ${client?.company ? `<p class="text-gray-400">${client.company}</p>` : ''}
                                ${client?.address ? `<p class="text-gray-400 text-sm">${client.address}</p>` : ''}
                            </div>
                        </div>
                    </div>

                    ${invoice.description ? `
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Description</h4>
                            <p class="text-gray-200">${invoice.description}</p>
                        </div>
                    ` : ''}

                    <!-- Invoice Items -->
                    <div>
                        <h4 class="font-semibold text-gray-300 mb-3">Items</h4>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b border-white border-opacity-10">
                                        <th class="text-left py-3 text-gray-300">Description</th>
                                        <th class="text-right py-3 text-gray-300">Qty</th>
                                        <th class="text-right py-3 text-gray-300">Rate</th>
                                        <th class="text-right py-3 text-gray-300">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoice.items.map(item => `
                                        <tr class="border-b border-white border-opacity-5">
                                            <td class="py-3">${item.description}</td>
                                            <td class="text-right py-3">${item.quantity}</td>
                                            <td class="text-right py-3">${Utils.formatCurrency(item.rate)}</td>
                                            <td class="text-right py-3">${Utils.formatCurrency(item.amount)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Invoice Totals -->
                    <div class="bg-white bg-opacity-5 rounded-lg p-4">
                        <div class="space-y-2 text-right">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Subtotal:</span>
                                <span>${Utils.formatCurrency(invoice.subtotal)}</span>
                            </div>
                            ${invoice.discount > 0 ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Discount (${invoice.discount}%):</span>
                                    <span>-${Utils.formatCurrency(invoice.discountAmount)}</span>
                                </div>
                            ` : ''}
                            ${invoice.taxRate > 0 ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-400">Tax (${invoice.taxRate}%):</span>
                                    <span>${Utils.formatCurrency(invoice.taxAmount)}</span>
                                </div>
                            ` : ''}
                            <div class="flex justify-between text-lg font-semibold border-t border-white border-opacity-10 pt-2">
                                <span>Total:</span>
                                <span>${Utils.formatCurrency(invoice.amount)}</span>
                            </div>
                        </div>
                    </div>

                    ${invoice.notes ? `
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Notes</h4>
                            <p class="text-gray-200">${invoice.notes}</p>
                        </div>
                    ` : ''}

                    <!-- Actions -->
                    <div class="flex flex-wrap justify-end gap-3 pt-4 border-t border-white border-opacity-10">
                        ${invoice.status === 'unpaid' ? `
                            <button onclick="InvoicesManager.markAsPaid('${invoice.id}'); UI.closeModal();" class="btn-primary">
                                <i class="fas fa-check mr-2"></i>Mark as Paid
                            </button>
                        ` : ''}
                        <button onclick="InvoicesManager.printInvoice('${invoice.id}')" class="btn-secondary">
                            <i class="fas fa-print mr-2"></i>Print
                        </button>
                        <button onclick="InvoicesManager.editInvoice('${invoice.id}'); UI.closeModal();" class="btn-secondary">
                            <i class="fas fa-edit mr-2"></i>Edit
                        </button>
                        <button onclick="UI.closeModal()" class="btn-primary">
                            Close
                        </button>
                    </div>
                </div>
            `;

            UI.createModal(`Invoice #${invoice.number}`, content, { size: 'xl' });

        } catch (error) {
            console.error('Error viewing invoice:', error);
            UI.showToast('Error loading invoice details', 'error');
        }
    }

    static async editInvoice(invoiceId) {
        try {
            const invoice = await Storage.get('invoices', invoiceId);
            if (!invoice) {
                UI.showToast('Invoice not found', 'error');
                return;
            }

            // Create edit form similar to add form but with pre-filled data
            const clientOptions = this.clients.map(client => 
                `<option value="${client.id}" ${invoice.clientId === client.id ? 'selected' : ''}>${client.name}</option>`
            ).join('');

            const projectOptions = this.projects
                .filter(project => project.clientId === invoice.clientId)
                .map(project => 
                    `<option value="${project.id}" ${invoice.projectId === project.id ? 'selected' : ''}>${project.name}</option>`
                ).join('');

            const formHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Client *</label>
                            <select name="clientId" class="form-input" required onchange="InvoicesManager.onClientChange(this.value)">
                                <option value="">Select a client</option>
                                ${clientOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Project (Optional)</label>
                            <select name="projectId" class="form-input" id="project-select">
                                <option value="">Select a project</option>
                                ${projectOptions}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Invoice Date *</label>
                            <input type="date" name="date" class="form-input" value="${Utils.formatDateForInput(invoice.date)}" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Due Date *</label>
                            <input type="date" name="dueDate" class="form-input" value="${Utils.formatDateForInput(invoice.dueDate)}" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
                            <select name="status" class="form-input">
                                <option value="draft" ${invoice.status === 'draft' ? 'selected' : ''}>Draft</option>
                                <option value="unpaid" ${invoice.status === 'unpaid' ? 'selected' : ''}>Unpaid</option>
                                <option value="paid" ${invoice.status === 'paid' ? 'selected' : ''}>Paid</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea name="description" class="form-input" rows="3">${invoice.description || ''}</textarea>
                    </div>

                    <!-- Invoice Items -->
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <label class="block text-sm font-medium text-gray-300">Invoice Items</label>
                            <button type="button" onclick="InvoicesManager.addInvoiceItem()" class="btn-secondary btn-sm">
                                <i class="fas fa-plus mr-1"></i>Add Item
                            </button>
                        </div>
                        <div id="invoice-items" class="space-y-3">
                            ${invoice.items.map(item => this.createEditableInvoiceItem(item)).join('')}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Tax Rate (%)</label>
                            <input type="number" name="taxRate" class="form-input" min="0" max="100" step="0.01" value="${invoice.taxRate || 0}" onchange="InvoicesManager.calculateTotal()">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Discount (%)</label>
                            <input type="number" name="discount" class="form-input" min="0" max="100" step="0.01" value="${invoice.discount || 0}" onchange="InvoicesManager.calculateTotal()">
                        </div>
                    </div>

                    <div class="bg-white bg-opacity-5 rounded-lg p-4">
                        <div class="flex justify-between items-center text-lg font-semibold">
                            <span>Total Amount:</span>
                            <span id="total-amount">${Utils.formatCurrency(invoice.amount)}</span>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                        <textarea name="notes" class="form-input" rows="3">${invoice.notes || ''}</textarea>
                    </div>
                </div>
            `;

            UI.createFormModal('Edit Invoice', formHTML, (formData, modalId) => {
                this.handleEditInvoice(invoiceId, formData, modalId);
            }, {
                size: 'lg',
                onOpen: () => {
                    setTimeout(() => this.calculateTotal(), 100);
                }
            });

        } catch (error) {
            console.error('Error loading invoice for edit:', error);
            UI.showToast('Error loading invoice', 'error');
        }
    }

    static createEditableInvoiceItem(item) {
        const itemId = Utils.generateId();
        return `
            <div class="grid grid-cols-12 gap-3 items-end" id="item-${itemId}">
                <div class="col-span-5">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <input type="text" name="items[${itemId}][description]" class="form-input" value="${item.description}" required>
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                    <input type="number" name="items[${itemId}][quantity]" class="form-input" min="1" value="${item.quantity}" onchange="InvoicesManager.calculateTotal()" required>
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Rate</label>
                    <input type="number" name="items[${itemId}][rate]" class="form-input" min="0" step="0.01" value="${item.rate}" onchange="InvoicesManager.calculateTotal()" required>
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                    <input type="text" id="amount-${itemId}" class="form-input" readonly value="${Utils.formatCurrency(item.amount)}">
                </div>
                <div class="col-span-1">
                    <button type="button" onclick="InvoicesManager.removeInvoiceItem('${itemId}')" class="btn-secondary p-2 text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    static async handleEditInvoice(invoiceId, formData, modalId) {
        try {
            // Similar validation and processing as handleAddInvoice
            const errors = Storage.validateInvoice(formData);
            if (errors.length > 0) {
                UI.showToast(errors[0], 'error');
                return;
            }

            // Process items and calculate totals (same logic as add)
            const items = [];
            const itemElements = document.querySelectorAll('[id^="item-"]');
            
            itemElements.forEach(element => {
                const description = element.querySelector('input[name$="[description]"]')?.value;
                const quantity = parseFloat(element.querySelector('input[name$="[quantity]"]')?.value) || 0;
                const rate = parseFloat(element.querySelector('input[name$="[rate]"]')?.value) || 0;
                
                if (description && quantity > 0 && rate >= 0) {
                    items.push({
                        description: description.trim(),
                        quantity: quantity,
                        rate: rate,
                        amount: quantity * rate
                    });
                }
            });

            if (items.length === 0) {
                UI.showToast('Please add at least one invoice item', 'error');
                return;
            }

            const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
            const discount = (parseFloat(formData.discount) || 0) / 100;
            const taxRate = (parseFloat(formData.taxRate) || 0) / 100;
            const discountAmount = subtotal * discount;
            const taxableAmount = subtotal - discountAmount;
            const taxAmount = taxableAmount * taxRate;
            const total = taxableAmount + taxAmount;

            // Get current invoice
            const currentInvoice = await Storage.get('invoices', invoiceId);
            
            // Update invoice object
            const updatedInvoice = {
                ...currentInvoice,
                clientId: formData.clientId,
                projectId: formData.projectId || null,
                date: formData.date,
                dueDate: formData.dueDate,
                status: formData.status,
                description: formData.description?.trim() || '',
                items: items,
                subtotal: subtotal,
                discount: discount * 100,
                taxRate: taxRate * 100,
                discountAmount: discountAmount,
                taxAmount: taxAmount,
                amount: total,
                notes: formData.notes?.trim() || ''
            };

            // Save to storage
            await Storage.update('invoices', updatedInvoice);
            
            // Update local data
            const index = this.invoices.findIndex(i => i.id === invoiceId);
            if (index !== -1) {
                this.invoices[index] = updatedInvoice;
                this.applyFilters();
            }

            UI.closeModal(modalId);
            UI.showToast('Invoice updated successfully', 'success');

        } catch (error) {
            console.error('Error updating invoice:', error);
            UI.showToast('Error updating invoice', 'error');
        }
    }

    static async markAsPaid(invoiceId) {
        try {
            const invoice = await Storage.get('invoices', invoiceId);
            if (!invoice) return;

            invoice.status = 'paid';
            invoice.paidDate = new Date().toISOString().split('T')[0];
            
            await Storage.update('invoices', invoice);
            
            const index = this.invoices.findIndex(i => i.id === invoiceId);
            if (index !== -1) {
                this.invoices[index] = invoice;
                this.applyFilters();
            }

            UI.showToast('Invoice marked as paid', 'success');

        } catch (error) {
            console.error('Error updating invoice status:', error);
            UI.showToast('Error updating invoice status', 'error');
        }
    }

    static async printInvoice(invoiceId) {
        try {
            const invoice = await Storage.get('invoices', invoiceId);
            if (!invoice) {
                UI.showToast('Invoice not found', 'error');
                return;
            }

            const client = this.clients.find(c => c.id === invoice.clientId);
            const project = invoice.projectId ? this.projects.find(p => p.id === invoice.projectId) : null;

            // Create printable invoice
            const printContent = this.generatePrintableInvoice(invoice, client, project);
            
            // Open print dialog
            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();

        } catch (error) {
            console.error('Error printing invoice:', error);
            UI.showToast('Error printing invoice', 'error');
        }
    }

    static generatePrintableInvoice(invoice, client, project) {
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Invoice #${invoice.number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
                        .company-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
                        .invoice-title { font-size: 20px; margin: 20px 0; }
                        .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                        .details > div { width: 48%; }
                        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        .table th { background-color: #f8f9fa; font-weight: bold; }
                        .total-section { margin-top: 20px; text-align: right; }
                        .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
                        .final-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
                        .notes { margin-top: 30px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-name">CowebsLB</div>
                        <div>Professional Web Development & Design</div>
                        <div class="invoice-title">INVOICE #${invoice.number}</div>
                    </div>

                    <div class="details">
                        <div>
                            <h3>Bill To:</h3>
                            <p><strong>${client?.name || 'Unknown Client'}</strong></p>
                            ${client?.company ? `<p>${client.company}</p>` : ''}
                            ${client?.email ? `<p>${client.email}</p>` : ''}
                            ${client?.address ? `<p>${client.address}</p>` : ''}
                        </div>
                        <div>
                            <h3>Invoice Details:</h3>
                            <p><strong>Date:</strong> ${Utils.formatDate(invoice.date)}</p>
                            <p><strong>Due Date:</strong> ${Utils.formatDate(invoice.dueDate)}</p>
                            <p><strong>Status:</strong> ${Utils.capitalize(invoice.status)}</p>
                            ${project ? `<p><strong>Project:</strong> ${project.name}</p>` : ''}
                        </div>
                    </div>

                    ${invoice.description ? `
                        <div>
                            <h3>Description:</h3>
                            <p>${invoice.description}</p>
                        </div>
                    ` : ''}

                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width: 50%;">Description</th>
                                <th style="width: 15%; text-align: center;">Qty</th>
                                <th style="width: 20%; text-align: right;">Rate</th>
                                <th style="width: 15%; text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.items.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td style="text-align: center;">${item.quantity}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(item.rate)}</td>
                                    <td style="text-align: right;">${Utils.formatCurrency(item.amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="total-section">
                        <div style="width: 300px; margin-left: auto;">
                            <div class="total-row">
                                <span>Subtotal:</span>
                                <span>${Utils.formatCurrency(invoice.subtotal)}</span>
                            </div>
                            ${invoice.discount > 0 ? `
                                <div class="total-row">
                                    <span>Discount (${invoice.discount}%):</span>
                                    <span>-${Utils.formatCurrency(invoice.discountAmount)}</span>
                                </div>
                            ` : ''}
                            ${invoice.taxRate > 0 ? `
                                <div class="total-row">
                                    <span>Tax (${invoice.taxRate}%):</span>
                                    <span>${Utils.formatCurrency(invoice.taxAmount)}</span>
                                </div>
                            ` : ''}
                            <div class="total-row final-total">
                                <span>Total:</span>
                                <span>${Utils.formatCurrency(invoice.amount)}</span>
                            </div>
                        </div>
                    </div>

                    ${invoice.notes ? `
                        <div class="notes">
                            <h3>Notes:</h3>
                            <p>${invoice.notes}</p>
                        </div>
                    ` : ''}

                    <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
                        <p>Thank you for your business!</p>
                        <p>This invoice was generated on ${Utils.formatDate(new Date().toISOString())}</p>
                    </div>
                </body>
            </html>
        `;
    }

    static deleteInvoice(invoiceId) {
        UI.showConfirm(
            'Delete Invoice',
            'Are you sure you want to delete this invoice? This action cannot be undone.',
            () => this.handleDeleteInvoice(invoiceId),
            {
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        );
    }

    static async handleDeleteInvoice(invoiceId) {
        try {
            await Storage.delete('invoices', invoiceId);
            
            this.invoices = this.invoices.filter(i => i.id !== invoiceId);
            this.applyFilters();

            UI.showToast('Invoice deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting invoice:', error);
            UI.showToast('Error deleting invoice', 'error');
        }
    }
}
