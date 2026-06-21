import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Question {
  q_id: number | string;
  topic?: string;
  job_role?: string;
  difficulty?: string;
  question: string;
  answer?: string;
  answer_comment?: string;
  order?: number;
}

export interface SubmitAnswerResponse {
  success: boolean;
  message?: string;
  nextQuestionId?: string;
  isFinished?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private backendUrl = 'http://localhost:8000/api/v1';
  private apiUrl = '/api/interview'; // Can be adjusted based on actual backend configurations

  constructor(private http: HttpClient) { }

  /**
   * Fetches the 5 questions pool from the backend POST endpoint.
   */
  getQuestionAnswers(filters: { topic?: string; job_role?: string; difficulty?: string; user_id?: number; limit?: number } = { limit: 5 }): Observable<{ status: string; count: number; data: Question[] }> {
    return this.http.post<{ status: string; count: number; data: Question[] }>(
      `${this.backendUrl}/get_question_answer`,
      filters
    );
  }

  generateQuestionAnswers(filters: { topic?: string; job_role?: string; difficulty?: string; user_id?: number; limit?: number } = { limit: 5 }): Observable<{ status: string; session_id?: number; count: number; data: Question[] }> {
    return this.http.post<{ status: string; session_id?: number; count: number; data: Question[] }>(
      `${this.backendUrl}/generate_question_answer`,
      filters
    );
  }


  /**
   * Fetches a single interview question from the backend (Legacy fallback).
   */
  getQuestion(questionId: string): Observable<Question> {
    return this.http.get<Question>(`${this.apiUrl}/questions/${questionId}`);
  }

  /**
   * Submits the transcribed answer back to the backend.
   */
  submitAnswer(sessionId: number, userId: number, qId: number | string, answerText: string): Observable<any> {
    const qIdVal = typeof qId === 'string' && !isNaN(Number(qId)) ? Number(qId) : qId;
    return this.http.post<any>(`${this.backendUrl}/answers_result`, {
      session_id: sessionId,
      user_id: userId,
      q_id: qIdVal,
      candidate_answer: answerText
    });
  }

  /**
   * Adds a new question to the repository database.
   */
  addQuestionAnswer(qa: Question): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/add_question_answer`, qa);
  }

  /**
   * Updates an existing question in the repository.
   */
  updateQuestionAnswer(qa: Question): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/update_question_answer`, qa);
  }

  /**
   * Deletes a question from the repository.
   */
  deleteQuestionAnswer(id: number | string): Observable<any> {
    // Parse ID as integer if possible
    const idVal = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
    return this.http.post<any>(`${this.backendUrl}/delete_question_answer`, { q_id: idVal });
  }

  /**
   * Gets admin dashboard statistics.
   */
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.backendUrl}/admin/dashboard_stats`);
  }

  /**
   * Creates a new topic.
   */
  createTopic(name: string, roles: string[] = []): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/admin/create_topic`, { name, roles });
  }

  /**
   * Creates a new role.
   */
  createRole(name: string, topics: string[] = []): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/admin/create_role`, { name, topics });
  }

  /**
   * Updates an existing topic.
   */
  updateTopic(oldName: string, newName: string, roles: string[] = []): Observable<any> {
    return this.http.put<any>(`${this.backendUrl}/admin/update_topic`, { old_name: oldName, new_name: newName, roles });
  }

  /**
   * Deletes a topic from the repository.
   */
  deleteTopic(name: string): Observable<any> {
    return this.http.delete<any>(`${this.backendUrl}/admin/delete_topic/${encodeURIComponent(name)}`);
  }

  /**
   * Updates an existing role.
   */
  updateRole(oldName: string, newName: string, topics: string[] = []): Observable<any> {
    return this.http.put<any>(`${this.backendUrl}/admin/update_role`, { old_name: oldName, new_name: newName, topics });
  }

  /**
   * Deletes a role from the repository.
   */
  deleteRole(name: string): Observable<any> {
    return this.http.delete<any>(`${this.backendUrl}/admin/delete_role/${encodeURIComponent(name)}`);
  }

  /**
   * Fetches the dynamic list of topics.
   */
  getTopics(): Observable<{ status: string; data: any[] }> {
    return this.http.get<{ status: string; data: any[] }>(`${this.backendUrl}/admin/topics`);
  }

  /**
   * Fetches the dynamic list of roles.
   */
  getRoles(): Observable<{ status: string; data: any[] }> {
    return this.http.get<{ status: string; data: any[] }>(`${this.backendUrl}/admin/roles`);
  }

  /**
   * Fetches all interview sessions.
   */
  getSessions(): Observable<{ status: string; data: any[] }> {
    return this.http.get<{ status: string; data: any[] }>(`${this.backendUrl}/admin/sessions`);
  }

  /**
   * Deletes an interview session.
   */
  deleteSession(sessionId: number | string): Observable<any> {
    return this.http.delete<any>(`${this.backendUrl}/admin/delete_session/${sessionId}`);
  }

  /**
   * Fetches all registered users for administration dropdown selection.
   */
  getUsers(): Observable<{ status: string; data: any[] }> {
    return this.http.get<{ status: string; data: any[] }>(`${this.backendUrl}/admin/users`);
  }

  /**
   * Direct API for administrators to configure and generate new interview sessions.
   */
  adminCreateSession(payload: { user_id: number; topic?: string; job_role?: string; difficulty?: string; limit?: number | string }): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/admin/create_session`, payload);
  }

  /**
   * Updates the status of an interview session.
   */
  updateSessionStatus(sessionId: number, status: string): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/update_session_status`, {
      session_id: sessionId,
      status: status
    });
  }

  /**
   * Fetches all interview sessions for a specific user.
   */
  getUserSessions(userId: number): Observable<{ status: string; data: any[] }> {
    return this.http.get<{ status: string; data: any[] }>(`${this.backendUrl}/user/sessions/${userId}`);
  }

  /**
   * Fetches all questions, candidate answers, and AI feedback for a specific session.
   */
  getSessionQuestions(sessionId: number): Observable<{ status: string; session_status: string; data: any[] }> {
    return this.http.get<{ status: string; session_status: string; data: any[] }>(`${this.backendUrl}/sessions/${sessionId}/questions`);
  }

  /**
   * Checks the evaluation progress of a completed session.
   */
  checkSessionProgress(sessionId: number, userId: number): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/sessions/check_progress`, {
      session_id: sessionId,
      user_id: userId
    });
  }

  /**
   * Updates user profile information (name, email, password, photo).
   */
  updateUserProfile(payload: any): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/update_profile`, payload);
  }
}
