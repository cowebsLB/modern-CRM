// Calendar Module
class Calendar {
    static currentDate = new Date();
    static events = [];
    static view = 'month'; // month, week, day

    static async init() {
        await this.loadEvents();
        this.renderCalendar();
        this.setupEventListeners();
    }

    static async loadEvents() {
        try {
            const [tasks, projects, invoices] = await Promise.all([
                Storage.getAll('tasks'),
                Storage.getAll('projects'),
                Storage.getAll('invoices')
            ]);

            this.events = [];

            // Add task due dates
            tasks.filter(task => task.dueDate).forEach(task => {
                this.events.push({
                    id: task.id,
                    title: task.title,
                    date: task.dueDate,
                    type: 'task',
                    priority: task.priority,
                    status: task.status,
                    color: this.getEventColor('task', task.priority)
                });
            });

            // Add project deadlines
            projects.filter(project => project.dueDate).forEach(project => {
                this.events.push({
                    id: project.id,
                    title: `${project.name} (Deadline)`,
                    date: project.dueDate,
                    type: 'project',
                    status: project.status,
                    color: this.getEventColor('project', project.status)
                });
            });

            // Add invoice due dates
            invoices.filter(invoice => invoice.dueDate && invoice.status !== 'paid').forEach(invoice => {
                this.events.push({
                    id: invoice.id,
                    title: `Invoice #${invoice.number} Due`,
                    date: invoice.dueDate,
                    type: 'invoice',
                    status: invoice.status,
                    amount: invoice.amount,
                    color: this.getEventColor('invoice', invoice.status)
                });
            });

            // Sort events by date
            this.events.sort((a, b) => new Date(a.date) - new Date(b.date));

        } catch (error) {
            console.error('Error loading calendar events:', error);
            this.events = [];
        }
    }

    static getEventColor(type, status) {
        const colorMap = {
            task: {
                high: '#ef4444',
                medium: '#f59e0b',
                low: '#10b981'
            },
            project: {
                planning: '#6b7280',
                active: '#3b82f6',
                on_hold: '#f59e0b',
                completed: '#10b981',
                cancelled: '#ef4444'
            },
            invoice: {
                draft: '#6b7280',
                unpaid: '#f59e0b',
                overdue: '#ef4444'
            }
        };

        return colorMap[type]?.[status] || '#3b82f6';
    }

    static renderCalendar() {
        const container = document.getElementById('calendar-container');
        if (!container) return;

        if (this.view === 'month') {
            this.renderMonthView(container);
        } else if (this.view === 'week') {
            this.renderWeekView(container);
        } else {
            this.renderDayView(container);
        }
    }

