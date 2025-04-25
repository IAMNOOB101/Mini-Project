document.addEventListener("DOMContentLoaded", function() {
    // Get email from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    document.getElementById("email").value = email;

    // Auto-focus first OTP digit
    document.getElementById("digit1").focus();

    // Auto-tab between OTP inputs
    const otpInputs = document.querySelectorAll('.otp-inputs input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });

    // Verify OTP
    document.getElementById("otpForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const verifyBtn = document.getElementById("verify-btn");
        const messageBox = document.getElementById("message");

        // Get OTP from inputs
        const otp = Array.from(otpInputs).map(input => input.value).join('');

        if (otp.length !== 4) {
            showMessage("Please enter a complete 4-digit OTP", "error");
            return;
        }

        try {
            verifyBtn.disabled = true;
            verifyBtn.textContent = "Verifying...";

            const response = await fetch("http://127.0.0.1:5000/api/verify_otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    otp: otp
                })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage("OTP verified successfully! Redirecting...", "success");
                setTimeout(() => {
                    window.location.href = `reset.html?email=${encodeURIComponent(email)}`;
                }, 1000);
            } else {
                throw new Error(data.error || "OTP verification failed");
            }
        } catch (error) {
            showMessage(error.message, "error");
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = "Verify";
        }
    });

    // Resend OTP
    document.getElementById("resend-btn").addEventListener("click", async function() {
        const resendBtn = this;
        const messageBox = document.getElementById("message");

        try {
            resendBtn.disabled = true;
            resendBtn.textContent = "Sending...";

            const response = await fetch("http://127.0.0.1:5000/api/forgot_password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage("New OTP sent successfully!", "success");
                // Clear OTP inputs
                otpInputs.forEach(input => input.value = '');
                document.getElementById("digit1").focus();
            } else {
                throw new Error(data.error || "Failed to resend OTP");
            }
        } catch (error) {
            showMessage(error.message, "error");
        } finally {
            resendBtn.disabled = false;
            resendBtn.textContent = "Resend OTP";
        }
    });

    function showMessage(message, type) {
        const messageBox = document.getElementById("message");
        messageBox.textContent = message;
        messageBox.className = type;
    }
});