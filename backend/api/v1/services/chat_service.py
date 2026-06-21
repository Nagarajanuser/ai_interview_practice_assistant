import logging
import re
from typing import TypedDict
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, START, END
from core.config import settings
from core.database import get_db_cursor

# Initialize ChatOllama LLM using the model configured in environment settings
try:
    llm = ChatOllama(
        model=settings.OLLAMA_MODEL,
        temperature=0
    )
except Exception as e:
    logging.error(f"Error initializing ChatOllama model {settings.OLLAMA_MODEL}: {e}")
    llm = None

# LangGraph state definition
class AgentState(TypedDict):
    question: str
    expected_answer: str
    expected_details: str
    candidate_answer: str
    score: int
    comment: str

def evaluate_candidate_answer(state: AgentState):
    prompt = f"""You are an expert technical interviewer evaluating a candidate's answer.
Compare the candidate's answer against the expected answer and additional guidelines.

Question: {state.get('question', '')}
Expected Answer: {state.get('expected_answer', '')}
Expected Details: {state.get('expected_details', '')}

Candidate's Answer: {state.get('candidate_answer', '')}

Evaluate the candidate's answer. You must:
1. Assign a score from 0 to 10 (where 0 is completely wrong/empty and 10 is perfect/complete).
2. Write a professional, constructive feedback comment from the perspective of the interviewer addressing the candidate. Specify:
   - What key points they got right and what points were given.
   - What key points they missed or could improve.
   - What was unnecessary or incorrect (if any).

Your response must strictly follow this format:
SCORE: <integer between 0 and 10>
COMMENT: <feedback text>
"""
    if not llm:
        return {"score": 0, "comment": "Ollama LLM is not initialized."}

    response = llm.invoke(prompt)
    response_text = response.content
    
    score = 0
    comment = ""
    
    score_match = re.search(r'SCORE:\s*(\d+)', response_text, re.IGNORECASE)
    if score_match:
        score = int(score_match.group(1))
        score = max(0, min(10, score))
        
    comment_match = re.search(r'COMMENT:\s*(.*)', response_text, re.IGNORECASE | re.DOTALL)
    if comment_match:
        comment = comment_match.group(1).strip()
    else:
        comment = re.sub(r'SCORE:\s*\d+', '', response_text, flags=re.IGNORECASE).strip()
        
    return {
        "score": score,
        "comment": comment
    }

# Build LangGraph workflow
workflow = StateGraph(AgentState)
workflow.add_node("evaluate", evaluate_candidate_answer)
workflow.add_edge(START, "evaluate")
workflow.add_edge("evaluate", END)

# Compile graph
evaluation_graph = workflow.compile()

def background_evaluate_answer(
    session_id: int,
    user_id: int,
    q_id: int,
    candidate_answer: str,
    question: str,
    default_answer: str,
    answer_comment: str
):
    score = 0
    comment = "Could not generate AI feedback at this time."
    candidate_ans = candidate_answer.strip()
    
    if candidate_ans and candidate_ans != "No response recorded.":
        try:
            initial_state = {
                "question": question,
                "expected_answer": default_answer,
                "expected_details": answer_comment,
                "candidate_answer": candidate_ans,
                "score": 0,
                "comment": ""
            }
            final_state = evaluation_graph.invoke(initial_state)
            score = final_state.get("score", 0)
            comment = final_state.get("comment", "Could not generate AI feedback at this time.")
        except Exception as llm_err:
            logging.error(f"Error calling LangGraph LLM in background_evaluate_answer: {llm_err}")
    else:
        comment = "No answer was recorded or submitted."

    # Update database with evaluated scores
    conn, cursor = get_db_cursor()
    try:
        query = """
            UPDATE candidate_answers 
            SET score = %s, llm_comment = %s
            WHERE session_id = %s AND user_id = %s AND q_id = %s
        """
        cursor.execute(query, (score, comment, session_id, user_id, q_id))
        conn.commit()
        logging.info(f"Background evaluation complete for session_id {session_id}, q_id {q_id}. Score: {score}")
    except Exception as e:
        logging.error(f"Error in background_evaluate_answer update DB: {e}")
    finally:
        cursor.close()
        conn.close()
