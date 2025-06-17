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
 function createEstateCard(Estate, index) {
    // Use the first image if available, else a default image
    let imgSrc = '/Static/assets/img/Estate Images/DJI_0071.jpg';
    if (Estate.Images && Estate.Images[0] && Estate.Images[0].img && Estate.Images[0].img !== 'To modify') {
        imgSrc = Estate.Images[0].img;
    }
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
                            <span>${Estate.location || ''}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${Estate.Capacity || ''}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-tag"></i>
                            <span>${Estate.budget || ''}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-generator"></i>
                            <span>${Estate.Generator || ''}</span>
                        </div>
                    </div>
                </div>
                <p class="Estate-desc">${Estate.description || ''}</p>
                <div class="Estate-tags">
                    ${(Estate.features || []).slice(0, 3).map(feature => 
                        `<span class="tag">${feature}</span>`
                    ).join('')}
                    <span class="tag primary">${Estate.Free_rooms || ''}</span>
                </div>
            </div>
        </div>
    `;
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
                    <p><strong>Budget:</strong> ${Estate.budget}</p>
                    <p><strong>Free_Space:</strong> ${Estate.Free}</p>
                    <p><strong>Location:</strong> ${Estate.location}</p>
                    <p><strong>Wifi:</strong> ${Estate.WIFI}</p>
                    <p><strong>Distance:</strong> ${Estate.Distance}</p>
                    <p><strong>Description:</strong> ${Estate.desc}</p>
                </div>
                
                <div class="info-section">
                    <h4><i class="fas fa-star"></i> Features</h4>
                    <div class="features-grid">
                        ${Estate.features.map(feature => 
                            `<span class="feature-badge"><i class="fas fa-check"></i> ${feature}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            
            <!-- Assets Section -->
            <div class="Asset-section">
                <h4><i class="fas fa-utensils"></i> Assets</h4>
                <div class="Asset-grid">
                    ${Estate.Asset.map(item => `
                        <div class="Asset-item-card ${item.available ? '' : 'unavailable'}">
                            ${item.img ? `<img src="${item.img}" alt="${item.name}">` : ''}
                            <div class="Asset-item-info">
                                <h5>${item.name}</h5>
                                ${item.description ? `<p class="Asset-item-desc">${item.description}</p>` : ''}
                                ${!item.available ? '<span class="unavailable-badge">Unavailable</span>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Reviews Section -->
            <div class="reviews-section">
                <h4><i class="fas fa-comments"></i> Reviews (${Estate.reviews.length})</h4>
                ${Estate.reviews.length > 0 ? `
                    <div class="reviews-list">
                        ${Estate.reviews.slice(0, 3).map(review => `
                            <div class="review-card">
                                <div class="review-header">
                                    <div class="reviewer-avatar">
                                        ${review.customerName.charAt(0).toUpperCase()}
                                    </div>
                                    <div class="reviewer-info">
                                        <h6>${review.customerName}</h6>
                                        <div class="review-rating">
                                            ${[...Array(5)].map((_, i) => 
                                                `<i class="fas fa-star ${i < review.rating ? 'active' : ''}"></i>`
                                            ).join('')}
                                        </div>
                                        <span class="review-date">${formatDate(review.date)}</span>
                                    </div>
                                </div>
                                <p class="review-text">${review.comment}</p>
                            </div>
                        `).join('')}
                        ${Estate.reviews.length > 3 ? 
                            `<button class="btn btn-outline" onclick="showAllReviews('${Estate.id}')">
                                View All ${Estate.reviews.length} Reviews
                            </button>` : ''
                        }
                    </div>
                ` : '<p class="no-reviews">No reviews yet. Be the first to review!</p>'}
            </div>
            
            <!-- Action Buttons -->
            <div class="Estate-actions-section">
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="openOrderModal('${Estate.id}')">
                        <i class="fas fa-shopping-cart"></i> Place Order
                    </button>
                    <button class="btn btn-secondary" onclick="openReservationModal('${Estate.id}')">
                        <i class="fas fa-calendar-plus"></i> Make Reservation
                    </button>
                    <button class="btn btn-outline" onclick="openReviewModal('${Estate.id}')">
                        <i class="fas fa-star"></i> Write Review
                    </button>
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
                    <form onsubmit="submitQuickOrder(event, '${EstateId}')" id="PlaceOrderForm">
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
                            <textarea name="instructions" rows="3" placeholder="Any special requests, allergies, or cooking preferences..."></textarea>
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
    const orderData = {
        EstateId: EstateId,
        customerName: form.customerName.value.trim(),
        customerPhone: form.customerPhone.value.trim(),
        instructions: form.instructions.value.trim(),
        date: new Date().toISOString(),
        status: 'pending'
    };
    const order = dataManager.createOrder(orderData);
    
    if (order) {
        closeModal();
        showToast('Order placed successfully! The restaurant will contact you shortly.', 'success');
        
    }
}
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
        restaurantId,
        customerId: appState.currentUser.id,
        customerName: appState.currentUser.name,
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
}
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
    // This could be implemented to load additional restaurants
    showToast('All Estates loaded!', 'info');
}

// Initialize when DOM is loaded
/*document.addEventListener('DOMContentLoaded', () => {
    initEstates();
    
    // Example
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('hide');
        setTimeout(() => { preloader.style.display = 'none'; }, 500);
    }
});*/
document.addEventListener('DOMContentLoaded', () => {
    initEstates();
});
