// user-display.js - This will be included in all pages
document.addEventListener("DOMContentLoaded", function() {
    // Update username in sidebar and navbar
    function updateUserDisplay() {
        const storedFirstName = localStorage.getItem('userFirstName');
        const storedLastName = localStorage.getItem('userLastName');
        
        // Update sidebar username
        const sidebarSpans = document.querySelectorAll('.sidebar .profile span');
        sidebarSpans.forEach(span => {
            if (storedFirstName) {
                span.textContent = storedLastName 
                    ? `${storedFirstName} ${storedLastName.charAt(0)}.` 
                    : storedFirstName;
            }
        });
        
        // Update navbar username if exists
        const navbarUsername = document.getElementById('navbar-username');
        if (navbarUsername && storedFirstName) {
            navbarUsername.textContent = storedFirstName;
        }
    }

    // Initialize user display
    updateUserDisplay();

    // Add logout functionality
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear all user-related data
            localStorage.removeItem('user');
            localStorage.removeItem('userFirstName');
            localStorage.removeItem('userLastName');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('token');
            window.location.href = "login.html";
        });
    });

    // Add theme toggle functionality if element exists
    const themeToggle = document.querySelector('.toggle-theme');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
        });
    }
});