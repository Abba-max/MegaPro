// Main application controller
// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Hide preloader
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        preloader.classList.add('hide');
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }, 1500);
    
    // Initialize components
    initNavigation();
    initScrollEffects();
    setupModalHandlers();
     updateStatistics();
    // Initialize other modules
    initAuth();
    initEstates();
    console.log('Eyang Village initialized successfully!');
}

// Navigation functionality
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Update scroll to top button
        updateScrollToTopButton();
    });
    
    // Smooth scroll for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            
            if (targetId.startsWith('#')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Update active nav link
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
    navMenu.classList.toggle('active');
}

// Scroll effects
function initScrollEffects() {
    // Intersection Observer for animations
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
    
    // Observe elements for animation
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
        if (e.target.classList.contains('modal')) {
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
    if (existingModal) {
        existingModal.remove();
    }
//Create Modal
    const modal = document.createElement('div');
    modal.id = 'dynamicModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        ${content}
    `;
    
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Toast notifications
function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.getElementById('toastContainer');
    
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
    // Show toast with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    // Auto remove toast
    setTimeout(() => {
        closeToast(toast.querySelector('.toast-close'));
    }, duration);
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
   const Estates = Object.keys(EstateData).length;
    const totalStudents = userData.students.length + 500; // Base number + registered users
    
    // Animate numbers
    animateNumber('totalEstates', totalRestaurants);
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

setInterval(syncData, 5 * 60 * 1000);

// Export main functions for global access
window.EyangVillage = {
    showToast,
    showModal,
    closeModal,
};

console.log('Eyang Village');
