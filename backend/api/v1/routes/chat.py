from datetime import datetime
import logging
import re
from fastapi import APIRouter, HTTPException, BackgroundTasks
from core.database import get_db_cursor
from api.v1.schemas.chat_schema import (
    TopicRequest, RoleRequest, UpdateTopicRequest, UpdateRoleRequest,
    CreateSessionRequest, UpdateSessionStatusRequest, CheckProgressRequest,
    QARequest, QuestionFilterRequest, UpdateQARequest, DeleteQARequest,
    SignupRequest, LoginRequest, PasswordResetRequest, UpdateProfileRequest,
    SubmitAnswerRequest
)
from api.v1.services.chat_service import background_evaluate_answer

router = APIRouter()

# -----------------------------------
# ADMIN ENDPOINTS
# -----------------------------------
@router.get("/admin/dashboard_stats")
def get_dashboard_stats():
    conn, cursor = get_db_cursor()
    try:
        # 1. Total questions count
        cursor.execute("SELECT COUNT(*) FROM interview_questions")
        total_questions = cursor.fetchone()[0]
        
        # 2. Get distinct topics in database and custom ones
        cursor.execute("SELECT name FROM custom_topics")
        custom_topics = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT DISTINCT topic FROM interview_questions WHERE topic IS NOT NULL AND topic != ''")
        existing_topics = [row[0] for row in cursor.fetchall()]
        all_topics = sorted(list(set(custom_topics + existing_topics)))
        total_topics = len(all_topics)
        
        # 3. Get distinct roles in database and custom ones
        cursor.execute("SELECT name FROM custom_roles")
        custom_roles = [row[0] for row in cursor.fetchall()]
        cursor.execute("SELECT DISTINCT job_role FROM interview_questions WHERE job_role IS NOT NULL AND job_role != ''")
        existing_roles = [row[0] for row in cursor.fetchall()]
        all_roles = sorted(list(set(custom_roles + existing_roles)))
        total_roles = len(all_roles)
        
        # 4. Each topic question count
        cursor.execute("SELECT topic, COUNT(*) FROM interview_questions WHERE topic IS NOT NULL AND topic != '' GROUP BY topic")
        topic_counts_raw = dict(cursor.fetchall())
        topic_stats = [{"name": t, "question_count": topic_counts_raw.get(t, 0)} for t in all_topics]
        
        # 5. Each role question count
        cursor.execute("SELECT job_role, COUNT(*) FROM interview_questions WHERE job_role IS NOT NULL AND job_role != '' GROUP BY job_role")
        role_counts_raw = dict(cursor.fetchall())
        role_stats = [{"name": r, "question_count": role_counts_raw.get(r, 0)} for r in all_roles]
        
        # 6. Interview sessions and statuses
        session_query = """
            SELECT s.session_id, s.user_id, u.name as user_name, s.interview_name, s.start_time, s.total_questions, s.status, s.created_at, s.total_score, s.end_time 
            FROM interview_sessions s 
            LEFT JOIN users u ON s.user_id = u.user_id 
            ORDER BY s.created_at DESC
        """
        cursor.execute(session_query)
        sessions_rows = cursor.fetchall()
        
        sessions = []
        for s in sessions_rows:
            sessions.append({
                "session_id": s[0],
                "user_id": s[1],
                "user_name": s[2] if s[2] else "Unknown User",
                "interview_name": s[3],
                "start_time": s[4].isoformat() if s[4] else None,
                "total_questions": s[5],
                "status": s[6],
                "created_at": s[7].isoformat() if s[7] else None,
                "total_score": float(s[8]) if s[8] is not None else None,
                "end_time": s[9].isoformat() if s[9] else None
            })
            
        return {
            "status": "success",
            "total_questions": total_questions,
            "total_topics": total_topics,
            "total_roles": total_roles,
            "topics": topic_stats,
            "roles": role_stats,
            "sessions": sessions
        }
    except Exception as e:
        logging.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/admin/create_topic")
def create_topic(request: TopicRequest):
    conn, cursor = get_db_cursor()
    try:
        name = request.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Topic name cannot be empty.")
        
        cursor.execute("INSERT INTO custom_topics (name) VALUES (%s) ON DUPLICATE KEY UPDATE name=name", (name,))
        
        # Delete old mappings if any
        cursor.execute("DELETE FROM topic_role_mapping WHERE topic_name = %s", (name,))
        if request.roles:
            cursor.executemany(
                "INSERT INTO topic_role_mapping (topic_name, role_name) VALUES (%s, %s) ON DUPLICATE KEY UPDATE topic_name=topic_name",
                [(name, r.strip()) for r in request.roles if r.strip()]
            )
            
        conn.commit()
        return {"status": "success", "message": f"Topic '{name}' created successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/admin/create_role")
