

// // // document.addEventListener("DOMContentLoaded", function () {
// // //     // Set user email
// // //     const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
// // //     document.getElementById("user-email").textContent = userEmail;

// // //     // Initialize Charts
// // //     initCharts();

// // //     // Load performance data
// // //     loadPerformanceData();

// // //     // Setup sidebar navigation
// // //     setupSidebar();

// // //     // Load and display feedback
// // //     displayFeedback();

// // //     // Button event listeners
// // //     setupButtons();
// // // });

// // // let focusChart; // Global variable to store chart instance

// // // function initCharts() {
// // //     // Initialize empty chart
// // //     const focusCtx = document.getElementById('focus-chart').getContext('2d');
// // //     focusChart = new Chart(focusCtx, {
// // //         type: 'doughnut',
// // //         data: {
// // //             labels: ['Focused', 'Distracted'],
// // //             datasets: [{
// // //                 data: [0, 100], // Default empty state
// // //                 backgroundColor: ['#4361ee', '#f8961e'],
// // //                 borderWidth: 0
// // //             }]
// // //         },
// // //         options: {
// // //             responsive: true,
// // //             maintainAspectRatio: false,
// // //             plugins: {
// // //                 legend: {
// // //                     position: 'bottom'
// // //                 },
// // //                 tooltip: {
// // //                     callbacks: {
// // //                         label: function(context) {
// // //                             return `${context.label}: ${context.raw}%`;
// // //                         }
// // //                     }
// // //                 }
// // //             }
// // //         }
// // //     });
// // // }

// // // function updateFocusChart(focusData) {
// // //     if (!focusData || !focusChart) return;
    
// // //     const focused = Math.round(focusData.focus_percentage * 100);
// // //     const distracted = 100 - focused;
    
// // //     focusChart.data.datasets[0].data = [focused, distracted];
// // //     focusChart.update();
// // // }

// // // function displayFeedback() {
// // //     let answers = JSON.parse(localStorage.getItem("interviewAnswers")) || {};
    
// // //     // Define correct answers for feedback comparison
// // //     let correctAnswers = {
// // //         q1: "Flexible hardwarking and confident",

// // //         q2: "One of my biggest strengths is my problem-solving ability. Whenever I face a challenge, I analyze the situation carefully and find an efficient solution. For example, in my recent project, I encountered a database connectivity issue. I systematically debugged the problem, identified a misconfiguration in the connection string, and fixed it, ensuring smooth application functionality. This ability to troubleshoot and resolve issues quickly helps me contribute effectively to any team I work with.",
// // //         q3: "Correct Answer 3"
// // //     };

// // //     let feedbackContainer = document.getElementById("improvement-areas");
// // //     let correctCount = 0;
// // //     let totalQuestions = Object.keys(correctAnswers).length;

// // //     feedbackContainer.innerHTML = ""; // Clear existing content

// // //     // Add summary statistics
// // //     let summaryItem = document.createElement("div");
// // //     summaryItem.className = "improvement-item summary-stats";
// // //     summaryItem.innerHTML = `<strong>Performance Summary:</strong>`;
// // //     feedbackContainer.appendChild(summaryItem);

// // //     for (let key in correctAnswers) {
// // //         let userAnswer = answers[key] || "Not answered";
// // //         let isCorrect = userAnswer === correctAnswers[key];

// // //         if (isCorrect) correctCount++;

// // //         let feedbackItem = document.createElement("div");
// // //         feedbackItem.className = "improvement-item";
// // //         feedbackItem.innerHTML = `
// // //             <div class="question-feedback">
// // //                 <strong>Question ${key.replace("q", "")}:</strong> 
// // //                 <span class="${isCorrect ? 'correct' : 'incorrect'}">
// // //                     ${isCorrect ? '✅ Correct' : '❌ Incorrect'}
// // //                 </span>
// // //                 <div class="user-answer">Your answer: ${userAnswer}</div>
// // //                 ${!isCorrect ? `<div class="correct-answer">Correct answer: ${correctAnswers[key]}</div>` : ''}
// // //             </div>`;
        
// // //         feedbackContainer.appendChild(feedbackItem);
// // //     }

// // //     // Store performance data for further use
// // //     let performanceData = {
// // //         correct: correctCount,
// // //         total: totalQuestions,
// // //         percentage: ((correctCount / totalQuestions) * 100).toFixed(2),
// // //         timestamp: new Date().toISOString()
// // //     };

// // //     localStorage.setItem("performanceData", JSON.stringify(performanceData));

// // //     // Update UI with performance data
// // //     updatePerformanceUI(performanceData);
// // // }

// // // function updatePerformanceUI(data) {
// // //     document.getElementById("avg-score").textContent = `${data.percentage}%`;
// // //     document.getElementById("correct-answers").textContent = `${data.correct}/${data.total}`;
    
