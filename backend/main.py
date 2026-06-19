
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import requests
from pydantic import BaseModel
import logging

import mysql.connector

def get_db_cursor():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    return conn, cursor

# MySQL configuration
db_config = {
    "host":"localhost",
    "user":"root",
    "password":"Nag@1234",
    "database":"interview_practice"
}

# -----------------------------------
# ALLOWED ORIGINS
# -----------------------------------
origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200"
]

app = FastAPI()

# -----------------------------------
# ADD CORS MIDDLEWARE
# -----------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------
# REQUEST MODEL
# -----------------------------------
class QARequest(BaseModel):
    topic: str
    job_role: str
    difficulty: str
    question: str
    answer: str
    answer_comment: str

@app.get("/")
def home():
    return {"message": "FastAPI + Ollama Running"}


@app.post("/add_question_answer")
def add_question_answer(question_answer_request: QARequest):
    conn, cursor = get_db_cursor()
    try:
        qa_pair = {       
            "topic": question_answer_request.topic,
            "job_role": question_answer_request.job_role,
            "difficulty": question_answer_request.difficulty,
            "question": question_answer_request.question,
            "answer": question_answer_request.answer,
            "answer_comment": question_answer_request.answer_comment
        }
        
        query = """
            INSERT INTO interview_questions (topic, job_role, difficulty, question, answer, answer_comment)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        values = (
            qa_pair["topic"],
            qa_pair["job_role"],
            qa_pair["difficulty"],
            qa_pair["question"],
            qa_pair["answer"],
            qa_pair["answer_comment"]
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
