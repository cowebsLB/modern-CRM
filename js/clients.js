// Clients Management
class ClientsManager {
    static clients = [];
    static filteredClients = [];
    static currentFilters = {
        search: '',
        status: '',
        tag: ''
    };

    static async init() {
        await this.loadClients();
        this.setupEventListeners();
        this.renderClients();
    }

    static async loadClients() {
        try {
            this.clients = await Storage.getAll('clients');
            this.filteredClients = [...this.clients];
        } catch (error) {
            console.error('Error loading clients:', error);
            UI.showToast('Error loading clients', 'error');
            this.clients = [];
            this.filteredClients = [];
        }
    }

    static setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('client-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        // Status filter
        const statusFilter = document.getElementById('client-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Tag filter
        const tagFilter = document.getElementById('client-tag-filter');
        if (tagFilter) {
            tagFilter.addEventListener('change', (e) => {
                this.currentFilters.tag = e.target.value;
                this.applyFilters();
            });
        }
    }

    static applyFilters() {
        let filtered = [...this.clients];

        // Apply search filter
        if (this.currentFilters.search) {
            const search = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(client => 
                client.name.toLowerCase().includes(search) ||
                client.email.toLowerCase().includes(search) ||
                client.company?.toLowerCase().includes(search)
            );
        }

        // Apply status filter
        if (this.currentFilters.status) {
            filtered = filtered.filter(client => client.status === this.currentFilters.status);
        }

        // Apply tag filter
        if (this.currentFilters.tag) {
            filtered = filtered.filter(client => 
                client.tags && client.tags.includes(this.currentFilters.tag)
            );
        }

        this.filteredClients = filtered;
        this.renderClients();
    }

    static renderClients() {
        const container = document.getElementById('clients-list');
        if (!container) return;

        if (this.filteredClients.length === 0) {
            container.innerHTML = UI.createEmptyState(
                'No clients found',
                'Try adjusting your search or filters, or add a new client.',
                '<button onclick="ClientsManager.showAddModal()" class="btn-primary">Add First Client</button>'
            );
            return;
        }

        // Mobile view
        if (Utils.isMobile()) {
            container.innerHTML = this.filteredClients.map(client => this.renderClientCard(client)).join('');
        } else {
            // Desktop table view
            const { tableId, html } = UI.createDataTable(
                [
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'company', label: 'Company' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'status', label: 'Status', formatter: this.formatStatus },
                    { key: 'tags', label: 'Tags', formatter: this.formatTags }
                ],
                this.filteredClients,
                {
                    actions: [
                        { icon: 'fas fa-eye', label: 'View', handler: 'ClientsManager.viewClient' },
                        { icon: 'fas fa-edit', label: 'Edit', handler: 'ClientsManager.editClient' },
                        { icon: 'fas fa-trash', label: 'Delete', handler: 'ClientsManager.deleteClient' }
                    ]
                }
            );

            container.innerHTML = html;
            UI.renderTableData(tableId);

            // Setup search for table
            const searchInput = document.getElementById(`search-${tableId}`);
            if (searchInput) {
                searchInput.addEventListener('input', Utils.debounce((e) => {
                    UI.searchTable(tableId, e.target.value);
                }, 300));
            }
        }
    }

    static renderClientCard(client) {
        const statusClass = Utils.getStatusColor(client.status, 'client');
        const tags = client.tags ? client.tags.map(tag => 
            `<span class="tag ${tag === 'vip' ? 'tag-vip' : tag === 'urgent' ? 'tag-urgent' : ''}">${tag}</span>`
        ).join(' ') : '';

        return `
            <div class="mobile-card cursor-pointer" onclick="ClientsManager.viewClient('${client.id}')">
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <h3 class="font-semibold text-white">${client.name}</h3>
                        <p class="text-gray-400 text-sm">${client.email}</p>
                        ${client.company ? `<p class="text-gray-500 text-sm">${client.company}</p>` : ''}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="event.stopPropagation(); ClientsManager.editClient('${client.id}')" 
                                class="text-gray-400 hover:text-blue-400 p-1">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="event.stopPropagation(); ClientsManager.deleteClient('${client.id}')" 
                                class="text-gray-400 hover:text-red-400 p-1">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <span class="status-badge ${statusClass}">${Utils.capitalize(client.status)}</span>
                        ${tags}
                    </div>
                    ${client.phone ? `<span class="text-gray-400 text-sm">${client.phone}</span>` : ''}
                </div>
            </div>
        `;
    }

