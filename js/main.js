// Main App Controller
class CRMApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.isLoading = false;
        this.theme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    async init() {
        // Initialize storage
        await Storage.init();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Apply theme
        this.applyTheme();
        
        // Initialize UI
        this.initializeUI();
        
        // Initialize notifications
        await Notifications.init();
        
        // Load initial page
        await this.navigateToPage('dashboard');
        
        // Hide loading spinner
        this.hideLoader();

        // Register service worker
        this.registerServiceWorker();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });

        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-menu-overlay');

        mobileMenuBtn?.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        themeToggle?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Quick add button
        const quickAddBtn = document.getElementById('quick-add-btn');
        quickAddBtn?.addEventListener('click', () => {
            this.showQuickAddModal();
        });

        // Search button
        const searchBtn = document.getElementById('search-btn');
        searchBtn?.addEventListener('click', () => {
            this.showGlobalSearch();
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || 'dashboard';
            this.navigateToPage(page, false);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'k':
                        e.preventDefault();
                        this.showGlobalSearch();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.showQuickAddModal();
                        break;
                }
            }
        });
    }

    initializeUI() {
        // Initialize tooltips and animations
        this.setupAnimations();
        
        // Setup progressive enhancement
        document.body.classList.add('js-enabled');
    }

    async navigateToPage(pageName, pushState = true) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showPageLoader();

        try {
            // Update active nav link
            this.updateActiveNavLink(pageName);
            
            // Update page title
            this.updatePageTitle(pageName);
            
            // Load page content
            await this.loadPageContent(pageName);
            
            // Update URL
            if (pushState) {
                history.pushState({ page: pageName }, '', `#${pageName}`);
            }
            
            this.currentPage = pageName;
            
        } catch (error) {
            console.error('Navigation error:', error);
            UI.showToast('Error loading page', 'error');
        } finally {
            this.isLoading = false;
            this.hidePageLoader();
        }
    }

    async loadPageContent(pageName) {
        const pageContent = document.getElementById('page-content');
        
        // Add loading animation
        pageContent.style.opacity = '0.5';
        
        let content = '';
        
        switch(pageName) {
            case 'dashboard':
                content = await this.getDashboardContent();
                break;
            case 'analytics':
                content = Analytics.getAnalyticsHTML();
                break;
            case 'calendar':
                content = Calendar.getCalendarHTML();
                break;
            case 'notifications':
                content = Notifications.getNotificationsHTML();
                break;
            case 'clients':
                content = await this.getClientsContent();
                break;
            case 'projects':
                content = await this.getProjectsContent();
                break;
            case 'invoices':
                content = await this.getInvoicesContent();
                break;
            case 'tasks':
                content = await this.getTasksContent();
                break;
            default:
                content = '<div class="text-center text-gray-400 mt-20">Page not found</div>';
        }
        
        // Animate content change
        pageContent.innerHTML = content;
        pageContent.style.opacity = '1';
        
        // Initialize page-specific functionality
        this.initializePageFunctionality(pageName);
    }

    async getDashboardContent() {
        const stats = await this.getDashboardStats();
        
        return `
            <div class="space-y-6 animate-slide-up">
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="card card-hover">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Total Clients</p>
                                <p class="text-3xl font-bold gradient-text">${stats.totalClients}</p>
                            </div>
                            <div class="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-users text-blue-400 text-xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card card-hover">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Active Projects</p>
                                <p class="text-3xl font-bold gradient-text">${stats.activeProjects}</p>
                            </div>
                            <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-project-diagram text-green-400 text-xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card card-hover">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Unpaid Invoices</p>
                                <p class="text-3xl font-bold gradient-text">$${stats.unpaidAmount.toLocaleString()}</p>
                            </div>
                            <div class="w-12 h-12 bg-red-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-file-invoice-dollar text-red-400 text-xl"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card card-hover">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">This Month</p>
                                <p class="text-3xl font-bold gradient-text">$${stats.monthlyRevenue.toLocaleString()}</p>
                            </div>
                            <div class="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-chart-line text-purple-400 text-xl"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Today's Agenda & Quick Actions Row -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Today's Agenda -->
                    <div class="card">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-semibold">Today's Agenda</h3>
                            <button onclick="app.navigateToPage('calendar')" class="btn-secondary btn-sm">
                                <i class="fas fa-calendar-alt mr-1"></i>
                                View Calendar
                            </button>
                        </div>
                        <div id="todays-agenda">
                            <!-- Today's items will be loaded here -->
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="card">
                        <h3 class="text-xl font-semibold mb-4">Quick Actions</h3>
                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="app.navigateToPage('clients')" class="btn-secondary flex flex-col items-center p-4">
                                <i class="fas fa-user-plus text-2xl mb-2"></i>
                                <span>Add Client</span>
                            </button>
                            <button onclick="app.navigateToPage('projects')" class="btn-secondary flex flex-col items-center p-4">
                                <i class="fas fa-plus text-2xl mb-2"></i>
                                <span>New Project</span>
                            </button>
                            <button onclick="app.navigateToPage('invoices')" class="btn-secondary flex flex-col items-center p-4">
                                <i class="fas fa-file-invoice text-2xl mb-2"></i>
                                <span>Create Invoice</span>
                            </button>
                            <button onclick="app.showGlobalSearch()" class="btn-secondary flex flex-col items-center p-4">
                                <i class="fas fa-search text-2xl mb-2"></i>
                                <span>Search</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="card">
                    <h3 class="text-xl font-semibold mb-4">Recent Activity</h3>
                    <div class="space-y-3" id="recent-activity">
                        <!-- Activity items will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    async getClientsContent() {
        return `
            <div class="space-y-6 animate-slide-up">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <h2 class="text-2xl font-bold">Clients</h2>
                    <button onclick="ClientsManager.showAddModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Client
                    </button>
                </div>

                <!-- Search and Filters -->
                <div class="card">
                    <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                        <div class="relative flex-1">
                            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                            <input type="text" id="client-search" class="search-input" placeholder="Search clients...">
                        </div>
                        <select id="client-filter" class="form-input sm:w-auto">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <select id="client-tag-filter" class="form-input sm:w-auto">
                            <option value="">All Tags</option>
                            <option value="vip">VIP</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>

                <!-- Clients List -->
                <div class="card">
                    <div id="clients-list" class="space-y-4">
                        <!-- Clients will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    async getProjectsContent() {
        return `
            <div class="space-y-6 animate-slide-up">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <h2 class="text-2xl font-bold">Projects</h2>
                    <button onclick="ProjectsManager.showAddModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Project
                    </button>
                </div>

                <!-- Search and Filters -->
                <div class="card">
                    <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                        <div class="relative flex-1">
                            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                            <input type="text" id="project-search" class="search-input" placeholder="Search projects...">
                        </div>
                        <select id="project-status-filter" class="form-input sm:w-auto">
                            <option value="">All Status</option>
                            <option value="new">New</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                        <select id="project-client-filter" class="form-input sm:w-auto">
                            <option value="">All Clients</option>
                        </select>
                    </div>
                </div>

                <!-- Projects Grid -->
                <div id="projects-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Projects will be loaded here -->
                </div>
            </div>
        `;
    }

    async getInvoicesContent() {
        return `
            <div class="space-y-6 animate-slide-up">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <h2 class="text-2xl font-bold">Invoices</h2>
                    <button onclick="InvoicesManager.showAddModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Create Invoice
                    </button>
                </div>

                <!-- Search and Filters -->
                <div class="card">
                    <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                        <div class="relative flex-1">
                            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                            <input type="text" id="invoice-search" class="search-input" placeholder="Search invoices...">
                        </div>
                        <select id="invoice-status-filter" class="form-input sm:w-auto">
                            <option value="">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                        <select id="invoice-client-filter" class="form-input sm:w-auto">
                            <option value="">All Clients</option>
                        </select>
                    </div>
                </div>

                <!-- Invoices List -->
                <div class="card">
                    <div class="overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Client</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="invoices-table-body">
                                <!-- Invoices will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async getTasksContent() {
        return `
            <div class="space-y-6 animate-slide-up">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <h2 class="text-2xl font-bold">Tasks</h2>
                    <button onclick="TasksManager.showAddModal()" class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Create Task
                    </button>
                </div>

                <!-- Search and Filters -->
                <div class="card">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div class="relative">
                            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                            <input type="text" id="task-search" class="search-input" placeholder="Search tasks...">
                        </div>
                        <select id="task-status-filter" class="form-input">
                            <option value="">All Status</option>
                            <option value="todo">To Do</option>
                            <option value="inprogress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                        <select id="task-priority-filter" class="form-input">
                            <option value="">All Priority</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <select id="task-project-filter" class="form-input">
                            <option value="">All Projects</option>
                        </select>
                        <input type="text" id="task-assignee-filter" class="form-input" placeholder="Filter by assignee...">
                    </div>
                </div>

                <!-- Tasks Board -->
                <div id="tasks-container">
                    <!-- Task columns will be rendered here -->
                </div>
            </div>
        `;
    }

    async getDashboardStats() {
        try {
            const [clients, projects, invoices] = await Promise.all([
                Storage.getAll('clients'),
                Storage.getAll('projects'),
                Storage.getAll('invoices')
            ]);

            const activeProjects = projects.filter(p => p.status === 'in-progress').length;
            const unpaidInvoices = invoices.filter(i => i.status === 'unpaid');
            const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
            
            // Calculate this month's revenue
            const thisMonth = new Date().getMonth();
            const thisYear = new Date().getFullYear();
            const monthlyRevenue = invoices
                .filter(i => {
                    const invDate = new Date(i.date);
                    return i.status === 'paid' && 
                           invDate.getMonth() === thisMonth && 
                           invDate.getFullYear() === thisYear;
                })
                .reduce((sum, inv) => sum + inv.amount, 0);

            return {
                totalClients: clients.length,
                activeProjects,
                unpaidAmount,
                monthlyRevenue
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return {
                totalClients: 0,
                activeProjects: 0,
                unpaidAmount: 0,
                monthlyRevenue: 0
            };
        }
    }

    initializePageFunctionality(pageName) {
        switch(pageName) {
            case 'dashboard':
                this.loadRecentActivity();
                Notifications.renderTodaysAgenda();
                break;
            case 'analytics':
                Analytics.init().then(() => Analytics.updateMetrics());
                break;
            case 'calendar':
                Calendar.init();
                break;
            case 'notifications':
                // Notifications are already initialized in main init
                break;
            case 'clients':
                ClientsManager.init();
                break;
            case 'projects':
                ProjectsManager.init();
                break;
            case 'invoices':
                InvoicesManager.init();
                break;
            case 'tasks':
                TasksManager.init();
                break;
        }
    }

    async loadRecentActivity() {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;

        try {
            // Get recent items from all collections
            const [clients, projects, invoices] = await Promise.all([
                Storage.getAll('clients'),
                Storage.getAll('projects'),
                Storage.getAll('invoices')
            ]);

            const activities = [];

            // Add recent clients
            clients.slice(-3).forEach(client => {
                activities.push({
                    type: 'client',
                    icon: 'fas fa-user-plus',
                    text: `New client added: ${client.name}`,
                    time: client.createdAt,
                    color: 'text-blue-400'
                });
            });

            // Add recent projects
            projects.slice(-3).forEach(project => {
                activities.push({
                    type: 'project',
                    icon: 'fas fa-project-diagram',
                    text: `Project updated: ${project.name}`,
                    time: project.updatedAt || project.createdAt,
                    color: 'text-green-400'
                });
            });

            // Add recent invoices
            invoices.slice(-3).forEach(invoice => {
                activities.push({
                    type: 'invoice',
                    icon: 'fas fa-file-invoice-dollar',
                    text: `Invoice #${invoice.number} created`,
                    time: invoice.createdAt,
                    color: 'text-purple-400'
                });
            });

            // Sort by time
            activities.sort((a, b) => new Date(b.time) - new Date(a.time));

            // Render activities
            activityContainer.innerHTML = activities.slice(0, 5).map(activity => `
                <div class="flex items-center space-x-3 p-3 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors">
                    <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <i class="${activity.icon} text-sm ${activity.color}"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-gray-200">${activity.text}</p>
                        <p class="text-xs text-gray-400">${Utils.formatDate(activity.time)}</p>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading recent activity:', error);
            activityContainer.innerHTML = '<p class="text-gray-400 text-center">No recent activity</p>';
        }
    }

    updateActiveNavLink(pageName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    updatePageTitle(pageName) {
        const titleElement = document.getElementById('page-title');
        const titles = {
            dashboard: 'Dashboard',
            clients: 'Clients',
            projects: 'Projects',
            invoices: 'Invoices'
        };
        
        if (titleElement) {
            titleElement.textContent = titles[pageName] || 'Page';
        }
    }

    showQuickAddModal() {
        const modal = UI.createModal('Quick Add', `
            <div class="space-y-4">
                <button onclick="app.navigateToPage('clients'); UI.closeModal();" class="w-full btn-secondary text-left">
                    <i class="fas fa-user-plus mr-3"></i>Add Client
                </button>
                <button onclick="app.navigateToPage('projects'); UI.closeModal();" class="w-full btn-secondary text-left">
                    <i class="fas fa-project-diagram mr-3"></i>New Project
                </button>
                <button onclick="app.navigateToPage('invoices'); UI.closeModal();" class="w-full btn-secondary text-left">
                    <i class="fas fa-file-invoice-dollar mr-3"></i>Create Invoice
                </button>
            </div>
        `);
    }

    showGlobalSearch() {
        const modal = UI.createModal('Search', `
            <div class="space-y-4">
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                    <input type="text" id="global-search" class="search-input" placeholder="Search clients, projects, invoices..." autofocus>
                </div>
                <div id="search-results" class="space-y-2 max-h-60 overflow-y-auto">
                    <!-- Search results will appear here -->
                </div>
            </div>
        `);

        // Setup search functionality
        const searchInput = document.getElementById('global-search');
        const resultsContainer = document.getElementById('search-results');

        searchInput.addEventListener('input', Utils.debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                return;
            }

            try {
                const results = await this.performGlobalSearch(query);
                this.renderSearchResults(results, resultsContainer);
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300));
    }

    async performGlobalSearch(query) {
        const [clients, projects, invoices] = await Promise.all([
            Storage.getAll('clients'),
            Storage.getAll('projects'),
            Storage.getAll('invoices')
        ]);

        const results = [];
        const searchTerm = query.toLowerCase();

        // Search clients
        clients.forEach(client => {
            if (client.name.toLowerCase().includes(searchTerm) || 
                client.email.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: 'client',
                    item: client,
                    title: client.name,
                    subtitle: client.email
                });
            }
        });

        // Search projects
        projects.forEach(project => {
            if (project.name.toLowerCase().includes(searchTerm) || 
                project.description.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: 'project',
                    item: project,
                    title: project.name,
                    subtitle: project.description
                });
            }
        });

        // Search invoices
        invoices.forEach(invoice => {
            if (invoice.number.toLowerCase().includes(searchTerm)) {
                results.push({
                    type: 'invoice',
                    item: invoice,
                    title: `Invoice #${invoice.number}`,
                    subtitle: `$${invoice.amount.toLocaleString()}`
                });
            }
        });

        return results;
    }

    renderSearchResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center py-4">No results found</p>';
            return;
        }

        const icons = {
            client: 'fas fa-user',
            project: 'fas fa-project-diagram',
            invoice: 'fas fa-file-invoice-dollar'
        };

        container.innerHTML = results.map(result => `
            <div class="p-3 rounded-lg hover:bg-white hover:bg-opacity-5 cursor-pointer" onclick="app.navigateToSearchResult('${result.type}', '${result.item.id}')">
                <div class="flex items-center space-x-3">
                    <i class="${icons[result.type]} text-blue-400"></i>
                    <div>
                        <p class="text-white font-medium">${result.title}</p>
                        <p class="text-gray-400 text-sm">${result.subtitle}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    navigateToSearchResult(type, id) {
        UI.closeModal();
        
        switch(type) {
            case 'client':
                this.navigateToPage('clients');
                // TODO: Highlight specific client
                break;
            case 'project':
                this.navigateToPage('projects');
                // TODO: Highlight specific project
                break;
            case 'invoice':
                this.navigateToPage('invoices');
                // TODO: Highlight specific invoice
                break;
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
    }

    applyTheme() {
        document.body.className = document.body.className.replace(/theme-\w+/, '');
        document.body.classList.add(`theme-${this.theme}`);
        
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = this.theme === 'dark' ? 'fas fa-sun w-5' : 'fas fa-moon w-5';
        }
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-slide-up');
                }
            });
        });

        // Observe elements that should animate on scroll
        document.querySelectorAll('.card').forEach(el => {
            observer.observe(el);
        });
    }

    showLoader() {
        const loader = document.getElementById('loading-spinner');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    hideLoader() {
        const loader = document.getElementById('loading-spinner');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showPageLoader() {
        // Add subtle loading indication
        const content = document.getElementById('page-content');
        if (content) {
            content.style.opacity = '0.7';
        }
    }

    hidePageLoader() {
        const content = document.getElementById('page-content');
        if (content) {
            content.style.opacity = '1';
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // 🔥 Register versioned service worker for auto-updates
                const registration = await navigator.serviceWorker.register('sw-v2.js');
                console.log('Service Worker v2 registered successfully');
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('New Service Worker version found, updating...');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available, show update notification
                            this.showUpdateNotification();
                        }
                    });
                });
                
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    showUpdateNotification() {
        // Show a subtle notification that an update is available
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas fa-download"></i>
                <span>App updated! Refresh to get the latest version.</span>
                <button onclick="window.location.reload()" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors">
                    Refresh
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200 transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Slide in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('translate-x-full');
                setTimeout(() => notification.remove(), 300);
            }
        }, 10000);
    }

    showNotifications() {
        const content = Notifications.getNotificationsHTML();
        UI.createModal('Notifications', content, 'max-w-2xl');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CRMApp();
});

// Handle page visibility changes for better performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause expensive operations
    } else {
        // Page is visible, resume operations
        if (window.app) {
            window.app.loadRecentActivity();
        }
    }
});
