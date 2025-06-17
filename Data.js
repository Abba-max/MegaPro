// main.js
const EstateData = {
    'cite universitaire': {
            name: 'Cite Universitaire',
            rating: 3.0,
            location: 'It is located near the school University.',
            Capacity: '114 double rooms, 10 single rooms',
            budget: '30,000 FCFA-double room, 60,000 FCFA-single room',
            Free_rooms: '//To modify',
            description: 'Cite Universitaire is a student residence offering affordable accommodation with basic amenities. It is located near the school University, providing easy access to classes and campus facilities.',
             WIFI: 'Not Available',
            Restaurant: ' Not Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'Front View', img: '/Static/assets/img/Estate Images/cite_universitaire.jpg' },
                { name: 'Room', img: '/Static/assets/img/Estate Images/cite_universitaire_room.jpg' }
            ],
            features: [ 'Budget Friendly', 'Discipline'],
            
        },
        'RPN': {
            name: 'RPN',
            rating: 4.5,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Available',
            Restaurant: ' Not Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },
                { name: 'To modify', img: 'To modify' }, 
            ],
            features: [ 'Luxury', 'Comfortable'],
        },
        'Colonel': {
            name: 'Colonel/Bao',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Not Available',
            Restaurant: ' Not Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },
                { name: 'To modify', img: 'To modify' }, 
            ],
            features: [ 'Budget Friendly', 'Discipline'],
        },
        'Bevina': {
            name: 'Cite Bevina',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Not Available',
            Restaurant: ' Not Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },
                { name: 'To modify', img: 'To modify' }, 
            ],
            features: [ 'To Modify', 'To Modify'],
        },
        'Cite Verte': {
            name: 'Cite Verte',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: ' Available',
            Restaurant: ' Not Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },
                { name: 'To modify', img: 'To modify' }, 
            ],
            features: [ 'To Modify', 'To Modify'],
        },
        'TBC': {
            name: 'TBC',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Available',
            Restaurant: '  Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },
                { name: 'To modify', img: 'To modify' }, 
            ],
            features: [ 'To Modify', 'To Modify'],
        },
        'Digital': {
            name: 'Digital City',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Available',
            Restaurant: '  Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },
                { name: 'To modify', img: 'To modify' },
            ],
            features: [ 'To Modify', 'To Modify'],
        },
        'Shekina': {
            name: 'Shekina',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Available',
            Restaurant: '  Available',
            Generator: 'Available',
            TV_Fridge: ' Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },    
                { name: 'To modify', img: 'To modify' },    
            ],
            features: [ 'To Modify', 'To Modify'],
        },
        'Germain': {
            name: 'Cite Saint Germain',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Not Available',
            Restaurant: '  Not Available',
            Generator: 'Not Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },    
                { name: 'To modify', img: 'To modify' },    
            ],
            features: [ 'To Modify', 'To Modify'],
        },
        'Jumeirah': {
            name: 'Jumeirah',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Not Available',
            Restaurant: ' Not  Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },    
                { name: 'To modify', img: 'To modify' },    
            ],
            features: [ 'To Modify', 'To Modify'],
        },
        'Face': {
            name: 'En Face de lecole',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Not Available',
            Restaurant: '  Not Available',
            Generator: 'Not Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },    
                { name: 'To modify', img: 'To modify' },    
            ],
            features: [ 'To Modify', 'To Modify'],
        },

'Toundalia': {
            name: 'Toundalia',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Available',
            Restaurant: ' Not Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },    
                { name: 'To modify', img: 'To modify' },    
            ],
            features: [ 'To Modify', 'To Modify'],
        },

'Divine': {
            name: 'Grace Divine',
            rating: 4.0,
            location: '// to modify.',
            Capacity: '// to modify',
            budget: '// to modify',
            Free_rooms: '//To modify',
            description: '// to modify',
            WIFI: 'Not Available',
            Restaurant: ' Not Available',
            Generator: 'Available',
            TV_Fridge: 'Not Available',
            Security: '24/7 security service',
            phone: '+237 xxx xxx xxx',
            Images: [
                { name: 'To modify', img: 'To modify' },    
                { name: 'To modify', img: 'To modify' },    
            ],
            features: [ 'To Modify', 'To Modify'],
        },
    };
window.EstateData = EstateData;

// Search functionality
   /* function searchRestaurants() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const restaurantCards = document.querySelectorAll('.restaurant-card');
        const searchResults = document.getElementById('searchResults');
        const searchResultsList = document.getElementById('searchResultsList');
        const searchResultsText = document.getElementById('searchResultsText');
        const mainList = document.getElementById('restaurantList');

        if (searchTerm === '') {
            searchResults.style.display = 'none';
            mainList.style.display = 'grid';
            return;
        }

        let matchingCards = [];
        
        restaurantCards.forEach(card => {
            const name = card.dataset.name.toLowerCase();
            const cuisine = card.dataset.cuisine.toLowerCase();
            const category = card.dataset.category.toLowerCase();
            
            if (name.includes(searchTerm) || cuisine.includes(searchTerm) || category.includes(searchTerm)) {
                matchingCards.push(card.cloneNode(true));
            }
        });

        // Display search results
        mainList.style.display = 'none';
        searchResults.style.display = 'block';
        
        if (matchingCards.length > 0) {
            searchResultsText.textContent = `Found ${matchingCards.length} restaurant(s) matching "${searchTerm}"`;
            searchResultsList.innerHTML = '';
            matchingCards.forEach(card => {
                searchResultsList.appendChild(card);
            });
            // Re-attach event listeners to cloned cards
            attachCardEventListeners();
        } else {
            searchResultsText.textContent = `No restaurants found matching "${searchTerm}"`;
            searchResultsList.innerHTML = '<div class="no-results"><i class="fas fa-search" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i><h3>No Results Found</h3><p>Try searching for different keywords like "local", "fast food", or restaurant names.</p></div>';
        }
    }*/
 /* // Filter functionality
    function filterRestaurants(category) {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const restaurantCards = document.querySelectorAll('.restaurant-card');
        const searchResults = document.getElementById('searchResults');
        const mainList = document.getElementById('restaurantList');

        // Hide search results and show main list
        searchResults.style.display = 'none';
        mainList.style.display = 'grid';
        document.getElementById('searchInput').value = '';

        // Update active filter button
        filterBtns.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Filter cards with animation
        restaurantCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            
            if (category === 'all' || card.dataset.category.includes(category)) {
                card.classList.remove('hidden');
                card.classList.add('visible');
                setTimeout(() => {
                    card.style.display = 'block';
                }, 50);
            } else {
                card.classList.add('hidden');
                card.classList.remove('visible');
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
    }
 */
