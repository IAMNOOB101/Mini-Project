# InterviewAI 🎯

An intelligent, AI-powered mock interview simulation platform that prepares candidates for technical and behavioral interviews. InterviewAI dynamically generates domain-tailored interview questions, assesses voice and communication confidence, and provides in-depth performance evaluations with actionable feedback.

---

## 🚀 Tech Stack

- **Frontend:** React.js, Vite, React Router, Vanilla CSS
- **Backend:** Python 3.10+, Django 5, Django REST Framework (DRF)
- **Database:** PostgreSQL
- **AI Engine:** Google Gemini (`gemini-3.6-flash`) with local Ollama fallback
- **Authentication:** JWT (HttpOnly Cookie / Bearer) & Two-Factor Authentication (TOTP)
- **Cloud Storage:** Cloudinary (Resume & Media Storage)
- **Payment Gateway:** Razorpay

---

## 🛠️ Project Structure

```text
Interview-AI/
├── backend_django/         # Django REST Framework Backend
│   ├── apps/
│   │   ├── admin_panel/    # Platform analytics & user administration
│   │   ├── auth_app/       # Authentication, TOTP 2FA, password management
│   │   ├── guest/          # Guest mock interview access
│   │   ├── institutions/   # Institutional partner portals
│   │   ├── payments/       # Subscription plans & billing
│   │   ├── sessions/       # Interview lifecycle, questions & reports
│   │   └── users/          # Profiles, resumes & user management
│   ├── interviewai/        # Core Django settings, URLs & middleware
│   ├── services/           # AI service, analysis engine, resume parser
│   └── manage.py
│
├── frontend/               # React (Vite) Application
│   ├── src/
│   │   ├── components/     # Reusable UI elements & navigation
│   │   ├── pages/          # Application views (Dashboard, Interview, Setup, etc.)
│   │   ├── services/       # API clients & interview services
│   │   └── utils/          # Voice confidence & speech recognition utilities
│   └── vite.config.js      # Reverse proxy routing to backend (:8000)
│
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

- **Python:** 3.10 or higher
- **Node.js:** 18.x or higher
- **PostgreSQL:** 14+ running locally or remotely

---

### Backend Setup (Django)

1. **Navigate to the backend directory:**
   ```powershell
   cd backend_django
   ```

2. **Create and activate a virtual environment:**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Copy the provided `.env.example` template to `.env` and fill in your configuration:
   ```powershell
   cp .env.example .env
   ```
   > Refer to `backend_django/.env.example` for all configurable environment variables.

5. **Apply Database Migrations:**
   ```powershell
   python manage.py migrate
   ```

6. **Start the Django Development Server:**
   ```powershell
   python manage.py runserver 127.0.0.1:8000
   ```
   The backend API will be available at `http://127.0.0.1:8000`.

---

### Frontend Setup (React / Vite)

1. **Navigate to the frontend directory:**
   ```powershell
   cd frontend
   ```

2. **Install Node dependencies:**
   ```powershell
   npm install
   ```

3. **Verify API Proxy Configuration:**
   Ensure `/frontend/vite.config.js` routes `/api` requests to the Django server:
   ```javascript
   proxy: {
     "/api": {
       target: "http://localhost:8000",
       changeOrigin: true,
     },
   }
   ```

4. **Start the Frontend Development Server:**
   ```powershell
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## 🗝️ Core Features

- **Real-Time Dynamic AI Interviewer:** Questions adapt on the fly based on the candidate's previous responses, tech stack, and experience level.
- **Speech-to-Text & Voice Confidence:** Live microphone transcription with voice stability tracking.
- **Simulation Mode:** Flexible interview simulation with or without camera access for low-latency testing across any environment.
- **Automated Resume Parsing:** Extracts skills, experience, and domain baselines directly from uploaded PDF resumes.
- **Multi-Metric Evaluation:** Comprehensive scoring across technical correctness, communication clarity, and confidence.
- **Two-Factor Authentication (2FA):** Optional TOTP authenticator setup for account security.
- **Institution & Admin Dashboards:** Track interview metrics, student success rates, and domain performance.

---

## 👤 Author

**Aadarsh Agrawal**
- GitHub: [@IAMNOOB101](https://github.com/IAMNOOB101)
- Email: [agrawalaadarsh387@gmail.com](mailto:agrawalaadarsh387@gmail.com)

---

## 📝 License

This project is proprietary and confidential.
