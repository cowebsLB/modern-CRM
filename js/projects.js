// Projects Management
class ProjectsManager {
    static projects = [];
    static clients = [];
    static filteredProjects = [];
    static currentFilters = {
        search: '',
        status: '',
        client: ''
    };

    static async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderProjects();
        this.populateClientFilter();
    }

    static async loadData() {
        try {
            [this.projects, this.clients] = await Promise.all([
                Storage.getAll('projects'),
                Storage.getAll('clients')
            ]);
            this.filteredProjects = [...this.projects];
        } catch (error) {
            console.error('Error loading projects:', error);
            UI.showToast('Error loading projects', 'error');
            this.projects = [];
            this.clients = [];
            this.filteredProjects = [];
        }
    }

    static setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('project-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        // Status filter
        const statusFilter = document.getElementById('project-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Client filter
        const clientFilter = document.getElementById('project-client-filter');
        if (clientFilter) {
            clientFilter.addEventListener('change', (e) => {
                this.currentFilters.client = e.target.value;
                this.applyFilters();
            });
        }
    }

    static populateClientFilter() {
        const clientFilter = document.getElementById('project-client-filter');
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
        let filtered = [...this.projects];

        // Apply search filter
        if (this.currentFilters.search) {
            const search = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(project => 
                project.name.toLowerCase().includes(search) ||
                project.description?.toLowerCase().includes(search) ||
                this.getClientName(project.clientId).toLowerCase().includes(search)
            );
        }

        // Apply status filter
        if (this.currentFilters.status) {
            filtered = filtered.filter(project => project.status === this.currentFilters.status);
        }

        // Apply client filter
        if (this.currentFilters.client) {
            filtered = filtered.filter(project => project.clientId === this.currentFilters.client);
        }

        this.filteredProjects = filtered;
        this.renderProjects();
    }

    static getClientName(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        return client ? client.name : 'Unknown Client';
    }

    static renderProjects() {
        const container = document.getElementById('projects-grid');
        if (!container) return;

        if (this.filteredProjects.length === 0) {
            container.innerHTML = `
                <div class="col-span-full">
                    ${UI.createEmptyState(
                        'No projects found',
                        'Try adjusting your search or filters, or create a new project.',
                        '<button onclick="ProjectsManager.showAddModal()" class="btn-primary">Create First Project</button>'
                    )}
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredProjects.map(project => this.renderProjectCard(project)).join('');
    }

    static renderProjectCard(project) {
        const client = this.clients.find(c => c.id === project.clientId);
        const clientName = client ? client.name : 'Unknown Client';
        const statusClass = Utils.getStatusColor(project.status, 'project');
        const statusIcon = Utils.getStatusIcon(project.status, 'project');
        
        const tags = project.tags ? project.tags.map(tag => 
            `<span class="tag ${tag === 'urgent' ? 'tag-urgent' : ''}">${tag}</span>`
        ).join(' ') : '';

        const progress = this.calculateProgress(project);
        const dueDate = project.dueDate ? new Date(project.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && project.status !== 'completed';

        return `
            <div class="card card-hover cursor-pointer" onclick="ProjectsManager.viewProject('${project.id}')">
                <!-- Header -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="font-semibold text-white mb-1">${project.name}</h3>
                        <p class="text-gray-400 text-sm">${clientName}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="event.stopPropagation(); ProjectsManager.editProject('${project.id}')" 
                                class="text-gray-400 hover:text-blue-400 p-1" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="event.stopPropagation(); ProjectsManager.deleteProject('${project.id}')" 
                                class="text-gray-400 hover:text-red-400 p-1" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <!-- Description -->
                ${project.description ? `<p class="text-gray-300 text-sm mb-4 line-clamp-2">${project.description}</p>` : ''}

                <!-- Progress -->
                <div class="mb-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm text-gray-400">Progress</span>
                        <span class="text-sm text-gray-300">${progress}%</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                    </div>
                </div>

                <!-- Status and Due Date -->
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-2">
                        <span class="status-badge ${statusClass}">
                            <i class="${statusIcon} mr-1"></i>
                            ${Utils.capitalize(project.status)}
                        </span>
                        ${tags}
                    </div>
                    ${dueDate ? `
                        <span class="text-xs ${isOverdue ? 'text-red-400' : 'text-gray-400'}">
                            ${isOverdue ? 'Overdue: ' : 'Due: '}${Utils.formatDate(project.dueDate)}
                        </span>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-between text-sm text-gray-400 pt-3 border-t border-white border-opacity-10">
                    <span>Created ${Utils.formatDate(project.createdAt, 'relative')}</span>
                    <div class="flex items-center space-x-3">
                        ${project.budget ? `<span>$${Utils.formatNumber(project.budget)}</span>` : ''}
                        <button onclick="event.stopPropagation(); ProjectsManager.viewTasks('${project.id}')" 
                                class="text-blue-400 hover:text-blue-300" title="View Tasks">
                            <i class="fas fa-tasks"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    static calculateProgress(project) {
        // Simple progress calculation based on status
        const statusProgress = {
            'new': 0,
            'in-progress': 50,
            'completed': 100,
            'on-hold': 25,
            'cancelled': 0
        };
        return statusProgress[project.status] || 0;
    }

    static showAddModal(clientId = null) {
        const clientOptions = this.clients.map(client => 
            `<option value="${client.id}" ${clientId === client.id ? 'selected' : ''}>${client.name}</option>`
        ).join('');

        const formHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Project Name *</label>
                        <input type="text" name="name" class="form-input" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Client *</label>
                        <select name="clientId" class="form-input" required>
                            <option value="">Select a client</option>
                            ${clientOptions}
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea name="description" class="form-input" rows="3" placeholder="Project description..."></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
                        <select name="status" class="form-input">
                            <option value="new">New</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="on-hold">On Hold</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                        <input type="date" name="startDate" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                        <input type="date" name="dueDate" class="form-input">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Budget</label>
                        <input type="number" name="budget" class="form-input" min="0" step="0.01" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                        <select name="priority" class="form-input">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                    <div class="flex flex-wrap gap-2 mb-2">
                        <label class="flex items-center">
                            <input type="checkbox" name="tags" value="website" class="mr-2">
                            <span class="tag">Website</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="tags" value="mobile" class="mr-2">
                            <span class="tag">Mobile</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="tags" value="ecommerce" class="mr-2">
                            <span class="tag">E-commerce</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="tags" value="urgent" class="mr-2">
                            <span class="tag tag-urgent">Urgent</span>
                        </label>
                    </div>
                    <input type="text" name="customTags" class="form-input" placeholder="Add custom tags (comma separated)">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                    <textarea name="notes" class="form-input" rows="3" placeholder="Additional project notes..."></textarea>
                </div>
            </div>
        `;

        UI.createFormModal('Create New Project', formHTML, this.handleAddProject.bind(this), {
            size: 'lg'
        });
    }

    static async handleAddProject(formData, modalId) {
        try {
            // Validate required fields
            const errors = Storage.validateProject(formData);
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
            if (formData.customTags && formData.customTags.trim()) {
                const customTags = formData.customTags.split(',').map(tag => tag.trim()).filter(tag => tag);
                tags.push(...customTags);
            }

            // Create project object
            const project = {
                name: formData.name.trim(),
                clientId: formData.clientId,
                description: formData.description?.trim() || '',
                status: formData.status || 'new',
                startDate: formData.startDate || new Date().toISOString().split('T')[0],
                dueDate: formData.dueDate || null,
                budget: formData.budget ? parseFloat(formData.budget) : null,
                priority: formData.priority || 'medium',
                tags: tags,
                notes: formData.notes?.trim() || ''
            };

            // Save to storage
            const savedProject = await Storage.add('projects', project);
            
            // Update local data
            this.projects.push(savedProject);
            this.applyFilters();

            // Close modal and show success
            UI.closeModal(modalId);
            UI.showToast('Project created successfully', 'success');

        } catch (error) {
            console.error('Error creating project:', error);
            UI.showToast('Error creating project', 'error');
        }
    }

    static async viewProject(projectId) {
        try {
            const project = await Storage.get('projects', projectId);
            if (!project) {
                UI.showToast('Project not found', 'error');
                return;
            }

            const client = this.clients.find(c => c.id === project.clientId);
            const clientName = client ? client.name : 'Unknown Client';

            // Get related data
            const [tasks, invoices] = await Promise.all([
                Storage.getProjectTasks(projectId),
                Storage.getProjectInvoices(projectId)
            ]);

            const statusClass = Utils.getStatusColor(project.status, 'project');
            const progress = this.calculateProgress(project);

            const content = `
                <div class="space-y-6">
                    <!-- Project Header -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Project Details</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">Client:</span> ${clientName}</p>
                                <p><span class="text-gray-400">Status:</span> ${UI.createBadge(Utils.capitalize(project.status), project.status === 'completed' ? 'success' : project.status === 'in-progress' ? 'primary' : 'default')}</p>
                                <p><span class="text-gray-400">Priority:</span> ${UI.createBadge(Utils.capitalize(project.priority), project.priority === 'urgent' ? 'danger' : project.priority === 'high' ? 'warning' : 'default')}</p>
                                <p><span class="text-gray-400">Created:</span> ${Utils.formatDate(project.createdAt)}</p>
                                ${project.startDate ? `<p><span class="text-gray-400">Start Date:</span> ${Utils.formatDate(project.startDate)}</p>` : ''}
                                ${project.dueDate ? `<p><span class="text-gray-400">Due Date:</span> ${Utils.formatDate(project.dueDate)}</p>` : ''}
                            </div>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Progress & Budget</h4>
                            <div class="space-y-4">
                                <div>
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-sm text-gray-400">Progress</span>
                                        <span class="text-sm text-gray-300">${progress}%</span>
                                    </div>
                                    <div class="w-full bg-gray-700 rounded-full h-3">
                                        <div class="bg-blue-500 h-3 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                                    </div>
                                </div>
                                ${project.budget ? `<p><span class="text-gray-400">Budget:</span> ${Utils.formatCurrency(project.budget)}</p>` : ''}
                                ${project.tags && project.tags.length > 0 ? `<p><span class="text-gray-400">Tags:</span> ${project.tags.map(tag => `<span class="tag ${tag === 'urgent' ? 'tag-urgent' : ''}">${tag}</span>`).join(' ')}</p>` : ''}
                            </div>
                        </div>
                    </div>

                    ${project.description ? `
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Description</h4>
                            <p class="text-gray-200">${project.description}</p>
                        </div>
                    ` : ''}

                    ${project.notes ? `
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Notes</h4>
                            <p class="text-gray-200">${project.notes}</p>
                        </div>
                    ` : ''}

                    <!-- Tasks -->
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-semibold text-gray-300">Tasks (${tasks.length})</h4>
                            <button onclick="ProjectsManager.addTask('${projectId}')" class="btn-primary btn-sm">
                                <i class="fas fa-plus mr-1"></i>Add Task
                            </button>
                        </div>
                        ${tasks.length > 0 ? `
                            <div class="space-y-2">
                                ${tasks.map(task => `
                                    <div class="flex items-center justify-between p-3 bg-white bg-opacity-5 rounded-lg">
                                        <div class="flex items-center space-x-3">
                                            <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''} 
                                                   onchange="ProjectsManager.toggleTask('${task.id}')"
                                                   class="rounded">
                                            <div>
                                                <p class="font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}">${task.title}</p>
                                                ${task.dueDate ? `<p class="text-sm text-gray-400">Due: ${Utils.formatDate(task.dueDate)}</p>` : ''}
                                            </div>
                                        </div>
                                        <span class="status-badge ${Utils.getStatusColor(task.status, 'project')}">${Utils.capitalize(task.status)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-gray-400">No tasks yet</p>'}
                    </div>

                    <!-- Invoices -->
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-semibold text-gray-300">Invoices (${invoices.length})</h4>
                            <button onclick="InvoicesManager.showAddModal('${project.clientId}', '${projectId}')" class="btn-primary btn-sm">
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
                        <button onclick="ProjectsManager.editProject('${project.id}'); UI.closeModal();" class="btn-secondary">
                            <i class="fas fa-edit mr-2"></i>Edit Project
                        </button>
                        <button onclick="UI.closeModal()" class="btn-primary">
                            Close
                        </button>
                    </div>
                </div>
            `;

            UI.createModal(project.name, content, { size: 'xl' });

        } catch (error) {
            console.error('Error viewing project:', error);
            UI.showToast('Error loading project details', 'error');
        }
    }

    static async editProject(projectId) {
        try {
            const project = await Storage.get('projects', projectId);
            if (!project) {
                UI.showToast('Project not found', 'error');
                return;
            }

            const clientOptions = this.clients.map(client => 
                `<option value="${client.id}" ${project.clientId === client.id ? 'selected' : ''}>${client.name}</option>`
            ).join('');

            const formHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Project Name *</label>
                            <input type="text" name="name" class="form-input" value="${project.name}" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Client *</label>
                            <select name="clientId" class="form-input" required>
                                <option value="">Select a client</option>
                                ${clientOptions}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea name="description" class="form-input" rows="3">${project.description || ''}</textarea>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
                            <select name="status" class="form-input">
                                <option value="new" ${project.status === 'new' ? 'selected' : ''}>New</option>
                                <option value="in-progress" ${project.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="on-hold" ${project.status === 'on-hold' ? 'selected' : ''}>On Hold</option>
                                <option value="cancelled" ${project.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                            <input type="date" name="startDate" class="form-input" value="${Utils.formatDateForInput(project.startDate)}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                            <input type="date" name="dueDate" class="form-input" value="${Utils.formatDateForInput(project.dueDate)}">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Budget</label>
                            <input type="number" name="budget" class="form-input" min="0" step="0.01" value="${project.budget || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                            <select name="priority" class="form-input">
                                <option value="low" ${project.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${project.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${project.priority === 'high' ? 'selected' : ''}>High</option>
                                <option value="urgent" ${project.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                        <div class="flex flex-wrap gap-2 mb-2">
                            <label class="flex items-center">
                                <input type="checkbox" name="tags" value="website" class="mr-2" ${project.tags?.includes('website') ? 'checked' : ''}>
                                <span class="tag">Website</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="tags" value="mobile" class="mr-2" ${project.tags?.includes('mobile') ? 'checked' : ''}>
                                <span class="tag">Mobile</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="tags" value="ecommerce" class="mr-2" ${project.tags?.includes('ecommerce') ? 'checked' : ''}>
                                <span class="tag">E-commerce</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="tags" value="urgent" class="mr-2" ${project.tags?.includes('urgent') ? 'checked' : ''}>
                                <span class="tag tag-urgent">Urgent</span>
                            </label>
                        </div>
                        <input type="text" name="customTags" class="form-input" placeholder="Add custom tags (comma separated)" 
                               value="${project.tags?.filter(tag => !['website', 'mobile', 'ecommerce', 'urgent'].includes(tag)).join(', ') || ''}">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                        <textarea name="notes" class="form-input" rows="3">${project.notes || ''}</textarea>
                    </div>
                </div>
            `;

            UI.createFormModal('Edit Project', formHTML, (formData, modalId) => {
                this.handleEditProject(projectId, formData, modalId);
            }, {
                size: 'lg'
            });

        } catch (error) {
            console.error('Error loading project for edit:', error);
            UI.showToast('Error loading project', 'error');
        }
    }

    static async handleEditProject(projectId, formData, modalId) {
        try {
            // Validate required fields
            const errors = Storage.validateProject(formData);
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
            if (formData.customTags && formData.customTags.trim()) {
                const customTags = formData.customTags.split(',').map(tag => tag.trim()).filter(tag => tag);
                tags.push(...customTags);
            }

            // Get current project
            const currentProject = await Storage.get('projects', projectId);
            
            // Update project object
            const updatedProject = {
                ...currentProject,
                name: formData.name.trim(),
                clientId: formData.clientId,
                description: formData.description?.trim() || '',
                status: formData.status || 'new',
                startDate: formData.startDate || null,
                dueDate: formData.dueDate || null,
                budget: formData.budget ? parseFloat(formData.budget) : null,
                priority: formData.priority || 'medium',
                tags: tags,
                notes: formData.notes?.trim() || ''
            };

            // Save to storage
            await Storage.update('projects', updatedProject);
            
            // Update local data
            const index = this.projects.findIndex(p => p.id === projectId);
            if (index !== -1) {
                this.projects[index] = updatedProject;
                this.applyFilters();
            }

            // Close modal and show success
            UI.closeModal(modalId);
            UI.showToast('Project updated successfully', 'success');

        } catch (error) {
            console.error('Error updating project:', error);
            UI.showToast('Error updating project', 'error');
        }
    }

    static deleteProject(projectId) {
        UI.showConfirm(
            'Delete Project',
            'Are you sure you want to delete this project? This action cannot be undone and will also delete all associated tasks.',
            () => this.handleDeleteProject(projectId),
            {
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        );
    }

    static async handleDeleteProject(projectId) {
        try {
            // Delete project and associated tasks
            await Promise.all([
                Storage.delete('projects', projectId),
                // TODO: Delete associated tasks
            ]);
            
            // Update local data
            this.projects = this.projects.filter(p => p.id !== projectId);
            this.applyFilters();

            UI.showToast('Project deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting project:', error);
            UI.showToast('Error deleting project', 'error');
        }
    }

    static async addTask(projectId) {
        const formHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Task Title *</label>
                    <input type="text" name="title" class="form-input" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea name="description" class="form-input" rows="3"></textarea>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                        <select name="priority" class="form-input">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                        <input type="date" name="dueDate" class="form-input">
                    </div>
                </div>
            </div>
        `;

        UI.createFormModal('Add Task', formHTML, async (formData, modalId) => {
            try {
                const task = {
                    title: formData.title.trim(),
                    description: formData.description?.trim() || '',
                    projectId: projectId,
                    status: 'new',
                    priority: formData.priority || 'medium',
                    dueDate: formData.dueDate || null
                };

                await Storage.add('tasks', task);
                UI.closeModal(modalId);
                UI.showToast('Task added successfully', 'success');

                // Refresh the project view if it's open
                const projectModal = document.querySelector('.modal-backdrop');
                if (projectModal) {
                    this.viewProject(projectId);
                }

            } catch (error) {
                console.error('Error adding task:', error);
                UI.showToast('Error adding task', 'error');
            }
        });
    }

    static async toggleTask(taskId) {
        try {
            const task = await Storage.get('tasks', taskId);
            if (!task) return;

            task.status = task.status === 'completed' ? 'new' : 'completed';
            await Storage.update('tasks', task);

            UI.showToast(`Task ${task.status === 'completed' ? 'completed' : 'reopened'}`, 'success');

        } catch (error) {
            console.error('Error updating task:', error);
            UI.showToast('Error updating task', 'error');
        }
    }

    static viewTasks(projectId) {
        // Navigate to a tasks view or show tasks modal
        UI.showToast('Tasks view coming soon!', 'info');
    }
}
