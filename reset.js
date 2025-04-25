// function togglePassword(fieldId, icon) {
//     const field = document.getElementById(fieldId);
//     if (field.type === "password") {
//         field.type = "text";
//         icon.textContent = "🙈";
//     } else {
//         field.type = "password";
//         icon.textContent = "👁️";
//     }
// }

// async function resetPassword() {
//     const newPassword = document.getElementById("newPassword").value;
//     const confirmPassword = document.getElementById("confirmPassword").value;
//     const email = sessionStorage.getItem("resetEmail");

//     if (!email) {
//         alert("Session expired. Please start the password reset process again.");
//         window.location.href = "forgetpassword.html";
//         return;
//     }

//     if (newPassword !== confirmPassword) {
//         alert("Passwords don't match!");
//         return;
//     }

//     if (newPassword.length < 8) {
//         alert("Password must be at least 8 characters long");
//         return;
//     }

//     try {
//         const resetBtn = document.getElementById("reset-btn");
//         resetBtn.disabled = true;
//         resetBtn.textContent = "Processing...";

//         let response = await fetch("http://127.0.0.1:5000/api/reset_password", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ 
//                 email: email,
//                 new_password: newPassword 
//             })
//         });

//         let data = await response.json();

//         if (response.ok) {
//             alert("Password reset successfully!");
//             sessionStorage.removeItem("resetEmail");
//             window.location.href = "login.html";
//         } else {
//             alert(`Error: ${data.error}`);
//         }
//     } catch (error) {
//         alert("Error resetting password. Please try again.");
//     } finally {
//         const resetBtn = document.getElementById("reset-btn");
//         resetBtn.disabled = false;
//         resetBtn.textContent = "Reset password";
//     }
// }
// Add this at the top of reset.js
document.addEventListener("DOMContentLoaded", function() {
    // Try to get email from URL first, then sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    let email = urlParams.get("email");
    
    if (!email) {
        email = sessionStorage.getItem("resetEmail");
    } else {
        // Store in sessionStorage if came from URL
        sessionStorage.setItem("resetEmail", email);
    }
    
    if (!email) {
        alert("Session expired. Please start the password reset process again.");
        window.location.href = "forgetpassword.html";
    }
});

// Rest of your existing reset.js remains the same
function togglePassword(fieldId, icon) {
    const field = document.getElementById(fieldId);
    if (field.type === "password") {
        field.type = "text";
        icon.textContent = "🙈";
    } else {
        field.type = "password";
        icon.textContent = "👁️";
    }
}

async function resetPassword() {
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const email = sessionStorage.getItem("resetEmail");

    if (!email) {
        alert("Session expired. Please start the password reset process again.");
        window.location.href = "forgetpassword.html";
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Passwords don't match!");
        return;
    }

    if (newPassword.length < 8) {
        alert("Password must be at least 8 characters long");
        return;
    }

    try {
        const resetBtn = document.getElementById("reset-btn");
        resetBtn.disabled = true;
        resetBtn.textContent = "Processing...";

        let response = await fetch("http://127.0.0.1:5000/api/reset_password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email: email,
                new_password: newPassword 
            })
        });

        let data = await response.json();

        if (response.ok) {
            alert("Password reset successfully!");
            sessionStorage.removeItem("resetEmail");
            window.location.href = "login.html";
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        alert("Error resetting password. Please try again.");
    } finally {
        const resetBtn = document.getElementById("reset-btn");
        resetBtn.disabled = false;
        resetBtn.textContent = "Reset password";
    }
}