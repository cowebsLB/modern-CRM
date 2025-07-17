// Notifications & Reminders Module
class Notifications {
    static notifications = [];
    static reminders = [];
    static settings = {
        enableNotifications: true,
        enableSound: true,
        checkInterval: 60000, // 1 minute
        remindersBefore: [24, 1] // hours before due date
    };

    static async init() {
        await this.loadSettings();
        await this.checkPermissions();
        this.startNotificationChecker();
        this.renderTodaysAgenda();
    }

    static async loadSettings() {
        try {
            const settings = await Storage.get('settings', 'notifications');
            if (settings) {
                this.settings = { ...this.settings, ...settings.value };
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    }

    static async saveSettings() {
        try {
            await Storage.update('settings', {
                key: 'notifications',
                value: this.settings
            });
        } catch (error) {
            console.error('Error saving notification settings:', error);
        }
    }

    static async checkPermissions() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support desktop notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    static startNotificationChecker() {
        setInterval(() => {
            if (this.settings.enableNotifications) {
                this.checkForDueItems();
            }
        }, this.settings.checkInterval);

        // Initial check
        this.checkForDueItems();
    }

    static async checkForDueItems() {
        try {
            const [tasks, projects, invoices] = await Promise.all([
                Storage.getAll('tasks'),
                Storage.getAll('projects'),
                Storage.getAll('invoices')
            ]);

            const now = new Date();
            const notifications = [];

            // Check tasks
            tasks.forEach(task => {
                if (task.dueDate && task.status !== 'completed') {
                    const dueDate = new Date(task.dueDate);
                    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

                    if (hoursUntilDue <= 0 && hoursUntilDue > -24) {
                        notifications.push({
                            id: `task-${task.id}`,
                            type: 'task',
                            title: 'Task Overdue',
                            message: `Task "${task.title}" is overdue`,
                            priority: 'high',
                            data: task
                        });
                    } else if (this.settings.remindersBefore.includes(Math.floor(hoursUntilDue))) {
                        notifications.push({
                            id: `task-${task.id}`,
                            type: 'task',
                            title: 'Task Due Soon',
                            message: `Task "${task.title}" is due in ${Math.floor(hoursUntilDue)} hours`,
                            priority: task.priority,
                            data: task
                        });
                    }
                }
            });

            // Check projects
            projects.forEach(project => {
                if (project.dueDate && project.status !== 'completed') {
                    const dueDate = new Date(project.dueDate);
                    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

                    if (hoursUntilDue <= 0 && hoursUntilDue > -24) {
                        notifications.push({
                            id: `project-${project.id}`,
                            type: 'project',
                            title: 'Project Deadline Passed',
                            message: `Project "${project.name}" deadline has passed`,
                            priority: 'high',
                            data: project
                        });
                    } else if (this.settings.remindersBefore.includes(Math.floor(hoursUntilDue))) {
                        notifications.push({
                            id: `project-${project.id}`,
                            type: 'project',
                            title: 'Project Deadline Approaching',
                            message: `Project "${project.name}" is due in ${Math.floor(hoursUntilDue)} hours`,
                            priority: 'medium',
                            data: project
                        });
                    }
                }
            });

            // Check invoices
            invoices.forEach(invoice => {
                if (invoice.dueDate && invoice.status !== 'paid') {
                    const dueDate = new Date(invoice.dueDate);
                    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

                    if (hoursUntilDue <= 0 && hoursUntilDue > -24) {
                        notifications.push({
                            id: `invoice-${invoice.id}`,
                            type: 'invoice',
                            title: 'Invoice Overdue',
                            message: `Invoice #${invoice.number} is overdue (${Utils.formatCurrency(invoice.amount)})`,
                            priority: 'high',
                            data: invoice
                        });
                    } else if (this.settings.remindersBefore.includes(Math.floor(hoursUntilDue))) {
                        notifications.push({
                            id: `invoice-${invoice.id}`,
                            type: 'invoice',
                            title: 'Payment Due Soon',
                            message: `Invoice #${invoice.number} payment due in ${Math.floor(hoursUntilDue)} hours`,
                            priority: 'medium',
                            data: invoice
                        });
                    }
                }
            });

            // Process new notifications
            notifications.forEach(notification => {
                if (!this.notifications.find(n => n.id === notification.id)) {
                    this.showNotification(notification);
                    this.notifications.push(notification);
                }
            });

            // Update notifications display
            this.updateNotificationBadge();

        } catch (error) {
            console.error('Error checking for due items:', error);
        }
    }

    static async showNotification(notification) {
        // Show browser notification
        if (await this.checkPermissions()) {
            const browserNotification = new Notification(notification.title, {
                body: notification.message,
                icon: '/icon-192x192.png',
                badge: '/icon-96x96.png',
                tag: notification.id,
                requireInteraction: notification.priority === 'high',
                actions: [
                    {
                        action: 'view',
                        title: 'View'
                    },
                    {
                        action: 'dismiss',
                        title: 'Dismiss'
                    }
                ]
            });

            browserNotification.onclick = () => {
                this.handleNotificationClick(notification);
                browserNotification.close();
            };
        }

        // Show in-app toast
        const toastType = notification.priority === 'high' ? 'error' : 'warning';
        UI.showToast(notification.message, toastType, 10000);

        // Play sound if enabled
        if (this.settings.enableSound) {
            this.playNotificationSound();
        }
    }

    static handleNotificationClick(notification) {
        // Navigate to the relevant item
        switch (notification.type) {
            case 'task':
                app.navigateToPage('tasks');
                setTimeout(() => TasksManager.viewTask(notification.data.id), 500);
                break;
            case 'project':
                app.navigateToPage('projects');
                setTimeout(() => ProjectsManager.viewProject(notification.data.id), 500);
                break;
            case 'invoice':
                app.navigateToPage('invoices');
                setTimeout(() => InvoicesManager.viewInvoice(notification.data.id), 500);
                break;
        }
    }

    static playNotificationSound() {
        // Create a simple notification sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }

    static updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        const count = this.notifications.filter(n => !n.dismissed).length;
        
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count.toString();
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    static async renderTodaysAgenda() {
        const container = document.getElementById('todays-agenda');
        if (!container) return;

        try {
            const [tasks, projects, invoices] = await Promise.all([
                Storage.getAll('tasks'),
                Storage.getAll('projects'),
                Storage.getAll('invoices')
            ]);

            const today = new Date().toISOString().split('T')[0];
            const todayItems = [];

            // Tasks due today
            tasks.filter(task => task.dueDate === today && task.status !== 'completed')
                 .forEach(task => {
                     todayItems.push({
                         type: 'task',
                         title: task.title,
                         priority: task.priority,
                         id: task.id,
                         icon: 'fas fa-tasks'
                     });
                 });

            // Projects due today
            projects.filter(project => project.dueDate === today && project.status !== 'completed')
                   .forEach(project => {
                       todayItems.push({
                           type: 'project',
                           title: project.name,
                           priority: 'medium',
                           id: project.id,
                           icon: 'fas fa-project-diagram'
                       });
                   });

            // Invoices due today
            invoices.filter(invoice => invoice.dueDate === today && invoice.status !== 'paid')
                   .forEach(invoice => {
                       todayItems.push({
                           type: 'invoice',
                           title: `Invoice #${invoice.number}`,
                           priority: 'high',
                           id: invoice.id,
                           icon: 'fas fa-file-invoice-dollar',
                           amount: invoice.amount
                       });
                   });

            if (todayItems.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-calendar-check text-4xl text-green-400 mb-4"></i>
                        <p class="text-gray-400">No items due today!</p>
                        <p class="text-sm text-gray-500">You're all caught up.</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="space-y-3">
                        ${todayItems.map(item => `
                            <div class="flex items-center justify-between p-3 rounded-lg border border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-all duration-200 cursor-pointer"
                                 onclick="Notifications.handleAgendaClick('${item.type}', '${item.id}')">
                                <div class="flex items-center space-x-3">
                                    <i class="${item.icon} text-lg text-blue-400"></i>
                                    <div>
                                        <p class="font-medium">${item.title}</p>
                                        <p class="text-sm text-gray-400 capitalize">${item.type}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="priority-badge priority-${item.priority}">${Utils.capitalize(item.priority)}</span>
                                    ${item.amount ? `<p class="text-sm text-green-400 mt-1">${Utils.formatCurrency(item.amount)}</p>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error rendering today\'s agenda:', error);
            container.innerHTML = '<p class="text-red-400">Error loading agenda</p>';
        }
    }

    static handleAgendaClick(type, id) {
        this.handleNotificationClick({ type, data: { id } });
    }

    static showNotificationSettings() {
        const content = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-300">Enable Desktop Notifications</label>
                    <input type="checkbox" id="enable-notifications" class="form-checkbox" ${this.settings.enableNotifications ? 'checked' : ''}>
                </div>
                
                <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-gray-300">Enable Notification Sound</label>
                    <input type="checkbox" id="enable-sound" class="form-checkbox" ${this.settings.enableSound ? 'checked' : ''}>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Reminder Times (hours before due)</label>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="checkbox" class="form-checkbox mr-2" value="24" ${this.settings.remindersBefore.includes(24) ? 'checked' : ''}>
                            24 hours before
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="form-checkbox mr-2" value="12" ${this.settings.remindersBefore.includes(12) ? 'checked' : ''}>
                            12 hours before
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" class="form-checkbox mr-2" value="1" ${this.settings.remindersBefore.includes(1) ? 'checked' : ''}>
                            1 hour before
                        </label>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4 border-t border-white border-opacity-10">
                    <button onclick="Notifications.testNotification()" class="btn-secondary">
                        Test Notification
                    </button>
                    <button onclick="Notifications.saveNotificationSettings()" class="btn-primary">
                        Save Settings
                    </button>
                </div>
            </div>
        `;

        UI.createModal('Notification Settings', content);
    }

    static async saveNotificationSettings() {
        this.settings.enableNotifications = document.getElementById('enable-notifications').checked;
        this.settings.enableSound = document.getElementById('enable-sound').checked;
        
        // Get reminder times
        const reminderCheckboxes = document.querySelectorAll('input[type="checkbox"][value]');
        this.settings.remindersBefore = Array.from(reminderCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => parseInt(cb.value));

        await this.saveSettings();
        
        if (this.settings.enableNotifications) {
            await this.checkPermissions();
        }

        UI.closeModal();
        UI.showToast('Notification settings saved', 'success');
    }

    static testNotification() {
        this.showNotification({
            id: 'test',
            type: 'test',
            title: 'Test Notification',
            message: 'This is a test notification from your CRM',
            priority: 'medium'
        });
    }

    static dismissNotification(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.dismissed = true;
            this.updateNotificationBadge();
        }
    }

    static clearAllNotifications() {
        this.notifications = this.notifications.map(n => ({ ...n, dismissed: true }));
        this.updateNotificationBadge();
        UI.showToast('All notifications cleared', 'success');
    }

    static getNotificationsHTML() {
        const activeNotifications = this.notifications.filter(n => !n.dismissed);
        
        return `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">Notifications</h3>
                    <div class="flex space-x-2">
                        <button onclick="Notifications.showNotificationSettings()" class="btn-secondary btn-sm">
                            <i class="fas fa-cog mr-1"></i>Settings
                        </button>
                        <button onclick="Notifications.clearAllNotifications()" class="btn-secondary btn-sm">
                            Clear All
                        </button>
                    </div>
                </div>
                
                ${activeNotifications.length === 0 ? `
                    <div class="text-center py-8">
                        <i class="fas fa-bell-slash text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-400">No new notifications</p>
                    </div>
                ` : `
                    <div class="space-y-3">
                        ${activeNotifications.map(notification => `
                            <div class="glass-card p-4 border-l-4 ${notification.priority === 'high' ? 'border-red-500' : notification.priority === 'medium' ? 'border-yellow-500' : 'border-blue-500'}">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <h4 class="font-medium">${notification.title}</h4>
                                        <p class="text-sm text-gray-400 mt-1">${notification.message}</p>
                                        <p class="text-xs text-gray-500 mt-2 capitalize">${notification.type}</p>
                                    </div>
                                    <div class="flex space-x-2">
                                        <button onclick="Notifications.handleNotificationClick(${JSON.stringify(notification).replace(/"/g, '&quot;')})" 
                                                class="btn-secondary btn-sm">
                                            View
                                        </button>
                                        <button onclick="Notifications.dismissNotification('${notification.id}')" 
                                                class="btn-secondary btn-sm text-gray-400 hover:text-red-400">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }
}
