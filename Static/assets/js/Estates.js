function initEstates() {
    loadEstates(); // Load all estates by default
    setupSearchFunctionality();
}

function processImagePath(path) {
    if (!path) return '/static/assets/img/Estate Images/DJI_0071.jpg';

    // Remove any Django static tags if present
    let processedPath = path.replace(/^{%\s*static\s*'([^']+)'\s*%}/, '/static/$1')
                           .replace(/^'/, '')
                           .replace(/'$/, '');

    // Ensure the path starts with /static/
    if (!processedPath.startsWith('/static/')) {
        processedPath = '/static' + (processedPath.startsWith('/') ? '' : '/') + processedPath;
    }

    return processedPath;
}

function createEstateCard(Estate, index) {
    const mainImg = processImagePath(Estate.images?.[0] || Estate.image);
        const showThumbs = Estate.images?.length > 1;
    const thumbCount = Math.min(4, Estate.images?.length || 0);
    const extraImages = Estate.images?.length > 4 ? Estate.images.length - 4 : 0;
    return `
        <div class="Estate-card animate" style="animation-delay:${index * 0.1}s">
            <div class="Estate-img-container">
                <img src="${mainImg}" alt="${Estate.name}" class="main-img">
                <div class="Estate-badge rating">
                    <i class="fas fa-star" style="color: gold;"></i> ${Estate.rating ? Estate.rating.toFixed(1) : 'N/A'}
                </div>
            </div>
            <div class="Estate-content">
                <di class="Estate-header">
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
                            <i class="fas fa-clock"></i>
                            <span>${publishedTime}</span>
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
                </div>
            </div>
        </div>
    `;
}

// All other functions (loadEstates, filterEstates, setupSearchFunctionality, searchEstates,
// clearSearch, openEstateDetails, createEstateDetailsHTML, changeMainImage,
// changeGalleryImage, nextImage, prevImage, showModal, scrollToEstates)
// remain the same as in your original code.
// Make sure to include them below this updated createEstateCard function.

// Display Publishing date of an Estate
// This entire DOMContentLoaded block should be removed or commented out if you're using the per-card calculation.
/*
document.addEventListener('DOMContentLoaded', function() {
    // Set the date we're counting to (Year, Month (0-11), Day, Hour, Minute, Second)
    const Pubdate = new Date("July 20, 2025 16:59:59").getTime();

    // Update the count every 1 second
    const x = setInterval(function() {

        // Get today's date and time
        const now = new Date().getTime();

        // Find the distance between now and the count date
        const distance = now -Pubdate;
        // Time calculations for days, hours, minutes and seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        // Display the result in the corresponding elements
        document.getElementById("days").innerHTML = days;
        document.getElementById("hours").innerHTML = hours;
        document.getElementById("minutes").innerHTML = minutes;
    }, 1000); // Update every 1000ms (1 second)
});
*/

// Keep this DOMContentLoaded as it adds a class for styling
document.addEventListener('DOMContentLoaded', function() {
    document.documentElement.classList.add('loaded');
});


// Load and display Estates
function loadEstates(filter = 'all') {
    const EstateGrid = document.getElementById('EstateGrid');
    let Estates = dataManager.getAllEstates(); // Assuming dataManager.getAllEstates() returns your estate data

    // Apply filter
    if (filter !== 'all') {
        Estates = dataManager.getEstatesByCategory(filter);
    }

    // Sort by rating (highest first)
    Estates.sort((a, b) => b.rating - a.rating);

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
    // Assuming 'all' is the default category button
    const defaultFilterButton = document.querySelector('.filter-btn[onclick*="filterEstates"][onclick*="\'all\'"]');
    if (defaultFilterButton) {
        defaultFilterButton.classList.add('active');
    }
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
            <div class="Estate-gallery">
                 <div class="main-image">
                    <img src="${mainImage}" alt="${Estate.name}" id="mainGalleryImage" >
                    ${images.length > 1 ? `<div class="image-counter">1/${images.length}</div>` : ''}
                </div>
                       ${images.length > 1 ? `
                    <div class="gallery-thumbnails" id="galleryThumbnails" >
                        ${images.map((img, index) => `
                            <img src="${img}" alt="${Estate.name}"
                                 onclick="changeGalleryImage(${index})"
                                 class="${index === 0 ? 'active' : ''}"
                                 data-index="${index}">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="Estate-info-grid">
                <div class="info-section">
                    <h4><i class="fas fa-info-circle"></i> About</h4>
                    <p><strong>Capacity:</strong> ${Estate.Capacity}</p>
                    <p><strong>Budget:</strong> ${Estate.Price}</p>
                    <p><strong>Free Rooms:</strong> ${Estate.Free_Rooms}</p>
                    <p><strong>Location:</strong> ${Estate.location}</p>
                    <p><strong>Space:</strong> ${Estate.Space}</p>
                    <p><strong>Generator:</strong> ${Estate.Generator}</p>
                    <p><strong>Restaurant:</strong> ${Estate.Restaurant}</p>
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
            <div class="reviews-section">
                <h4><i class="fas fa-comments"></i> Reviews</h4>
                <p>No reviews yet. Be the first to review!</p>
            </div>
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
function formatPublishedTime(publishedTimestamp) {
    const now = new Date().getTime();
    const diff = now - publishedTimestamp;
    
    // Calculate time units
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `Updated ${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `Updated ${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `Updated ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return `Updated just now`;
    }
}