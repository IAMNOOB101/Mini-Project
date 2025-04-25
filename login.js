// document.querySelector(".login-btn").addEventListener("click", function (e) {
//     e.preventDefault();

//     let email = document.getElementById("email").value;
//     let password = document.getElementById("password").value;

//     fetch("http://127.0.0.1:5000/api/login", {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({ email: email, password: password })
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.error) {
//             alert("Login failed: " + data.error);
//         } else {
//             alert("Login successful! Redirecting...");
//             localStorage.setItem("user", JSON.stringify(data.user)); // Store user session
//             window.location.href = "dashboard.html"; // Redirect to dashboard
//         }
//     })
//     .catch(error => console.error("Error:", error));
// });
document.addEventListener("DOMContentLoaded", function() {
    // Clear any existing user data when login page loads
    localStorage.removeItem('user');
    localStorage.removeItem('userFirstName');
    localStorage.removeItem('userLastName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('token');

    document.querySelector(".login-btn")?.addEventListener("click", function (e) {
        e.preventDefault();

        let email = document.getElementById("email").value.trim().toLowerCase();
        let password = document.getElementById("password").value;

        if (!email || !password) {
            alert("Please enter both email and password");
            return;
        }

        fetch("http://127.0.0.1:5000/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: email, password: password })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || "Login failed"); });
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                alert("Login failed: " + data.error);
            } else {
                // Store user data in the format expected by other components
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userFirstName', data.user.first_name);
                localStorage.setItem('userLastName', data.user.last_name || '');
                localStorage.setItem('token', data.token || ''); // If using JWT
                
                // Also maintain the original 'user' object for backwards compatibility
                localStorage.setItem('user', JSON.stringify(data.user));
                
                alert("Login successful! Redirecting...");
                window.location.href = "dashboard.html";
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Login failed: " + error.message);
        });
    });
});