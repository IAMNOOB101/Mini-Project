document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("document-form");
    const sidebarUsername = document.getElementById("sidebar-username");
    const navbarUsername = document.getElementById("navbar-username");

    // Get userEmail from localStorage - no fallback to test email
    const userEmail = localStorage.getItem('userEmail');
    
    if (!userEmail) {
        window.location.href = "login.html";
        return;
    }

    // Try to load existing user data
    loadUserData(userEmail);

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = {
            first_name: document.getElementById("first_name").value.trim(),
            last_name: document.getElementById("last_name").value.trim(),
            email: userEmail,
            education: document.getElementById("education").value.trim(),
            skills: document.getElementById("skills").value.trim().split(',').map(skill => skill.trim()),
            work_place: document.getElementById("work_place").value.trim(),
            hobbies: document.getElementById("hobbies").value.trim().split(',').map(hobby => hobby.trim()),
            git_id: document.getElementById("git_id").value.trim(),
            linkedin_id: document.getElementById("linkedin_id").value.trim()
        };

        try {
            const response = await fetch("http://127.0.0.1:5000/api/document/upload", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to save profile");
            }

            // Update all user data storage locations
            localStorage.setItem('userFirstName', formData.first_name);
            localStorage.setItem('userLastName', formData.last_name || '');
            
            // Also update the full user object if it exists
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.first_name = formData.first_name;
            user.last_name = formData.last_name;
            localStorage.setItem('user', JSON.stringify(user));

            updateUserDisplay(formData.first_name);
            alert("Profile saved successfully!");
            
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Error: " + error.message);
        }
    });

    async function loadUserData(email) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/user?email=${encodeURIComponent(email)}`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error("Failed to load user data");
            }
            
            const userData = await response.json();
            
            if (userData) {
                document.getElementById("first_name").value = userData.first_name || '';
                document.getElementById("last_name").value = userData.last_name || '';
                document.getElementById("education").value = userData.education || '';
                document.getElementById("skills").value = userData.skills?.join(', ') || '';
                document.getElementById("work_place").value = userData.work_place || '';
                document.getElementById("hobbies").value = userData.hobbies?.join(', ') || '';
                document.getElementById("git_id").value = userData.git_id || '';
                document.getElementById("linkedin_id").value = userData.linkedin_id || '';
                
                updateUserDisplay(userData.first_name);
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    }

    function updateUserDisplay(firstName) {
        if (firstName) {
            if (sidebarUsername) sidebarUsername.textContent = firstName;
            if (navbarUsername) navbarUsername.textContent = firstName;
        }
    }

    // Initialize with stored name if available
    const storedFirstName = localStorage.getItem('userFirstName');
    if (storedFirstName) {
        updateUserDisplay(storedFirstName);
    }

    // Logout function
    document.querySelector('.logout-btn')?.addEventListener('click', function(e) {
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