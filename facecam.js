


document.addEventListener("DOMContentLoaded", () => {
    const webcam = document.getElementById("webcam");
    const startInterviewBtn = document.getElementById("start-interview");
    const startVoiceBtn = document.getElementById("start-voice");
    const speechText = document.getElementById("speech-text");
    const micBtn = document.getElementById("mic-btn");
    const cameraBtn = document.getElementById("camera-btn");
    const storedFirstName = localStorage.getItem('userFirstName');
    if (storedFirstName) {
        const usernameElement = document.getElementById('navbar-username');
        if (usernameElement) {
            usernameElement.textContent = storedFirstName;
        }
        const profileNameSpans = document.querySelectorAll('.profile-section .profile-name');
    profileNameSpans.forEach(span => {
        span.textContent = storedFirstName;
    });
    }

    // Track media states
    let micActive = true;
    let cameraActive = true;

    // Initialize webcam
    async function startWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            webcam.srcObject = stream;
            
            // Enable toggle buttons
            if (micBtn) micBtn.disabled = false;
            if (cameraBtn) cameraBtn.disabled = false;
        } catch (err) {
            console.error("Error accessing camera/mic:", err);
            alert("Could not access camera/microphone. Please check permissions.");
        }
    }

    // Toggle microphone
    if (micBtn) {
        micBtn.addEventListener("click", () => {
            if (webcam.srcObject) {
                const audioTracks = webcam.srcObject.getAudioTracks();
                audioTracks.forEach(track => {
                    track.enabled = !track.enabled;
                });
                micActive = !micActive;
                micBtn.style.backgroundColor = micActive ? '#f0f2f5' : '#ff6b6b80';
                micBtn.title = micActive ? 'Mute Microphone' : 'Unmute Microphone';
            }
        });
    }

    // Toggle camera
    if (cameraBtn) {
        cameraBtn.addEventListener("click", () => {
            if (webcam.srcObject) {
                const videoTracks = webcam.srcObject.getVideoTracks();
                videoTracks.forEach(track => {
                    track.enabled = !track.enabled;
                });
                cameraActive = !cameraActive;
                cameraBtn.style.backgroundColor = cameraActive ? '#f0f2f5' : '#ff6b6b80';
                cameraBtn.title = cameraActive ? 'Turn Camera Off' : 'Turn Camera On';
            }
        });
    }

    // Initialize Speech Recognition if available
    if (startVoiceBtn) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = "en-US";
            recognition.interimResults = false;

            startVoiceBtn.addEventListener("click", () => {
                startVoiceBtn.textContent = "Listening...";
                startVoiceBtn.style.background = "linear-gradient(135deg, #ffcc00, #ff9500)";
                recognition.start();
            });

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;
                
                speechText.textContent = transcript;
                startVoiceBtn.textContent = "Start Voice Recognition";
                startVoiceBtn.style.background = "linear-gradient(135deg, #1abc9c, #16a085)";
                
                // Update confidence based on speech recognition confidence
                updateConfidence(confidence * 100);
            };

            recognition.onerror = (event) => {
                speechText.textContent = "Error: " + event.error;
                startVoiceBtn.textContent = "Start Voice Recognition";
                startVoiceBtn.style.background = "linear-gradient(135deg, #1abc9c, #16a085)";
                console.error("Speech Recognition Error:", event.error);
            };
        } else {
            startVoiceBtn.style.display = "none";
        }
    }

    // Confidence level with optional real confidence parameter
    function updateConfidence(realConfidence = null) {
        // Use real confidence if available, otherwise simulate
        const confidenceLevel = realConfidence !== null ? 
            Math.min(100, Math.floor(realConfidence)) : 
            Math.min(100, Math.floor(Math.random() * 100));
        
        const confidenceFill = document.getElementById('confidence-level');
        const feedback = document.getElementById('confidence-feedback');
        
        confidenceFill.style.width = `${confidenceLevel}%`;
        confidenceFill.textContent = `${confidenceLevel}%`;
        
        if (confidenceLevel < 30) {
            feedback.textContent = "Low confidence detected. Try to relax and maintain eye contact.";
            confidenceFill.style.background = "linear-gradient(90deg, #ff6b6b, #ff9500)";
        } else if (confidenceLevel < 70) {
            feedback.textContent = "Moderate confidence. You're doing well! Keep practicing.";
            confidenceFill.style.background = "linear-gradient(90deg, #ff9500, #ffcc00)";
        } else {
            feedback.textContent = "High confidence detected! Excellent interview skills.";
            confidenceFill.style.background = "linear-gradient(90deg, #ffcc00, #1abc9c)";
        }
    }

    // Update confidence periodically (simulation when no speech)
    setInterval(() => {
        if (!speechText.textContent || speechText.textContent === "Your speech will appear here...") {
            updateConfidence();
        }
    }, 5000);
    updateConfidence(); // Initial call

    // Start interview button
    startInterviewBtn.addEventListener("click", () => {
        // Stop webcam stream
        if (webcam.srcObject) {
            webcam.srcObject.getTracks().forEach(track => track.stop());
        }
        // Redirect to interview questions
        window.location.href = "interview_questions.html";
    });

    // Start webcam on load
    startWebcam();
});