// // //     // Calculate average time if available
// // //     if (data.avgTime) {
// // //         document.getElementById("avg-time").textContent = `${data.avgTime}s`;
// // //     }
    
// // //     // Update focus chart
// // //     updateFocusChart({ focus_percentage: data.percentage / 100 });
// // // }

// // // async function loadPerformanceData() {
// // //     try {
// // //         // Try to load from localStorage first
// // //         let performanceData = JSON.parse(localStorage.getItem("performanceData"));

// // //         if (!performanceData) {
// // //             // If no local data, try to fetch from API
// // //             const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
// // //             const response = await fetch(`http://localhost:5000/api/user_interview_data?email=${userEmail}`);
            
// // //             if (response.ok) {
// // //                 performanceData = await response.json();
                
// // //                 if (performanceData.error) {
// // //                     throw new Error(performanceData.error);
// // //                 }
                
// // //                 // Store the fetched data locally
// // //                 localStorage.setItem("performanceData", JSON.stringify({
// // //                     correct: performanceData.correct_answers,
// // //                     total: performanceData.total_questions,
// // //                     percentage: performanceData.average_score * 100,
// // //                     avgTime: performanceData.average_time,
// // //                     improvements: performanceData.weaknesses
// // //                 }));
// // //             } else {
// // //                 throw new Error(`Server returned ${response.status}`);
// // //             }
// // //         }

// // //         if (!performanceData) {
// // //             throw new Error("No performance data available");
// // //         }

// // //         // Update UI with the loaded data
// // //         updatePerformanceUI(performanceData);

// // //         // Display improvements if available
// // //         if (performanceData.improvements) {
// // //             displayImprovements(performanceData.improvements);
// // //         }

// // //     } catch (error) {
// // //         console.error("Error loading performance data:", error);
// // //         loadMockData();
// // //     }
// // // }

// // // function displayImprovements(improvements) {
// // //     const improvementsContainer = document.getElementById("improvement-areas");
// // //     improvementsContainer.innerHTML = "";

// // //     if (improvements && improvements.length > 0) {
// // //         improvements.forEach(item => {
// // //             const improvementItem = document.createElement("div");
// // //             improvementItem.className = "improvement-item";
// // //             improvementItem.innerHTML = `
// // //                 <strong>${item.topic || 'Area'}:</strong> 
// // //                 <span class="score">${item.score || item.average_score || 'N/A'}%</span>
// // //                 <div class="suggestions">${item.suggestions || 'Practice more questions in this area'}</div>
// // //             `;
// // //             improvementsContainer.appendChild(improvementItem);
// // //         });
// // //     } else {
// // //         improvementsContainer.innerHTML = '<div class="improvement-item">No specific improvement areas identified yet. Keep practicing!</div>';
// // //     }
// // // }

// // // function loadMockData() {
// // //     console.log("Loading mock data...");
// // //     const mockData = {
// // //         correct: 8,
// // //         total: 12,
// // //         percentage: 66.67,
// // //         avgTime: "45",
// // //         improvements: [
// // //             {
// // //                 topic: "Technical Questions",
// // //                 score: 65,
// // //                 suggestions: "Review data structures and algorithms"
// // //             },
// // //             {
// // //                 topic: "Behavioral Questions",
// // //                 score: 58,
// // //                 suggestions: "Practice STAR method for answering"
// // //             },
// // //             {
// // //                 topic: "System Design",
// // //                 score: 62,
// // //                 suggestions: "Study scalable architecture patterns"
// // //             }
// // //         ]
// // //     };

// // //     // Update UI with mock data
// // //     updatePerformanceUI(mockData);
// // //     displayImprovements(mockData.improvements);
// // // }

// // // function setupSidebar() {
// // //     // Set active link based on current page
// // //     const currentPage = window.location.pathname.split('/').pop();
// // //     document.querySelectorAll('.sidebar-nav a').forEach(link => {
// // //         if (link.getAttribute('href') === currentPage) {
// // //             link.parentElement.classList.add('active');
// // //         }
// // //     });
    
// // //     // Logout button
// // //     document.getElementById('logout-btn').addEventListener('click', function(e) {
// // //         e.preventDefault();
// // //         localStorage.removeItem('userEmail');
// // //         localStorage.removeItem('interviewAnswers');
// // //         localStorage.removeItem('performanceData');
// // //         window.location.href = 'login.html';
// // //     });
// // // }

// // // function setupButtons() {
// // //     document.getElementById("detailed-report").addEventListener("click", function () {
// // //         // Save current timestamp as report generation time
// // //         const reportData = JSON.parse(localStorage.getItem("performanceData")) || {};
// // //         reportData.reportGeneratedAt = new Date().toISOString();
// // //         localStorage.setItem("performanceData", JSON.stringify(reportData));
        
