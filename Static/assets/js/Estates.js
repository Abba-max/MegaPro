const dataManager = (() => {
    let _allEstates = []; // Private variable to store fetched data
    let _isDataLoaded = false;

    // Fetches estates from the Django API
    async function fetchEstates() {
        try {
            const response = await fetch('/api/estates/'); // Your Django API endpoint
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            _allEstates = data;
            _isDataLoaded = true;
            console.log("Estates loaded:", _allEstates); // For debugging
        } catch (error) {
            console.error("Failed to fetch estates:", error);
            // Optionally, load fallback data or show an error message
            // _allEstates = yourFallbackStaticData;
        }
    }

    // Public methods for dataManager
    return {
        async initialize() {
            if (!_isDataLoaded) {
                await fetchEstates();
            }
        },
        getAllEstates() {
            return _allEstates;
        },
        getEstatesByCategory(category) {
            if (category === 'all') {
                return _allEstates;
            }
            // Filter by checking if the category is present in the 'category' array
            // This assumes your 'category' in JS data aligns with your Django features/categories.
            return _allEstates.filter(estate => 
                (estate.category && estate.category.some(feat => feat.toLowerCase().includes(category.toLowerCase()))) ||
                (estate.WIFI === 'YES' && category.toLowerCase() === 'wifi') ||
                (estate.Generator === 'YES' && category.toLowerCase() === 'generator') ||
                (estate.Security === 'YES' && category.toLowerCase() === 'security') ||
                (estate.Restaurant === 'YES' && category.toLowerCase() === 'restaurant') ||
                (estate.TV_Fridge === 'YES' && category.toLowerCase() === 'tv_fridge') ||
                (estate.Distance.toLowerCase().includes(category.toLowerCase())) ||
                (estate.Space.toLowerCase().includes(category.toLowerCase())) ||
                (category.toLowerCase() === 'budget_friendly' && parseFloat(estate.Price.replace(/[^\d.]/g, '')) < 70000) // Example budget logic
            );
        },
        getEstate(id) {
            return _allEstates.find(estate => estate.id === id);
        },
        searchEstates(searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            return _allEstates.filter(estate =>
                estate.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                estate.location.toLowerCase().includes(lowerCaseSearchTerm) ||
                estate.description.toLowerCase().includes(lowerCaseSearchTerm) ||
                (estate.category && estate.category.some(feat => feat.toLowerCase().includes(lowerCaseSearchTerm)))
            );
        }
    };
})();


// --- Original JS Functions (with minor adjustments for async data loading) ---

