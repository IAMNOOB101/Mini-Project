// document.addEventListener("DOMContentLoaded", function () {
//     const immediateBtn = document.getElementById("immediate");
//     const setTimeBtn = document.getElementById("set-time");
//     const saveBtn = document.getElementById("save");
//     const dateTimePicker = document.getElementById("date-time-picker");

//     // Start Interview Immediately (Redirect to facecam.html first)
//     immediateBtn.addEventListener("click", function () {
//         const role = document.getElementById("role").value;
//         const interviewType = document.getElementById("interviewType").value;
//         const knowledgeDomain = document.getElementById("knowledge").value;

//         if (!role || !interviewType) {
//             alert("Please select a Role and Interview Type before starting.");
//             return;
//         }

//         // Store the details in localStorage
//         localStorage.setItem("selectedRole", role);
//         localStorage.setItem("selectedInterviewType", interviewType);
//         localStorage.setItem("selectedKnowledgeDomain", knowledgeDomain);
//         // localStorage.setItem("selectedRole", role);
// // localStorage.setItem("interviewType", interviewType);


//         // Redirect to facecam.html first
//         window.location.href = "facecam.html";
//     });

//     // Show Date-Time Picker when "Set Date and Time" is clicked
//     setTimeBtn.addEventListener("click", function () {
//         dateTimePicker.classList.toggle("hidden");
//     });

//     // Save Interview for Later
//     saveBtn.addEventListener("click", function () {
//         const role = document.getElementById("role").value;
//         const interviewType = document.getElementById("interviewType").value;
//         const knowledgeDomain = document.getElementById("knowledge").value;
//         const date = document.getElementById("date").value;
//         const time = document.getElementById("time").value;

//         const interviewDetails = {
//             role: role,
//             interviewType: interviewType,
//             knowledgeDomain: knowledgeDomain,
//             date: date,
//             time: time
//         };

//         localStorage.setItem("savedInterview", JSON.stringify(interviewDetails));
//         alert("Interview details saved!");
//     });

//     // Load saved data (if any)
//     function loadSavedData() {
//         const savedData = JSON.parse(localStorage.getItem("savedInterview"));
//         if (savedData) {
//             document.getElementById("role").value = savedData.role;
//             document.getElementById("interviewType").value = savedData.interviewType;
//             document.getElementById("knowledge").value = savedData.knowledgeDomain;
//             document.getElementById("date").value = savedData.date;
//             document.getElementById("time").value = savedData.time;
//         }
//     }

//     loadSavedData();
// });
document.addEventListener("DOMContentLoaded", function() {
  const immediateBtn = document.getElementById("immediate");
  const setTimeBtn = document.getElementById("set-time");
  const saveBtn = document.getElementById("save");
  const dateTimePicker = document.getElementById("date-time-picker");
  const resumeInput = document.getElementById("resume");
  const roleSelect = document.getElementById("role");
  const interviewTypeSelect = document.getElementById("interviewType");
  const knowledgeSelect = document.getElementById("knowledge");
  if (!localStorage.getItem('userEmail')) {
      window.location.href = "login.html";
      return;
  }
  // Start Interview Immediately
  immediateBtn.addEventListener("click", async function() {
      const role = roleSelect.value;
      const interviewType = interviewTypeSelect.value;
      const knowledgeDomain = knowledgeSelect.value;
      const resumeFile = resumeInput.files[0];

      if (!role || !interviewType) {
          alert("Please select a Role and Interview Type");
          return;
      }

      try {
          // Store selections in localStorage
          localStorage.setItem("selectedRole", role);
          localStorage.setItem("interviewType", interviewType);
          localStorage.setItem("knowledgeDomain", knowledgeDomain);

          // Upload resume if provided (fire-and-forget approach)
          if (resumeFile) {
              const formData = new FormData();
              formData.append("resume", resumeFile);
              formData.append("email", localStorage.getItem("userEmail") || "guest@example.com");
              
              // Don't await this - proceed immediately
              fetch("/api/upload_resume", {
                  method: "POST",
                  body: formData
              }).catch(e => console.log("Resume upload optional:", e));
          }

          // Redirect to facecam
          window.location.href = "facecam.html";
      } catch (error) {
          console.error("Error:", error);
          alert("Error starting interview: " + error.message);
      }
  });

  // Save Interview for Later
  saveBtn.addEventListener("click", async function() {
      const role = roleSelect.value;
      const interviewType = interviewTypeSelect.value;
      const knowledgeDomain = knowledgeSelect.value;
      const date = document.getElementById("date").value;
      const time = document.getElementById("time").value;
      const resumeFile = resumeInput.files[0];

      if (!date || !time) {
          alert("Please select date and time");
          return;
      }

      try {
          const interviewData = {
              email: localStorage.getItem("userEmail") || "guest@example.com",
              role: role,
              interviewType: interviewType,
              knowledgeDomain: knowledgeDomain,
              scheduledTime: new Date(`${date}T${time}`).toISOString(),
              status: "scheduled"
          };

          // Upload resume if provided
          if (resumeFile) {
              const formData = new FormData();
              formData.append("resume", resumeFile);
              formData.append("email", interviewData.email);

              await fetch("/api/upload_resume", {
                  method: "POST",
                  body: formData
              });
          }

          // Save interview to database
          await fetch("/api/save_interview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(interviewData)
          });

          alert("Interview scheduled successfully!");
      } catch (error) {
          console.error("Error:", error);
          alert("Error scheduling interview: " + error.message);
      }
  });

  // Toggle date-time picker
  setTimeBtn.addEventListener("click", function() {
      dateTimePicker.classList.toggle("hidden");
  });
});