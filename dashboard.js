// document.getElementById("upload-btn").addEventListener("click", function () {
//     let fileInput = document.getElementById("resume-upload");
//     let file = fileInput.files[0];

//     if (!file) {
//         alert("❌ No file selected!");
//         return;
//     }

//     let formData = new FormData();
//     formData.append("file", file);

//     // Assume the user is logged in and we have their email stored (hardcoded for now)
//     let userEmail = "test@example.com"; // Replace this with actual logged-in user email
//     formData.append("email", userEmail);

//     fetch("http://127.0.0.1:5000/api/upload/resume", {
//         method: "POST",
//         body: formData
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.error) {
//             alert("❌ Upload Failed: " + data.error);
//         } else {
//             alert("✅ Resume uploaded successfully!");
//             document.getElementById("upload-status").innerText = "Uploaded: " + file.name;
//         }
//     })
//     .catch(error => console.error("🚨 Upload Error:", error));
// });
// document.addEventListener("DOMContentLoaded", function () {
//     // Existing resume upload functionality
//     document.getElementById("upload-btn")?.addEventListener("click", function () {
//         let fileInput = document.getElementById("resume-upload");
//         let file = fileInput.files[0];

//         if (!file) {
//             alert("❌ No file selected!");
//             return;
//         }

//         let formData = new FormData();
//         formData.append("file", file);

//         // Assume the user is logged in and we have their email stored
//         let userEmail = localStorage.getItem('userEmail') || 'test@example.com';
//         formData.append("email", userEmail);

//         fetch("http://127.0.0.1:5000/api/upload/resume", {
//             method: "POST",
//             body: formData
//         })
//         .then(response => response.json())
//         .then(data => {
//             if (data.error) {
//                 alert("❌ Upload Failed: " + data.error);
//             } else {
//                 alert("✅ Resume uploaded successfully!");
//                 document.getElementById("upload-status").innerText = "Uploaded: " + file.name;
//             }
//         })
//         .catch(error => console.error("🚨 Upload Error:", error));
//     });

    

//     document.addEventListener("DOMContentLoaded", function () {
//         const storedFirstName = localStorage.getItem('userFirstName');
//         const storedLastName = localStorage.getItem('userLastName');
    
//         if (storedFirstName) {
//             const profileSpan = document.getElementById('sidebar-username'); // ✅ changed this line
//             if (profileSpan) {
//                 const displayName = storedLastName 
//                     ? `${storedFirstName} ${storedLastName.charAt(0)}.` 
//                     : storedFirstName;
//                 profileSpan.textContent = displayName;
//             }
//         }
//     });
    

//     // Existing logout functionality with enhanced clearing
//     document.querySelector('.logout-btn')?.addEventListener('click', function(e) {
//         e.preventDefault();
//         localStorage.removeItem('userFirstName');
//         localStorage.removeItem('userLastName');
//         localStorage.removeItem('token');
//         localStorage.removeItem('userEmail');
//         window.location.href = "login.html";
//     });

//     // Existing theme toggle functionality (if any)
//     document.querySelector('.toggle-theme')?.addEventListener('click', function() {
//         document.body.classList.toggle('dark-mode');
//         // Add any additional theme toggle logic here
//     });
// });
// // document.addEventListener("DOMContentLoaded", function () {
    
// //     const userEmail = localStorage.getItem('userEmail');
// //     if (!userEmail) {
// //         window.location.href = "login.html";
// //         return;



// //     // Resume upload functionality
// //     document.getElementById("upload-btn")?.addEventListener("click", function () {
// //         let fileInput = document.getElementById("resume-upload");
// //         let file = fileInput.files[0];

// //         if (!file) {
// //             alert("❌ No file selected!");
// //             return;
// //         }

// //         let formData = new FormData();
// //         formData.append("file", file);
// //         formData.append("email", userEmail);

// //         fetch("http://127.0.0.1:5000/api/upload/resume", {
// //             method: "POST",
// //             body: formData
// //         })
// //         .then(response => response.json())
// //         .then(data => {
// //             if (data.error) {
// //                 alert("❌ Upload Failed: " + data.error);
// //             } else {
// //                 alert("✅ Resume uploaded successfully!");
// //                 document.getElementById("upload-status").innerText = "Uploaded: " + file.name;
// //             }
// //         })
// //         .catch(error => console.error("🚨 Upload Error:", error));
// //     });

// //     // Display username
// //     const storedFirstName = localStorage.getItem('userFirstName');
// //     const storedLastName = localStorage.getItem('userLastName');
    
// //     if (storedFirstName) {
// //         const profileSpan = document.querySelector('.sidebar .profile span');
// //         if (profileSpan) {
// //             const displayName = storedLastName 
// //                 ? `${storedFirstName} ${storedLastName.charAt(0)}.` 
// //                 : storedFirstName;
// //             profileSpan.textContent = displayName;
// //         }
// //     }

// //     // Logout functionality
// //     document.querySelector('.logout-btn')?.addEventListener('click', function(e) {
// //         e.preventDefault();
// //         localStorage.removeItem('user');
// //         localStorage.removeItem('userFirstName');
// //         localStorage.removeItem('userLastName');
// //         localStorage.removeItem('userEmail');
// //         localStorage.removeItem('token');
// //         window.location.href = "login.html";
// //     });

// //     // Theme toggle functionality
// //     document.querySelector('.toggle-theme')?.addEventListener('click', function() {
// //         document.body.classList.toggle('dark-mode');
// //     });
// // });

document.addEventListener("DOMContentLoaded", function () {
    // ✅ Update username in sidebar
    const storedFirstName = localStorage.getItem('userFirstName');
    const storedLastName = localStorage.getItem('userLastName');

    if (storedFirstName) {
        const profileSpan = document.getElementById('sidebar-username'); // use ID directly
        if (profileSpan) {
            const displayName = storedLastName 
                ? `${storedFirstName} ${storedLastName.charAt(0)}.` 
                : storedFirstName;
            profileSpan.textContent = displayName;
        }
    }

    // ✅ Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (e) {
            e.preventDefault();
            localStorage.removeItem('userFirstName');
            localStorage.removeItem('userLastName');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('token');
            window.location.href = "login.html";
        });
    }

    // ✅ Theme toggle
    const themeBtn = document.querySelector('.toggle-theme');
    if (themeBtn) {
        themeBtn.addEventListener("click", function () {
            document.body.classList.toggle('dark-mode');
        });
    }

    // ✅ Resume upload (if this section is visible)
    const uploadBtn = document.getElementById("upload-btn");
    if (uploadBtn) {
        uploadBtn.addEventListener("click", function () {
            let fileInput = document.getElementById("resume-upload");
            let file = fileInput?.files[0];

            if (!file) {
                alert("❌ No file selected!");
                return;
            }

            let formData = new FormData();
            formData.append("file", file);

            let userEmail = localStorage.getItem('userEmail') || 'test@example.com';
            formData.append("email", userEmail);

            fetch("http://127.0.0.1:5000/api/upload/resume", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert("❌ Upload Failed: " + data.error);
                } else {
                    alert("✅ Resume uploaded successfully!");
                    document.getElementById("upload-status").innerText = "Uploaded: " + file.name;
                }
            })
            .catch(error => console.error("🚨 Upload Error:", error));
        });
    }
});
