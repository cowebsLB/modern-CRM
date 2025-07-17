// Analytics Dashboard Module
class Analytics {
    static charts = {};
    static data = {
        revenue: [],
        projects: [],
        clients: [],
        tasks: [],
        invoices: []
    };

    static async init() {
        await this.loadAnalyticsData();
        this.renderCharts();
    }

    static async loadAnalyticsData() {
        try {
            const [clients, projects, invoices, tasks] = await Promise.all([
                Storage.getAll('clients'),
                Storage.getAll('projects'),
                Storage.getAll('invoices'),
                Storage.getAll('tasks')
            ]);

            this.data = {
                clients: clients || [],
                projects: projects || [],
                invoices: invoices || [],
                tasks: tasks || []
            };

            this.calculateRevenue();
            this.calculateProjectMetrics();
            this.calculateClientMetrics();
            this.calculateTaskMetrics();

        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    }

    static calculateRevenue() {
        const revenueByMonth = {};
        const currentYear = new Date().getFullYear();
        
        // Initialize 12 months
        for (let i = 0; i < 12; i++) {
            const month = new Date(currentYear, i).toLocaleString('default', { month: 'short' });
            revenueByMonth[month] = 0;
        }

        // Calculate actual revenue
        this.data.invoices
            .filter(invoice => invoice.status === 'paid')
            .forEach(invoice => {
                const date = new Date(invoice.date);
                if (date.getFullYear() === currentYear) {
                    const month = date.toLocaleString('default', { month: 'short' });
                    revenueByMonth[month] += invoice.amount || 0;
                }
            });

        this.data.revenue = Object.entries(revenueByMonth).map(([month, amount]) => ({
            month,
            amount
        }));
    }

    static calculateProjectMetrics() {
        const statusCounts = {
            planning: 0,
            active: 0,
            on_hold: 0,
            completed: 0,
            cancelled: 0
        };

        this.data.projects.forEach(project => {
            if (statusCounts.hasOwnProperty(project.status)) {
                statusCounts[project.status]++;
            }
        });

        this.data.projectMetrics = statusCounts;

        // Calculate completion rate
        const total = this.data.projects.length;
        const completed = statusCounts.completed;
        this.data.completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    static calculateClientMetrics() {
        const activeCounts = {
            active: 0,
            inactive: 0
        };

        this.data.clients.forEach(client => {
            if (client.status === 'active') {
                activeCounts.active++;
            } else {
                activeCounts.inactive++;
            }
        });

        this.data.clientMetrics = activeCounts;
    }

    static calculateTaskMetrics() {
        const priorityCounts = {
            high: 0,
            medium: 0,
            low: 0
        };

        const statusCounts = {
            todo: 0,
            inprogress: 0,
            completed: 0
        };

        this.data.tasks.forEach(task => {
            if (priorityCounts.hasOwnProperty(task.priority)) {
                priorityCounts[task.priority]++;
            }
            if (statusCounts.hasOwnProperty(task.status)) {
                statusCounts[task.status]++;
            }
        });

        this.data.taskPriorities = priorityCounts;
        this.data.taskStatuses = statusCounts;
    }

    static renderCharts() {
        this.renderRevenueChart();
        this.renderProjectStatusChart();
        this.renderClientStatusChart();
        this.renderTaskPriorityChart();
        this.renderOverdueInvoicesChart();
    }

    static renderRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.revenue.map(r => r.month),
                datasets: [{
                    label: 'Monthly Revenue',
                    data: this.data.revenue.map(r => r.amount),
                    borderColor: '#3b82f6',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#cbd5e1'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#cbd5e1',
                            callback: function(value) {
                                return Utils.formatCurrency(value);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    static renderProjectStatusChart() {
        const ctx = document.getElementById('projectStatusChart');
        if (!ctx) return;

        if (this.charts.projectStatus) {
            this.charts.projectStatus.destroy();
        }

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];
        const data = Object.values(this.data.projectMetrics);
        const labels = Object.keys(this.data.projectMetrics).map(Utils.capitalize);

        this.charts.projectStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color + '80'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#cbd5e1',
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    static renderClientStatusChart() {
        const ctx = document.getElementById('clientStatusChart');
        if (!ctx) return;

        if (this.charts.clientStatus) {
            this.charts.clientStatus.destroy();
        }

        this.charts.clientStatus = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Active', 'Inactive'],
                datasets: [{
                    label: 'Clients',
                    data: [this.data.clientMetrics.active, this.data.clientMetrics.inactive],
                    backgroundColor: ['#10b981', '#6b7280'],
                    borderColor: ['#059669', '#4b5563'],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#cbd5e1'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#cbd5e1',
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    static renderTaskPriorityChart() {
        const ctx = document.getElementById('taskPriorityChart');
        if (!ctx) return;

        if (this.charts.taskPriority) {
            this.charts.taskPriority.destroy();
        }

        this.charts.taskPriority = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['High Priority', 'Medium Priority', 'Low Priority'],
                datasets: [{
                    data: [
                        this.data.taskPriorities.high,
                        this.data.taskPriorities.medium,
                        this.data.taskPriorities.low
                    ],
                    backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                    borderColor: ['#dc2626', '#d97706', '#059669'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#cbd5e1',
                            padding: 15,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    static renderOverdueInvoicesChart() {
        const ctx = document.getElementById('overdueInvoicesChart');
        if (!ctx) return;

        if (this.charts.overdueInvoices) {
            this.charts.overdueInvoices.destroy();
        }

        // Calculate overdue invoices by month
        const overdueData = this.calculateOverdueByMonth();

        this.charts.overdueInvoices = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: overdueData.map(d => d.month),
                datasets: [{
                    label: 'Overdue Invoices',
                    data: overdueData.map(d => d.count),
                    backgroundColor: '#ef4444',
                    borderColor: '#dc2626',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#cbd5e1'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#cbd5e1',
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    static calculateOverdueByMonth() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const overdueByMonth = {};

        // Initialize months
        for (let i = 0; i < 12; i++) {
            const month = new Date(currentYear, i).toLocaleString('default', { month: 'short' });
            overdueByMonth[month] = 0;
        }

        // Count overdue invoices
        this.data.invoices
            .filter(invoice => {
                return invoice.status === 'unpaid' && new Date(invoice.dueDate) < now;
            })
            .forEach(invoice => {
                const dueDate = new Date(invoice.dueDate);
                if (dueDate.getFullYear() === currentYear) {
                    const month = dueDate.toLocaleString('default', { month: 'short' });
                    overdueByMonth[month]++;
                }
            });

        return Object.entries(overdueByMonth).map(([month, count]) => ({
            month,
            count
        }));
    }

    static getAnalyticsHTML() {
        return `
            <div class="space-y-6 animate-slide-up">
                <!-- Analytics Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <h2 class="text-2xl font-bold gradient-text">Analytics Dashboard</h2>
                    <button onclick="Analytics.init()" class="btn-secondary">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh Data
                    </button>
                </div>

                <!-- Key Metrics -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="glass-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Total Revenue</p>
                                <p class="text-2xl font-bold text-green-400" id="total-revenue">$0</p>
                            </div>
                            <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-dollar-sign text-green-400 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="glass-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Completion Rate</p>
                                <p class="text-2xl font-bold text-blue-400" id="completion-rate">0%</p>
                            </div>
                            <div class="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-chart-line text-blue-400 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="glass-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Active Projects</p>
                                <p class="text-2xl font-bold text-purple-400" id="active-projects">0</p>
                            </div>
                            <div class="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-project-diagram text-purple-400 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="glass-card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-gray-400 text-sm">Pending Tasks</p>
                                <p class="text-2xl font-bold text-yellow-400" id="pending-tasks">0</p>
                            </div>
                            <div class="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-xl flex items-center justify-center">
                                <i class="fas fa-tasks text-yellow-400 text-xl"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Charts Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Revenue Chart -->
                    <div class="glass-card">
                        <h3 class="text-lg font-semibold mb-4">Monthly Revenue</h3>
                        <div class="h-64">
                            <canvas id="revenueChart"></canvas>
                        </div>
                    </div>

                    <!-- Project Status Chart -->
                    <div class="glass-card">
                        <h3 class="text-lg font-semibold mb-4">Project Status Distribution</h3>
                        <div class="h-64">
                            <canvas id="projectStatusChart"></canvas>
                        </div>
                    </div>

                    <!-- Client Status Chart -->
                    <div class="glass-card">
                        <h3 class="text-lg font-semibold mb-4">Client Activity</h3>
                        <div class="h-64">
                            <canvas id="clientStatusChart"></canvas>
                        </div>
                    </div>

                    <!-- Task Priority Chart -->
                    <div class="glass-card">
                        <h3 class="text-lg font-semibold mb-4">Task Priority Distribution</h3>
                        <div class="h-64">
                            <canvas id="taskPriorityChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Overdue Invoices Chart -->
                <div class="glass-card">
                    <h3 class="text-lg font-semibold mb-4">Overdue Invoices by Month</h3>
                    <div class="h-64">
                        <canvas id="overdueInvoicesChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    static updateMetrics() {
        // Update the metrics display
        const totalRevenue = this.data.revenue.reduce((sum, r) => sum + r.amount, 0);
        const completionRate = this.data.completionRate;
        const activeProjects = this.data.projectMetrics.active || 0;
        const pendingTasks = (this.data.taskStatuses.todo || 0) + (this.data.taskStatuses.inprogress || 0);

        const elements = {
            'total-revenue': Utils.formatCurrency(totalRevenue),
            'completion-rate': `${completionRate}%`,
            'active-projects': activeProjects.toString(),
            'pending-tasks': pendingTasks.toString()
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
}