// // //         window.location.href = "detailed_report.html";
// // //     });

// // //     document.getElementById("new-interview").addEventListener("click", function () {
// // //         // Clear previous interview answers but keep performance data
// // //         localStorage.removeItem('interviewAnswers');
// // //         window.location.href = "interview_questions.html";
// // //     });
// // // }
// // document.addEventListener("DOMContentLoaded", function () {
// //     // Set user email
// //     const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
// //     document.getElementById("user-email").textContent = userEmail;

// //     // Initialize Charts
// //     initCharts();

// //     // Load performance data
// //     loadPerformanceData();

// //     // Setup sidebar navigation
// //     setupSidebar();

// //     // Load and display feedback
// //     displayFeedback();

// //     // Button event listeners
// //     setupButtons();
// // });

// // let focusChart; // Global variable to store chart instance

// // function initCharts() {
// //     // Initialize empty chart
// //     const focusCtx = document.getElementById('focus-chart').getContext('2d');
// //     focusChart = new Chart(focusCtx, {
// //         type: 'doughnut',
// //         data: {
// //             labels: ['Focused', 'Distracted'],
// //             datasets: [{
// //                 data: [0, 100], // Default empty state
// //                 backgroundColor: ['#4361ee', '#f8961e'],
// //                 borderWidth: 0
// //             }]
// //         },
// //         options: {
// //             responsive: true,
// //             maintainAspectRatio: false,
// //             plugins: {
// //                 legend: {
// //                     position: 'bottom'
// //                 },
// //                 tooltip: {
// //                     callbacks: {
// //                         label: function(context) {
// //                             return `${context.label}: ${context.raw}%`;
// //                         }
// //                     }
// //                 }
// //             }
// //         }
// //     });
// // }

// // function updateFocusChart(focusData) {
// //     if (!focusData || !focusChart) return;
    
// //     const focused = Math.round(focusData.focus_percentage * 100);
// //     const distracted = 100 - focused;
    
// //     focusChart.data.datasets[0].data = [focused, distracted];
// //     focusChart.update();
// // }

// // function displayFeedback() {
// //     let answers = JSON.parse(localStorage.getItem("interviewAnswers")) || {};
    
// //     // Define correct answers for feedback comparison
// //     let correctAnswers = {
// //         q1: "Flexible hardworking and confident",
// //         q2: "One of my biggest strengths is my problem-solving ability. Whenever I face a challenge, I analyze the situation carefully and find an efficient solution. For example, in my recent project, I encountered a database connectivity issue. I systematically debugged the problem, identified a misconfiguration in the connection string, and fixed it, ensuring smooth application functionality. This ability to troubleshoot and resolve issues quickly helps me contribute effectively to any team I work with.",
// //         q3: "Correct Answer 3"
// //     };

// //     let feedbackContainer = document.getElementById("improvement-areas");
// //     let correctCount = 0;
// //     let totalQuestions = Object.keys(correctAnswers).length;

// //     feedbackContainer.innerHTML = ""; // Clear existing content

// //     // Add summary statistics
// //     let summaryItem = document.createElement("div");
// //     summaryItem.className = "improvement-item summary-stats";
// //     summaryItem.innerHTML = `<strong>Performance Summary:</strong>`;
// //     feedbackContainer.appendChild(summaryItem);

// //     for (let key in correctAnswers) {
// //         let userAnswer = answers[key] || "Not answered";
// //         let isCorrect = userAnswer.toLowerCase().trim() === correctAnswers[key].toLowerCase().trim();

// //         if (isCorrect) correctCount++;

// //         let feedbackItem = document.createElement("div");
// //         feedbackItem.className = "improvement-item";
// //         feedbackItem.innerHTML = `
// //             <div class="question-feedback">
// //                 <strong>Question ${key.replace("q", "")}:</strong> 
// //                 <span class="${isCorrect ? 'correct' : 'incorrect'}">
// //                     ${isCorrect ? '✅ Correct' : '❌ Incorrect'}
// //                 </span>
// //                 <div class="user-answer">Your answer: ${userAnswer}</div>
// //                 ${!isCorrect ? `<div class="correct-answer">Correct answer: ${correctAnswers[key]}</div>` : ''}
// //             </div>`;
        
// //         feedbackContainer.appendChild(feedbackItem);
// //     }

// //     // Store performance data for further use
// //     let performanceData = {
// //         correct: correctCount,
// //         total: totalQuestions,
// //         percentage: ((correctCount / totalQuestions) * 100).toFixed(2),
// //         timestamp: new Date().toISOString()
// //     };

// //     localStorage.setItem("performanceData", JSON.stringify(performanceData));

// //     // Update UI with performance data
// //     updatePerformanceUI(performanceData);
// // }

