document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault(); // Prevents form submission (so the page doesn't refresh)
    
    // Redirect to dashboard.html
    window.location.href = "dashboard.html";
});