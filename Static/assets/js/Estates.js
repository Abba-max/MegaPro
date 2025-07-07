function initEstates() {
    loadEstates(); // Load all estates by default
    setupSearchFunctionality();
}
 function createEstateCard(Estate, index) {
    let imgSrc = Estate.images && Estate.images[0] ? Estate.images[0] : '/Static/assets/img/Estate Images/DJI_0071.jpg';
    return `
        <div class="Estate-card animate" style="animation-delay:${index * 0.1}s">
            <div class="Estate-img">
                <img src="${imgSrc}" alt="${Estate.name}" loading="lazy">
                <div class="Estate-badge rating">
                    <i class="fas fa-star"></i> ${Estate.rating ? Estate.rating.toFixed(1) : 'N/A'}
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
                    <a href="/quick_order/?estate=${encodeURIComponent(Estate.name)}" class="btn btn-primary">Place Quick Order</a>
                        
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
    return `
        <div class="Estate-details-content">
            <!-- Estate Images -->
            <div class="Estate-gallery">
                <div class="main-image">
                    <img src="${Estate.image}" alt="${Estate.name}">
                </div>
                ${Estate.images.length > 0 ? `
                    <div class="gallery-thumbnails">
                        ${Estate.images.map(img => `
                            <img src="${img}" alt="${Estate.name}" onclick="changeMainImage('${img}')">
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
function openPlaceOrder(EstateId) {
    const Estate = dataManager.getEstate(EstateId);
    if (!Estate) return;

    const modalContent = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Place Order - ${Estate.name}</h2>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                    <div class="Place-order-content">
                    <form onsubmit="submitPlaceOrder(event, '${EstateId}')" id="PlaceOrderForm">
                        <div class="form-group">
                            <label>Your Name</label>
                            <input type="text" name="customerName" required ${appState.currentUser ? `value="${appState.currentUser.name}"` : ''}>
                        </div>
                        <div class="form-group">
                            <label>Whatshapp Phone Number</label>
                            <input type="tel" name="customerPhone" required ${appState.currentUser ? `value="${appState.currentUser.phone || ''}"` : ''}>
                        </div>
                        <div class="form-group">
                            <label>Special Instructions</label>
                            <textarea name="instructions" rows="3" placeholder="Any special requests, preferences or specifications..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary full-width">
                            <i class="fas fa-shopping-cart"></i> Place Order
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function submitPlaceOrder(event, EstateId) {
    event.preventDefault();
    const form = event.target;      
const formData = new FormData(form);
const orderData = {
    EstateId,
    userId: appState.currentUser ? appState.currentUser.id : null,
    userName: formData.get('customerName'),
    userPhone: formData.get('customerPhone'),
    instructions: formData.get('instructions')
};
    const order = dataManager.createOrder(orderData);
    
    if (order) {
        closeModal();
        showToast('Order placed successfully! We will contact you shortly.', 'success');
        
    }
}/*
function openReviewModal(EstateId) {
    if (!appState.currentUser) {
        showToast('Please login to write a review', 'warning');
        openAuthModal();
        return;
    }

    const Estate = dataManager.getEstate(EstateId);
    if (!Estate) return;

    const modalContent = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Write Review - ${Estate.name}</h2>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form onsubmit="submitReview(event, '${EstateId}')" id="reviewForm">
                    <div class="form-group">
                        <label>Your Rating</label>
                        <div class="rating-input" id="ratingInput">
                            ${[1, 2, 3, 4, 5].map(rating => `
                                <i class="fas fa-star rating-star" data-rating="${rating}" onclick="setRating(${rating})"></i>
                            `).join('')}
                        </div>
                        <input type="hidden" name="rating" id="selectedRating" required>
                    </div>
                    <div class="form-group">
                        <label>Your Review</label>
                        <textarea name="comment" rows="4" required placeholder="Share your experience with this estate..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="recommend"> I would recommend this estate to others
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary full-width">
                        <i class="fas fa-paper-plane"></i> Submit Review
                    </button>
                </form>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function setRating(rating) {
    document.getElementById('selectedRating').value = rating;
    
    // Update star display
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function submitReview(event, estateId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const rating = parseInt(formData.get('rating'));
    
    if (!rating) {
        showToast('Please select a rating', 'warning');
        return;
    }
    
    const reviewData = {
        EstateId: estateId,
        userId: appState.currentUser.id,
        userName: appState.currentUser.name,
        rating,
        comment: formData.get('comment'),
        recommend: formData.get('recommend') === 'on'
    };
    
    const review = dataManager.createReview(reviewData);
    
    if (review) {
        closeModal();
        showToast('Review submitted successfully!', 'success');
    } else {
        showToast('Failed to submit review. Please try again.', 'error');
    }
}*/
function changeMainImage(imageSrc) {
    const mainImage = document.querySelector('.main-img img');
    if (mainImage) {
        mainImage.src = imageSrc;
    }
}

function scrollToEstates() {
    document.getElementById('Estates').scrollIntoView({ behavior: 'smooth' });
}

function loadMoreEstates() {
}



document.addEventListener('DOMContentLoaded', () => {
    initEstates();
});
