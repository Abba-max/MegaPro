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
    const publishedTime = Estate.publishedAt ? formatPublishedTime(Estate.publishedAt) : '';
    // Render only one gold star
        const avgRating = Estate.avgRating !== undefined ? Estate.avgRating : 3.5;
    const reviewCount = Estate.reviewCount !== undefined ? Estate.reviewCount : 0;
    
    const displayRating = avgRating.toFixed(1);
    const reviewCountDisplay = reviewCount > 0 ? `(${reviewCount})` : '';
    
    function renderSingleStar() {
        return `<i class="fas fa-star" style="color:gold;"></i>`;
    }
    return `
        <div class="Estate-card animate" style="animation-delay:${index * 0.1}s">
            <div class="Estate-img-container">
                <img src="${mainImg}" alt="${Estate.name}"  class="main-img">
                <div class="Estate-badge rating">
                    ${renderSingleStar()} <span style='margin-left:5px;'>${displayRating} ${reviewCountDisplay}</span>
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
        Estates.forEach(est => {
        est.avgRating = est.avgRating || 3.5;
        est.reviewCount = est.reviewCount || 0;
    });

    // Fetch all reviews for all estates and calculate average ratings
    Promise.all(Estates.map(est => fetch(`/api/reviews/?estate_id=${encodeURIComponent(est.name)}`)
        .then(res => res.json())
        .then(data => {
            const ratings = Array.isArray(data.reviews) ? 
                data.reviews.map(r => parseFloat(r.rating)).filter(r => !isNaN(r)) : [];
            if (ratings.length > 0) {
                est.avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                est.reviewCount = ratings.length;
            } else {
                // Set default values when no reviews exist
                est.avgRating = 3.5;
                est.reviewCount = 0;
            }
        })
        .catch(() => {
            // On error, use default values
            est.avgRating = 3.5;
            est.reviewCount = 0;
        })
    )).then(() => {
        // Sort by new average rating (highest first)
        Estates.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
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
            <!-- Estate Info -->
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
                    </div>
                </div>
            </div>
            <!-- Reviews Section -->
            <div class="reviews-section" id="reviewsSection">
                <h4><i class="fas fa-comments"></i> Reviews</h4>
                <div id="reviewsList"><p>Loading reviews...</p></div>
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
    // After showing modal, initialize gallery and reviews
   setTimeout(async () => {
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
        async function fetchCurrentUser() {
        try {
            const res = await fetch('/api/current_user/');
            if (res.ok) {
                const data = await res.json();
                window.currentUser = data && data.username ? data.username : null;
            } else {
                window.currentUser = null;
            }
        } catch {
            window.currentUser = null;
        }
    }
    await fetchCurrentUser();
        // Real-time reviews: fetch reviews and show average rating
          const reviewsSection = document.getElementById('reviewsSection');
    if (reviewsSection) {
        const reviewsList = document.getElementById('reviewsList');
        const modalHeader = document.querySelector('.modal-header');
        let estateId = null;
        const modal = document.getElementById('dynamicModal');
        if (modal) {
            const h2 = modal.querySelector('.modal-header h2');
            if (h2) {
                estateId = h2.textContent;
            }
        }
        
        // Helper to render stars
        function renderStars(rating) {
            rating = Math.round(parseFloat(rating));
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += `<i class="fas fa-star" style="color:${i <= rating ? 'gold' : '#ccc'};"></i>`;
            }
            return stars;
        }

        // Helper to render replies recursively
        function renderReplies(replies, parentId) {
            if (!replies || !replies.length) return '';
            return `<div class="review-replies">${replies.map(reply => renderReviewItem(reply, parentId)).join('')}</div>`;
        }

        // Helper to render a single review (with replies)
        function renderReviewItem(r, parentId = null) {
            const liked = r.likedByCurrentUser ? 'liked' : '';
            const userLoggedIn = !!window.currentUser;
            // Use data attributes for event delegation
            return `
                <div class="review-item" data-review-id="${r.id}">
                    <strong>${r.author}</strong> <span style="color:#888;font-size:12px;">${r.created_at}</span>
                    ${parentId ? '' : `<div class="review-rating">${renderStars(r.rating)} (${r.rating}/5)</div>`}
                    <p>${r.text}</p>
                    <div class="review-actions">
                        <button class="like-btn ${liked}" data-like-id="${r.id}" ${userLoggedIn ? '' : 'disabled title="Login to like"'}>
                            <i class="fas fa-thumbs-up"></i> <span class="like-count">${r.likes || 0}</span>
                        </button>
                        ${parentId ? '' : `<button class="reply-btn" data-reply-id="${r.id}" ${userLoggedIn ? '' : 'disabled title="Login to reply"'}>
                            <i class="fas fa-reply"></i> Reply
                        </button>`}
                    </div>
                    ${parentId ? '' : `<div class="reply-box" id="reply-box-${r.id}" style="display:none;">
                        <textarea placeholder="Write a reply..." ${userLoggedIn ? '' : 'disabled'}></textarea>
                        <button data-send-id="${r.id}" ${userLoggedIn ? '' : 'disabled'}>Send</button>
                    </div>`}
                    ${renderReplies(r.replies, r.id)}
                </div>
            `;
        }

        // Show only 3 most recent reviews, with Load More
        let allReviews = [];
        let reviewsShown = 3;

    function renderReviewsList() {
    if (!allReviews.length) {
        reviewsList.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
        return;
    }
    
    // Show review count
    const reviewCountHtml = `<div class="review-count" style="margin-bottom: 15px;">
        <strong>Total Reviews:</strong> ${allReviews.length}
    </div>`;
    
    // Sort by created_at descending (most recent first)
    const sorted = allReviews.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Show all reviews if "Load More" was clicked, otherwise show first 3
    const visible = reviewsShown >= allReviews.length ? sorted : sorted.slice(0, reviewsShown);
    
    reviewsList.innerHTML = reviewCountHtml + visible.map(r => renderReviewItem(r)).join('');
    
    // Only show "Load More" if there are more reviews to show
    if (reviewsShown < allReviews.length) {
        reviewsList.innerHTML += `<button class="btn btn-secondary load-more-btn" id="loadMoreBtn">
            Load More (${allReviews.length - reviewsShown} remaining)
        </button>`;
    }
    
    attachReviewEventHandlers();
}

        // Attach event handlers using event delegation
        function attachReviewEventHandlers() {
            // Defensive: Only attach if reviewsList exists
            if (!reviewsList) return;
            
            // Remove previous handler if present
            if (reviewsList._delegationHandler) {
                reviewsList.removeEventListener('click', reviewsList._delegationHandler);
            }
            
            // Define the handler
            function delegationHandler(e) {
                // If the button is disabled, do nothing
                const btn = e.target.closest('button');
                if (btn && btn.disabled) return;

                // Like button
                if (btn && btn.classList.contains('like-btn') && btn.hasAttribute('data-like-id')) {
                    e.preventDefault();
                    const reviewId = btn.getAttribute('data-like-id');
                    likeReview(reviewId, btn);
                    return;
                }
                
                // Reply button
                if (btn && btn.classList.contains('reply-btn') && btn.hasAttribute('data-reply-id')) {
                    e.preventDefault();
                    const reviewId = btn.getAttribute('data-reply-id');
                    showReplyBox(reviewId);
                    return;
                }
                
                // Send reply button
                if (btn && btn.hasAttribute('data-send-id')) {
                    e.preventDefault();
                    const parentId = btn.getAttribute('data-send-id');
                    submitReply(parentId, btn);
                    return;
                }
                
                // Load more button
                if (btn && btn.id === 'loadMoreBtn') {
                    e.preventDefault();
                    loadMoreReviews();
                    return;
                }
            }
            
            // Store reference to handler and attach event
            reviewsList._delegationHandler = delegationHandler;
            reviewsList.addEventListener('click', delegationHandler);
        }

        // Define global functions for review interactions
      window.loadMoreReviews = function() {
    // Show all reviews by setting reviewsShown to a large number
    reviewsShown = allReviews.length;
    renderReviewsList();
};
        window.likeReview = function(reviewId, btn) {
            if (!window.currentUser) {
                window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                return;
            }
            // Optimistic UI update
            const countSpan = btn.querySelector('.like-count');
            let count = parseInt(countSpan.textContent) || 0;
            if (!btn.classList.contains('liked')) {
                count++;
                btn.classList.add('liked');
            } else {
                count = Math.max(0, count - 1);
                btn.classList.remove('liked');
            }
            countSpan.textContent = count;
            
            // Send like to backend
            fetch(`/api/reviews/like/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ review_id: reviewId })
            });
        };

        window.showReplyBox = function(reviewId) {
            if (!window.currentUser) {
                window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                return;
            }
            const box = document.getElementById('reply-box-' + reviewId);
            if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
        };

        window.submitReply = function(parentId, btn) {
            if (!window.currentUser) {
                window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                return;
            }
            const box = btn.closest('.reply-box');
            const textarea = box.querySelector('textarea');
            const text = textarea.value.trim();
            if (!text) return;
            
            btn.disabled = true;
            const author = window.currentUser;
            
            fetch(`/api/reviews/reply/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_id: parentId, text, author })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to send reply');
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    textarea.value = '';
                    box.style.display = 'none';
                    fetchReviews();
                }
            })
            .catch(() => {
                alert('Failed to send reply. Please try again.');
            })
            .finally(() => { btn.disabled = false; });
        };

        // Fetch reviews (with replies and likes)
function fetchReviews() {
    if (!estateId) return;
    fetch(`/api/reviews/?estate_id=${encodeURIComponent(estateId)}`)
        .then(res => res.json())
        .then(data => {
            allReviews = data.reviews || [];
            // Calculate average rating from top-level reviews only
            const ratings = allReviews.filter(r => !r.is_reply).map(r => parseFloat(r.rating)).filter(r => !isNaN(r));
            const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 3.5;
            
            // Show average rating in modal header
            if (modalHeader) {
                let ratingHtml = `<div class="Estate-badge rating" style="margin-left:10px;display:inline-block;">
                    <i class="fas fa-star" style="color: gold;"></i> ${avgRating.toFixed(1)} / 5
                    <span style="margin-left: 5px;">(${allReviews.length} reviews)</span>
                </div>`;
                // Remove previous badge if exists
                const oldBadge = modalHeader.querySelector('.Estate-badge.rating');
                if (oldBadge) oldBadge.remove();
                modalHeader.insertAdjacentHTML('beforeend', ratingHtml);
            }
            
            renderReviewsList();
        })
        .catch(() => {
            reviewsList.innerHTML = '<p>Error loading reviews.</p>';
            // On error, show default rating
            if (modalHeader) {
                let ratingHtml = `<div class="Estate-badge rating" style="margin-left:10px;display:inline-block;">
                    <i class="fas fa-star" style="color: gold;"></i> 3.5 / 5
                    <span style="margin-left: 5px;">(0 reviews)</span>
                </div>`;
                const oldBadge = modalHeader.querySelector('.Estate-badge.rating');
                if (oldBadge) oldBadge.remove();
                modalHeader.insertAdjacentHTML('beforeend', ratingHtml);
            }
        });
}
        // Initial fetch
        fetchReviews();
    }
}, 10);
if (!document.getElementById('review-styles')) {
    const style = document.createElement('style');
    style.id = 'review-styles';
    style.innerHTML = `
        .review-item {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            margin-bottom: 12px;
            padding: 12px 16px;
            position: relative;
        }
        .review-rating { margin: 4px 0 8px 0; }
        .review-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 4px;
        }
        .like-btn, .reply-btn {
            background: none;
            border: none;
            color: #555;
            cursor: pointer;
            font-size: 14px;
            padding: 2px 8px;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .like-btn.liked {
            color: #1976d2;
            font-weight: bold;
        }
        .like-btn:hover, .reply-btn:hover {
            background: #f0f0f0;
        }
        .review-replies {
            margin-left: 32px;
            border-left: 2px solid #eee;
            padding-left: 12px;
        }
        .reply-box {
            margin-top: 8px;
            background: #f9f9f9;
            border-radius: 6px;
            padding: 8px;
        }
        .reply-box textarea {
            width: 100%;
            min-height: 40px;
            border-radius: 4px;
            border: 1px solid #ccc;
            padding: 6px;
            margin-bottom: 6px;
            resize: vertical;
        }
        .reply-box button {
            background: #1976d2;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 4px 14px;
            cursor: pointer;
            font-size: 13px;
        }
        .reply-box button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
   .load-more-btn {
    display: block !important;
    margin: 10px auto 0 auto;
    background: #eee;
    color: #1976d2;
    border: none;
    border-radius: 4px;
    padding: 6px 18px;
    font-size: 15px;
    cursor: pointer;
    transition: background 0.2s;
}
.load-more-btn:hover {
    background: #e3e3e3;
}
    `;
    document.head.appendChild(style);
}
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