def create_role(request: RoleRequest):
    conn, cursor = get_db_cursor()
    try:
        name = request.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Role name cannot be empty.")
        
        cursor.execute("INSERT INTO custom_roles (name) VALUES (%s) ON DUPLICATE KEY UPDATE name=name", (name,))
        
        # Delete old mappings if any
        cursor.execute("DELETE FROM topic_role_mapping WHERE role_name = %s", (name,))
        if request.topics:
            cursor.executemany(
                "INSERT INTO topic_role_mapping (topic_name, role_name) VALUES (%s, %s) ON DUPLICATE KEY UPDATE topic_name=topic_name",
                [(t.strip(), name) for t in request.topics if t.strip()]
            )
            
        conn.commit()
        return {"status": "success", "message": f"Role '{name}' created successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/admin/topics")
def get_topics():
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT name FROM custom_topics")
        custom = [row[0] for row in cursor.fetchall()]
        
        cursor.execute("SELECT DISTINCT topic FROM interview_questions WHERE topic IS NOT NULL AND topic != ''")
        existing = [row[0] for row in cursor.fetchall()]
        
        all_topics = sorted(list(set(custom + existing)))
        
        cursor.execute("SELECT topic_name, role_name FROM topic_role_mapping")
        mappings = cursor.fetchall()
        
        topic_to_roles = {}
        for t, r in mappings:
            if t not in topic_to_roles:
                topic_to_roles[t] = []
            topic_to_roles[t].append(r)
            
        result = []
        for t in all_topics:
            result.append({
                "name": t,
                "roles": topic_to_roles.get(t, [])
            })
            
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/admin/roles")
def get_roles():
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT name FROM custom_roles")
        custom = [row[0] for row in cursor.fetchall()]
        
        cursor.execute("SELECT DISTINCT job_role FROM interview_questions WHERE job_role IS NOT NULL AND job_role != ''")
        existing = [row[0] for row in cursor.fetchall()]
        
        all_roles = sorted(list(set(custom + existing)))
        
        cursor.execute("SELECT topic_name, role_name FROM topic_role_mapping")
        mappings = cursor.fetchall()
        
        role_to_topics = {}
        for t, r in mappings:
            if r not in role_to_topics:
                role_to_topics[r] = []
            role_to_topics[r].append(t)
            
        result = []
        for r in all_roles:
            result.append({
                "name": r,
                "topics": role_to_topics.get(r, [])
            })
            
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.put("/admin/update_topic")
def update_topic(request: UpdateTopicRequest):
    conn, cursor = get_db_cursor()
    try:
        old_name = request.old_name.strip()
        new_name = request.new_name.strip()
        
        if not old_name or not new_name:
            raise HTTPException(status_code=400, detail="Topic names cannot be empty.")
            
        cursor.execute("SELECT COUNT(*) FROM custom_topics WHERE name = %s", (old_name,))
        if cursor.fetchone()[0] > 0:
            if old_name != new_name:
                cursor.execute("SELECT COUNT(*) FROM custom_topics WHERE name = %s", (new_name,))
                if cursor.fetchone()[0] > 0:
                    raise HTTPException(status_code=400, detail=f"Topic '{new_name}' already exists.")
                cursor.execute("INSERT INTO custom_topics (name) VALUES (%s)", (new_name,))
                cursor.execute("UPDATE topic_role_mapping SET topic_name = %s WHERE topic_name = %s", (new_name, old_name))
                cursor.execute("DELETE FROM custom_topics WHERE name = %s", (old_name,))
        else:
            cursor.execute("INSERT INTO custom_topics (name) VALUES (%s) ON DUPLICATE KEY UPDATE name=name", (new_name,))
            
        cursor.execute("UPDATE interview_questions SET topic = %s WHERE topic = %s", (new_name, old_name))
        
        cursor.execute("DELETE FROM topic_role_mapping WHERE topic_name = %s", (new_name,))
        if request.roles:
            cursor.executemany(
                "INSERT INTO topic_role_mapping (topic_name, role_name) VALUES (%s, %s) ON DUPLICATE KEY UPDATE topic_name=topic_name",
                [(new_name, r.strip()) for r in request.roles if r.strip()]
            )
            
        conn.commit()
        return {"status": "success", "message": f"Topic '{old_name}' updated to '{new_name}' successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.put("/admin/update_role")
def update_role(request: UpdateRoleRequest):
    conn, cursor = get_db_cursor()
    try:
        old_name = request.old_name.strip()
        new_name = request.new_name.strip()
        
        if not old_name or not new_name:
            raise HTTPException(status_code=400, detail="Role names cannot be empty.")
            
        cursor.execute("SELECT COUNT(*) FROM custom_roles WHERE name = %s", (old_name,))
        if cursor.fetchone()[0] > 0:
            if old_name != new_name:
                cursor.execute("SELECT COUNT(*) FROM custom_roles WHERE name = %s", (new_name,))
                if cursor.fetchone()[0] > 0:
                    raise HTTPException(status_code=400, detail=f"Role '{new_name}' already exists.")
                cursor.execute("INSERT INTO custom_roles (name) VALUES (%s)", (new_name,))
                cursor.execute("UPDATE topic_role_mapping SET role_name = %s WHERE role_name = %s", (new_name, old_name))
                cursor.execute("DELETE FROM custom_roles WHERE name = %s", (old_name,))
        else:
            cursor.execute("INSERT INTO custom_roles (name) VALUES (%s) ON DUPLICATE KEY UPDATE name=name", (new_name,))
            
        cursor.execute("UPDATE interview_questions SET job_role = %s WHERE job_role = %s", (new_name, old_name))
        
        cursor.execute("DELETE FROM topic_role_mapping WHERE role_name = %s", (new_name,))
        if request.topics:
            cursor.executemany(
                "INSERT INTO topic_role_mapping (topic_name, role_name) VALUES (%s, %s) ON DUPLICATE KEY UPDATE topic_name=topic_name",
                [(t.strip(), new_name) for t in request.topics if t.strip()]
            )
            
        conn.commit()
        return {"status": "success", "message": f"Role '{old_name}' updated to '{new_name}' successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.delete("/admin/delete_topic/{name}")
def delete_topic(name: str):
    conn, cursor = get_db_cursor()
    try:
        name = name.strip()
        cursor.execute("DELETE FROM custom_topics WHERE name = %s", (name,))
        cursor.execute("DELETE FROM topic_role_mapping WHERE topic_name = %s", (name,))
        cursor.execute("UPDATE interview_questions SET topic = '' WHERE topic = %s", (name,))
        conn.commit()
        return {"status": "success", "message": f"Topic '{name}' deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.delete("/admin/delete_role/{name}")
def delete_role(name: str):
    conn, cursor = get_db_cursor()
    try:
        name = name.strip()
        cursor.execute("DELETE FROM custom_roles WHERE name = %s", (name,))
        cursor.execute("DELETE FROM topic_role_mapping WHERE role_name = %s", (name,))
        cursor.execute("UPDATE interview_questions SET job_role = '' WHERE job_role = %s", (name,))
        conn.commit()
        return {"status": "success", "message": f"Role '{name}' deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/admin/sessions")
def get_sessions():
    conn, cursor = get_db_cursor()
    try:
        session_query = """
            SELECT s.session_id, s.user_id, u.name as user_name, s.interview_name, s.start_time, s.total_questions, s.status, s.created_at, s.total_score, s.end_time 
            FROM interview_sessions s 
            LEFT JOIN users u ON s.user_id = u.user_id 
            ORDER BY s.created_at DESC
        """
        cursor.execute(session_query)
        sessions_rows = cursor.fetchall()
        
        sessions = []
        for s in sessions_rows:
            sessions.append({
                "session_id": s[0],
                "user_id": s[1],
                "user_name": s[2] if s[2] else "Unknown User",
                "interview_name": s[3],
                "start_time": s[4].isoformat() if s[4] else None,
                "total_questions": s[5],
                "status": s[6],
                "created_at": s[7].isoformat() if s[7] else None,
                "total_score": float(s[8]) if s[8] is not None else None,
                "end_time": s[9].isoformat() if s[9] else None
            })
        return {"status": "success", "data": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.delete("/admin/delete_session/{session_id}")
def delete_session(session_id: int):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("DELETE FROM candidate_answers WHERE session_id = %s", (session_id,))
        cursor.execute("DELETE FROM interview_sessions WHERE session_id = %s", (session_id,))
        conn.commit()
        return {"status": "success", "message": f"Session #{session_id} deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/admin/users")
def get_users():
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT user_id, name, emailid FROM users ORDER BY name")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "user_id": r[0],
                "name": r[1],
                "emailid": r[2]
            })
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/admin/create_session")
def admin_create_session(request: CreateSessionRequest):
    conn, cursor = get_db_cursor()
    try:
        user_id = request.user_id
        topic = request.topic.strip()
        job_role = request.job_role.strip()
        difficulty = request.difficulty.strip()
        limit = request.limit
        
        # 1. Fetch matching questions from database
        query = "SELECT q_id, topic, job_role, difficulty, question, answer, answer_comment FROM interview_questions"
        where_clauses = []
        values = []
        
        if topic:
            where_clauses.append("topic = %s")
            values.append(topic)
        if job_role:
            where_clauses.append("job_role = %s")
            values.append(job_role)
        if difficulty:
            where_clauses.append("difficulty = %s")
            values.append(difficulty)
            
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
            
        if isinstance(limit, int):
            query += " ORDER BY q_id DESC LIMIT %s"
            values.append(limit)
        elif isinstance(limit, str) and limit.strip().lower() == "all":
            query += " ORDER BY q_id DESC"
        else:
            try:
                limit_int = int(limit)
                query += " ORDER BY q_id DESC LIMIT %s"
                values.append(limit_int)
            except ValueError:
                query += " ORDER BY q_id DESC"
        
        cursor.execute(query, tuple(values))
        rows = cursor.fetchall()
        
        if not rows:
            raise HTTPException(status_code=400, detail="No questions match the selected Topic / Job Role criteria in the database. Please add questions first.")

        # 2. Insert into interview_sessions
        session_query = """
            INSERT INTO interview_sessions (user_id, interview_name, start_time, total_questions, status)
            VALUES (%s, %s, %s, %s, %s)
        """
        interview_name = ""
        if topic and job_role:
            interview_name = f"{topic} ({job_role})"
        elif topic:
            interview_name = topic
        elif job_role:
            interview_name = job_role
        else:
            interview_name = "General Interview"

        session_values = (
            user_id,
            interview_name,
            None,
            len(rows),
            "CREATED"
        )
        cursor.execute(session_query, session_values)
        session_id = cursor.lastrowid
        
        # 3. Populate candidate_answers table
        ans_insert_query = """
            INSERT INTO candidate_answers (session_id, q_id, user_id)
            VALUES (%s, %s, %s)
        """
        for r in rows:
            q_id = r[0]
            cursor.execute(ans_insert_query, (session_id, q_id, user_id))
            
        conn.commit()
        return {"status": "success", "session_id": session_id, "message": "Interview session created successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error in admin_create_session: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# -----------------------------------
# AUTH ENDPOINTS
# -----------------------------------
@router.post("/signup")
def signup(signup_request: SignupRequest):
    conn, cursor = get_db_cursor()
    try:
        login_id = signup_request.login_id.strip().lower()
        if not re.match(r'^[a-z0-9_\-]+$', login_id):
            raise HTTPException(status_code=400, detail="Login ID can only contain letters, numbers, hyphens or underscores.")
        if len(login_id) < 3:
            raise HTTPException(status_code=400, detail="Login ID must be at least 3 characters long.")
            
        # Check email uniqueness
        cursor.execute("SELECT user_id FROM users WHERE emailid = %s", (signup_request.emailid.strip(),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email ID is already registered.")

        # Check login_id uniqueness
        cursor.execute("SELECT user_id FROM users WHERE login_id = %s", (login_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Login ID is already taken.")
            
        insert_query = """
            INSERT INTO users (name, emailid, login_id, password)
            VALUES (%s, %s, %s, %s)
        """
        values = (
            signup_request.name.strip(),
            signup_request.emailid.strip(),
            login_id,
            signup_request.password
        )
        cursor.execute(insert_query, values)
        conn.commit()
        
        logging.info(f"User registered successfully: {signup_request.emailid} / {login_id}")
        return {"status": "success", "message": "User registered successfully."}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error in signup: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/login")
def login(login_request: LoginRequest):
    conn, cursor = get_db_cursor()
    try:
        identifier = login_request.emailid.strip().lower()
        query = "SELECT user_id, name, emailid, password, photo, login_id FROM users WHERE emailid = %s OR login_id = %s"
        cursor.execute(query, (identifier, identifier))
        user = cursor.fetchone()
        
        if not user or user[3] != login_request.password:
            raise HTTPException(status_code=401, detail="Invalid email/login ID or password.")
            
        logging.info(f"User logged in: {identifier}")
        return {
            "status": "success",
            "message": "Login successful.",
            "user": {
                "user_id": user[0],
                "name": user[1],
                "emailid": user[2],
                "password": user[3],
                "photo": user[4],
                "login_id": user[5]
            }
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error in login: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/update_profile")
def update_profile(request: UpdateProfileRequest):
    conn, cursor = get_db_cursor()
    try:
        login_id = request.login_id.strip().lower()
        if not re.match(r'^[a-z0-9_\-]+$', login_id):
            raise HTTPException(status_code=400, detail="Login ID can only contain letters, numbers, hyphens or underscores.")
        if len(login_id) < 3:
            raise HTTPException(status_code=400, detail="Login ID must be at least 3 characters long.")

        # Check if email is already taken by another user
        check_query = "SELECT user_id FROM users WHERE emailid = %s AND user_id != %s"
        cursor.execute(check_query, (request.emailid.strip(), request.user_id))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email ID is already registered by another user.")
            
        # Check if login_id is already taken by another user
        check_login_query = "SELECT user_id FROM users WHERE login_id = %s AND user_id != %s"
        cursor.execute(check_login_query, (login_id, request.user_id))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Login ID is already registered by another user.")

        update_query = """
            UPDATE users 
            SET name = %s, emailid = %s, login_id = %s, password = %s, photo = %s
            WHERE user_id = %s
        """
        values = (
            request.name.strip(),
            request.emailid.strip(),
            login_id,
            request.password,
            request.photo,
            request.user_id
        )
        cursor.execute(update_query, values)
        conn.commit()
        
        logging.info(f"User profile updated successfully: User ID {request.user_id}")
        return {
            "status": "success",
            "message": "Profile updated successfully.",
            "user": {
                "user_id": request.user_id,
                "name": request.name.strip(),
                "emailid": request.emailid.strip(),
                "login_id": login_id,
                "password": request.password,
                "photo": request.photo
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error in update_profile: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/check_login_id")
def check_login_id(login_id: str, exclude_user_id: int | None = None):
    conn, cursor = get_db_cursor()
    try:
        val = login_id.strip().lower()
        if len(val) < 3:
            return {"available": False, "suggestions": []}
            
        if exclude_user_id:
            query = "SELECT COUNT(*) FROM users WHERE login_id = %s AND user_id != %s"
            cursor.execute(query, (val, exclude_user_id))
        else:
            query = "SELECT COUNT(*) FROM users WHERE login_id = %s"
            cursor.execute(query, (val,))
            
        count = cursor.fetchone()[0]
        if count == 0:
            return {"available": True, "suggestions": []}
            
        suggestions = []
        suffixes = ["123", "_ai", "_practice", "2026", "_job"]
        for suffix in suffixes:
            candidate = f"{val}{suffix}"
            cursor.execute("SELECT COUNT(*) FROM users WHERE login_id = %s", (candidate,))
            if cursor.fetchone()[0] == 0:
                suggestions.append(candidate)
            if len(suggestions) >= 3:
                break
                
        return {"available": False, "suggestions": suggestions}
    except Exception as e:
        logging.error(f"Error in check_login_id: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/password_reset")
def password_reset(reset_request: PasswordResetRequest):
    conn, cursor = get_db_cursor()
    try:
        check_query = "SELECT user_id FROM users WHERE emailid = %s"
        cursor.execute(check_query, (reset_request.emailid,))
        existing_user = cursor.fetchone()
        
        if not existing_user:
            raise HTTPException(status_code=404, detail="Email ID not found.")
            
        update_query = "UPDATE users SET password = %s WHERE emailid = %s"
        cursor.execute(update_query, (reset_request.new_password, reset_request.emailid))
        conn.commit()
        
        logging.info(f"Password reset success for user: {reset_request.emailid}")
        return {"status": "success", "message": "Password reset successfully."}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error in password_reset: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# -----------------------------------
# INTERVIEW ENDPOINTS
# -----------------------------------
@router.post("/generate_question_answer")
def generate_question_answer(filter_request: QuestionFilterRequest):
    conn, cursor = get_db_cursor()
    try:
        topic = filter_request.topic
        job_role = filter_request.job_role
        difficulty = filter_request.difficulty
        limit = filter_request.limit
        user_id = filter_request.user_id

        # Validate user_id or fallback
        if user_id:
            cursor.execute("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
            if not cursor.fetchone():
                cursor.execute("SELECT user_id FROM users LIMIT 1")
                row = cursor.fetchone()
                if row:
                    user_id = row[0]
                else:
                    cursor.execute("INSERT INTO users (name, emailid, password) VALUES (%s, %s, %s)", 
                                   ("Test User", "testuser@example.com", "password"))
                    conn.commit()
                    user_id = cursor.lastrowid
        else:
            cursor.execute("SELECT user_id FROM users LIMIT 1")
            row = cursor.fetchone()
            if row:
                user_id = row[0]
            else:
                cursor.execute("INSERT INTO users (name, emailid, password) VALUES (%s, %s, %s)", 
                               ("Test User", "testuser@example.com", "password"))
                conn.commit()
                user_id = cursor.lastrowid

        # Fetch questions
        query = "SELECT q_id, topic, job_role, difficulty, question, answer, answer_comment, date_of_entry FROM interview_questions"
        where_clauses = []
        values = []
        
        if topic:
            where_clauses.append("topic = %s")
            values.append(topic)
        if job_role:
            where_clauses.append("job_role = %s")
            values.append(job_role)
        if difficulty:
            where_clauses.append("difficulty = %s")
            values.append(difficulty)
            
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
            
        if isinstance(limit, int):
            query += " ORDER BY q_id DESC LIMIT %s"
            values.append(limit)
        elif isinstance(limit, str) and limit.strip().lower() == "all":
            query += " ORDER BY q_id DESC"
        else:
            try:
                limit_int = int(limit)
                query += " ORDER BY q_id DESC LIMIT %s"
                values.append(limit_int)
            except ValueError:
                query += " ORDER BY q_id DESC"
        
        cursor.execute(query, tuple(values))
        rows = cursor.fetchall()
        
        columns = [col[0] for col in cursor.description]
        results = []
        for row in rows:
            row_dict = dict(zip(columns, row))
            if "date_of_entry" in row_dict and row_dict["date_of_entry"]:
                row_dict["date_of_entry"] = row_dict["date_of_entry"].isoformat()
            results.append(row_dict)

        # Generate session
        session_query = """
            INSERT INTO interview_sessions (user_id, interview_name, start_time, total_questions, status)
            VALUES (%s, %s, %s, %s, %s)
        """
        session_values = (
            user_id,
            topic if topic else "General",
            None,
            len(results),
            "CREATED"
        )
        cursor.execute(session_query, session_values)
        conn.commit()
        session_id = cursor.lastrowid

        # Insert candidate_answers link rows
        ans_insert_query = """
            INSERT INTO candidate_answers (session_id, q_id, user_id)
            VALUES (%s, %s, %s)
        """
        for q in results:
            q_id = q.get("q_id")
            cursor.execute(ans_insert_query, (session_id, q_id, user_id))
        conn.commit()
            
        return {"status": "success", "session_id": session_id, "count": len(results), "data": results}

    except Exception as e:
        logging.error(f"Error in generate_question_answer: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/answers_result")
def answers_result(answer_request: SubmitAnswerRequest, background_tasks: BackgroundTasks):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute(
            "SELECT question, answer, answer_comment FROM interview_questions WHERE q_id = %s",
            (answer_request.q_id,)
        )
        row = cursor.fetchone()
        if not row:
            logging.warning(f"Question with q_id {answer_request.q_id} not found in database.")
            question = ""
            default_answer = ""
            answer_comment = ""
        else:
            question = row[0]
            default_answer = row[1]
            answer_comment = row[2]

        # Record answer immediately and reset evaluation scores
        query = """
            UPDATE candidate_answers 
            SET candidate_answer = %s, score = 0, llm_comment = ''
            WHERE session_id = %s AND user_id = %s AND q_id = %s
        """
        values = (
            answer_request.candidate_answer,
            answer_request.session_id,
            answer_request.user_id,
            answer_request.q_id
        )
        cursor.execute(query, values)
        conn.commit()
        logging.info(f"Recorded candidate answer immediately for session_id: {answer_request.session_id}, q_id: {answer_request.q_id}")

        # Schedule background task evaluation
        background_tasks.add_task(
            background_evaluate_answer,
            answer_request.session_id,
            answer_request.user_id,
            answer_request.q_id,
            answer_request.candidate_answer,
            question,
            default_answer,
            answer_comment
        )

        return {
            "status": "success", 
            "message": "Candidate answer recorded. Evaluation scheduled in background."
        }
    except Exception as e:
        logging.error(f"Error in answers_result: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/sessions/{session_id}/questions")
def get_session_questions(session_id: int):
    conn, cursor = get_db_cursor()
    try:
        cursor.execute("SELECT status FROM interview_sessions WHERE session_id = %s", (session_id,))
        session_row = cursor.fetchone()
        if not session_row:
            raise HTTPException(status_code=404, detail="Session not found.")
            
        status = session_row[0]
        
        query = """
            SELECT q.q_id, q.topic, q.job_role, q.difficulty, q.question, q.answer, q.answer_comment,
                   a.candidate_answer, a.score, a.llm_comment
            FROM candidate_answers a
            JOIN interview_questions q ON a.q_id = q.q_id
            WHERE a.session_id = %s
            ORDER BY a.q_id ASC
        """
        cursor.execute(query, (session_id,))
        rows = cursor.fetchall()
        
        questions = []
        for r in rows:
            questions.append({
                "q_id": r[0],
                "topic": r[1],
                "job_role": r[2],
                "difficulty": r[3],
                "question": r[4],
                "answer": r[5],
                "answer_comment": r[6],
                "candidate_answer": r[7] if r[7] else "",
                "score": r[8] if r[8] is not None else 0,
                "llm_comment": r[9] if r[9] else ""
            })
        return {"status": "success", "session_status": status, "data": questions}
    except Exception as e:
        logging.error(f"Error in get_session_questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/sessions/check_progress")
def check_progress(request: CheckProgressRequest):
    conn, cursor = get_db_cursor()
    try:
        query = """
            SELECT score, llm_comment 
            FROM candidate_answers 
            WHERE session_id = %s AND user_id = %s
        """
        cursor.execute(query, (request.session_id, request.user_id))
        rows = cursor.fetchall()
        
        if not rows:
            return {
                "status": "empty",
                "message": "No answers found for this session."
            }
            
        all_evaluated = True
        total_score = 0
        for score, comment in rows:
            if not comment or not comment.strip():
                all_evaluated = False
                break
            total_score += score if score is not None else 0
            
        if not all_evaluated:
            return {
                "status": "pending",
                "message": "AI evaluation is still in progress. Some questions do not have feedback yet."
            }
            
        update_query = """
            UPDATE interview_sessions 
            SET total_score = %s 
            WHERE session_id = %s AND user_id = %s
        """
        cursor.execute(update_query, (total_score, request.session_id, request.user_id))
        conn.commit()
        
        logging.info(f"Session {request.session_id} total score updated to {total_score}")
        return {
            "status": "success",
            "message": "All evaluations completed! Total score updated.",
            "total_score": total_score
        }
    except Exception as e:
        logging.error(f"Error checking progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/update_session_status")
def update_session_status(request: UpdateSessionStatusRequest):
    conn, cursor = get_db_cursor()
    try:
        status = request.status.strip().upper()
        if status not in ["CREATED", "NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ABANDONED"]:
            raise HTTPException(status_code=400, detail="Invalid session status.")
        
        cursor.execute("SELECT COUNT(*) FROM interview_sessions WHERE session_id = %s", (request.session_id,))
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="Session not found.")
            
        if status == "IN_PROGRESS":
            cursor.execute(
                "UPDATE interview_sessions SET status = %s, start_time = %s WHERE session_id = %s",
                (status, datetime.now(), request.session_id)
            )
        elif status == "COMPLETED":
            cursor.execute(
                "UPDATE interview_sessions SET status = %s, end_time = %s WHERE session_id = %s",
                (status, datetime.now(), request.session_id)
            )
        else:
            cursor.execute(
                "UPDATE interview_sessions SET status = %s WHERE session_id = %s",
                (status, request.session_id)
            )
        conn.commit()
        logging.info(f"Updated session {request.session_id} status to {status}")
        return {"status": "success", "message": f"Session status updated to {status}."}
    except HTTPException as he:
        raise he
    except Exception as e:
        logging.error(f"Error updating session status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/user/sessions/{user_id}")
def get_user_sessions(user_id: int):
    conn, cursor = get_db_cursor()
    try:
        session_query = """
            SELECT s.session_id, s.interview_name, s.start_time, s.total_questions, s.status, s.created_at, s.total_score, s.end_time 
            FROM interview_sessions s 
            WHERE s.user_id = %s
            ORDER BY s.created_at DESC
        """
        cursor.execute(session_query, (user_id,))
        sessions_rows = cursor.fetchall()
        
        sessions = []
        for s in sessions_rows:
            sessions.append({
                "session_id": s[0],
                "interview_name": s[1],
                "start_time": s[2].isoformat() if s[2] else None,
                "total_questions": s[3],
                "status": s[4],
                "created_at": s[5].isoformat() if s[5] else None,
                "total_score": float(s[6]) if s[6] is not None else None,
                "end_time": s[7].isoformat() if s[7] else None
            })
        return {"status": "success", "data": sessions}
    except Exception as e:
        logging.error(f"Error in get_user_sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# -----------------------------------
# QUESTION REPOSITORY ENDPOINTS
# -----------------------------------
@router.post("/add_question_answer")
def add_question_answer(question_answer_request: QARequest):
    conn, cursor = get_db_cursor()
    try:
        query = """
            INSERT INTO interview_questions (topic, job_role, difficulty, question, answer, answer_comment)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        values = (
            question_answer_request.topic,
            question_answer_request.job_role,
            question_answer_request.difficulty,
            question_answer_request.question,
            question_answer_request.answer,
            question_answer_request.answer_comment
        )
        cursor.execute(query, values)
        conn.commit()
        
        logging.info(f"Successfully added question-answer pair: {question_answer_request.topic}")
        return {"status": "success", "message": "Question and answer added successfully."}
    except Exception as e:
        logging.error(f"Error in add_question_answer: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/get_question_answer")
def get_question_answer(filter_request: QuestionFilterRequest):
    conn, cursor = get_db_cursor()
    try:
        topic = filter_request.topic
        job_role = filter_request.job_role
        difficulty = filter_request.difficulty
        limit = filter_request.limit

        query = "SELECT q_id, topic, job_role, difficulty, question, answer, answer_comment, date_of_entry FROM interview_questions"
        where_clauses = []
        values = []
        
        if topic:
            where_clauses.append("topic = %s")
            values.append(topic)
        if job_role:
            where_clauses.append("job_role = %s")
            values.append(job_role)
        if difficulty:
            where_clauses.append("difficulty = %s")
            values.append(difficulty)
            
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
            
        if isinstance(limit, int):
            query += " ORDER BY q_id DESC LIMIT %s"
            values.append(limit)
        elif isinstance(limit, str) and limit.strip().lower() == "all":
            query += " ORDER BY q_id DESC"
        else:
            try:
                limit_int = int(limit)
                query += " ORDER BY q_id DESC LIMIT %s"
                values.append(limit_int)
            except ValueError:
                query += " ORDER BY q_id DESC"
        
        cursor.execute(query, tuple(values))
        rows = cursor.fetchall()
        
        columns = [col[0] for col in cursor.description]
        results = []
        for row in rows:
            row_dict = dict(zip(columns, row))
            if "date_of_entry" in row_dict and row_dict["date_of_entry"]:
                row_dict["date_of_entry"] = row_dict["date_of_entry"].isoformat()
            results.append(row_dict)
            
        return {"status": "success", "count": len(results), "data": results}
    except Exception as e:
        logging.error(f"Error in get_question_answer: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/update_question_answer")
def update_question_answer(update_request: UpdateQARequest):
    conn, cursor = get_db_cursor()
    try:
        query = """
            UPDATE interview_questions 
            SET topic = %s, job_role = %s, difficulty = %s, question = %s, answer = %s, answer_comment = %s
            WHERE q_id = %s
        """
        values = (
            update_request.topic,
            update_request.job_role,
            update_request.difficulty,
            update_request.question,
            update_request.answer,
            update_request.answer_comment,
            update_request.q_id
        )
        cursor.execute(query, values)
        conn.commit()
        logging.info(f"Successfully updated question-answer pair: ID {update_request.q_id}")
        return {"status": "success", "message": "Question and answer updated successfully."}
    except Exception as e:
        logging.error(f"Error in update_question_answer: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/delete_question_answer")
def delete_question_answer(delete_request: DeleteQARequest):
    conn, cursor = get_db_cursor()
    try:
        query = "DELETE FROM interview_questions WHERE q_id = %s"
        cursor.execute(query, (delete_request.q_id,))
        conn.commit()
        logging.info(f"Successfully deleted question-answer pair: ID {delete_request.q_id}")
        return {"status": "success", "message": "Question and answer deleted successfully."}
    except Exception as e:
        logging.error(f"Error in delete_question_answer: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    finally:
        cursor.close()
        conn.close()
