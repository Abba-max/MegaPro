function initEstates() {
    loadEstates(); // Load all estates by default
    setupSearchFunctionality();
}
 function createEstateCard(Estate, index) {
    //let imgSrc = Estate.images && Estate.images[0] ? Estate.images[0] : '/Static/assets/img/Estate Images/DJI_0071.jpg';
     const mainImg = Estate.images?.[0] || Estate.image || '/Static/assets/img/Estate Images/DJI_0071.jpg';
        const showThumbs = Estate.images?.length > 1;
    const thumbCount = Math.min(4, Estate.images?.length || 0);
    const extraImages = Estate.images?.length > 4 ? Estate.images.length - 4 : 0;
    return `
        <div class="Estate-card animate" style="animation-delay:${index * 0.1}s">
            <div class="Estate-img-container">
                <img src="${mainImg}" alt="${Estate.name}" loading="lazy" class="main-img">
                <div class="Estate-badge rating">
                    <i class="fas fa-star" style="color: gold;"></i> ${Estate.rating ? Estate.rating.toFixed(1) : 'N/A'}
                </div>
            </div>
            <div class="Estate-content">
                <div class="Estate-header">
                    <h3 class="Estate-name">${Estate.name}</h3>
                    <div class="Estate-meta">
                        <div class="meta-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${Estate.location}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${Estate.Capacity}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-tag"></i>
                            <span>${Estate.Price}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-bolt"></i>
                            <span>${Estate.Generator}</span>
                        </div>
                    </div>
                </div>
                <p class="Estate-desc">${Estate.description}</p>
                <div class="Estate-tags">
                    ${(Estate.features || Estate.category || []).slice(0, 3).map(feature => 
                        `<span class="tag">${feature}</span>`
                    ).join('')}
                    <span class="tag primary">${Estate.Free_Rooms || ''}</span>
                </div>
                <div class="Estate-actions">
                    <button class="btn btn-primary" onclick="openEstateDetails('${Estate.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <a href="/quick_order/?estate=${encodeURIComponent(Estate.name)}" class="btn btn-primary">Place Reservation</a>
                    </button>
                </div>
            </div>
        </div>
    `;
} 

// Load and display Estates
function loadEstates(filter = 'all') {
    const EstateGrid = document.getElementById('EstateGrid');
    let Estates = dataManager.getAllEstates();

    // Apply filter 
    if (filter !== 'all') {
        Estates = dataManager.getEstatesByCategory(filter);
    }

    // Sort by rating (highest first)
    Estates.sort((a, b) => b.rating  - a.rating);

     // Update total Estates count
    document.getElementById('totalEstates').textContent = `${Estates.length}+`;
    
    EstateGrid.innerHTML = Estates.map((Estate, index) => 
        createEstateCard(Estate, index)
    ).join('');

    // Add animation delay for staggered effect
    const cards = EstateGrid.querySelectorAll('.Estate-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate');
    });
}

