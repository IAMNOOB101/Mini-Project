from flask import Flask, request, jsonify, send_from_directory
from flask_pymongo import PyMongo
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
import os
import random
import uuid
import re
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from flask import send_from_directory
from bson.objectid import ObjectId

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"]}})

# Configure upload folders
app.config.update({
    'UPLOAD_FOLDER': 'uploads',
    'RESUME_UPLOAD_FOLDER': 'uploads/resumes',
    'ALLOWED_EXTENSIONS': {'pdf', 'doc', 'docx'},
    'MAX_CONTENT_LENGTH': 16 * 1024 * 1024  # 16MB
})

# Create upload directories
os.makedirs(app.config['RESUME_UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# MongoDB Connection
try:
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
    db = client["mockmate"]
    users_collection = db["users"]
    questions_collection = db["questions"]
    answers_collection = db["answers"]
    focus_logs_collection = db["focus_logs"]
    otp_collection = db["otp_codes"]
    interviews_collection = db["interviews"]
    
    # Create indexes
    users_collection.create_index("email", unique=True)
    questions_collection.create_index([("role", 1), ("type", 1)])
    answers_collection.create_index([("email", 1), ("timestamp", -1)])
    
    print("✅ MongoDB Connected Successfully!")
except Exception as e:
    print(f"🚨 MongoDB Connection Failed: {e}")
    raise e

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def send_otp(email, otp_code):
    """Send OTP email (configure with your SMTP credentials)"""
    try:
        sender_email = "mockmate1@gmail.com"
        sender_password = "sqkh tfwj wlqa kaec"
        
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = email
        msg['Subject'] = "Your OTP Code"
        
        body = f"Your OTP code is: {otp_code}\n\nPlease do not share this OTP with anyone."
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, email, msg.as_string())
        
        print(f"✅ OTP sent to {email}")
        return True
    except Exception as e:
        print(f"🚨 Failed to send OTP: {e}")
        print(f"📧 OTP for {email}: {otp_code}")  # Fallback
        return False

def evaluate_answer(user_answer, correct_answer, keywords=[]):
    """Enhanced answer evaluation with similarity scoring"""
    if not user_answer.strip():
        return {
            "score": 0,
            "is_correct": False,
            "feedback": "You didn't provide an answer.",
            "suggestion": "Please try to answer the question."
        }
    
    similarity = SequenceMatcher(None, user_answer.lower(), correct_answer.lower()).ratio()
    matched_keywords = [kw for kw in keywords if kw.lower() in user_answer.lower()]
    keyword_score = len(matched_keywords) / len(keywords) if keywords else 0
    score = (0.7 * similarity) + (0.3 * keyword_score)
    
    if score >= 0.8:
        feedback = "Excellent answer! You covered all key points."
        suggestion = "Great job! You might add more examples next time."
    elif score >= 0.5:
        feedback = f"Good attempt. You covered {len(matched_keywords)} of {len(keywords)} key terms."
        suggestion = f"Try to include: {', '.join(kw for kw in keywords if kw not in matched_keywords)}"
    else:
        feedback = "Your answer doesn't match the expected response."
        suggestion = f"Consider including: {correct_answer[:100]}..." if correct_answer else "Review the question requirements."

    return {
        "score": score,
        "is_correct": score >= 0.8,
        "feedback": feedback,
        "suggestion": suggestion,
        "matched_keywords": matched_keywords
    }

# ========== AUTHENTICATION ENDPOINTS ========== #
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "").strip()
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"error": "Invalid email format"}), 400

        if users_collection.find_one({"email": email}):
            return jsonify({"error": "User already exists"}), 409

        hashed_password = generate_password_hash(password)
        user = {
            "email": email,
            "password": hashed_password,
            "first_name": first_name,
            "last_name": last_name,
            "resume": "",
            "created_at": datetime.utcnow()
        }

        users_collection.insert_one(user)
        return jsonify({"message": "Signup successful!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "").strip()

        user = users_collection.find_one({"email": email})
        if not user or not check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid email or password"}), 401

        users_collection.update_one(
            {"email": email},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        return jsonify({
            "message": "Login successful!",
            "user": {
                "email": user["email"],
                "first_name": user.get("first_name", ""),
                "last_name": user.get("last_name", ""),
                "resume": user.get("resume", "")
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/forgot_password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()

        if not users_collection.find_one({"email": email}):
            return jsonify({"error": "User not found"}), 404

        otp_code = str(random.randint(1000, 9999))
        otp_collection.update_one(
            {"email": email},
            {"$set": {"otp": otp_code, "created_at": datetime.utcnow()}},
            upsert=True
        )

        if not send_otp(email, otp_code):
            return jsonify({
                "message": "OTP sent to your email",
                "otp": otp_code  # Remove this in production
            })

        return jsonify({
            "message": "OTP sent to your email",
            "otp": otp_code  # Remove this in production
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/verify_otp', methods=['POST'])
def verify_otp():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        otp_code = data.get("otp", "").strip()

        otp_record = otp_collection.find_one({
            "email": email,
            "otp": otp_code,
            "created_at": {"$gte": datetime.utcnow() - timedelta(minutes=5)}
        })
        
        if not otp_record:
            return jsonify({"error": "Invalid or expired OTP"}), 400

        return jsonify({"message": "OTP verified successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reset_password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        new_password = data.get("new_password", "").strip()

        if len(new_password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400

        hashed_password = generate_password_hash(new_password)
        result = users_collection.update_one(
            {"email": email},
            {"$set": {"password": hashed_password}}
        )
        
        if result.modified_count == 1:
            return jsonify({"message": "Password reset successful!"})
        return jsonify({"error": "Failed to reset password"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/document/upload', methods=['POST'])
def upload_document():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({"error": "Email is required"}), 400

        update_data = {
            "first_name": data.get('first_name', ''),
            "last_name": data.get('last_name', ''),
            "education": data.get('education', ''),
            "skills": data.get('skills', []),
            "work_place": data.get('work_place', ''),
            "hobbies": data.get('hobbies', []),
            "git_id": data.get('git_id', ''),
            "linkedin_id": data.get('linkedin_id', ''),
            "updated_at": datetime.utcnow()
        }

        update_data = {k: v for k, v in update_data.items() if v}

        users_collection.update_one(
            {"email": email},
            {"$set": update_data},
            upsert=True
        )

        return jsonify({
            "message": "Profile updated successfully!",
            "first_name": data.get('first_name', '')
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ========== INTERVIEW ENDPOINTS ========== #
# @app.route('/api/questions', methods=['GET'])
# def get_questions():
#     try:
#         role = request.args.get("role", "").strip().lower()
#         interview_type = request.args.get("type", "technical").strip().lower()

#         if not role:
#             return jsonify({"error": "No role specified"}), 400

#         questions = list(questions_collection.find(
#             {"role": role, "type": interview_type},
#             {"_id": 0, "question": 1, "correct_answer": 1, "keywords": 1, "difficulty": 1}
#         ).sort("difficulty", 1))

#         if not questions:
#             questions = [
#                 {
#                     "question": "Describe your work ethic in three words.",
#                     "correct_answer": "Flexible hardworking and confident",
#                     "keywords": ["flexible", "hardworking", "confident"],
#                     "difficulty": "easy"
#                 },
#                 {
#                     "question": "What is your greatest strength?",
#                     "correct_answer": "One of my biggest strengths is my problem-solving ability...",
#                     "keywords": ["problem-solving", "strength", "example"],
#                     "difficulty": "easy"
#                 }
#             ]

#         return jsonify({"questions": questions})
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

@app.route('/api/questions', methods=['GET'])
def get_questions():
    try:
        role = request.args.get("role", "").strip().lower()
        interview_type = request.args.get("type", "technical").strip().lower()

        if not role:
            return jsonify({"error": "No role specified"}), 400

        # Include question IDs in the response
        questions = list(questions_collection.find(
            {"role": role, "type": interview_type},
            {"_id": 0, "id": 1, "question": 1, "correct_answer": 1, "keywords": 1, "difficulty": 1}
        ).sort("difficulty", 1))

        if not questions:
            questions = [
                {
                    "id": "q1",
                    "question": "Describe your work ethic in three words.",
                    "correct_answer": "Flexible hardworking and confident",
                    "keywords": ["flexible", "hardworking", "confident"],
                    "difficulty": "easy"
                },
                {
                    "id": "q2",
                    "question": "What is your greatest strength?",
                    "correct_answer": "One of my biggest strengths is my problem-solving ability...",
                    "keywords": ["problem-solving", "strength", "example"],
                    "difficulty": "easy"
                }
            ]

        # Ensure each question has an ID
        for i, q in enumerate(questions):
            if "id" not in q:
                q["id"] = f"q{i+1}"

        return jsonify({"questions": questions})
    except Exception as e:
        print(f"Error fetching questions: {str(e)}")
        return jsonify({"error": "Failed to fetch questions"}), 500

@app.route('/api/submit_answer', methods=['POST', 'OPTIONS'])
def submit_answer():
    if request.method == 'OPTIONS':
        response = jsonify({"message": "CORS preflight"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "*")
        response.headers.add("Access-Control-Allow-Methods", "*")
        return response

    try:
        data = request.get_json()
        print("Received submission:", data)
        
        required_fields = ['email', 'question', 'answer', 'role']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        question = questions_collection.find_one(
            {"question": data['question'], "role": data['role']},
            {"correct_answer": 1, "keywords": 1}
        )

        if not question:
            question = {
                "correct_answer": "No reference answer available",
                "keywords": []
            }

        evaluation = evaluate_answer(
            user_answer=data['answer'],
            correct_answer=question.get('correct_answer', ''),
            keywords=question.get('keywords', [])
        )

        answer_data = {
            "email": data['email'],
            "question": data['question'],
            "user_answer": data['answer'],
            "correct_answer": question.get('correct_answer', ''),
            "role": data['role'],
            "evaluation": evaluation,
            "timestamp": datetime.utcnow()
        }
        
        answers_collection.insert_one(answer_data)

        response = jsonify({
            "message": "Answer submitted successfully",
            "evaluation": evaluation
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    except Exception as e:
        print("Submission error:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload_resume', methods=['POST'])
def upload_resume():
    try:
        if 'resume' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['resume']
        email = request.form.get('email', '').strip().lower()
        
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400

        filename = secure_filename(f"{email}_{uuid.uuid4().hex[:8]}_{file.filename}")
        filepath = os.path.join(app.config['RESUME_UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        users_collection.update_one(
            {"email": email},
            {"$set": {"resume": filename}},
            upsert=True
        )
        
        return jsonify({
            "message": "Resume uploaded successfully",
            "filename": filename
        })
    except Exception as e:
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": str(e)}), 500

@app.route('/api/resume/<filename>', methods=['GET'])
def get_resume(filename):
    try:
        return send_from_directory(
            app.config['RESUME_UPLOAD_FOLDER'],
            filename,
            as_attachment=True
        )
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save_interview', methods=['POST'])
def save_interview():
    try:
        data = request.get_json()
        required_fields = ['email', 'role', 'interviewType', 'scheduledTime']
        
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        user = users_collection.find_one(
            {"email": data['email']},
            {"resume": 1, "first_name": 1, "last_name": 1}
        )

        interview_data = {
            "user_email": data['email'],
            "user_name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
            "role": data['role'],
            "interview_type": data['interviewType'],
            "knowledge_domain": data.get('knowledgeDomain', 'general'),
            "scheduled_time": datetime.fromisoformat(data['scheduledTime']),
            "status": "scheduled",
            "resume": user.get('resume', '') if user else '',
            "created_at": datetime.utcnow()
        }
        
        interviews_collection.insert_one(interview_data)
        return jsonify({"message": "Interview scheduled successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/monitor_face', methods=['POST'])
def monitor_face():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        status = data.get("status", "")

        if not email or not status:
            return jsonify({"error": "Missing required data"}), 400

        focus_logs_collection.insert_one({
            "email": email,
            "status": status,
            "timestamp": datetime.utcnow()
        })
        
        return jsonify({"message": "Focus status logged!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/user_interview_data', methods=['GET'])
def get_user_interview_data():
    try:
        email = request.args.get('email', '').strip().lower()
        if not email:
            return jsonify({"error": "Email parameter is required"}), 400

        answers = list(answers_collection.find(
            {"email": email},
            {"_id": 0, "question": 1, "user_answer": 1, "evaluation": 1, "timestamp": 1}
        ).sort("timestamp", -1))

        if not answers:
            return jsonify({"error": "No interview data found"}), 404

        total_questions = len(answers)
        avg_score = sum(a['evaluation']['score'] for a in answers) / total_questions
        focus_data = list(focus_logs_collection.find(
            {"email": email},
            {"_id": 0, "status": 1, "timestamp": 1}
        ).sort("timestamp", -1))

        feedback_by_question = []
        for answer in answers:
            feedback_by_question.append({
                "question": answer['question'],
                "your_answer": answer['user_answer'],
                "score": answer['evaluation']['score'],
                "feedback": answer['evaluation']['feedback'],
                "suggestion": answer['evaluation']['suggestion'],
                "keywords": answer['evaluation'].get('matched_keywords', []),
                "timestamp": answer['timestamp']
            })

        return jsonify({
            "total_questions": total_questions,
            "average_score": avg_score,
            "feedback_by_question": feedback_by_question,
            "focus_analysis": analyze_focus_data(focus_data),
            "weaknesses": identify_weaknesses(answers),
            "strengths": identify_strengths(answers)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def analyze_focus_data(focus_data):
    if not focus_data:
        return {}
    
    total = len(focus_data)
    focused = len([f for f in focus_data if f['status'] == 'user_focused'])
    return {
        "focus_percentage": focused / total,
        "distractions": total - focused
    }

def identify_weaknesses(answers):
    low_scoring = [a for a in answers if a['evaluation']['score'] < 0.6]
    weak_topics = {}
    
    for answer in low_scoring:
        topic = answer.get('role', 'general')
        if topic not in weak_topics:
            weak_topics[topic] = []
        weak_topics[topic].append(answer)
    
    return [
        {
            "topic": topic,
            "count": len(answers),
            "average_score": sum(a['evaluation']['score'] for a in answers) / len(answers),
            "questions": [a['question'] for a in answers[:3]]
        }
        for topic, answers in weak_topics.items()
    ]

def identify_strengths(answers):
    high_scoring = [a for a in answers if a['evaluation']['score'] >= 0.8]
    strong_topics = {}
    
    for answer in high_scoring:
        topic = answer.get('role', 'general')
        if topic not in strong_topics:
            strong_topics[topic] = []
        strong_topics[topic].append(answer)
    
    return [
        {
            "topic": topic,
            "count": len(answers),
            "average_score": sum(a['evaluation']['score'] for a in answers) / len(answers),
            "keywords": list(set(
                kw for a in answers 
                for kw in a['evaluation'].get('matched_keywords', [])
            ))[:5]
        }
        for topic, answers in strong_topics.items()
    ]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)