    static renderMonthView(container) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const monthName = this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        let calendarHTML = `
            <div class="calendar-view">
                <div class="calendar-header">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-semibold">${monthName}</h3>
                        <div class="flex space-x-2">
                            <button onclick="Calendar.previousMonth()" class="btn-secondary btn-sm">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button onclick="Calendar.today()" class="btn-secondary btn-sm">Today</button>
                            <button onclick="Calendar.nextMonth()" class="btn-secondary btn-sm">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Days of Week Header -->
                    <div class="grid grid-cols-7 gap-1 mb-2">
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => 
                            `<div class="calendar-day-header">${day}</div>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="calendar-grid grid grid-cols-7 gap-1">
        `;

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            const dayEvents = this.events.filter(event => event.date === dateString);
            const isToday = this.isToday(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            calendarHTML += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" 
                     onclick="Calendar.viewDay('${dateString}')">
                    <div class="day-number">${day}</div>
                    <div class="day-events">
                        ${dayEvents.slice(0, 3).map(event => `
                            <div class="event-dot" 
                                 style="background-color: ${event.color}"
                                 title="${event.title}"
                                 onclick="event.stopPropagation(); Calendar.viewEvent('${event.type}', '${event.id}')">
                            </div>
                        `).join('')}
                        ${dayEvents.length > 3 ? `<div class="event-more">+${dayEvents.length - 3}</div>` : ''}
                    </div>
                </div>
            `;
        }

        calendarHTML += `
                </div>
            </div>
        `;

        container.innerHTML = calendarHTML;
    }

    static renderWeekView(container) {
        // Implementation for week view
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        const weekDays = [];
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            weekDays.push(day);
        }

        let weekHTML = `
            <div class="week-view">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-semibold">Week of ${startOfWeek.toLocaleDateString()}</h3>
                    <div class="flex space-x-2">
                        <button onclick="Calendar.previousWeek()" class="btn-secondary btn-sm">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button onclick="Calendar.today()" class="btn-secondary btn-sm">Today</button>
                        <button onclick="Calendar.nextWeek()" class="btn-secondary btn-sm">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-7 gap-4">
                    ${weekDays.map(day => {
                        const dateString = day.toISOString().split('T')[0];
                        const dayEvents = this.events.filter(event => event.date === dateString);
                        const isToday = this.isToday(day);
                        
                        return `
                            <div class="week-day ${isToday ? 'today' : ''}">
                                <div class="day-header">
                                    <div class="day-name">${day.toLocaleDateString('default', { weekday: 'short' })}</div>
                                    <div class="day-number">${day.getDate()}</div>
                                </div>
                                <div class="day-events space-y-1">
                                    ${dayEvents.map(event => `
                                        <div class="week-event" 
                                             style="border-left: 4px solid ${event.color}"
                                             onclick="Calendar.viewEvent('${event.type}', '${event.id}')">
                                            <div class="event-title">${event.title}</div>
                                            <div class="event-type">${Utils.capitalize(event.type)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        container.innerHTML = weekHTML;
    }

    static setupEventListeners() {
        // View toggle buttons
        const viewButtons = document.querySelectorAll('[data-view]');
        viewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.target.getAttribute('data-view');
                this.changeView(view);
            });
        });
    }

    static changeView(view) {
        this.view = view;
        
        // Update active button
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
        
        this.renderCalendar();
    }

    static previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    static nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    static previousWeek() {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
        this.renderCalendar();
    }

    static nextWeek() {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
        this.renderCalendar();
    }

    static today() {
        this.currentDate = new Date();
        this.renderCalendar();
    }

    static isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    static getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    static viewDay(dateString) {
        const dayEvents = this.events.filter(event => event.date === dateString);
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('default', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        const content = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold">${formattedDate}</h3>
                
                ${dayEvents.length === 0 ? `
                    <p class="text-gray-400">No events scheduled for this day.</p>
                ` : `
                    <div class="space-y-3">
                        ${dayEvents.map(event => `
                            <div class="glass-card p-4 border-l-4" style="border-left-color: ${event.color}">
                                <div class="flex items-start justify-between">
                                    <div>
                                        <h4 class="font-medium">${event.title}</h4>
                                        <p class="text-sm text-gray-400 capitalize">${event.type}</p>
                                        ${event.amount ? `<p class="text-sm text-green-400">${Utils.formatCurrency(event.amount)}</p>` : ''}
                                    </div>
                                    <button onclick="Calendar.viewEvent('${event.type}', '${event.id}')" 
                                            class="btn-secondary btn-sm">
                                        View
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
                
                <div class="flex justify-end space-x-3">
                    <button onclick="Calendar.addEvent('${dateString}')" class="btn-primary">
                        Add Event
                    </button>
                    <button onclick="UI.closeModal()" class="btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        `;

        UI.createModal(`Events - ${formattedDate}`, content);
    }

    static viewEvent(type, id) {
        // Navigate to the appropriate manager and view the event
        switch (type) {
            case 'task':
                TasksManager.viewTask(id);
                break;
            case 'project':
                ProjectsManager.viewProject(id);
                break;
            case 'invoice':
                InvoicesManager.viewInvoice(id);
                break;
        }
    }

    static addEvent(dateString) {
        const content = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
                    <select id="event-type" class="form-input">
                        <option value="task">Task</option>
                        <option value="meeting">Meeting</option>
                        <option value="reminder">Reminder</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <input type="text" id="event-title" class="form-input" placeholder="Event title...">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea id="event-description" class="form-input" rows="3" placeholder="Event description..."></textarea>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Date</label>
                    <input type="date" id="event-date" class="form-input" value="${dateString}">
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button onclick="Calendar.saveEvent()" class="btn-primary">
                        Save Event
                    </button>
                    <button onclick="UI.closeModal()" class="btn-secondary">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        UI.createModal('Add Event', content);
    }

    static async saveEvent() {
        const type = document.getElementById('event-type').value;
        const title = document.getElementById('event-title').value;
        const description = document.getElementById('event-description').value;
        const date = document.getElementById('event-date').value;

        if (!title || !date) {
            UI.showToast('Please fill in all required fields', 'error');
            return;
        }

        // Create based on type
        if (type === 'task') {
            const task = {
                title: title,
                description: description,
                dueDate: date,
                status: 'todo',
                priority: 'medium'
            };
            
            await Storage.add('tasks', task);
            UI.showToast('Task created successfully', 'success');
        } else {
            // For meetings and reminders, we could add them to a separate events store
            // For now, let's create them as tasks with a special tag
            const task = {
                title: title,
                description: description,
                dueDate: date,
                status: 'todo',
                priority: 'medium',
                tags: [type]
            };
            
            await Storage.add('tasks', task);
            UI.showToast(`${Utils.capitalize(type)} created successfully`, 'success');
        }

        await this.loadEvents();
        this.renderCalendar();
        UI.closeModal();
    }

    static getCalendarHTML() {
        return `
            <div class="space-y-6 animate-slide-up">
                <!-- Calendar Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <h2 class="text-2xl font-bold gradient-text">Calendar</h2>
                    <div class="flex space-x-2">
                        <button data-view="month" class="btn-secondary active">Month</button>
                        <button data-view="week" class="btn-secondary">Week</button>
                        <button onclick="Calendar.addEvent('${new Date().toISOString().split('T')[0]}')" class="btn-primary">
                            <i class="fas fa-plus mr-2"></i>Add Event
                        </button>
                    </div>
                </div>

                <!-- Calendar Container -->
                <div class="glass-card">
                    <div id="calendar-container">
                        <!-- Calendar will be rendered here -->
                    </div>
                </div>

                <!-- Upcoming Events -->
                <div class="glass-card">
                    <h3 class="text-lg font-semibold mb-4">Upcoming Events</h3>
                    <div id="upcoming-events">
                        <!-- Upcoming events will be rendered here -->
                    </div>
                </div>
            </div>
        `;
    }

    static renderUpcomingEvents() {
        const container = document.getElementById('upcoming-events');
        if (!container) return;

        const now = new Date();
        const upcoming = this.events
            .filter(event => new Date(event.date) >= now)
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = '<p class="text-gray-400">No upcoming events</p>';
            return;
        }

        container.innerHTML = upcoming.map(event => {
            const eventDate = new Date(event.date);
            const daysUntil = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="flex items-center justify-between p-3 rounded-lg border border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-all duration-200 cursor-pointer"
                     onclick="Calendar.viewEvent('${event.type}', '${event.id}')">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${event.color}"></div>
                        <div>
                            <p class="font-medium">${event.title}</p>
                            <p class="text-sm text-gray-400">${Utils.formatDate(event.date)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-sm capitalize text-gray-400">${event.type}</p>
                        <p class="text-xs text-gray-500">
                            ${daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </p>
                    </div>
                </div>
            `;
        }).join('');
    }
}
