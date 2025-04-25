// async function sendOTP() {
//     let email = document.getElementById("email").value.trim();
//     let messageBox = document.getElementById("message");

//     if (!email) {
//         messageBox.innerHTML = "⚠️ Please enter a valid email.";
//         return;
//     }

//     try {
//         // Show loading state
//         const sendButton = document.querySelector(".send-button");
//         sendButton.innerHTML = "Sending...";
//         sendButton.disabled = true;

//         let response = await fetch("http://127.0.0.1:5000/api/forgot_password", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ email: email })
//         });

//         let data = await response.json();

//         if (response.ok) {
//             messageBox.style.color = "green";
//             messageBox.innerHTML = "✅ OTP sent successfully!";
//             setTimeout(() => {
//                 window.location.href = `otp.html?email=${encodeURIComponent(email)}`;
//             }, 1000);
//         } else {
//             messageBox.style.color = "red";
//             messageBox.innerHTML = `🚨 ${data.error}`;
//         }
//     } catch (error) {
//         messageBox.style.color = "red";
//         messageBox.innerHTML = "🚨 Error sending OTP. Please try again.";
//     } finally {
//         // Reset button state
//         const sendButton = document.querySelector(".send-button");
//         sendButton.innerHTML = "Send Code";
//         sendButton.disabled = false;
//     }
// }
// document.getElementById("send-otp-btn").addEventListener("click", async function(e) {
//     e.preventDefault();
//     const email = document.getElementById("email").value.trim();
//     const sendBtn = document.getElementById("send-otp-btn");
    
//     if (!email) {
//         alert("Please enter a valid email");
//         return;
//     }

//     try {
//         // Show loading state
//         sendBtn.disabled = true;
//         sendBtn.textContent = "Sending OTP...";
        
//         // Send request to generate OTP
//         const response = await fetch("http://127.0.0.1:5000/api/forgot_password", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ email: email })
//         });

//         const data = await response.json();

//         if (response.ok) {
//             // For development - show OTP (remove in production)
//             alert(`OTP sent: ${data.otp}`);
            
//             // Redirect to OTP page
//             window.location.href = `otp.html?email=${encodeURIComponent(email)}`;
//         } else {
//             throw new Error(data.error || "Failed to send OTP");
//         }
//     } catch (error) {
//         alert(error.message);
//     } finally {
//         sendBtn.disabled = false;
//         sendBtn.textContent = "Send OTP";
//     }
// });
async function sendOTP() {
    const email = document.getElementById("email").value.trim();
    const messageBox = document.getElementById("message");
    const sendBtn = document.getElementById("send-otp-btn");

    if (!email) {
        messageBox.style.color = "red";
        messageBox.innerHTML = "⚠️ Please enter a valid email.";
        return;
    }

    try {
        // Show loading state
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";
        
        const response = await fetch("http://127.0.0.1:5000/api/forgot_password", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();

        if (response.ok) {
            messageBox.style.color = "green";
            messageBox.innerHTML = "✅ OTP sent successfully!";
            
            // For development - show OTP in console (remove in production)
            console.log(`OTP sent: ${data.otp}`);
            
            // Redirect to OTP page after a short delay
            setTimeout(() => {
                window.location.href = `otp.html?email=${encodeURIComponent(email)}`;
            }, 1000);
        } else {
            messageBox.style.color = "red";
            messageBox.innerHTML = `🚨 ${data.error || "Failed to send OTP"}`;
        }
    } catch (error) {
        messageBox.style.color = "red";
        messageBox.innerHTML = "🚨 Error sending OTP. Please try again.";
        console.error("Error:", error);
    } finally {
        // Reset button state
        sendBtn.disabled = false;
        sendBtn.textContent = "Send Code";
    }
}

// Add event listener to the button
document.getElementById("send-otp-btn").addEventListener("click", sendOTP);