function initEstates() {
    // Ensure data is loaded before trying to display anything
    dataManager.initialize().then(() => {
        loadEstates(); // Load all estates by default after data is ready
        setupSearchFunctionality();
    });
}
function processImagePath(path) {
    if (!path) return '/static/assets/img/Estate Images/DJI_0071.jpg';

    // If Django is serving images via /media/ and you're getting full URLs from Django API,
    // this function might become simpler or unnecessary for image paths from the API.
    // However, it's good to keep if you still have static fallback images or paths.
    
    // For images coming from Django's MEDIA_URL, they will already be absolute or relative
    // to the root like /media/estate_images/your_image.jpg.
    // The replace logic for "{% static %}" might no longer be needed if Django sends clean URLs.
    
    let processedPath = path.replace(/^{%\s*static\s*'([^']+)'\s*%}/, '/static/$1')
                               .replace(/^'/, '')
                               .replace(/'$/, '');

    // Ensure the path starts with /static/ or /media/
    // Adjust this logic if your image paths from Django API are different.
    if (!processedPath.startsWith('/static/') && !processedPath.startsWith('/media/')) {
        // Assume it's a relative path that needs /static/ prepended if it's a fallback
        processedPath = '/static' + (processedPath.startsWith('/') ? '' : '/') + processedPath;
    }
    
    return processedPath;
}

function createEstateCard(Estate, index) {
    // processImagePath might still be useful for fallback images
    const mainImg = processImagePath(Estate.images?.[0] || Estate.image);
    const publishedTime = Estate.publishedAt ? formatPublishedTime(Estate.publishedAt) : '';

    return `
        <div class="Estate-card animate" style="animation-delay:${index * 0.1}s">
            <div class="Estate-img-container">
                <img src="${mainImg}" alt="${Estate.name}"  class="main-img">
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
                            <i class="fas fa-clock"></i>
                            <span>${publishedTime}</span>
                        </div>
                    </div>
                </div>
                <p class="Estate-desc">${Estate.description}</p>
                <div class="Estate-tags">
                    ${(Estate.category || []).slice(0, 3).map(feature =>
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

// ... All other functions (filterEstates, setupSearchFunctionality, searchEstates,
// clearSearch, openEstateDetails, createEstateDetailsHTML, changeMainImage,
// changeGalleryImage, nextImage, prevImage, showModal, scrollToEstates, formatPublishedTime)
// remain largely the same, but ensure they call dataManager methods for data retrieval.

// Example of how loadEstates now uses dataManager:
function loadEstates(filter = 'all') {
    const EstateGrid = document.getElementById('EstateGrid');
    let Estates = dataManager.getAllEstates(); // Get data from dataManager

    // Apply filter 
    if (filter !== 'all') {
        Estates = dataManager.getEstatesByCategory(filter);
    }

    // Sort by rating (highest first) - already sorted by Django API, but keeping for client-side sort preference
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


// Filter Estates - no change needed here other than loadEstates now being dynamic
function filterEstates(event, category) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    loadEstates(category);
}

// Search functionality - searchEstates will call dataManager.searchEstates()
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
                <p>Try searching for different keywords like  "Mini Cite","City" or "Cite".</p>
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
    const Estate = dataManager.getEstate(EstateId); // Get data from dataManager
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
    const images = (Estate.images && Estate.images.length > 0) ? Estate.images : (Estate.image ? [Estate.image] : []);
    const mainImage = images[0] || '/static/assets/img/Estate Images/DJI_0071.jpg'; // Fallback

    return `
        <div class="Estate-details-content">
            <!-- Estate Images -->
            <div class="Estate-gallery">
                   <div class="main-image">
                    <img src="${processImagePath(mainImage)}" alt="${Estate.name}" id="mainGalleryImage" >
                    ${images.length > 1 ? `<div class="image-counter">1/${images.length}</div>` : ''}
                </div>
                            ${images.length > 1 ? `
                    <div class="gallery-thumbnails" id="galleryThumbnails" >
                        ${images.map((img, index) => `
                            <img src="${processImagePath(img)}" alt="${Estate.name}"
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
                        ${(Estate.category || []).map(feature => // Use Estate.category for features here
                            `<span class="feature-badge"><i class="fas fa-check"></i> ${feature}</span>`
                        ).join('')}
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

// Functions related to modal, image gallery, and toast remain unchanged as they operate on the DOM
// and the data provided by the `openEstateDetails` and `createEstateDetailsHTML` functions.

let currentImageIndex = 0;
let estateImages = [];

function changeGalleryImage(index) {
    const mainImage = document.getElementById('mainGalleryImage');
    const thumbnails = document.querySelectorAll('#galleryThumbnails img');
    const counter = document.querySelector('.image-counter');
    
    if (!mainImage || !thumbnails.length) return;

    // Ensure estateImages is populated from the current modal's thumbnails
    if (estateImages.length === 0 || !thumbnails[0].src.includes(estateImages[0])) {
        estateImages = Array.from(thumbnails).map(t => t.src);
    }

    currentImageIndex = index;

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

function showModal(content) {
    const existingModal = document.getElementById('dynamicModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'dynamicModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"></div>
        ${content}
    `;
    
    document.body.appendChild(modal);

    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    document.body.style.overflow = 'hidden';

    // Initialize gallery after modal content is in DOM
    setTimeout(() => {
        const thumbnails = document.querySelectorAll('#galleryThumbnails img');
        if (thumbnails.length) {
            estateImages = Array.from(thumbnails).map(t => t.src);
            currentImageIndex = 0; // Reset index for new modal

            if (estateImages.length > 1) {
                const gallery = document.querySelector('.Estate-gallery');
                // Remove existing nav if modal is reused
                gallery.querySelectorAll('.gallery-nav').forEach(nav => nav.remove());

                gallery.insertAdjacentHTML('beforeend', `
                    <div class="gallery-nav prev" onclick="prevImage()">
                        <i class="fas fa-chevron-left"></i>
                    </div>
                    <div class="gallery-nav next" onclick="nextImage()">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                `);
            }
            // Call changeGalleryImage to set initial main image and counter
            changeGalleryImage(0);
        }
    }, 100); // Small delay to ensure DOM is ready
}

function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) {
        modal.classList.remove('show');
        modal.addEventListener('transitionend', () => {
            modal.remove();
        }, { once: true });
    }
    document.body.style.overflow = ''; // Restore body scroll
}

function scrollToEstates() {
    document.getElementById('Estates').scrollIntoView({ behavior: 'smooth' });
}

// Function to display toast messages (assuming you have toast styles)
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || (() => {
        const div = document.createElement('div');
        div.id = 'toast-container';
        document.body.appendChild(div);
        return div;
    })();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Hide and remove toast after a few seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
}

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


document.addEventListener('DOMContentLoaded', () => {
    // Add the loaded class for styling purposes
    document.documentElement.classList.add('loaded');
    
    // Initialize estates after the DOM is ready
    initEstates();
});



// function initEstates() {
//     loadEstates(); // Load all estates by default
//     setupSearchFunctionality();
// }

// function processImagePath(path) {
//     if (!path) return '/static/assets/img/Estate Images/DJI_0071.jpg';

//     // Remove any Django static tags if present
//     let processedPath = path.replace(/^{%\s*static\s*'([^']+)'\s*%}/, '/static/$1')
//                            .replace(/^'/, '')
//                            .replace(/'$/, '');

//     // Ensure the path starts with /static/
//     if (!processedPath.startsWith('/static/')) {
//         processedPath = '/static' + (processedPath.startsWith('/') ? '' : '/') + processedPath;
//     }

// }

// function createEstateCard(Estate, index) {
//     const mainImg = processImagePath(Estate.images?.[0] || Estate.image);
//         const showThumbs = Estate.images?.length > 1;
//     const thumbCount = Math.min(4, Estate.images?.length || 0);
//     const extraImages = Estate.images?.length > 4 ? Estate.images.length - 4 : 0;
//     const publishedTime = Estate.publishedAt ? formatPublishedTime(Estate.publishedAt) : '';
//     return `
//         <div class="Estate-card animate" style="animation-delay:${index * 0.1}s">
//             <div class="Estate-img-container">
//                 <img src="${mainImg}" alt="${Estate.name}" class="main-img">
//                 <div class="Estate-badge rating">
//                     <i class="fas fa-star" style="color: gold;"></i> ${Estate.rating ? Estate.rating.toFixed(1) : 'N/A'}
//                 </div>
//             </div>
//             <div class="Estate-content">
//                 <di class="Estate-header">
//                     <h3 class="Estate-name">${Estate.name}</h3>
//                     <div class="Estate-meta">
//                         <div class="meta-item">
//                             <i class="fas fa-map-marker-alt"></i>
//                             <span>${Estate.location}</span>
//                         </div>
//                         <div class="meta-item">
//                             <i class="fas fa-users"></i>
//                             <span>${Estate.Capacity}</span>
//                         </div>
//                         <div class="meta-item">
//                             <i class="fas fa-tag"></i>
//                             <span>${Estate.Price}</span>
//                         </div>
//                         <div class="meta-item">
//                             <i class="fas fa-clock"></i>
//                             <span style="color:blue;">${publishedTime}</span>
//                         </div>
//                     </div>
//                 </div>
//                 <p class="Estate-desc">${Estate.description}</p>
//                 <div class="Estate-tags">
//                     ${(Estate.features || Estate.category || []).slice(0, 3).map(feature =>
//                         `<span class="tag">${feature}</span>`
//                     ).join('')}
//                     <span class="tag primary">${Estate.Free_Rooms || ''}</span>
//                 </div>
//                 <div class="Estate-actions">
//                     <button class="btn btn-primary" onclick="openEstateDetails('${Estate.id}')">
//                         <i class="fas fa-eye"></i> View Details
//                     </button>
//                     <a href="/quick_order/?estate=${encodeURIComponent(Estate.name)}" class="btn btn-primary">Place Reservation</a>
//                 </div>
//             </div>
//         </div>
//     `;
// }

// // All other functions (loadEstates, filterEstates, setupSearchFunctionality, searchEstates,
// // clearSearch, openEstateDetails, createEstateDetailsHTML, changeMainImage,
// // changeGalleryImage, nextImage, prevImage, showModal, scrollToEstates)
// // remain the same as in your original code.
// // Make sure to include them below this updated createEstateCard function.

// // Display Publishing date of an Estate
// // This entire DOMContentLoaded block should be removed or commented out if you're using the per-card calculation.
// /*
// document.addEventListener('DOMContentLoaded', function() {
//     // Set the date we're counting to (Year, Month (0-11), Day, Hour, Minute, Second)
//     const Pubdate = new Date("July 20, 2025 16:59:59").getTime();

//     // Update the count every 1 second
//     const x = setInterval(function() {

//         // Get today's date and time
//         const now = new Date().getTime();

//         // Find the distance between now and the count date
//         const distance = now -Pubdate;
//         // Time calculations for days, hours, minutes and seconds
//         const days = Math.floor(distance / (1000 * 60 * 60 * 24));
//         const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//         const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

//         // Display the result in the corresponding elements
//         document.getElementById("days").innerHTML = days;
//         document.getElementById("hours").innerHTML = hours;
//         document.getElementById("minutes").innerHTML = minutes;
//     }, 1000); // Update every 1000ms (1 second)
// });
// */

// // Keep this DOMContentLoaded as it adds a class for styling
// document.addEventListener('DOMContentLoaded', function() {
//     document.documentElement.classList.add('loaded');
// });


// // Load and display Estates
// function loadEstates(filter = 'all') {
//     const EstateGrid = document.getElementById('EstateGrid');
//     let Estates = dataManager.getAllEstates(); // Assuming dataManager.getAllEstates() returns your estate data

//     // Apply filter
//     if (filter !== 'all') {
//         Estates = dataManager.getEstatesByCategory(filter);
//     }

//     // Sort by rating (highest first)
//     Estates.sort((a, b) => b.rating - a.rating);

//     // Update total Estates count
//     document.getElementById('totalEstates').textContent = `${Estates.length}+`;

//     EstateGrid.innerHTML = Estates.map((Estate, index) =>
//         createEstateCard(Estate, index)
//     ).join('');

//     // Add animation delay for staggered effect
//     const cards = EstateGrid.querySelectorAll('.Estate-card');
//     cards.forEach((card, index) => {
//         card.style.animationDelay = `${index * 0.1}s`;
//         card.classList.add('animate');
//     });
// }

// // Filter Estates
// function filterEstates(event, category) {
//     document.querySelectorAll('.filter-btn').forEach(btn => {
//         btn.classList.remove('active');
//     });
//     event.target.classList.add('active');
//     loadEstates(category);
// }
// // Search functionality
// function setupSearchFunctionality() {
//     const searchInput = document.getElementById('searchInput');
//     let searchTimeout;

//     searchInput.addEventListener('input', (e) => {
//         clearTimeout(searchTimeout);
//         searchTimeout = setTimeout(() => {
//             searchEstates(e.target.value);
//         }, 300);
//     });

//     searchInput.addEventListener('keypress', (e) => {
//         if (e.key === 'Enter') {
//             searchEstates(e.target.value);
//         }
//     });
// }

// function searchEstates(query = null) {
//     const searchInput = document.getElementById('searchInput');
//     const searchTerm = query || searchInput.value.trim();

//     if (searchTerm === '') {
//         loadEstates();
//         return;
//     }

//     const results = dataManager.searchEstates(searchTerm);

//     const EstateGrid = document.getElementById('EstateGrid');

//     if (results.length === 0) {
//         EstateGrid.innerHTML = `
//             <div class="empty-state" style="grid-column: 1 / -1;">
//                 <i class="fas fa-search"></i>
//                 <h3>No Estates found</h3>
//                 <p>Try searching for different keywords like  "Mini Cite","City" or "Cite".</p>
//                 <button class="btn btn-primary" onclick="clearSearch()">
//                     <i class="fas fa-times"></i> Clear Search
//                 </button>
//             </div>
//         `;
//         return;
//     }

//     EstateGrid.innerHTML = results.map((Estate, index) =>
//         createEstateCard(Estate, index)
//     ).join('');

//     // Add animation
//     const cards = EstateGrid.querySelectorAll('.Estate-card');
//     cards.forEach((card, index) => {
//         card.style.animationDelay = `${index * 0.1}s`;
//         card.classList.add('animate');
//     });

//     showToast(`Found ${results.length} Estate(s) matching "${searchTerm}"`, 'info');
// }

// function clearSearch() {
//     document.getElementById('searchInput').value = '';
//     loadEstates();

//     // Reset active filter
//     document.querySelectorAll('.filter-btn').forEach(btn => {
//         btn.classList.remove('active');
//     });
//     // Assuming 'all' is the default category button
//     const defaultFilterButton = document.querySelector('.filter-btn[onclick*="filterEstates"][onclick*="\'all\'"]');
//     if (defaultFilterButton) {
//         defaultFilterButton.classList.add('active');
//     }
// }
// function openEstateDetails(EstateId) {
//     const Estate = dataManager.getEstate(EstateId);
//     if (!Estate) {
//         showToast('Estate not found', 'error');
//         return;
//     }

//     const modalContent = `
//         <div class="modal-content" style="max-width: 800px;">
//             <div class="modal-header">
//                 <h2>${Estate.name}</h2>
//                 <button class="close-btn" onclick="closeModal()">&times;</button>
//             </div>
//             <div class="modal-body">
//                 ${createEstateDetailsHTML(Estate)}
//             </div>
//         </div>
//     `;

//     showModal(modalContent);
// }

// function createEstateDetailsHTML(Estate) {
//       const images = Estate.images || (Estate.image ? [Estate.image] : []);
//     const mainImage = images[0] || '/Static/assets/img/Estate Images/DJI_0071.jpg';
//     return `
//         <div class="Estate-details-content">
//             <div class="Estate-gallery">
//                  <div class="main-image">
//                     <img src="${mainImage}" alt="${Estate.name}" id="mainGalleryImage" >
//                     ${images.length > 1 ? `<div class="image-counter">1/${images.length}</div>` : ''}
//                 </div>
//                        ${images.length > 1 ? `
//                     <div class="gallery-thumbnails" id="galleryThumbnails" >
//                         ${images.map((img, index) => `
//                             <img src="${img}" alt="${Estate.name}"
//                                  onclick="changeGalleryImage(${index})"
//                                  class="${index === 0 ? 'active' : ''}"
//                                  data-index="${index}">
//                         `).join('')}
//                     </div>
//                 ` : ''}
//             </div>
//             <div class="Estate-info-grid">
//                 <div class="info-section">
//                     <h4><i class="fas fa-info-circle"></i> About</h4>
//                     <p><strong>Capacity:</strong> ${Estate.Capacity}</p>
//                     <p><strong>Budget:</strong> ${Estate.Price}</p>
//                     <p><strong>Free Rooms:</strong> ${Estate.Free_Rooms}</p>
//                     <p><strong>Location:</strong> ${Estate.location}</p>
//                     <p><strong>Space:</strong> ${Estate.Space}</p>
//                     <p><strong>Generator:</strong> ${Estate.Generator}</p>
//                     <p><strong>Restaurant:</strong> ${Estate.Restaurant}</p>
//                     <p><strong>TV/Fridge:</strong> ${Estate.TV_Fridge}</p>
//                     <p><strong>Wifi:</strong> ${Estate.WIFI}</p>
//                     <p><strong>Security:</strong> ${Estate.Security}</p>
//                     <p><strong>Distance:</strong> ${Estate.Distance}</p>
//                     <p><strong>Description:</strong> ${Estate.description}</p>

//                 </div>
//                 <div class="info-section">
//                     <h4><i class="fas fa-star"></i> Features</h4>
//                     <div class="features-grid">
//                         ${(Estate.features || Estate.category || []).map(feature =>
//                             `<span class="feature-badge"><i class="fas fa-check"></i> ${feature}</span>`
//                         ).join('')}
//                         ${Estate.reservationAvailable ?
//                             '<span class="feature-badge reservation"><i class="fas fa-truck"></i> Reservation Available</span>' : ''
//                         }
//                     </div>
//                 </div>
//             </div>
//             <div class="reviews-section">
//                 <h4><i class="fas fa-comments"></i> Reviews</h4>
//                 <p>No reviews yet. Be the first to review!</p>
//             </div>
//             <div class="Estate-actions-section">
//                 <div class="action-buttons">
//                        <a href="/review/?estate=${encodeURIComponent(Estate.name)}" class="btn btn-secondary">Write Review</a>
//                 </div>
//             </div>
//         </div>
//     `;
// }
// function changeMainImage(element,imageSrc) {
//         // For card thumbnails
//     if (element) {
//         const card = element.closest('.Estate-card');
//         if (card) {
//             // Update main image
//             const mainImg = card.querySelector('.main-img');
//             if (mainImg) {
//                 mainImg.src = imageSrc;
//             }

//             // Update active thumbnail
//             const thumbnails = card.querySelectorAll('.thumbnail-img');
//             thumbnails.forEach(thumb => thumb.classList.remove('active'));
//             element.classList.add('active');
//         }
//     }
//     const mainImage = document.querySelector('.main-img img');
//     if (mainImage) {
//         mainImage.src = imageSrc;
//     }
// }
// let currentImageIndex = 0;
// let estateImages = [];

// function changeGalleryImage(index) {
//     const mainImage = document.getElementById('mainGalleryImage');
//     const thumbnails = document.querySelectorAll('#galleryThumbnails img');
//     const counter = document.querySelector('.image-counter');

//     if (!mainImage || !thumbnails.length) return;

//     currentImageIndex = index;
//     estateImages = Array.from(thumbnails).map(t => t.src);

//     // Update main image
//     mainImage.src = estateImages[currentImageIndex];

//     // Update active thumbnail
//     thumbnails.forEach((thumb, i) => {
//         thumb.classList.toggle('active', i === currentImageIndex);
//     });

//     // Update counter
//     if (counter) {
//         counter.textContent = `${currentImageIndex + 1}/${estateImages.length}`;
//     }

//     // Scroll thumbnail into view
//     const activeThumb = thumbnails[currentImageIndex];
//     activeThumb.scrollIntoView({
//         behavior: 'smooth',
//         block: 'nearest',
//         inline: 'center'
//     });
// }

// function nextImage() {
//     if (estateImages.length === 0) return;
//     currentImageIndex = (currentImageIndex + 1) % estateImages.length;
//     changeGalleryImage(currentImageIndex);
// }

// function prevImage() {
//     if (estateImages.length === 0) return;
//     currentImageIndex = (currentImageIndex - 1 + estateImages.length) % estateImages.length;
//     changeGalleryImage(currentImageIndex);
// }

// // Initialize gallery when modal opens
// function showModal(content) {
//     const existingModal = document.getElementById('dynamicModal');
//     if (existingModal) {
//         existingModal.remove();
//     }
// //Create Modal
//     const modal = document.createElement('div');
//     modal.id = 'dynamicModal';
//     modal.className = 'modal';
//     modal.innerHTML = `
//         <div class="modal-overlay"></div>
//         ${content}
//     `;

//     document.body.appendChild(modal);

//     // Show modal with animation
//     setTimeout(() => {
//         modal.classList.add('show');
//     }, 10);

//     // Prevent body scroll
//     document.body.style.overflow = 'hidden';
//     // After showing modal, initialize gallery
//     setTimeout(() => {
//         const thumbnails = document.querySelectorAll('#galleryThumbnails img');
//         if (thumbnails.length) {
//             estateImages = Array.from(thumbnails).map(t => t.src);
//             currentImageIndex = 0;

//             // Add navigation arrows if multiple images
//             if (estateImages.length > 1) {
//                 const gallery = document.querySelector('.Estate-gallery');
//                 gallery.insertAdjacentHTML('beforeend', `
//                     <div class="gallery-nav prev" onclick="prevImage()">
//                         <i class="fas fa-chevron-left"></i>
//                     </div>
//                     <div class="gallery-nav next" onclick="nextImage()">
//                         <i class="fas fa-chevron-right"></i>
//                     </div>
//                 `);
//             }
//         }
//     }, 10);
// }
// function scrollToEstates() {
//     document.getElementById('Estates').scrollIntoView({ behavior: 'smooth' });
// }

// document.addEventListener('DOMContentLoaded', () => {
//     initEstates();
// });
// function formatPublishedTime(publishedTimestamp) {
//     const now = new Date().getTime();
//     const diff = now - publishedTimestamp;
    
//     // Calculate time units
//     const seconds = Math.floor(diff / 1000);
//     const minutes = Math.floor(seconds / 60);
//     const hours = Math.floor(minutes / 60);
//     const days = Math.floor(hours / 24);
    
//     if (days > 0) {
//         return `Updated ${days} day${days > 1 ? 's' : ''} ago`;
//     } else if (hours > 0) {
//         return `Updated ${hours} hour${hours > 1 ? 's' : ''} ago`;
//     } else if (minutes > 0) {
//         return `Updated ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
//     } else {
//         return `Updated just now`;
//     }
// }