// // function updatePerformanceUI(data) {
// //     document.getElementById("avg-score").textContent = `${data.percentage}%`;
// //     document.getElementById("correct-answers").textContent = `${data.correct}/${data.total}`;
    
// //     // Calculate average time if available
// //     if (data.avgTime) {
// //         document.getElementById("avg-time").textContent = `${data.avgTime}s`;
// //     }
    
// //     // Update focus chart
// //     updateFocusChart({ focus_percentage: data.percentage / 100 });
// // }

// // async function loadPerformanceData() {
// //     try {
// //         // Try to load from localStorage first
// //         let performanceData = JSON.parse(localStorage.getItem("performanceData"));

// //         if (!performanceData) {
// //             // If no local data, try to fetch from API
// //             const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
// //             const response = await fetch(`http://localhost:5000/api/user_interview_data?email=${userEmail}`);
            
// //             if (response.ok) {
// //                 performanceData = await response.json();
                
// //                 if (performanceData.error) {
// //                     throw new Error(performanceData.error);
// //                 }
                
// //                 // Store the fetched data locally
// //                 localStorage.setItem("performanceData", JSON.stringify({
// //                     correct: performanceData.correct_answers,
// //                     total: performanceData.total_questions,
// //                     percentage: performanceData.average_score * 100,
// //                     avgTime: performanceData.average_time,
// //                     improvements: performanceData.weaknesses
// //                 }));
// //             } else {
// //                 throw new Error(`Server returned ${response.status}`);
// //             }
// //         }

// //         if (!performanceData) {
// //             throw new Error("No performance data available");
// //         }

// //         // Update UI with the loaded data
// //         updatePerformanceUI(performanceData);

// //         // Display improvements if available
// //         if (performanceData.improvements) {
// //             displayImprovements(performanceData.improvements);
// //         }

// //     } catch (error) {
// //         console.error("Error loading performance data:", error);
// //         loadMockData();
// //     }
// // }

// // function displayImprovements(improvements) {
// //     const improvementsContainer = document.getElementById("improvement-areas");
// //     improvementsContainer.innerHTML = "";

// //     if (improvements && improvements.length > 0) {
// //         improvements.forEach(item => {
// //             const improvementItem = document.createElement("div");
// //             improvementItem.className = "improvement-item";
// //             improvementItem.innerHTML = `
// //                 <strong>${item.topic || 'Area'}:</strong> 
// //                 <span class="score">${item.score || item.average_score || 'N/A'}%</span>
// //                 <div class="suggestions">${item.suggestions || 'Practice more questions in this area'}</div>
// //             `;
// //             improvementsContainer.appendChild(improvementItem);
// //         });
// //     } else {
// //         improvementsContainer.innerHTML = '<div class="improvement-item">No specific improvement areas identified yet. Keep practicing!</div>';
// //     }
// // }

// // function loadMockData() {
// //     console.log("Loading mock data...");
// //     const mockData = {
// //         correct: 8,
// //         total: 12,
// //         percentage: 66.67,
// //         avgTime: "45",
// //         improvements: [
// //             {
// //                 topic: "Technical Questions",
// //                 score: 65,
// //                 suggestions: "Review data structures and algorithms"
// //             },
// //             {
// //                 topic: "Behavioral Questions",
// //                 score: 58,
// //                 suggestions: "Practice STAR method for answering"
// //             },
// //             {
// //                 topic: "System Design",
// //                 score: 62,
// //                 suggestions: "Study scalable architecture patterns"
// //             }
// //         ]
// //     };

// //     // Update UI with mock data
// //     updatePerformanceUI(mockData);
// //     displayImprovements(mockData.improvements);
// // }

// // function setupSidebar() {
// //     // Set active link based on current page
// //     const currentPage = window.location.pathname.split('/').pop();
// //     document.querySelectorAll('.sidebar-nav a').forEach(link => {
// //         if (link.getAttribute('href') === currentPage) {
// //             link.parentElement.classList.add('active');
// //         }
// //     });
    
// //     // Logout button
// //     document.getElementById('logout-btn').addEventListener('click', function(e) {
// //         e.preventDefault();
// //         localStorage.removeItem('userEmail');
// //         localStorage.removeItem('interviewAnswers');
// //         localStorage.removeItem('performanceData');
// //         window.location.href = 'login.html';
// //     });
// // }

// // function setupButtons() {
// //     document.getElementById("detailed-report").addEventListener("click", function () {
// //         // Save current timestamp as report generation time
// //         const reportData = JSON.parse(localStorage.getItem("performanceData")) || {};
// //         reportData.reportGeneratedAt = new Date().toISOString();
// //         localStorage.setItem("performanceData", JSON.stringify(reportData));
        
// //         window.location.href = "detailed_report.html";
// //     });

