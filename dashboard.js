 // Dashboard JavaScript
 document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.dashboard-container')) {
        const dashboard = new StudentDashboard();
    }
});
        class StudentDashboard {
            constructor() {
                this.currentUser = this.getCurrentUser();
                this.reservations = this.getReservations();
                this.favorites = this.getFavorites();
                this.init();
            }

            init() {
                this.loadUserData();
                this.loadDashboardData();
                this.setupEventListeners();
            }

            loadUserData() {
                document.getElementById('userName').textContent = this.currentUser.name;
                document.getElementById('welcomeName').textContent = this.currentUser.name.split(' ')[0];
                document.getElementById('userAvatar').textContent = this.getInitials(this.currentUser.name);
                
                // Load profile form
                if (document.getElementById('profileName')) {
                    document.getElementById('profileName').value = this.currentUser.name;
                    document.getElementById('profileEmail').value = this.currentUser.email;
                    document.getElementById('profilePhone').value = this.currentUser.phone || '+237 XXX XXX XXX';
                    document.getElementById('profileStudentId').value = this.currentUser.studentId || '';
                    document.getElementById('profileDepartment').value = this.currentUser.department || '';
                }
            }

            getInitials(name) {
                return name.split(' ').map(n => n[0]).join('').toUpperCase();
            }

            loadDashboardData() {
                // Update stats
                document.getElementById('activeReservations').textContent = this.reservations.filter(r => r.status === 'confirmed').length;
                document.getElementById('favoriteCount').textContent = this.favorites.length;
                document.getElementById('reviewCount').textContent = '3'; // Placeholder
                
                // Load notifications count
                document.getElementById('notificationCount').textContent = '3';
            }

            setupEventListeners() {
                // Mobile sidebar toggle
                window.addEventListener('resize', () => {
                    if (window.innerWidth > 768) {
                        document.getElementById('sidebar').classList.remove('visible');
                    }
                });
            }

            showToast(message, type = 'info') {
                const toastContainer = document.getElementById('toastContainer');
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                
                const icon = type === 'success' ? 'fas fa-check-circle' :
                            type === 'error' ? 'fas fa-exclamation-circle' :
                            'fas fa-info-circle';
                
                toast.innerHTML = `
                    <i class="${icon}"></i>
                    <span>${message}</span>
                    <button class="toast-close" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                toastContainer.appendChild(toast);
                
                setTimeout(() => toast.classList.add('show'), 10);
                setTimeout(() => {
                    if (toast.parentElement) {
                        toast.remove();
                    }
                }, 4000);
            }
        }

        // Initialize dashboard
        const dashboard = new StudentDashboard();

        // Navigation functions
        function showSection(sectionName) {
            // Hide all sections
            document.querySelectorAll('.dashboard-section').forEach(section => {
                section.style.display = 'none';
            });
            
            // Show selected section
            document.getElementById(sectionName + 'Section').style.display = 'block';
            
            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('visible');
            } else {
                sidebar.classList.toggle('hidden');
                mainContent.classList.toggle('expanded');
            }
        }

        function showNotifications() {
            dashboard.showToast('You have 3 new notifications', 'info');
        }

        function updateProfile(event) {
            event.preventDefault();
            dashboard.showToast('Profile updated successfully!', 'success');
        }

        function changePassword() {
            dashboard.showToast('Password change feature coming soon!', 'info');
        }

        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('eyangEstate_currentUser');
                sessionStorage.removeItem('eyangEstate_currentUser');
                window.location.href = 'auth.html';
            }
        }

      
        document.head.appendChild(additionalStyles);