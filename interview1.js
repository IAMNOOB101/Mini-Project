// document.addEventListener("DOMContentLoaded", function() {
//     const immediateBtn = document.getElementById("immediate");
//     const setTimeBtn = document.getElementById("set-time");
//     const dateTimePicker = document.getElementById("date-time-picker");
//     const dateInput = document.getElementById("date");
//     const timeInput = document.getElementById("time");
//     const saveBtn = document.getElementById("save");
//     const cancelBtn = document.getElementById("cancel");

//     // Initially hide the date-time picker
//     dateTimePicker.classList.add("hidden");

//     // Toggle Between Immediate and Set Date & Time
//     immediateBtn.addEventListener("click", function() {
//         immediateBtn.classList.add("active");
//         setTimeBtn.classList.remove("active");
//         dateTimePicker.classList.add("hidden");
//     });

//     setTimeBtn.addEventListener("click", function() {
//         setTimeBtn.classList.add("active");
//         immediateBtn.classList.remove("active");
//         dateTimePicker.classList.remove("hidden");
//     });

//     // Save Button Functionality
//     saveBtn.addEventListener("click", function() {
//         if (setTimeBtn.classList.contains("active")) {
//             if (!dateInput.value || !timeInput.value) {
//                 alert("Please select a date and time!");
//                 return;
//             }
//         }
//         alert("Your interview has been saved successfully!");
//     });

//     // Cancel Button Functionality
//     cancelBtn.addEventListener("click", function() {
//         immediateBtn.classList.add("active");
//         setTimeBtn.classList.remove("active");
//         dateTimePicker.classList.add("hidden");
//         dateInput.value = "";
//         timeInput.value = "";
//     });
// });
document.addEventListener("DOMContentLoaded", function() {
    const immediateBtn = document.getElementById("immediate");
    const setTimeBtn = document.getElementById("set-time");
    const dateTimePicker = document.getElementById("date-time-picker");
    const dateInput = document.getElementById("date");
    const timeInput = document.getElementById("time");
    const saveBtn = document.getElementById("save");
    const cancelBtn = document.getElementById("cancel");

    dateTimePicker.classList.add("hidden");

    immediateBtn.addEventListener("click", function() {
        immediateBtn.classList.add("active");
        setTimeBtn.classList.remove("active");
        dateTimePicker.classList.add("hidden");
    });

    setTimeBtn.addEventListener("click", function() {
        setTimeBtn.classList.add("active");
        immediateBtn.classList.remove("active");
        dateTimePicker.classList.remove("hidden");
    });

    saveBtn.addEventListener("click", function() {
        if (setTimeBtn.classList.contains("active")) {
            if (!dateInput.value || !timeInput.value) {
                alert("Please select a date and time!");
                return;
            }
        }
        alert("Your interview has been saved successfully!");
    });

    cancelBtn.addEventListener("click", function() {
        immediateBtn.classList.add("active");
        setTimeBtn.classList.remove("active");
        dateTimePicker.classList.add("hidden");
        dateInput.value = "";
        timeInput.value = "";
    });
    document.getElementById("immediate").addEventListener("click", async () => {
        try {
            // Request camera and microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            // If permission is granted, redirect to facecam page
            window.location.href = "facecam.html";
        } catch (err) {
            console.error("Permission denied:", err);
            alert("Please allow camera and microphone access to proceed.");
        }
    });
    document.getElementById("immediate").addEventListener("click", () => {
        window.location.href = "facecam.html"; // Redirect to Facecam page
    });

});