
document.getElementById("resume-upload").addEventListener("change", function () {
    alert("✅ Resume uploaded successfully!");
});

// Dark Mode Toggle
document.querySelector(".toggle-theme").addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");
    
    // Change icon between 🌙 and ☀️
    if (document.body.classList.contains("dark-mode")) {
        this.textContent = "☀️";
    } else {
        this.textContent = "🌙";
    }
});

// Sidebar Active State
const menuItems = document.querySelectorAll(".sidebar ul li");
menuItems.forEach(item => {
    item.addEventListener("click", function () {
        menuItems.forEach(i => i.classList.remove("active"));
        this.classList.add("active");
    });
});
console.dir(docement);