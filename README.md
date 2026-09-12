# InterviewAI

InterviewAI is an AI-powered mock interview platform that helps users practice for job interviews in their specific domain. The system uses AI (via Ollama/Gemini) to conduct real-time, interactive interviews and provides a detailed performance analysis with scores and confidence feedback.

## 🚀 Tech Stack

- **Frontend:** React.js, Vite, Tailwind CSS (optional depending on frontend UI setup)
- **Backend:** Python, Django 5, Django REST Framework (DRF)
- **Database:** PostgreSQL
- **AI Integration:** Ollama (local models) or Gemini via `ai_service`
- **File Storage:** Cloudinary (for resume uploads and profile pictures)
- **Payments:** Razorpay

---

## 🛠️ Project Structure

The repository contains two main directories:

- `/frontend` - The React application (Vite).
- `/backend_django` - The newly migrated Python/Django backend API. 
*(Note: This project originally used an Express/Node.js backend which has since been fully rewritten to Django).*

---

## ⚙️ Backend Setup (Django)

### 1. Prerequisites
- Python 3.10+
- PostgreSQL server running locally or remotely

### 2. Installation
Navigate into the backend directory and set up a virtual environment:

```powershell
cd backend_django
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file inside `/backend_django` (you can copy `.env.example` if available) and add the following keys:

```ini
PORT=8000
DEBUG=True
DJANGO_ENV=development

DJANGO_SECRET_KEY=your_secret_key_here

DB_NAME=interviewai-db
DB_USER=postgres
DB_PASS=your_db_password
DB_HOST=127.0.0.1
DB_PORT=5432

JWT_SECRET=your_secure_jwt_secret_key_here
JWT_ACCESS_TOKEN_LIFETIME=480

GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:14b
```

### 4. Database Migrations
Run the migrations to create the required tables in your PostgreSQL database:
```powershell
python manage.py migrate
```

### 5. Start the Server
```powershell
python manage.py runserver 8000
```
The API will be available at `http://localhost:8000`.

---

## 🖥️ Frontend Setup (React/Vite)

### 1. Installation
Navigate into the frontend directory and install the Node.js dependencies:
```powershell
cd frontend
npm install
```

### 2. Configuration
Ensure the backend proxy in `/frontend/vite.config.js` is pointing to the Django backend (port 8000):
```javascript
proxy: {
  "/api": {
    target: "http://localhost:8000",
    changeOrigin: true,
  },
}
```

### 3. Start the Development Server
```powershell
npm run dev
```
The application will open at `http://localhost:5173`.

---

## 🗝️ Core Features
- **Guest Flow:** Quick mock interview access without needing an account.
- **Resume Parsing:** Upload PDF resumes to dynamically generate tailored interview questions.
- **Topic Tracking:** The AI dynamically steers the interview to cover multiple domains (e.g. software engineering, system design).
- **Background Task Execution:** Final performance reports and automated emails are generated seamlessly in the background without holding up user requests.
- **Admin Dashboard:** Monitor overall platform usage, user counts, and domain performance.
- **Two-Factor Auth:** Secure user accounts via TOTP verification.

## 📝 License
This project is proprietary and confidential.
