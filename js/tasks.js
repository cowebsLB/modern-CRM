// Tasks Management
class TasksManager {
    static tasks = [];
    static clients = [];
    static projects = [];
    static filteredTasks = [];
    static currentFilters = {
        search: '',
        status: '',
        priority: '',
        project: '',
        assignee: ''
    };

    static async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderTasks();
        this.populateFilters();
    }

    static async loadData() {
        try {
            [this.tasks, this.clients, this.projects] = await Promise.all([
                Storage.getAll('tasks'),
                Storage.getAll('clients'),
                Storage.getAll('projects')
            ]);
            this.filteredTasks = [...this.tasks];
        } catch (error) {
            console.error('Error loading tasks:', error);
            UI.showToast('Error loading tasks', 'error');
            this.tasks = [];
            this.clients = [];
            this.projects = [];
            this.filteredTasks = [];
        }
    }

    static setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('task-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        // Filter inputs
        ['status', 'priority', 'project', 'assignee'].forEach(filterType => {
            const filterElement = document.getElementById(`task-${filterType}-filter`);
            if (filterElement) {
                filterElement.addEventListener('change', (e) => {
                    this.currentFilters[filterType] = e.target.value;
                    this.applyFilters();
                });
            }
        });
    }

    static populateFilters() {
        // Populate project filter
        const projectFilter = document.getElementById('task-project-filter');
        if (projectFilter) {
            const projectOptions = this.projects.map(project => 
                `<option value="${project.id}">${project.name}</option>`
            ).join('');

            projectFilter.innerHTML = `
                <option value="">All Projects</option>
                ${projectOptions}
            `;
        }
    }

    static applyFilters() {
        let filtered = [...this.tasks];

        // Apply search filter
        if (this.currentFilters.search) {
            const search = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(search) ||
                task.description?.toLowerCase().includes(search) ||
                task.assignee?.toLowerCase().includes(search)
            );
        }

        // Apply status filter
        if (this.currentFilters.status) {
            filtered = filtered.filter(task => task.status === this.currentFilters.status);
        }

        // Apply priority filter
        if (this.currentFilters.priority) {
            filtered = filtered.filter(task => task.priority === this.currentFilters.priority);
        }

        // Apply project filter
        if (this.currentFilters.project) {
            filtered = filtered.filter(task => task.projectId === this.currentFilters.project);
        }

        // Apply assignee filter
        if (this.currentFilters.assignee) {
            filtered = filtered.filter(task => 
                task.assignee?.toLowerCase().includes(this.currentFilters.assignee.toLowerCase())
            );
        }

        // Sort by priority and due date
        filtered.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            
            if (priorityDiff !== 0) return priorityDiff;
            
            // If same priority, sort by due date
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return 0;
        });

        this.filteredTasks = filtered;
        this.renderTasks();
    }

    static getProjectName(projectId) {
        if (!projectId) return '';
        const project = this.projects.find(p => p.id === projectId);
        return project ? project.name : 'Unknown Project';
    }

    static renderTasks() {
        const container = document.getElementById('tasks-container');
        if (!container) return;

        if (this.filteredTasks.length === 0) {
            container.innerHTML = UI.createEmptyState(
                'No tasks found',
                'Try adjusting your search or filters, or create a new task.',
                '<button onclick="TasksManager.showAddModal()" class="btn-primary">Create First Task</button>'
            );
            return;
        }

        // Group tasks by status
        const groupedTasks = {
            todo: this.filteredTasks.filter(t => t.status === 'todo'),
            inprogress: this.filteredTasks.filter(t => t.status === 'inprogress'),
            completed: this.filteredTasks.filter(t => t.status === 'completed')
        };

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                ${this.renderTaskColumn('To Do', 'todo', groupedTasks.todo)}
                ${this.renderTaskColumn('In Progress', 'inprogress', groupedTasks.inprogress)}
                ${this.renderTaskColumn('Completed', 'completed', groupedTasks.completed)}
            </div>
        `;
    }

    static renderTaskColumn(title, status, tasks) {
        const statusColors = {
            todo: 'border-gray-500',
            inprogress: 'border-blue-500',
            completed: 'border-green-500'
        };

        return `
            <div class="glass-card border-t-4 ${statusColors[status]}">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">${title}</h3>
                    <span class="text-sm text-gray-400">(${tasks.length})</span>
                </div>
                <div class="space-y-3 max-h-96 overflow-y-auto">
                    ${tasks.map(task => this.renderTaskCard(task)).join('')}
                    <button onclick="TasksManager.showAddModal('${status}')" 
                            class="w-full p-3 border border-dashed border-gray-500 rounded-lg hover:border-blue-400 hover:bg-white hover:bg-opacity-5 transition-all duration-200 text-gray-400 hover:text-blue-400">
                        <i class="fas fa-plus mr-2"></i>Add Task
                    </button>
                </div>
            </div>
        `;
    }

    static renderTaskCard(task) {
        const priorityColors = {
            high: 'border-red-500 bg-red-500 bg-opacity-10',
            medium: 'border-yellow-500 bg-yellow-500 bg-opacity-10',
            low: 'border-green-500 bg-green-500 bg-opacity-10'
        };

        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
        const projectName = this.getProjectName(task.projectId);

        return `
            <div class="task-card ${priorityColors[task.priority]} ${isOverdue ? 'ring-2 ring-red-500' : ''}" 
                 onclick="TasksManager.viewTask('${task.id}')">
                <div class="flex items-start justify-between mb-2">
                    <h4 class="font-medium text-white truncate pr-2">${task.title}</h4>
                    <div class="flex space-x-1">
                        <button onclick="event.stopPropagation(); TasksManager.editTask('${task.id}')" 
                                class="text-gray-400 hover:text-blue-400 p-1" title="Edit">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button onclick="event.stopPropagation(); TasksManager.deleteTask('${task.id}')" 
                                class="text-gray-400 hover:text-red-400 p-1" title="Delete">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
                
                ${task.description ? `
                    <p class="text-sm text-gray-300 mb-3 line-clamp-2">${task.description}</p>
                ` : ''}
                
                <div class="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span class="priority-badge priority-${task.priority}">${Utils.capitalize(task.priority)}</span>
                    ${task.dueDate ? `
                        <span class="${isOverdue ? 'text-red-400' : 'text-gray-400'}">
                            <i class="fas fa-calendar mr-1"></i>${Utils.formatDate(task.dueDate)}
                        </span>
                    ` : ''}
                </div>
                
                ${projectName ? `
                    <div class="text-xs text-blue-400 mb-2">
                        <i class="fas fa-project-diagram mr-1"></i>${projectName}
                    </div>
                ` : ''}
                
                ${task.assignee ? `
                    <div class="text-xs text-gray-400 mb-2">
                        <i class="fas fa-user mr-1"></i>${task.assignee}
                    </div>
                ` : ''}
                
                <div class="flex items-center justify-between">
                    <select onchange="TasksManager.updateTaskStatus('${task.id}', this.value)" 
                            onclick="event.stopPropagation()" 
                            class="text-xs bg-transparent border border-gray-500 rounded px-2 py-1">
                        <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                        <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    
                    ${task.progress !== undefined ? `
                        <div class="flex items-center space-x-2">
                            <div class="w-12 bg-gray-700 rounded-full h-2">
                                <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                     style="width: ${task.progress}%"></div>
                            </div>
                            <span class="text-xs">${task.progress}%</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static showAddModal(defaultStatus = 'todo', projectId = null) {
        const projectOptions = this.projects.map(project => 
            `<option value="${project.id}" ${projectId === project.id ? 'selected' : ''}>${project.name}</option>`
        ).join('');

        const formHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Task Title *</label>
                    <input type="text" name="title" class="form-input" placeholder="Enter task title..." required>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea name="description" class="form-input" rows="3" placeholder="Task description..."></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
                        <select name="status" class="form-input">
                            <option value="todo" ${defaultStatus === 'todo' ? 'selected' : ''}>To Do</option>
                            <option value="inprogress" ${defaultStatus === 'inprogress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${defaultStatus === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                        <select name="priority" class="form-input">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Project (Optional)</label>
                        <select name="projectId" class="form-input">
                            <option value="">Select a project</option>
                            ${projectOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Assignee</label>
                        <input type="text" name="assignee" class="form-input" placeholder="Assigned to...">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                        <input type="date" name="dueDate" class="form-input">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Progress (%)</label>
                        <input type="number" name="progress" class="form-input" min="0" max="100" value="0">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
                    <input type="text" name="tags" class="form-input" placeholder="urgent, bug-fix, feature...">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                    <textarea name="notes" class="form-input" rows="3" placeholder="Additional notes..."></textarea>
                </div>
            </div>
        `;

        UI.createFormModal('Create New Task', formHTML, this.handleAddTask.bind(this));
    }

    static async handleAddTask(formData, modalId) {
        try {
            // Validate required fields
            if (!formData.title?.trim()) {
                UI.showToast('Task title is required', 'error');
                return;
            }

            // Process tags
            const tags = formData.tags ? 
                formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

            // Create task object
            const task = {
                title: formData.title.trim(),
                description: formData.description?.trim() || '',
                status: formData.status || 'todo',
                priority: formData.priority || 'medium',
                projectId: formData.projectId || null,
                assignee: formData.assignee?.trim() || '',
                dueDate: formData.dueDate || null,
                progress: parseInt(formData.progress) || 0,
                tags: tags,
                notes: formData.notes?.trim() || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Save to storage
            const savedTask = await Storage.add('tasks', task);
            
            // Update local data
            this.tasks.push(savedTask);
            this.applyFilters();

            // Close modal and show success
            UI.closeModal(modalId);
            UI.showToast('Task created successfully', 'success');

        } catch (error) {
            console.error('Error creating task:', error);
            UI.showToast('Error creating task', 'error');
        }
    }

    static async viewTask(taskId) {
        try {
            const task = await Storage.get('tasks', taskId);
            if (!task) {
                UI.showToast('Task not found', 'error');
                return;
            }

            const project = task.projectId ? this.projects.find(p => p.id === task.projectId) : null;
            const priorityColors = {
                high: 'text-red-400',
                medium: 'text-yellow-400',
                low: 'text-green-400'
            };

            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

            const content = `
                <div class="space-y-6">
                    <!-- Task Header -->
                    <div>
                        <div class="flex items-start justify-between mb-4">
                            <h3 class="text-xl font-semibold text-white">${task.title}</h3>
                            <span class="priority-badge priority-${task.priority} ${priorityColors[task.priority]}">
                                ${Utils.capitalize(task.priority)} Priority
                            </span>
                        </div>
                        
                        ${task.description ? `
                            <p class="text-gray-300 mb-4">${task.description}</p>
                        ` : ''}
                    </div>

                    <!-- Task Details -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Task Information</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">Status:</span> 
                                   <span class="status-badge status-${task.status}">${Utils.capitalize(task.status)}</span></p>
                                <p><span class="text-gray-400">Progress:</span> ${task.progress}%</p>
                                ${task.assignee ? `<p><span class="text-gray-400">Assignee:</span> ${task.assignee}</p>` : ''}
                                ${task.dueDate ? `
                                    <p><span class="text-gray-400">Due Date:</span> 
                                       <span class="${isOverdue ? 'text-red-400' : 'text-gray-200'}">
                                           ${Utils.formatDate(task.dueDate)} ${isOverdue ? '(Overdue)' : ''}
                                       </span></p>
                                ` : ''}
                                ${project ? `<p><span class="text-gray-400">Project:</span> ${project.name}</p>` : ''}
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Timeline</h4>
                            <div class="space-y-2">
                                <p><span class="text-gray-400">Created:</span> ${Utils.formatDate(task.createdAt)}</p>
                                <p><span class="text-gray-400">Updated:</span> ${Utils.formatDate(task.updatedAt)}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium text-gray-300">Progress</span>
                            <span class="text-sm text-gray-400">${task.progress}%</span>
                        </div>
                        <div class="w-full bg-gray-700 rounded-full h-3">
                            <div class="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                                 style="width: ${task.progress}%"></div>
                        </div>
                    </div>

                    ${task.tags && task.tags.length > 0 ? `
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Tags</h4>
                            <div class="flex flex-wrap gap-2">
                                ${task.tags.map(tag => `
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 bg-opacity-20 text-blue-300">
                                        ${tag}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${task.notes ? `
                        <div>
                            <h4 class="font-semibold text-gray-300 mb-3">Notes</h4>
                            <p class="text-gray-200">${task.notes}</p>
                        </div>
                    ` : ''}

                    <!-- Actions -->
                    <div class="flex flex-wrap justify-end gap-3 pt-4 border-t border-white border-opacity-10">
                        <button onclick="TasksManager.editTask('${task.id}'); UI.closeModal();" class="btn-secondary">
                            <i class="fas fa-edit mr-2"></i>Edit Task
                        </button>
                        ${task.status !== 'completed' ? `
                            <button onclick="TasksManager.markAsCompleted('${task.id}'); UI.closeModal();" class="btn-primary">
                                <i class="fas fa-check mr-2"></i>Mark Complete
                            </button>
                        ` : ''}
                        <button onclick="UI.closeModal()" class="btn-primary">
                            Close
                        </button>
                    </div>
                </div>
            `;

            UI.createModal('Task Details', content, { size: 'lg' });

        } catch (error) {
            console.error('Error viewing task:', error);
            UI.showToast('Error loading task details', 'error');
        }
    }

    static async editTask(taskId) {
        try {
            const task = await Storage.get('tasks', taskId);
            if (!task) {
                UI.showToast('Task not found', 'error');
                return;
            }

            const projectOptions = this.projects.map(project => 
                `<option value="${project.id}" ${task.projectId === project.id ? 'selected' : ''}>${project.name}</option>`
            ).join('');

            const formHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Task Title *</label>
                        <input type="text" name="title" class="form-input" value="${task.title}" required>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea name="description" class="form-input" rows="3">${task.description || ''}</textarea>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
                            <select name="status" class="form-input">
                                <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                                <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                            <select name="priority" class="form-input">
                                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Project (Optional)</label>
                            <select name="projectId" class="form-input">
                                <option value="">Select a project</option>
                                ${projectOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Assignee</label>
                            <input type="text" name="assignee" class="form-input" value="${task.assignee || ''}">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                            <input type="date" name="dueDate" class="form-input" value="${task.dueDate ? Utils.formatDateForInput(task.dueDate) : ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Progress (%)</label>
                            <input type="number" name="progress" class="form-input" min="0" max="100" value="${task.progress || 0}">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
                        <input type="text" name="tags" class="form-input" value="${task.tags ? task.tags.join(', ') : ''}">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                        <textarea name="notes" class="form-input" rows="3">${task.notes || ''}</textarea>
                    </div>
                </div>
            `;

            UI.createFormModal('Edit Task', formHTML, (formData, modalId) => {
                this.handleEditTask(taskId, formData, modalId);
            });

        } catch (error) {
            console.error('Error loading task for edit:', error);
            UI.showToast('Error loading task', 'error');
        }
    }

    static async handleEditTask(taskId, formData, modalId) {
        try {
            if (!formData.title?.trim()) {
                UI.showToast('Task title is required', 'error');
                return;
            }

            const tags = formData.tags ? 
                formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

            const currentTask = await Storage.get('tasks', taskId);
            
            const updatedTask = {
                ...currentTask,
                title: formData.title.trim(),
                description: formData.description?.trim() || '',
                status: formData.status,
                priority: formData.priority,
                projectId: formData.projectId || null,
                assignee: formData.assignee?.trim() || '',
                dueDate: formData.dueDate || null,
                progress: parseInt(formData.progress) || 0,
                tags: tags,
                notes: formData.notes?.trim() || '',
                updatedAt: new Date().toISOString()
            };

            await Storage.update('tasks', updatedTask);
            
            const index = this.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
                this.applyFilters();
            }

            UI.closeModal(modalId);
            UI.showToast('Task updated successfully', 'success');

        } catch (error) {
            console.error('Error updating task:', error);
            UI.showToast('Error updating task', 'error');
        }
    }

    static async updateTaskStatus(taskId, newStatus) {
        try {
            const task = await Storage.get('tasks', taskId);
            if (!task) return;

            task.status = newStatus;
            task.updatedAt = new Date().toISOString();
            
            // If marking as completed, set progress to 100%
            if (newStatus === 'completed') {
                task.progress = 100;
            }

            await Storage.update('tasks', task);
            
            const index = this.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                this.tasks[index] = task;
                this.applyFilters();
            }

            UI.showToast(`Task marked as ${newStatus.replace('inprogress', 'in progress')}`, 'success');

        } catch (error) {
            console.error('Error updating task status:', error);
            UI.showToast('Error updating task status', 'error');
        }
    }

    static async markAsCompleted(taskId) {
        await this.updateTaskStatus(taskId, 'completed');
    }

    static deleteTask(taskId) {
        UI.showConfirm(
            'Delete Task',
            'Are you sure you want to delete this task? This action cannot be undone.',
            () => this.handleDeleteTask(taskId),
            {
                confirmText: 'Delete',
                cancelText: 'Cancel'
            }
        );
    }

    static async handleDeleteTask(taskId) {
        try {
            await Storage.delete('tasks', taskId);
            
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.applyFilters();

            UI.showToast('Task deleted successfully', 'success');

        } catch (error) {
            console.error('Error deleting task:', error);
            UI.showToast('Error deleting task', 'error');
        }
    }
}
