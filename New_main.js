// Main application controller

// --- Dummy Data (replace with real data or import as needed) ---
window.ordersData = window.ordersData || [];
window.userData = window.userData || { Residents: [] };

// --- EstateData assumed to be loaded globally from Data.js ---
window.EstateData = EstateData;

// --- Global for PWA install prompt ---
let deferredPrompt = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Hide preloader
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.classList.add('hide');
            setTimeout(() => { preloader.style.display = 'none'; }, 500);
        }
    }, 1500);

    // Initialize components
    initNavigation();
    initScrollEffects();
    setupModalHandlers();

    // Initialize other modules
    initAuth();

    console.log('Eyang Estate initialized successfully!');
}

// Navigation functionality
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
        updateScrollToTopButton();
    });

    // Smooth scroll for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    updateActiveNavLink(link);
                }
            }
        });
    });

    // Update active navigation based on scroll position
    window.addEventListener('scroll', updateActiveNavigation);
}

function updateActiveNavLink(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

function updateActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    let currentSection = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

// Mobile menu toggle
function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    if (navMenu) navMenu.classList.toggle('active');
}

// Scroll effects
function initScrollEffects() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeInUp');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.Estate-card, .stat-card, .content-card').forEach(el => {
        observer.observe(el);
    });
}

function updateScrollToTopButton() {
    const scrollToTopBtn = document.getElementById('scrollToTop');
    if (scrollToTopBtn) {
        if (window.scrollY > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Modal management
function setupModalHandlers() {
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList && e.target.classList.contains('modal')) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeAuthModal();
        }
    });
}

function showModal(content) {
    // Remove existing modal if any
    const existingModal = document.getElementById('dynamicModal');
    if (existingModal) existingModal.remove();

    // Create new modal
    const modal = document.createElement('div');
    modal.id = 'dynamicModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        ${content}
    `;
    document.body.appendChild(modal);

    setTimeout(() => { modal.classList.add('show'); }, 10);
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => { modal.remove(); }, 300);
    }
    document.body.style.overflow = '';
}

// Toast notifications
function showToast(message, type = 'info', duration = 4000) {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = getToastIcon(type);

    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="closeToast(this)">
            <i class="fas fa-times"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => { closeToast(toast.querySelector('.toast-close')); }, duration);
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fas fa-check-circle';
        case 'error': return 'fas fa-exclamation-circle';
        case 'warning': return 'fas fa-exclamation-triangle';
        case 'info':
        default: return 'fas fa-info-circle';
    }
}

function closeToast(closeBtn) {
    const toast = closeBtn.closest('.toast');
    toast.classList.remove('show');
    setTimeout(() => { toast.remove(); }, 300);
}

// Statistics update
function updateStatistics() {
    const totalEstates = typeof EstateData !== 'undefined' ? Object.keys(EstateData).length : 0;
    const totalStudents = userData.Residents.length + 500;
    animateNumber('totalEstates', totalEstates);
    animateNumber('totalStudents', totalStudents);
}

function animateNumber(elementId, finalNumber) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const duration = 2000;
    const startNumber = 0;
    const increment = finalNumber / (duration / 50);
    let currentNumber = startNumber;

    const timer = setInterval(() => {
        currentNumber += increment;
        if (currentNumber >= finalNumber) {
            currentNumber = finalNumber;
            clearInterval(timer);
        }
        element.textContent = Math.floor(currentNumber) + '+';
    }, 50);
}

// Contact form submission
function submitContact(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        timestamp: new Date().toISOString()
    };

    // In a real application, this would be sent to a server
    console.log('Contact form submission:', contactData);

    // Show success message
    showToast('Message sent successfully! We\'ll get back to you soon.', 'success');

    // Reset form
    event.target.reset();
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-CM', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Error handling
window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    showToast('An error occurred. Please refresh the page if problems persist.', 'error');
});

// Performance monitoring
function measurePerformance() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`Page load time: ${loadTime}ms`);
        });
    }
}

// Progressive Web App support
function initPWA() {
    // Register service worker (if available)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    }

    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });
}

function showInstallPrompt() {
    // Show custom install prompt
    const installBanner = document.createElement('div');
    installBanner.className = 'install-banner';
    installBanner.innerHTML = `
        <div class="install-content">
            <i class="fas fa-mobile-alt"></i>
            <span>Install EyangEstate for quick access!</span>
            <button onclick="installApp()" class="btn btn-sm btn-primary">Install</button>
            <button onclick="dismissInstall()" class="btn btn-sm btn-outline">Maybe Later</button>
        </div>
    `;

    document.body.appendChild(installBanner);

    setTimeout(() => {
        installBanner.classList.add('show');
    }, 1000);
}

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
        });
    }
    dismissInstall();
}

function dismissInstall() {
    const installBanner = document.querySelector('.install-banner');
    if (installBanner) {
        installBanner.remove();
    }
}

// Accessibility enhancements
function initAccessibility() {
    // Skip link for keyboard navigation
    const skipLink = document.createElement('a');
    skipLink.href = '#Estates';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);

    // Keyboard navigation for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const modal = document.querySelector('.modal.show');
            if (modal) {
                trapFocus(e, modal);
            }
        }
    });
}

function trapFocus(e, container) {
    const focusableElements = container.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
    }
}

// Dark mode support (future enhancement)
function initTheme() {
    const savedTheme = localStorage.getItem('eyangEstate_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('eyangEstate_theme')) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('eyangEstate_theme', newTheme);
    showToast(`Switched to ${newTheme} mode`, 'info');
}

// Analytics and tracking (placeholder)
function trackEvent(eventName, properties = {}) {
    console.log('Analytics event:', eventName, properties);
    // In a real application, this would send data to analytics service
}

function trackPageView(pageName) {
    console.log('Page view:', pageName);
    // Track page views for analytics
}

// Data synchronization (for future server integration)
function syncData() {
    // This would sync local data with server
    console.log('Syncing data...');
    dataManager.saveToLocalStorage();
}

// Performance optimization
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Estates data manager
const dataManager = {
    getAllEstates: () => Object.values(window.EstateData),
    getEstatesByCategory: (category) => Object.values(window.EstateData).filter(e => (e.features || []).includes(category)),
    searchEstates: (query) => Object.values(window.EstateData).filter(e =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(query.toLowerCase()))
    )
};

// Initialize performance monitoring and PWA features
measurePerformance();
initPWA();
initAccessibility();
initTheme();

// Auto-sync data every 5 minutes
setInterval(syncData, 5 * 60 * 1000);

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
});

// Export main functions for global access
window.EyangFoodExplorer = {
    showToast,
    showModal,
    closeModal,
    trackEvent,
    formatCurrency,
    formatDate
};

window.openRestaurantPage = function(name) {
    showToast(`Open details for ${name}`, 'info');
};
window.openQuickView = function(name) {
    showToast(`Quick view for ${name}`, 'info');
};

console.log('Eyang Estate');
