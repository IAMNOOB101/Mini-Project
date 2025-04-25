document.addEventListener("DOMContentLoaded", async () => {
    // DOM Elements
    const video = document.getElementById("video");
    const alertMessage = document.getElementById("alert-message");
    const questionText = document.getElementById("question-text");
    const answerField = document.getElementById("answer");
    const submitBtn = document.getElementById("submit-answer");
    const nextBtn = document.getElementById("next-question");
    const toggleCameraBtn = document.getElementById("toggle-camera");
    const feedbackContainer = document.getElementById("feedback-container");
    const feedbackContent = document.getElementById("feedback-content");

    // State
    let questions = [];
    let currentQuestionIndex = 0;
    let stream = null;
    let faceDetectionModel = null;
    let detectionInterval = null;
    
    const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
    const selectedRole = localStorage.getItem("selectedRole") || "developer";
    const interviewType = localStorage.getItem("interviewType") || "technical";

    // Initialize application
    async function initializeApp() {
        try {
            await fetchQuestions();
            initCamera().catch(error => {
                console.error("Camera initialization error:", error);
                alertMessage.textContent = "Camera access denied. Interview will continue without monitoring.";
                alertMessage.style.display = "block";
            });
        } catch (error) {
            console.error("Initialization error:", error);
            questions = getFallbackQuestions();
            showCurrentQuestion();
        }
    }

    // Initialize camera
    async function initCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                },
                audio: false
            });
            
            video.srcObject = stream;
            video.play();
            
            // Load face detection model
            faceDetectionModel = await blazeface.load();
            startFaceDetection();
            
            toggleCameraBtn.textContent = "Disable Camera";
            toggleCameraBtn.classList.remove("btn-primary");
            toggleCameraBtn.classList.add("btn-danger");
            
        } catch (error) {
            console.error("Camera initialization failed:", error);
            alertMessage.textContent = "Camera access denied. Interview will continue without monitoring.";
            alertMessage.style.display = "block";
            throw error;
        }
    }

    // Face detection
    function startFaceDetection() {
        detectionInterval = setInterval(async () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                const predictions = await faceDetectionModel.estimateFaces(video, false);
                
                if (predictions.length > 0) {
                    const face = predictions[0];
                    const nose = face.landmarks[2];
                    const videoRect = video.getBoundingClientRect();
                    const centerX = videoRect.width / 2;
                    const centerY = videoRect.height / 2;
                    const threshold = 0.25;
                    
                    if (Math.abs(nose[0] - centerX) > centerX * threshold || 
                        Math.abs(nose[1] - centerY) > centerY * threshold) {
                        alertMessage.style.display = "block";
                        logFocusStatus("user_looking_away");
                    } else {
                        alertMessage.style.display = "none";
                        logFocusStatus("user_focused");
                    }
                } else {
                    alertMessage.style.display = "block";
                    logFocusStatus("no_face_detected");
                }
            }
        }, 1000);
    }

    async function logFocusStatus(status) {
        try {
            await fetch("http://localhost:5000/api/monitor_face", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: userEmail,
                    status: status,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error("Failed to log focus status:", error);
        }
    }

    // Toggle camera
    toggleCameraBtn.addEventListener("click", () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            stream = null;
            clearInterval(detectionInterval);
            toggleCameraBtn.textContent = "Enable Camera";
            toggleCameraBtn.classList.remove("btn-danger");
            toggleCameraBtn.classList.add("btn-primary");
            alertMessage.style.display = "none";
        } else {
            initCamera();
        }
    });

    // Load questions with enhanced error handling
    // async function fetchQuestions() {
    //     try {
    //         questionText.textContent = "Loading questions...";
    //         const response = await fetch(`http://localhost:5000/api/questions?role=${selectedRole}&type=${interviewType}`);
            
    //         if (!response.ok) throw new Error(`Server returned ${response.status}`);
            
    //         const data = await response.json();
    //         if (data.questions && data.questions.length > 0) {
    //             questions = data.questions;
    //             showCurrentQuestion();
    //         } else {
    //             throw new Error("No questions available for this role/type");
    //         }
    //     } catch (error) {
    //         console.error("Error loading questions:", error);
    //         questions = getFallbackQuestions();
    //         showCurrentQuestion();
    //     }
    // }
    async function fetchQuestions() {
        try {
            questionText.textContent = "Loading questions...";
            const response = await fetch(`http://localhost:5000/api/questions?role=${selectedRole}&type=${interviewType}`);
            
            if (!response.ok) throw new Error(`Server returned ${response.status}`);
            
            const data = await response.json();
            if (data.questions && data.questions.length > 0) {
                questions = data.questions;
                // Store the questions with correct answers in localStorage
                localStorage.setItem("interviewQuestions", JSON.stringify(questions));
                showCurrentQuestion();
            } else {
                throw new Error("No questions available for this role/type");
            }
        } catch (error) {
            console.error("Error loading questions:", error);
            questions = getFallbackQuestions();
            // Store fallback questions if API fails
            localStorage.setItem("interviewQuestions", JSON.stringify(questions));
            showCurrentQuestion();
        }
    }
    function getFallbackQuestions() {
        return [
            {
                id: "q1",
                question: "Describe your work ethic in three words.",
                correct_answer: "Flexible hardworking and confident",
                keywords: ["flexible", "hardworking", "confident"]
            },
            {
                id: "q2",
                question: "What is your greatest strength?",
                correct_answer: "One of my biggest strengths is my problem-solving ability. Whenever I face a challenge, I analyze the situation carefully and find an efficient solution. For example, in my recent project, I encountered a database connectivity issue. I systematically debugged the problem, identified a misconfiguration in the connection string, and fixed it, ensuring smooth application functionality. This ability to troubleshoot and resolve issues quickly helps me contribute effectively to any team I work with.",
                keywords: ["problem-solving", "strength", "example"]
            },
            {
                id: "q3",
                question: "Question 3 text here",
                correct_answer: "Correct Answer 3",
                keywords: ["keyword1", "keyword2"]
            }
        ];
    }

    function showCurrentQuestion() {
        if (currentQuestionIndex < questions.length) {
            questionText.textContent = questions[currentQuestionIndex].question;
            answerField.value = "";
            hideFeedback();
        } else {
            questionText.textContent = "Interview completed!";
            answerField.disabled = true;
            submitBtn.disabled = true;
        }
    }

    function showFeedback(evaluation) {
        const scorePercent = Math.round(evaluation.score * 100);
        let scoreClass = "score-medium";
        
        if (scorePercent >= 80) scoreClass = "score-high";
        else if (scorePercent <= 40) scoreClass = "score-low";
        
        feedbackContent.innerHTML = `
            <div class="feedback-score ${scoreClass}">Score: ${scorePercent}%</div>
            <p class="feedback-message">${evaluation.feedback}</p>
            <div class="feedback-suggestion">
                <strong>Suggestion:</strong> ${evaluation.suggestion}
            </div>
            ${evaluation.matched_keywords && evaluation.matched_keywords.length > 0 ? 
                `<p><strong>Matched Keywords:</strong> ${evaluation.matched_keywords.join(', ')}</p>` : ''}
        `;
        
        feedbackContainer.style.display = "block";
    }

    function hideFeedback() {
        feedbackContainer.style.display = "none";
    }

    // Submit answer and store feedback
    submitBtn.addEventListener("click", async () => {
        const answer = answerField.value.trim();
        
        if (!answer) {
            alert("Please enter an answer before submitting.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            // Store answer with question ID (q1, q2, q3 format)
            let answers = JSON.parse(localStorage.getItem("interviewAnswers")) || {};
            const questionId = questions[currentQuestionIndex].id || `q${currentQuestionIndex+1}`;
            answers[questionId] = answer;
            localStorage.setItem("interviewAnswers", JSON.stringify(answers));

            const response = await fetch("http://localhost:5000/api/submit_answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: userEmail,
                    question: questions[currentQuestionIndex].question,
                    answer: answer,
                    role: selectedRole
                })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);

            showFeedback(result.evaluation);

        } catch (error) {
            console.error("Submission error:", error);
            alert("Failed to submit answer. Please try again.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Answer";
        }
    });

    // Next question handler with redirection
    nextBtn.addEventListener("click", () => {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            showCurrentQuestion();
        } else {
            alert("Congratulations! You've completed all questions.");
            setTimeout(() => {
                window.location.href = "interview_complete.html";
            }, 1500);
        }
    });

    initializeApp();
    

// 🔊 Ask Question - Text-to-Speech
document.getElementById("ask-question-btn").addEventListener("click", () => {
    const question = questions[currentQuestionIndex]?.question || "";
    if (!question) return;

    const utterance = new SpeechSynthesisUtterance(question);
    utterance.lang = "en-US";
    utterance.pitch = 1;
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
});

let recognition;
let recognizing = false;

document.getElementById("speak-answer-btn").addEventListener("click", () => {
    if (recognizing) {
        recognition.stop(); // stop previous if still running
        return;
    }

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    recognizing = true;

    recognition.onstart = () => {
        console.log("🎤 Voice recognition started.");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        answerField.value = transcript;
        console.log("✅ Transcript:", transcript);
    };

    recognition.onerror = (event) => {
        console.error("❌ Speech recognition error:", event);
        alert("Speech recognition failed: " + event.error);
        recognizing = false;
    };

    recognition.onend = () => {
        console.log("🎤 Voice recognition ended.");
        recognizing = false;
    };
});





    window.addEventListener("beforeunload", () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (detectionInterval) {
            clearInterval(detectionInterval);
        }
    });
});