// Webcam Activation
const webcam = document.getElementById('webcam');
const startWebcam = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcam.srcObject = stream;
    } catch (err) {
        console.error("Error accessing webcam: ", err);
    }
};

// Start Voice Recognition
const startVoiceBtn = document.getElementById('start-voice');
const speechText = document.getElementById('speech-text');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.lang = 'en-US';

startVoiceBtn.addEventListener('click', () => {
    recognition.start();
});

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    speechText.textContent = transcript;
};

recognition.onerror = (event) => {
    speechText.textContent = "Error: " + event.error;
};

// Initialize Webcam on Page Load
window.onload = () => {
    startWebcam();
};