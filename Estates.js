const dataManager = {
    getAllEstates: () => Object.values(window.EstateData),
    getEstatesByCategory: (category) =>
        Object.values(window.EstateData).filter(e =>
            (e.features || []).some(f => f.trim().toLowerCase() === category.trim().toLowerCase())
        ),
    searchEstates: (query) =>
        Object.values(window.EstateData).filter(e =>
            e.name.toLowerCase().includes(query.toLowerCase()) ||
            (e.description && e.description.toLowerCase().includes(query.toLowerCase()))
        )
};
window.filterEstates = filterEstates;

function initEstates() {
    loadEstates(); // Load all estates by default
    setupSearchFunctionality();
}

// Load and display Estates
function loadEstates(filter = 'all') {
    const EstateGrid = document.getElementById('EstateGrid');
    let Estates = dataManager.getAllEstates();

    // Apply filter only if not 'all'
    if (filter && filter !== 'all') {
        Estates = dataManager.getEstatesByCategory(filter);
    }

    // Sort by rating (highest first)
    Estates.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Update total Estates count
    const totalEstatesElem = document.getElementById('totalEstates');
    if (totalEstatesElem) totalEstatesElem.textContent = `${Estates.length}+`;

    // Render estates
    EstateGrid.innerHTML = Estates.map((Estate, index) =>
        createEstateCard(Estate, index)
    ).join('');

    // Add animation delay for staggered effect
    const cards = EstateGrid.querySelectorAll('.Estate-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate');
    });

    updateStatistics();
}

// Filter Estates
function filterEstates(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (window.event && window.event.target.classList.contains('filter-btn')) {
        window.event.target.classList.add('active');
    }
    loadEstates(category);
}
window.filterEstates = filterEstates;

// Search functionality
function setupSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchEstates(e.target.value);
        }, 300);
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchEstates(e.target.value);
        }
    });
}

function searchEstates(query = null) {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = query || searchInput.value.trim();
    
    if (searchTerm === '') {
        loadEstates();
        return;
    }
    
    const results = dataManager.searchEstates(searchTerm);
    
    const EstateGrid = document.getElementById('EstateGrid');
    
    if (results.length === 0) {
        EstateGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-search"></i>
                <h3>No Estates found</h3>
                <p>Try searching for different keywords like "Generator", "WIFI", or "Fridge".</p>
                <button class="btn btn-primary" onclick="clearSearch()">
                    <i class="fas fa-times"></i> Clear Search
                </button>
            </div>
        `;
        return;
    }
    
    EstateGrid.innerHTML = results.map((Estate, index) => 
        createEstateCard(Estate, index)
    ).join('');
    
    // Add animation
    const cards = EstateGrid.querySelectorAll('.Estate-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate');
    });
    
    showToast(`Found ${results.length} Estate(s) matching "${searchTerm}"`, 'info');
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    loadEstates();

    // Reset active filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.filter-btn[onclick="filterEstates(\'all\')"]').classList.add('active');
}

function scrollToEstates() {
    document.getElementById('Estates').scrollIntoView({ behavior: 'smooth' });
}

function loadMoreEstates() {
    // This could be implemented to load additional restaurants
    showToast('All Estates loaded!', 'info');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initEstates();
    
    // Example
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('hide');
        setTimeout(() => { preloader.style.display = 'none'; }, 500);
    }
});

function createEstateCard(Estate, index) {
    let imgSrc = '/Static/assets/img/Estate Images/DJI_0071.jpg';
    if (Estate.Images && Estate.Images[0] && Estate.Images[0].img && Estate.Images[0].img !== 'To modify') {
        imgSrc = Estate.Images[0].img;
    }
    return `
    <div class="Estate-card animate" style="animation-delay:${index * 0.1}s">
        <div class="Estate-img">
            <img src="${imgSrc}" alt="">
            <div class="rating">${Estate.rating || 'N/A'} ⭐</div>
        </div>
        <div class="Estate-info">
            <h3>${Estate.name}</h3>
            <div class="Estate-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${Estate.location || ''}</span>
                <span><i class="fas fa-user"></i> Capacity: ${Estate.Capacity || ''}</span>
                <span><i class="fas fa-wifi"></i> WIFI: ${Estate.WIFI || ''}</span>
                <span><i class="fas fa-tag"></i> Price: ${Estate.budget || ''}</span>
                <span><i class="fas fa-bed"></i> Free rooms: ${Estate.Free_rooms || ''}</span>
                <span><i class="fas fa-generator"></i> Generator: ${Estate.Generator || ''}</span>
            </div>
            <p class="Estate-desc">${Estate.description || ''}</p>
            <div class="button-group">
                <button class="btn" onclick="openRestaurantPage('${Estate.name}')">View Details</button>
                <button class="btn btn-outline" onclick="openQuickView('${Estate.name}')">Quick View</button>
            </div>
        </div>
    </div>
    `;
}

function updateStatistics() {
    const totalEstates = typeof EstateData !== 'undefined' ? Object.keys(EstateData).length : 0;
    const totalStudents = (window.userData && window.userData.Residents ? window.userData.Residents.length : 0) + 500;
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