// UI Management System
class UI {
    static modals = new Map();
    static toasts = [];
    static activeModal = null;

    // Modal Management
    static createModal(title, content, options = {}) {
        const modalId = Utils.generateId();
        
        const defaultOptions = {
            closable: true,
            backdrop: true,
            size: 'md', // sm, md, lg, xl
            animation: true,
            onClose: null,
            onOpen: null
        };

        const config = { ...defaultOptions, ...options };
        
        const modal = this.buildModal(modalId, title, content, config);
        this.modals.set(modalId, { element: modal, config });
        
        this.showModal(modalId);
        return modalId;
    }

    static buildModal(modalId, title, content, config) {
        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-lg',
            lg: 'max-w-2xl',
            xl: 'max-w-4xl'
        };

        const modalHTML = `
            <div class="modal-backdrop fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" id="modal-${modalId}">
                <div class="modal-content glass-dark rounded-xl ${sizeClasses[config.size]} w-full max-h-full overflow-hidden ${config.animation ? 'modal-enter' : ''}">
                    <div class="modal-header flex items-center justify-between p-6 border-b border-white border-opacity-10">
                        <h3 class="text-xl font-semibold text-white">${title}</h3>
                        ${config.closable ? `
                            <button class="modal-close text-gray-400 hover:text-white transition-colors p-1" onclick="UI.closeModal('${modalId}')">
                                <i class="fas fa-times text-lg"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="modal-body p-6 overflow-y-auto max-h-96">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('modal-container');
        container.insertAdjacentHTML('beforeend', modalHTML);
        
        const modalElement = document.getElementById(`modal-${modalId}`);
        
        // Add backdrop click handler
        if (config.backdrop && config.closable) {
            modalElement.addEventListener('click', (e) => {
                if (e.target === modalElement) {
                    this.closeModal(modalId);
                }
            });
        }

        // Add escape key handler
        if (config.closable) {
            const escapeHandler = (e) => {
                if (e.key === 'Escape' && this.activeModal === modalId) {
                    this.closeModal(modalId);
                }
            };
            document.addEventListener('keydown', escapeHandler);
            modalElement.escapeHandler = escapeHandler;
        }