// //     document.getElementById("new-interview").addEventListener("click", function () {
// //         // Clear previous interview answers but keep performance data
// //         localStorage.removeItem('interviewAnswers');
// //         window.location.href = "interview_questions.html";
// //     });
// // }


// document.addEventListener("DOMContentLoaded", function () {
//     // Set user email
//     const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
//     document.getElementById("user-email").textContent = userEmail;

//     // Initialize Charts
//     initCharts();

//     // Load performance data
//     loadPerformanceData();

//     // Setup sidebar navigation
//     setupSidebar();

//     // Load and display feedback
//     displayFeedback();

//     // Button event listeners
//     setupButtons();
// });

// let focusChart; // Global variable to store chart instance

// function initCharts() {
//     // Initialize empty chart
//     const focusCtx = document.getElementById('focus-chart').getContext('2d');
//     focusChart = new Chart(focusCtx, {
//         type: 'doughnut',
//         data: {
//             labels: ['Focused', 'Distracted'],
//             datasets: [{
//                 data: [0, 100], // Default empty state
//                 backgroundColor: ['#4361ee', '#f8961e'],
//                 borderWidth: 0
//             }]
//         },
//         options: {
//             responsive: true,
//             maintainAspectRatio: false,
//             plugins: {
//                 legend: {
//                     position: 'bottom'
//                 },
//                 tooltip: {
//                     callbacks: {
//                         label: function(context) {
//                             return `${context.label}: ${context.raw}%`;
//                         }
//                     }
//                 }
//             }
//         }
//     });
// }

// function updateFocusChart(focusData) {
//     if (!focusData || !focusChart) return;
    
//     const focused = Math.round(focusData.focus_percentage * 100);
//     const distracted = 100 - focused;
    
//     focusChart.data.datasets[0].data = [focused, distracted];
//     focusChart.update();
// }

// function displayFeedback() {
//     let answers = JSON.parse(localStorage.getItem("interviewAnswers")) || {};
    
//     // Define correct answers for feedback comparison
//     let correctAnswers = {
//         q1: "Flexible hardworking and confident",
//         q2: "One of my biggest strengths is my problem-solving ability. Whenever I face a challenge, I analyze the situation carefully and find an efficient solution. For example, in my recent project, I encountered a database connectivity issue. I systematically debugged the problem, identified a misconfiguration in the connection string, and fixed it, ensuring smooth application functionality. This ability to troubleshoot and resolve issues quickly helps me contribute effectively to any team I work with.",
//         q3: "Correct Answer 3"
//     };

//     let feedbackContainer = document.getElementById("improvement-areas");
//     let correctCount = 0;
//     let totalQuestions = Object.keys(correctAnswers).length;

//     feedbackContainer.innerHTML = ""; // Clear existing content

//     // Add summary statistics
//     let summaryItem = document.createElement("div");
//     summaryItem.className = "improvement-item summary-stats";
//     summaryItem.innerHTML = `<strong>Performance Summary:</strong>`;
//     feedbackContainer.appendChild(summaryItem);

//     for (let key in correctAnswers) {
//         let userAnswer = answers[key] || "Not answered";
//         let isCorrect = userAnswer.toLowerCase().trim() === correctAnswers[key].toLowerCase().trim();

//         if (isCorrect) correctCount++;

//         let feedbackItem = document.createElement("div");
//         feedbackItem.className = "improvement-item";
//         feedbackItem.innerHTML = `
//             <div class="question-feedback">
//                 <strong>Question ${key.replace("q", "")}:</strong> 
//                 <span class="${isCorrect ? 'correct' : 'incorrect'}">
//                     ${isCorrect ? '✅ Correct' : '❌ Incorrect'}
//                 </span>
//                 <div class="user-answer">Your answer: ${userAnswer}</div>
//                 ${!isCorrect ? `<div class="correct-answer">Correct answer: ${correctAnswers[key]}</div>` : ''}
//             </div>`;
        
//         feedbackContainer.appendChild(feedbackItem);
//     }

//     // Store performance data for further use
//     let performanceData = {
//         correct: correctCount,
//         total: totalQuestions,
//         percentage: ((correctCount / totalQuestions) * 100).toFixed(2),
//         timestamp: new Date().toISOString()
//     };

//     localStorage.setItem("performanceData", JSON.stringify(performanceData));

//     // Update UI with performance data
//     updatePerformanceUI(performanceData);
// }

// function updatePerformanceUI(data) {
//     document.getElementById("avg-score").textContent = `${data.percentage}%`;
//     document.getElementById("correct-answers").textContent = `${data.correct}/${data.total}`;
    
//     // Calculate average time if available
//     if (data.avgTime) {
//         document.getElementById("avg-time").textContent = `${data.avgTime}s`;
//     }
    