    static formatStatus(status) {
        const statusClass = Utils.getStatusColor(status, 'client');
        return `<span class="status-badge ${statusClass}">${Utils.capitalize(status)}</span>`;
    }

    static formatTags(tags) {
        if (!tags || tags.length === 0) return '';
        return tags.map(tag => 
            `<span class="tag ${tag === 'vip' ? 'tag-vip' : tag === 'urgent' ? 'tag-urgent' : ''}">${tag}</span>`
        ).join(' ');
    }

    static showAddModal() {
        const formHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                        <input type="text" name="name" class="form-input" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                        <input type="email" name="email" class="form-input" required>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Company</label>
                        <input type="text" name="company" class="form-input">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                        <input type="tel" name="phone" class="form-input">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Website</label>
                        <input type="url" name="website" class="form-input" placeholder="https://">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
                        <select name="status" class="form-input">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Address</label>
                    <textarea name="address" class="form-input" rows="3"></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                    <div class="flex flex-wrap gap-2 mb-2">
                        <label class="flex items-center">
                            <input type="checkbox" name="tags" value="vip" class="mr-2">
                            <span class="tag tag-vip">VIP</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="tags" value="urgent" class="mr-2">
                            <span class="tag tag-urgent">Urgent</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="tags" value="potential" class="mr-2">
                            <span class="tag">Potential</span>
                        </label>
                    </div>
                    <input type="text" name="customTag" class="form-input" placeholder="Add custom tag">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                    <textarea name="notes" class="form-input" rows="3" placeholder="Additional notes about this client..."></textarea>
                </div>
            </div>
        `;

        UI.createFormModal('Add New Client', formHTML, this.handleAddClient.bind(this), {
            size: 'lg'
        });
    }

    static async handleAddClient(formData, modalId) {
        try {
            // Validate required fields
            const errors = Storage.validateClient(formData);
            if (errors.length > 0) {
                UI.showToast(errors[0], 'error');
                return;
            }

            // Process tags
            const tags = [];
            if (formData.tags) {
                if (Array.isArray(formData.tags)) {
                    tags.push(...formData.tags);
                } else {
                    tags.push(formData.tags);
                }
            }
            if (formData.customTag && formData.customTag.trim()) {
                tags.push(formData.customTag.trim());
            }

            // Create client object
            const client = {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                company: formData.company?.trim() || '',
                phone: formData.phone?.trim() || '',
                website: formData.website?.trim() || '',
                address: formData.address?.trim() || '',
                status: formData.status || 'active',
                tags: tags,
                notes: formData.notes?.trim() || ''
            };

            // Save to storage
            const savedClient = await Storage.add('clients', client);
            
            // Update local data
            this.clients.push(savedClient);
            this.applyFilters();

            // Close modal and show success
            UI.closeModal(modalId);
            UI.showToast('Client added successfully', 'success');

        } catch (error) {
            console.error('Error adding client:', error);
            UI.showToast('Error adding client', 'error');
        }
    }

    static async viewClient(clientId) {
        try {
            const client = await Storage.get('clients', clientId);
            if (!client) {
                UI.showToast('Client not found', 'error');
                return;
            }

            // Get related data
            const [projects, invoices] = await Promise.all([
                Storage.getClientProjects(clientId),
                Storage.getClientInvoices(clientId)
            ]);

            const content = `
                <div class="space-y-6">
                    <!-- Client Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Contact Information</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">Email:</span> ${client.email}</p>
                                ${client.phone ? `<p><span class="text-gray-400">Phone:</span> ${client.phone}</p>` : ''}
                                ${client.company ? `<p><span class="text-gray-400">Company:</span> ${client.company}</p>` : ''}
                                ${client.website ? `<p><span class="text-gray-400">Website:</span> <a href="${client.website}" target="_blank" class="text-blue-400">${client.website}</a></p>` : ''}
                            </div>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Details</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">Status:</span> ${this.formatStatus(client.status)}</p>
                                <p><span class="text-gray-400">Created:</span> ${Utils.formatDate(client.createdAt)}</p>
                                ${client.tags && client.tags.length > 0 ? `<p><span class="text-gray-400">Tags:</span> ${this.formatTags(client.tags)}</p>` : ''}
                            </div>
                        </div>
                    </div>

                    ${client.address ? `
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Address</h4>
                            <p class="text-gray-200">${client.address}</p>
                        </div>
                    ` : ''}

                    ${client.notes ? `
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Notes</h4>
                            <p class="text-gray-200">${client.notes}</p>
                        </div>
                    ` : ''}

                    <!-- Projects -->
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-semibold text-gray-300">Projects (${projects.length})</h4>
                            <button onclick="ProjectsManager.showAddModal('${clientId}')" class="btn-primary btn-sm">
                                <i class="fas fa-plus mr-1"></i>Add Project
                            </button>
                        </div>
                        ${projects.length > 0 ? `
                            <div class="space-y-2">
                                ${projects.map(project => `
                                    <div class="flex items-center justify-between p-3 bg-white bg-opacity-5 rounded-lg">
                                        <div>
                                            <p class="font-medium">${project.name}</p>
                                            <p class="text-sm text-gray-400">${Utils.formatDate(project.createdAt)}</p>
                                        </div>
                                        <span class="status-badge ${Utils.getStatusColor(project.status, 'project')}">${Utils.capitalize(project.status)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-gray-400">No projects yet</p>'}
                    </div>

                    <!-- Invoices -->
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-semibold text-gray-300">Invoices (${invoices.length})</h4>
                            <button onclick="InvoicesManager.showAddModal('${clientId}')" class="btn-primary btn-sm">
                                <i class="fas fa-plus mr-1"></i>Create Invoice
                            </button>
                        </div>
                        ${invoices.length > 0 ? `
                            <div class="space-y-2">
                                ${invoices.map(invoice => `
                                    <div class="flex items-center justify-between p-3 bg-white bg-opacity-5 rounded-lg">
                                        <div>
                                            <p class="font-medium">Invoice #${invoice.number}</p>
                                            <p class="text-sm text-gray-400">${Utils.formatDate(invoice.date)}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="font-medium">${Utils.formatCurrency(invoice.amount)}</p>
                                            <span class="status-badge ${Utils.getStatusColor(invoice.status, 'invoice')}">${Utils.capitalize(invoice.status)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-gray-400">No invoices yet</p>'}
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-end space-x-3 pt-4 border-t border-white border-opacity-10">
                        <button onclick="ClientsManager.editClient('${client.id}'); UI.closeModal();" class="btn-secondary">
                            <i class="fas fa-edit mr-2"></i>Edit Client
                        </button>
                        <button onclick="UI.closeModal()" class="btn-primary">
                            Close
                        </button>
                    </div>
                </div>
            `;

            UI.createModal(client.name, content, { size: 'xl' });

        } catch (error) {
            console.error('Error viewing client:', error);
            UI.showToast('Error loading client details', 'error');
        }
    }

    static async editClient(clientId) {
        try {
            const client = await Storage.get('clients', clientId);
            if (!client) {
                UI.showToast('Client not found', 'error');
                return;
            }

            const formHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                            <input type="text" name="name" class="form-input" value="${client.name}" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                            <input type="email" name="email" class="form-input" value="${client.email}" required>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Company</label>
                            <input type="text" name="company" class="form-input" value="${client.company || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                            <input type="tel" name="phone" class="form-input" value="${client.phone || ''}">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Website</label>
                            <input type="url" name="website" class="form-input" value="${client.website || ''}" placeholder="https://">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
                            <select name="status" class="form-input">
                                <option value="active" ${client.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${client.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Address</label>
                        <textarea name="address" class="form-input" rows="3">${client.address || ''}</textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                        <div class="flex flex-wrap gap-2 mb-2">
                            <label class="flex items-center">
                                <input type="checkbox" name="tags" value="vip" class="mr-2" ${client.tags?.includes('vip') ? 'checked' : ''}>
                                <span class="tag tag-vip">VIP</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="tags" value="urgent" class="mr-2" ${client.tags?.includes('urgent') ? 'checked' : ''}>
                                <span class="tag tag-urgent">Urgent</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="tags" value="potential" class="mr-2" ${client.tags?.includes('potential') ? 'checked' : ''}>
                                <span class="tag">Potential</span>
                            </label>
                        </div>
                        <input type="text" name="customTag" class="form-input" placeholder="Add custom tag" value="${client.tags?.filter(tag => !['vip', 'urgent', 'potential'].includes(tag)).join(', ') || ''}">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                        <textarea name="notes" class="form-input" rows="3" placeholder="Additional notes about this client...">${client.notes || ''}</textarea>
                    </div>
                </div>
            `;

            UI.createFormModal('Edit Client', formHTML, (formData, modalId) => {
                this.handleEditClient(clientId, formData, modalId);
            }, {
                size: 'lg'
            });

        } catch (error) {
            console.error('Error loading client for edit:', error);
            UI.showToast('Error loading client', 'error');
        }
    }

    static async handleEditClient(clientId, formData, modalId) {
        try {
            // Validate required fields
            const errors = Storage.validateClient(formData);
            if (errors.length > 0) {
                UI.showToast(errors[0], 'error');
                return;
            }

            // Process tags
            const tags = [];
            if (formData.tags) {
                if (Array.isArray(formData.tags)) {
                    tags.push(...formData.tags);
                } else {
                    tags.push(formData.tags);
                }
            }
            if (formData.customTag && formData.customTag.trim()) {
                const customTags = formData.customTag.split(',').map(tag => tag.trim()).filter(tag => tag);
                tags.push(...customTags);
            }

            // Get current client
            const currentClient = await Storage.get('clients', clientId);
            
            // Update client object
            const updatedClient = {
                ...currentClient,
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                company: formData.company?.trim() || '',
                phone: formData.phone?.trim() || '',
                website: formData.website?.trim() || '',
                address: formData.address?.trim() || '',
                status: formData.status || 'active',
                tags: tags,
                notes: formData.notes?.trim() || ''
            };

            // Save to storage
            await Storage.update('clients', updatedClient);
            
            // Update local data
            const index = this.clients.findIndex(c => c.id === clientId);
            if (index !== -1) {
                this.clients[index] = updatedClient;
                this.applyFilters();
            }

            // Close modal and show success
            UI.closeModal(modalId);
            UI.showToast('Client updated successfully', 'success');

        } catch (error) {
            console.error('Error updating client:', error);
            UI.showToast('Error updating client', 'error');
        }
    }

    static deleteClient(clientId) {
        UI.showConfirm(
            'Delete Client',
            'Are you sure you want to delete this client? This action cannot be undone.',
            () => this.handleDeleteClient(clientId),
            {
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        );
    }

    static async handleDeleteClient(clientId) {
        try {
            await Storage.delete('clients', clientId);
            
            // Update local data
            this.clients = this.clients.filter(c => c.id !== clientId);
            this.applyFilters();

            UI.showToast('Client deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting client:', error);
            UI.showToast('Error deleting client', 'error');
        }
    }
}
