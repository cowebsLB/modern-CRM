// Utility Functions
class Utils {
    
    // ID Generation
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Date Formatting
    static formatDate(dateString, format = 'short') {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        const options = {
            short: { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            },
            long: { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            },
            time: {
                hour: '2-digit',
                minute: '2-digit'
            },
            relative: null // Special case for relative time
        };

        if (format === 'relative') {
            return this.getRelativeTime(date);
        }

        return date.toLocaleDateString('en-US', options[format] || options.short);
    }

    static getRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
        return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
    }

    static formatDateForInput(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        return date.toISOString().split('T')[0];
    }

    // Currency Formatting
    static formatCurrency(amount, currency = 'USD') {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Number Formatting
    static formatNumber(number, decimals = 0) {
        if (typeof number !== 'number') {
            number = parseFloat(number) || 0;
        }

        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }

    // Validation
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    static validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static validateRequired(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    }

    // String Utilities
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static titleCase(str) {
        if (!str) return '';
        return str.split(' ')
            .map(word => this.capitalize(word))
            .join(' ');
    }

    static slugify(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    static truncate(str, length = 50, suffix = '...') {
        if (!str || str.length <= length) return str;
        return str.substring(0, length).trim() + suffix;
    }

    // Array Utilities
    static sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = this.getNestedValue(a, key);
            const bVal = this.getNestedValue(b, key);
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = this.getNestedValue(item, key);
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    static getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    static unique(array, key = null) {
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            const val = this.getNestedValue(item, key);
            if (seen.has(val)) return false;
            seen.add(val);
            return true;
        });
    }

    // DOM Utilities
    static createElement(tag, className = '', content = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content) element.innerHTML = content;
        return element;
    }

    static getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                // Handle multiple values (checkboxes, multi-select)
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    }

    static clearForm(form) {
        const elements = form.querySelectorAll('input, select, textarea');
        elements.forEach(element => {
            if (element.type === 'checkbox' || element.type === 'radio') {
                element.checked = false;
            } else {
                element.value = '';
            }
        });
    }

    // Performance Utilities
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Local Storage Utilities
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Failed to remove from localStorage:', error);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Failed to clear localStorage:', error);
                return false;
            }
        }
    };

    // File Utilities
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    static readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    // Color Utilities
    static generateColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 60%)`;
    }

    static getContrastColor(hexColor) {
        // Remove # if present
        hexColor = hexColor.replace('#', '');
        
        // Parse RGB values
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    // Status Utilities
    static getStatusColor(status, type = 'project') {
        const statusColors = {
            project: {
                'new': 'status-new',
                'in-progress': 'status-in-progress',
                'completed': 'status-completed',
                'on-hold': 'status-unpaid',
                'cancelled': 'status-overdue'
            },
            invoice: {
                'paid': 'status-paid',
                'unpaid': 'status-unpaid',
                'overdue': 'status-overdue',
                'draft': 'status-new'
            },
            client: {
                'active': 'status-completed',
                'inactive': 'status-unpaid'
            }
        };

        return statusColors[type]?.[status] || 'status-new';
    }

    static getStatusIcon(status, type = 'project') {
        const statusIcons = {
            project: {
                'new': 'fas fa-clock',
                'in-progress': 'fas fa-spinner',
                'completed': 'fas fa-check-circle',
                'on-hold': 'fas fa-pause',
                'cancelled': 'fas fa-times-circle'
            },
            invoice: {
                'paid': 'fas fa-check-circle',
                'unpaid': 'fas fa-clock',
                'overdue': 'fas fa-exclamation-triangle',
                'draft': 'fas fa-edit'
            },
            client: {
                'active': 'fas fa-check-circle',
                'inactive': 'fas fa-pause'
            }
        };

        return statusIcons[type]?.[status] || 'fas fa-circle';
    }

    // Error Handling
    static async handleAsync(asyncFn) {
        try {
            const result = await asyncFn();
            return [null, result];
        } catch (error) {
            return [error, null];
        }
    }

    static formatError(error) {
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        return 'An unexpected error occurred';
    }

    // Animation Utilities
    static animateValue(start, end, duration, callback) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = start + (end - start) * easeOutQuart;
            
            callback(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Print Utilities
    static printElement(element, title = 'Print') {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .no-print { display: none !important; }
                        @media print {
                            body { margin: 0; }
                            .page-break { page-break-before: always; }
                        }
                    </style>
                </head>
                <body>
                    ${element.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // Copy to Clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                return true;
            } catch (fallbackError) {
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    // URL Utilities
    static getQueryParams() {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (let [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    }

    static setQueryParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.replaceState({}, '', url);
    }

    // Hash Utilities
    static generateHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Device Detection
    static isMobile() {
        return window.innerWidth <= 768;
    }

    static isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    static isDesktop() {
        return window.innerWidth > 1024;
    }

    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
}