        return modalElement;
    }

    static showModal(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal) return;

        this.activeModal = modalId;
        modal.element.style.display = 'flex';
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Focus management
        const firstFocusable = modal.element.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }

        // Trigger onOpen callback
        if (modal.config.onOpen) {
            modal.config.onOpen(modalId);
        }
    }

    static closeModal(modalId = null) {
        if (!modalId) modalId = this.activeModal;
        if (!modalId) return;

        const modal = this.modals.get(modalId);
        if (!modal) return;

        // Add exit animation
        if (modal.config.animation) {
            const content = modal.element.querySelector('.modal-content');
            content.classList.remove('modal-enter');
            content.classList.add('modal-exit');
            
            setTimeout(() => {
                this.removeModal(modalId);
            }, 300);
        } else {
            this.removeModal(modalId);
        }

        // Trigger onClose callback
        if (modal.config.onClose) {
            modal.config.onClose(modalId);
        }
    }

    static removeModal(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal) return;

        // Remove escape key handler
        if (modal.element.escapeHandler) {
            document.removeEventListener('keydown', modal.element.escapeHandler);
        }

        // Remove from DOM
        modal.element.remove();
        this.modals.delete(modalId);

        // Restore body scroll if no more modals
        if (this.modals.size === 0) {
            document.body.style.overflow = '';
        }

        this.activeModal = null;
    }

    static updateModalContent(modalId, content) {
        const modal = this.modals.get(modalId);
        if (!modal) return;

        const bodyElement = modal.element.querySelector('.modal-body');
        if (bodyElement) {
            bodyElement.innerHTML = content;
        }
    }

    // Form Modal Helper
    static createFormModal(title, formHTML, onSubmit, options = {}) {
        const formId = Utils.generateId();
        
        const content = `
            <form id="form-${formId}" class="space-y-4">
                ${formHTML}
                <div class="flex justify-end space-x-3 pt-4 border-t border-white border-opacity-10">
                    <button type="button" onclick="UI.closeModal()" class="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" class="btn-primary">
                        ${options.submitText || 'Save'}
                    </button>
                </div>
            </form>
        `;

        const modalId = this.createModal(title, content, {
            ...options,
            onOpen: () => {
                const form = document.getElementById(`form-${formId}`);
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const formData = Utils.getFormData(form);
                    onSubmit(formData, modalId);
                });
            }
        });

        return modalId;
    }

    // Confirmation Modal
    static showConfirm(title, message, onConfirm, options = {}) {
        const content = `
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 bg-opacity-20 mb-4">
                    <i class="fas fa-exclamation-triangle text-red-400 text-xl"></i>
                </div>
                <p class="text-gray-300 mb-6">${message}</p>
                <div class="flex justify-center space-x-3">
                    <button onclick="UI.closeModal()" class="btn-secondary">
                        ${options.cancelText || 'Cancel'}
                    </button>
                    <button onclick="UI.handleConfirm('${Utils.generateId()}')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                        ${options.confirmText || 'Delete'}
                    </button>
                </div>
            </div>
        `;

        const modalId = this.createModal(title, content, {
            size: 'sm',
            ...options
        });

        // Store the callback for the confirm button
        window.tempConfirmCallback = onConfirm;
        
        return modalId;
    }

    static handleConfirm(id) {
        if (window.tempConfirmCallback) {
            window.tempConfirmCallback();
            delete window.tempConfirmCallback;
        }
        this.closeModal();
    }

    // Toast Notifications
    static showToast(message, type = 'info', duration = 5000) {
        const toastId = Utils.generateId();
        const toast = this.createToast(toastId, message, type);
        
        const container = document.getElementById('toast-container');
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('translate-x-0');
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toastId);
            }, duration);
        }

        return toastId;
    }

    static createToast(toastId, message, type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.id = `toast-${toastId}`;
        toast.className = `toast toast-${type} transform translate-x-full transition-transform duration-300 flex items-center space-x-3 min-w-80`;
        
        toast.innerHTML = `
            <i class="${icons[type]}"></i>
            <span class="flex-1">${message}</span>
            <button onclick="UI.removeToast('${toastId}')" class="text-current opacity-70 hover:opacity-100">
                <i class="fas fa-times"></i>
            </button>
        `;

        return toast;
    }

    static removeToast(toastId) {
        const toast = document.getElementById(`toast-${toastId}`);
        if (!toast) return;

        toast.classList.add('translate-x-full');
        toast.classList.remove('translate-x-0');
        
        setTimeout(() => {
            toast.remove();
        }, 300);
    }

    // Loading States
    static showLoader(element, text = 'Loading...') {
        const loader = document.createElement('div');
        loader.className = 'absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10';
        loader.innerHTML = `
            <div class="flex items-center space-x-3 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                <div class="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-white">${text}</span>
            </div>
        `;
        
        element.style.position = 'relative';
        element.appendChild(loader);
        
        return loader;
    }

    static hideLoader(element) {
        const loader = element.querySelector('.absolute.inset-0');
        if (loader) {
            loader.remove();
        }
    }

    // Skeleton Loading
    static createSkeleton(lines = 3, className = '') {
        const skeleton = document.createElement('div');
        skeleton.className = `animate-pulse space-y-3 ${className}`;
        
        for (let i = 0; i < lines; i++) {
            const line = document.createElement('div');
            line.className = 'h-4 bg-gray-700 rounded skeleton';
            if (i === lines - 1) {
                line.style.width = '75%';
            }
            skeleton.appendChild(line);
        }
        
        return skeleton;
    }

    // Data Table Helpers
    static createDataTable(headers, data, options = {}) {
        const tableId = Utils.generateId();
        
        const defaultOptions = {
            sortable: true,
            searchable: true,
            pagination: true,
            pageSize: 10,
            actions: []
        };
        
        const config = { ...defaultOptions, ...options };
        
        let tableHTML = `
            <div class="data-table-container" id="table-${tableId}">
        `;
        
        if (config.searchable) {
            tableHTML += `
                <div class="mb-4">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        <input type="text" class="search-input" placeholder="Search..." id="search-${tableId}">
                    </div>
                </div>
            `;
        }
        
        tableHTML += `
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr>
        `;
        
        headers.forEach(header => {
            const sortIcon = config.sortable ? '<i class="fas fa-sort ml-2 opacity-50"></i>' : '';
            tableHTML += `
                <th class="${config.sortable ? 'cursor-pointer hover:bg-white hover:bg-opacity-5' : ''}" 
                    ${config.sortable ? `onclick="UI.sortTable('${tableId}', '${header.key}')"` : ''}>
                    ${header.label}${sortIcon}
                </th>
            `;
        });
        
        if (config.actions.length > 0) {
            tableHTML += '<th>Actions</th>';
        }
        
        tableHTML += `
                        </tr>
                    </thead>
                    <tbody id="tbody-${tableId}">
                    </tbody>
                </table>
            </div>
        `;
        
        if (config.pagination) {
            tableHTML += `
                <div class="flex items-center justify-between mt-4">
                    <div class="text-sm text-gray-400" id="pagination-info-${tableId}"></div>
                    <div class="flex space-x-2" id="pagination-${tableId}"></div>
                </div>
            `;
        }
        
        tableHTML += '</div>';
        
        // Store table data and config
        if (!window.dataTables) window.dataTables = {};
        window.dataTables[tableId] = {
            headers,
            data: data.slice(),
            originalData: data.slice(),
            config,
            currentPage: 1,
            sortKey: null,
            sortDirection: 'asc'
        };
        
        return { tableId, html: tableHTML };
    }

    static renderTableData(tableId) {
        const table = window.dataTables[tableId];
        if (!table) return;
        
        const tbody = document.getElementById(`tbody-${tableId}`);
        const { data, config, currentPage } = table;
        
        const startIndex = (currentPage - 1) * config.pageSize;
        const endIndex = startIndex + config.pageSize;
        const pageData = data.slice(startIndex, endIndex);
        
        tbody.innerHTML = pageData.map(row => {
            let rowHTML = '<tr>';
            
            table.headers.forEach(header => {
                const value = Utils.getNestedValue(row, header.key);
                const formattedValue = header.formatter ? header.formatter(value, row) : value;
                rowHTML += `<td>${formattedValue}</td>`;
            });
            
            if (config.actions.length > 0) {
                rowHTML += '<td>';
                config.actions.forEach(action => {
                    rowHTML += `
                        <button onclick="${action.handler}('${row.id}')" 
                                class="btn-secondary mr-2 px-3 py-1 text-sm" 
                                title="${action.label}">
                            <i class="${action.icon}"></i>
                        </button>
                    `;
                });
                rowHTML += '</td>';
            }
            
            rowHTML += '</tr>';
            return rowHTML;
        }).join('');
        
        this.updatePagination(tableId);
    }

    static updatePagination(tableId) {
        const table = window.dataTables[tableId];
        if (!table || !table.config.pagination) return;
        
        const totalPages = Math.ceil(table.data.length / table.config.pageSize);
        const currentPage = table.currentPage;
        
        // Update info
        const info = document.getElementById(`pagination-info-${tableId}`);
        const start = (currentPage - 1) * table.config.pageSize + 1;
        const end = Math.min(currentPage * table.config.pageSize, table.data.length);
        info.textContent = `Showing ${start}-${end} of ${table.data.length} results`;
        
        // Update pagination buttons
        const pagination = document.getElementById(`pagination-${tableId}`);
        let paginationHTML = '';
        
        // Previous button
        if (currentPage > 1) {
            paginationHTML += `
                <button onclick="UI.changePage('${tableId}', ${currentPage - 1})" 
                        class="btn-secondary px-3 py-1">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }
        
        // Page numbers
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            const isActive = i === currentPage;
            paginationHTML += `
                <button onclick="UI.changePage('${tableId}', ${i})" 
                        class="${isActive ? 'btn-primary' : 'btn-secondary'} px-3 py-1">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `
                <button onclick="UI.changePage('${tableId}', ${currentPage + 1})" 
                        class="btn-secondary px-3 py-1">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
        
        pagination.innerHTML = paginationHTML;
    }

    static changePage(tableId, page) {
        const table = window.dataTables[tableId];
        if (!table) return;
        
        table.currentPage = page;
        this.renderTableData(tableId);
    }

    static sortTable(tableId, key) {
        const table = window.dataTables[tableId];
        if (!table) return;
        
        if (table.sortKey === key) {
            table.sortDirection = table.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            table.sortKey = key;
            table.sortDirection = 'asc';
        }
        
        table.data = Utils.sortBy(table.data, key, table.sortDirection);
        table.currentPage = 1;
        
        this.renderTableData(tableId);
        this.updateSortIcons(tableId);
    }

    static updateSortIcons(tableId) {
        const table = window.dataTables[tableId];
        if (!table) return;
        
        // Reset all sort icons
        const headers = document.querySelectorAll(`#table-${tableId} th i`);
        headers.forEach(icon => {
            icon.className = 'fas fa-sort ml-2 opacity-50';
        });
        
        // Update active sort icon
        if (table.sortKey) {
            const headerIndex = table.headers.findIndex(h => h.key === table.sortKey);
            if (headerIndex !== -1) {
                const icon = headers[headerIndex];
                icon.className = `fas fa-sort-${table.sortDirection === 'asc' ? 'up' : 'down'} ml-2`;
            }
        }
    }

    static searchTable(tableId, query) {
        const table = window.dataTables[tableId];
        if (!table) return;
        
        if (!query.trim()) {
            table.data = table.originalData.slice();
        } else {
            table.data = table.originalData.filter(row => {
                return table.headers.some(header => {
                    const value = Utils.getNestedValue(row, header.key);
                    return value && value.toString().toLowerCase().includes(query.toLowerCase());
                });
            });
        }
        
        table.currentPage = 1;
        this.renderTableData(tableId);
    }

    // Progress Bar
    static createProgressBar(percentage, options = {}) {
        const defaultOptions = {
            showLabel: true,
            animated: true,
            color: 'blue'
        };
        
        const config = { ...defaultOptions, ...options };
        
        return `
            <div class="w-full bg-gray-700 rounded-full h-2 ${config.animated ? 'overflow-hidden' : ''}">
                <div class="bg-${config.color}-500 h-2 rounded-full transition-all duration-500 ${config.animated ? 'animate-pulse' : ''}" 
                     style="width: ${percentage}%"></div>
            </div>
            ${config.showLabel ? `<span class="text-sm text-gray-400 mt-1">${percentage}%</span>` : ''}
        `;
    }

    // Badge Component
    static createBadge(text, type = 'default') {
        const types = {
            default: 'bg-gray-700 text-gray-200',
            primary: 'bg-blue-500 bg-opacity-20 text-blue-300',
            success: 'bg-green-500 bg-opacity-20 text-green-300',
            warning: 'bg-yellow-500 bg-opacity-20 text-yellow-300',
            danger: 'bg-red-500 bg-opacity-20 text-red-300'
        };
        
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${types[type]}">${text}</span>`;
    }

    // Empty State
    static createEmptyState(title, description, actionButton = null) {
        return `
            <div class="text-center py-12">
                <div class="mx-auto h-12 w-12 text-gray-400 mb-4">
                    <i class="fas fa-inbox text-4xl"></i>
                </div>
                <h3 class="text-lg font-medium text-gray-200 mb-2">${title}</h3>
                <p class="text-gray-400 mb-4">${description}</p>
                ${actionButton ? actionButton : ''}
            </div>
        `;
    }

    // Utility Methods
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        const fade = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            }
        };
        
        requestAnimationFrame(fade);
    }

    static fadeOut(element, duration = 300) {
        const start = performance.now();
        const initialOpacity = parseFloat(element.style.opacity) || 1;
        
        const fade = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = initialOpacity * (1 - progress);
            
            if (progress >= 1) {
                element.style.display = 'none';
            } else {
                requestAnimationFrame(fade);
            }
        };
        
        requestAnimationFrame(fade);
    }

    static slideUp(element, duration = 300) {
        const height = element.offsetHeight;
        element.style.overflow = 'hidden';
        element.style.height = height + 'px';
        
        const start = performance.now();
        
        const slide = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.height = (height * (1 - progress)) + 'px';
            
            if (progress >= 1) {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            } else {
                requestAnimationFrame(slide);
            }
        };
        
        requestAnimationFrame(slide);
    }
}