//     // Update focus chart
//     updateFocusChart({ focus_percentage: data.percentage / 100 });
// }

// async function loadPerformanceData() {
//     try {
//         // Try to load from localStorage first
//         let performanceData = JSON.parse(localStorage.getItem("performanceData"));

//         if (!performanceData) {
//             // If no local data, try to fetch from API
//             const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
//             const response = await fetch(`http://localhost:5000/api/user_interview_data?email=${userEmail}`);
            
//             if (response.ok) {
//                 performanceData = await response.json();
                
//                 if (performanceData.error) {
//                     throw new Error(performanceData.error);
//                 }
                
//                 // Store the fetched data locally
//                 localStorage.setItem("performanceData", JSON.stringify({
//                     correct: performanceData.correct_answers,
//                     total: performanceData.total_questions,
//                     percentage: performanceData.average_score * 100,
//                     avgTime: performanceData.average_time,
//                     improvements: performanceData.weaknesses
//                 }));
//             } else {
//                 throw new Error(`Server returned ${response.status}`);
//             }
//         }

//         if (!performanceData) {
//             throw new Error("No performance data available");
//         }

//         // Update UI with the loaded data
//         updatePerformanceUI(performanceData);

//         // Display improvements if available
//         if (performanceData.improvements) {
//             displayImprovements(performanceData.improvements);
//         }

//     } catch (error) {
//         console.error("Error loading performance data:", error);
//         loadMockData();
//     }
// }

// function displayImprovements(improvements) {
//     const improvementsContainer = document.getElementById("improvement-areas");
//     improvementsContainer.innerHTML = "";

//     if (improvements && improvements.length > 0) {
//         improvements.forEach(item => {
//             const improvementItem = document.createElement("div");
//             improvementItem.className = "improvement-item";
//             improvementItem.innerHTML = `
//                 <strong>${item.topic || 'Area'}:</strong> 
//                 <span class="score">${item.score || item.average_score || 'N/A'}%</span>
//                 <div class="suggestions">${item.suggestions || 'Practice more questions in this area'}</div>
//             `;
//             improvementsContainer.appendChild(improvementItem);
//         });
//     } else {
//         improvementsContainer.innerHTML = '<div class="improvement-item">No specific improvement areas identified yet. Keep practicing!</div>';
//     }
// }

// function loadMockData() {
//     console.log("Loading mock data...");
//     const mockData = {
//         correct: 8,
//         total: 12,
//         percentage: 66.67,
//         avgTime: "45",
//         improvements: [
//             {
//                 topic: "Technical Questions",
//                 score: 65,
//                 suggestions: "Review data structures and algorithms"
//             },
//             {
//                 topic: "Behavioral Questions",
//                 score: 58,
//                 suggestions: "Practice STAR method for answering"
//             },
//             {
//                 topic: "System Design",
//                 score: 62,
//                 suggestions: "Study scalable architecture patterns"
//             }
//         ]
//     };

//     // Update UI with mock data
//     updatePerformanceUI(mockData);
//     displayImprovements(mockData.improvements);
// }

// function setupSidebar() {
//     // Set active link based on current page
//     const currentPage = window.location.pathname.split('/').pop();
//     document.querySelectorAll('.sidebar-nav a').forEach(link => {
//         if (link.getAttribute('href') === currentPage) {
//             link.parentElement.classList.add('active');
//         }
//     });
    
//     // Logout button
//     document.getElementById('logout-btn').addEventListener('click', function(e) {
//         e.preventDefault();
//         localStorage.removeItem('userEmail');
//         localStorage.removeItem('interviewAnswers');
//         localStorage.removeItem('performanceData');
//         window.location.href = 'login.html';
//     });
// }

// function setupButtons() {
//     // Detailed Report button - redirect to report page
//     document.getElementById("detailed-report").addEventListener("click", function() {
//         // Save current timestamp as report generation time
//         const reportData = JSON.parse(localStorage.getItem("performanceData")) || {};
//         reportData.reportGeneratedAt = new Date().toISOString();
//         localStorage.setItem("performanceData", JSON.stringify(reportData));
        
//         // Redirect to detailed report page
//         window.location.href = "detailed_report.html";
//     });

//     // New Interview button
//     document.getElementById("new-interview").addEventListener("click", function() {
//         // Clear previous interview answers but keep performance data
//         localStorage.removeItem('interviewAnswers');
//         window.location.href = "interview_questions.html";
//     });
// }
document.addEventListener("DOMContentLoaded", function () {
    // Set user email
    const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
    document.getElementById("user-email").textContent = userEmail;

    // Initialize Charts
    initCharts();

    // Load performance data
    loadPerformanceData();

    // Setup sidebar navigation
    setupSidebar();

    // Load and display feedback
    displayFeedback();

    // Button event listeners
    setupButtons();
});

