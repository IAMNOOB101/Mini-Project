document.addEventListener("DOMContentLoaded", function() {
    // Set report date
    document.getElementById('report-date').textContent = new Date().toLocaleDateString();
    
    // Load user data and performance data
    loadUserData();
    loadPerformanceData();
    
    // Setup download button
    document.getElementById('download-btn').addEventListener('click', generatePDF);
});

function loadUserData() {
    try {
        const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
        document.getElementById('user-email').textContent = userEmail;
        
        // In a real app, you would fetch this from your backend
        const userData = JSON.parse(localStorage.getItem("userData")) || {
            firstName: "guest",
            lastName: "user",
            skills: ["JavaScript", "Python"],
            education: "Computer Science",
            experience: "3 years"
        };
        
        document.getElementById('user-name').textContent = `${userData.firstName} ${userData.lastName}`;
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

function loadPerformanceData() {
    try {
        // Try to load from localStorage first
        const performanceData = JSON.parse(localStorage.getItem("performanceData")) || {
            correct: 3,
            total: 5,
            percentage: 60,
            focusPercentage: 75,
            questions: [
                {
                    question: "Describe your work ethic in three words.",
                    answer: "Hardworking, dedicated, flexible",
                    correct: true,
                    score: 100
                },
                {
                    question: "What is your greatest strength?",
                    answer: "Problem solving skills",
                    correct: false,
                    score: 65
                }
            ],
            improvements: [
                {
                    area: "Technical Questions",
                    score: 65,
                    suggestion: "Review data structures and algorithms"
                },
                {
                    area: "Behavioral Questions",
                    score: 75,
                    suggestion: "Practice STAR method for answering"
                }
            ]
        };

        // Update performance summary
        document.getElementById('overall-score').textContent = `${performanceData.percentage}%`;
        document.getElementById('questions-answered').textContent = `${performanceData.correct}/${performanceData.total}`;
        document.getElementById('focus-percentage').textContent = `${performanceData.focusPercentage}%`;
        document.getElementById('focus-percentage-detail').textContent = `${performanceData.focusPercentage}%`;
        
        // Calculate focus time (mock data)
        const totalTime = 30; // minutes
        const focusedTime = Math.round(totalTime * performanceData.focusPercentage / 100);
        document.getElementById('focused-time').textContent = `${focusedTime} min`;
        document.getElementById('distracted-time').textContent = `${totalTime - focusedTime} min`;

        // Populate question analysis
        const questionTable = document.getElementById('question-analysis');
        performanceData.questions.forEach(q => {
            const row = questionTable.insertRow();
            row.insertCell(0).textContent = q.question;
            row.insertCell(1).textContent = q.answer;
            row.insertCell(2).innerHTML = q.correct ? '✅ Correct' : '❌ Incorrect';
            row.insertCell(3).textContent = `${q.score}%`;
        });

        // Populate improvement areas
        const improvementTable = document.getElementById('improvement-areas');
        performanceData.improvements.forEach(imp => {
            const row = improvementTable.insertRow();
            row.insertCell(0).textContent = imp.area;
            row.insertCell(1).textContent = `${imp.score}%`;
            row.insertCell(2).textContent = imp.suggestion;
        });

    } catch (error) {
        console.error("Error loading performance data:", error);
        alert("Failed to load report data. Please try again.");
    }
}

function generatePDF() {
    const element = document.getElementById('report-content');
    const opt = {
        margin: 10,
        filename: 'interview_report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Show loading state
    const btn = document.getElementById('download-btn');
    btn.disabled = true;
    btn.textContent = 'Generating PDF...';

    // Generate PDF
    html2pdf().from(element).set(opt).save().then(() => {
        btn.disabled = false;
        btn.textContent = 'Download Report as PDF';
    });
}