// Filter Estates
function filterEstates(event, category) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    loadEstates(category);
}
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
                <p>Try searching for different keywords like  "Mini Cite","City" or "Cite".</p>
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
function openEstateDetails(EstateId) {
    const Estate = dataManager.getEstate(EstateId);
    if (!Estate) {
        showToast('Estate not found', 'error');
        return;
    }
    
    const modalContent = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>${Estate.name}</h2>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${createEstateDetailsHTML(Estate)}
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function createEstateDetailsHTML(Estate) {
      const images = Estate.images || (Estate.image ? [Estate.image] : []);
    const mainImage = images[0] || '/Static/assets/img/Estate Images/DJI_0071.jpg';
    return `
        <div class="Estate-details-content">
            <!-- Estate Images -->
            <div class="Estate-gallery">
                 <div class="main-image">
                    <img src="${mainImage}" alt="${Estate.name}" id="mainGalleryImage" loading="lazy">
                    ${images.length > 1 ? `<div class="image-counter">1/${images.length}</div>` : ''}
                </div>
                       ${images.length > 1 ? `
                    <div class="gallery-thumbnails" id="galleryThumbnails" >
                        ${images.map((img, index) => `
                            <img src="${img}" alt="${Estate.name} " loading="lazy"
                                 onclick="changeGalleryImage(${index})"
                                 class="${index === 0 ? 'active' : ''}"
                                 data-index="${index}">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <!-- Estate Info -->
            <div class="Estate-info-grid">
                <div class="info-section">
                    <h4><i class="fas fa-info-circle"></i> About</h4>
                    <p><strong>Capacity:</strong> ${Estate.Capacity}</p>
                    <p><strong>Budget:</strong> ${Estate.Price}</p>
                    <p><strong>Free Rooms:</strong> ${Estate.Free_Rooms}</p>
                    <p><strong>Location:</strong> ${Estate.location}</p>
                    <p><strong>Space:</strong> ${Estate.Space}</p>
                    <p><strong>TV/Fridge:</strong> ${Estate.TV_Fridge}</p>
                    <p><strong>Wifi:</strong> ${Estate.WIFI}</p>
                    <p><strong>Security:</strong> ${Estate.Security}</p>
                    <p><strong>Distance:</strong> ${Estate.Distance}</p>
                    <p><strong>Description:</strong> ${Estate.description}</p>
                </div>
                <div class="info-section">
                    <h4><i class="fas fa-star"></i> Features</h4>
                    <div class="features-grid">
                        ${(Estate.features || Estate.category || []).map(feature => 
                            `<span class="feature-badge"><i class="fas fa-check"></i> ${feature}</span>`
                        ).join('')}
                        ${Estate.reservationAvailable ? 
                            '<span class="feature-badge reservation"><i class="fas fa-truck"></i> Reservation Available</span>' : ''
                        }
                    </div>
                </div>
            </div>
            <!-- Reviews Section -->
            <div class="reviews-section">
                <h4><i class="fas fa-comments"></i> Reviews</h4>
                <p>No reviews yet. Be the first to review!</p>
            </div>
            <!-- Action Buttons -->
            <div class="Estate-actions-section">
                <div class="action-buttons">
                       <a href="/review/?estate=${encodeURIComponent(Estate.name)}" class="btn btn-secondary">Write Review</a>
                </div>
            </div>
        </div>
    `;
}
function changeMainImage(element,imageSrc) {
        // For card thumbnails
    if (element) {
        const card = element.closest('.Estate-card');
        if (card) {
            // Update main image
            const mainImg = card.querySelector('.main-img');
            if (mainImg) {
                mainImg.src = imageSrc;
            }
            
            // Update active thumbnail
            const thumbnails = card.querySelectorAll('.thumbnail-img');
            thumbnails.forEach(thumb => thumb.classList.remove('active'));
            element.classList.add('active');
        }
    }
    const mainImage = document.querySelector('.main-img img');
    if (mainImage) {
        mainImage.src = imageSrc;
    }
}
let currentImageIndex = 0;
let estateImages = [];

function changeGalleryImage(index) {
    const mainImage = document.getElementById('mainGalleryImage');
    const thumbnails = document.querySelectorAll('#galleryThumbnails img');
    const counter = document.querySelector('.image-counter');
    
    if (!mainImage || !thumbnails.length) return;
    
    currentImageIndex = index;
    estateImages = Array.from(thumbnails).map(t => t.src);
    
    // Update main image
    mainImage.src = estateImages[currentImageIndex];
    
    // Update active thumbnail
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === currentImageIndex);
    });
    
    // Update counter
    if (counter) {
        counter.textContent = `${currentImageIndex + 1}/${estateImages.length}`;
    }
    
    // Scroll thumbnail into view
    const activeThumb = thumbnails[currentImageIndex];
    activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
    });
}

function nextImage() {
    if (estateImages.length === 0) return;
    currentImageIndex = (currentImageIndex + 1) % estateImages.length;
    changeGalleryImage(currentImageIndex);
}

function prevImage() {
    if (estateImages.length === 0) return;
    currentImageIndex = (currentImageIndex - 1 + estateImages.length) % estateImages.length;
    changeGalleryImage(currentImageIndex);
}

// Initialize gallery when modal opens
function showModal(content) {
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
    // After showing modal, initialize gallery
    setTimeout(() => {
        const thumbnails = document.querySelectorAll('#galleryThumbnails img');
        if (thumbnails.length) {
            estateImages = Array.from(thumbnails).map(t => t.src);
            currentImageIndex = 0;
            
            // Add navigation arrows if multiple images
            if (estateImages.length > 1) {
                const gallery = document.querySelector('.Estate-gallery');
                gallery.insertAdjacentHTML('beforeend', `
                    <div class="gallery-nav prev" onclick="prevImage()">
                        <i class="fas fa-chevron-left"></i>
                    </div>
                    <div class="gallery-nav next" onclick="nextImage()">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                `);
            }
        }
    }, 10);
}
function scrollToEstates() {
    document.getElementById('Estates').scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    initEstates();
});