let focusChart; // Global variable to store chart instance

function initCharts() {
    // Initialize empty chart
    const focusCtx = document.getElementById('focus-chart').getContext('2d');
    focusChart = new Chart(focusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Focused', 'Distracted'],
            datasets: [{
                data: [0, 100], // Default empty state
                backgroundColor: ['#4361ee', '#f8961e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

function updateFocusChart(focusData) {
    if (!focusData || !focusChart) return;
    
    const focused = Math.round(focusData.focus_percentage * 100);
    const distracted = 100 - focused;
    
    focusChart.data.datasets[0].data = [focused, distracted];
    focusChart.update();
}

// function displayFeedback() {
//     let answers = JSON.parse(localStorage.getItem("interviewAnswers")) || {};
    
//     // Define correct answers for feedback comparison
//     let correctAnswers = {
//         q1: "Flexible hardworking and confident",
//         q2: "One of my biggest strengths is my problem-solving ability. Whenever I face a challenge, I analyze the situation carefully and find an efficient solution. For example, in my recent project, I encountered a database connectivity issue. I systematically debugged the problem, identified a misconfiguration in the connection string, and fixed it, ensuring smooth application functionality. This ability to troubleshoot and resolve issues quickly helps me contribute effectively to any team I work with.",
//         q3: "Correct Answer 3"
//     };

//     let feedbackContainer = document.getElementById("improvement-areas");
//     let correctCount = 0;
//     let totalQuestions = Object.keys(correctAnswers).length;

//     feedbackContainer.innerHTML = ""; // Clear existing content

//     // Add summary statistics
//     let summaryItem = document.createElement("div");
//     summaryItem.className = "improvement-item summary-stats";
//     summaryItem.innerHTML = `<strong>Performance Summary:</strong>`;
//     feedbackContainer.appendChild(summaryItem);

//     for (let key in correctAnswers) {
//         let userAnswer = answers[key] || "Not answered";
//         let isCorrect = userAnswer.toLowerCase().trim() === correctAnswers[key].toLowerCase().trim();

//         if (isCorrect) correctCount++;

//         let feedbackItem = document.createElement("div");
//         feedbackItem.className = "improvement-item";
//         feedbackItem.innerHTML = `
//             <div class="question-feedback">
//                 <strong>Question ${key.replace("q", "")}:</strong> 
//                 <span class="${isCorrect ? 'correct' : 'incorrect'}">
//                     ${isCorrect ? '✅ Correct' : '❌ Incorrect'}
//                 </span>
//                 <div class="user-answer">Your answer: ${userAnswer}</div>
//                 ${!isCorrect ? `<div class="correct-answer">Correct answer: ${correctAnswers[key]}</div>` : ''}
//             </div>`;
        
//         feedbackContainer.appendChild(feedbackItem);
//     }

//     // Store performance data for further use
//     let performanceData = {
//         correct: correctCount,
//         total: totalQuestions,
//         percentage: ((correctCount / totalQuestions) * 100).toFixed(2),
//         timestamp: new Date().toISOString()
//     };

//     localStorage.setItem("performanceData", JSON.stringify(performanceData));

//     // Update UI with performance data
//     updatePerformanceUI(performanceData);
// }
function displayFeedback() {
    let answers = JSON.parse(localStorage.getItem("interviewAnswers")) || {};
    let questions = JSON.parse(localStorage.getItem("interviewQuestions")) || [];
    
    // Create correctAnswers object from the stored questions
    let correctAnswers = {};
    questions.forEach((q, index) => {
        const key = q.id || `q${index+1}`; // Use question ID or fallback to q1, q2, etc.
        correctAnswers[key] = q.correct_answer;
    });

    let feedbackContainer = document.getElementById("improvement-areas");
    let correctCount = 0;
    let totalQuestions = Object.keys(correctAnswers).length;

    feedbackContainer.innerHTML = ""; // Clear existing content

    // Add summary statistics
    let summaryItem = document.createElement("div");
    summaryItem.className = "improvement-item summary-stats";
    summaryItem.innerHTML = `<strong>Performance Summary:</strong>`;
    feedbackContainer.appendChild(summaryItem);

    for (let key in correctAnswers) {
        let userAnswer = answers[key] || "Not answered";
        let isCorrect = userAnswer.toLowerCase().trim() === correctAnswers[key].toLowerCase().trim();

        if (isCorrect) correctCount++;

        let feedbackItem = document.createElement("div");
        feedbackItem.className = "improvement-item";
        feedbackItem.innerHTML = `
            <div class="question-feedback">
                <strong>Question ${key.replace("q", "")}:</strong> 
                <span class="${isCorrect ? 'correct' : 'incorrect'}">
                    ${isCorrect ? '✅ Correct' : '❌ Incorrect'}
                </span>
                <div class="user-answer">Your answer: ${userAnswer}</div>
                ${!isCorrect ? `<div class="correct-answer">Correct answer: ${correctAnswers[key]}</div>` : ''}
            </div>`;
        
        feedbackContainer.appendChild(feedbackItem);
    }

    // Store performance data for further use
    let performanceData = {
        correct: correctCount,
        total: totalQuestions,
        percentage: totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(2) : 0,
        timestamp: new Date().toISOString()
    };

    localStorage.setItem("performanceData", JSON.stringify(performanceData));

    // Update UI with performance data
    updatePerformanceUI(performanceData);
}
function updatePerformanceUI(data) {
    document.getElementById("avg-score").textContent = `${data.percentage}%`;
    document.getElementById("correct-answers").textContent = `${data.correct}/${data.total}`;
    
    // Calculate average time if available
    if (data.avgTime) {
        document.getElementById("avg-time").textContent = `${data.avgTime}s`;
    }
    
    // Update focus chart
    updateFocusChart({ focus_percentage: data.percentage / 100 });
}

async function loadPerformanceData() {
    try {
        // Try to load from localStorage first
        let performanceData = JSON.parse(localStorage.getItem("performanceData"));

        if (!performanceData) {
            // If no local data, try to fetch from API
            const userEmail = localStorage.getItem("userEmail") || "guest@example.com";
            const response = await fetch(`http://localhost:5000/api/user_interview_data?email=${userEmail}`);
            
            if (response.ok) {
                performanceData = await response.json();
                
                if (performanceData.error) {
                    throw new Error(performanceData.error);
                }
                
                // Store the fetched data locally
                localStorage.setItem("performanceData", JSON.stringify({
                    correct: performanceData.correct_answers,
                    total: performanceData.total_questions,
                    percentage: performanceData.average_score * 100,
                    avgTime: performanceData.average_time,
                    improvements: performanceData.weaknesses
                }));
            } else {
                throw new Error(`Server returned ${response.status}`);
            }
        }

        if (!performanceData) {
            throw new Error("No performance data available");
        }

        // Update UI with the loaded data
        updatePerformanceUI(performanceData);

        // Display improvements if available
        if (performanceData.improvements) {
            displayImprovements(performanceData.improvements);
        }

    } catch (error) {
        console.error("Error loading performance data:", error);
        loadMockData();
    }
}

function displayImprovements(improvements) {
    const improvementsContainer = document.getElementById("improvement-areas");
    improvementsContainer.innerHTML = "";

    if (improvements && improvements.length > 0) {
        improvements.forEach(item => {
            const improvementItem = document.createElement("div");
            improvementItem.className = "improvement-item";
            improvementItem.innerHTML = `
                <strong>${item.topic || 'Area'}:</strong> 
                <span class="score">${item.score || item.average_score || 'N/A'}%</span>
                <div class="suggestions">${item.suggestions || 'Practice more questions in this area'}</div>
            `;
            improvementsContainer.appendChild(improvementItem);
        });
    } else {
        improvementsContainer.innerHTML = '<div class="improvement-item">No specific improvement areas identified yet. Keep practicing!</div>';
    }
}

function loadMockData() {
    console.log("Loading mock data...");
    const mockData = {
        correct: 8,
        total: 12,
        percentage: 66.67,
        avgTime: "45",
        improvements: [
            {
                topic: "Technical Questions",
                score: 65,
                suggestions: "Review data structures and algorithms"
            },
            {
                topic: "Behavioral Questions",
                score: 58,
                suggestions: "Practice STAR method for answering"
            },
            {
                topic: "System Design",
                score: 62,
                suggestions: "Study scalable architecture patterns"
            }
        ]
    };

    // Update UI with mock data
    updatePerformanceUI(mockData);
    displayImprovements(mockData.improvements);
}

function setupSidebar() {
    // Set active link based on current page
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.parentElement.classList.add('active');
        }
    });
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('userEmail');
        localStorage.removeItem('interviewAnswers');
        localStorage.removeItem('performanceData');
        window.location.href = 'login.html';
    });
}

function setupButtons() {
    // Detailed Report button - redirect to detailedreport.html
    document.getElementById("detailed-report").addEventListener("click", function() {
        // Save current timestamp as report generation time
        const reportData = JSON.parse(localStorage.getItem("performanceData")) || {};
        reportData.reportGeneratedAt = new Date().toISOString();
        localStorage.setItem("performanceData", JSON.stringify(reportData));
        
        // Redirect to detailed report page
        window.location.href = "detailedreport.html";
    });

    // New Interview button
    document.getElementById("new-interview").addEventListener("click", function() {
        // Clear previous interview answers but keep performance data
        localStorage.removeItem('interviewAnswers');
        window.location.href = "interview_questions.html";
    });
}