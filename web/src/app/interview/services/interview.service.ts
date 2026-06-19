import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Question {
  id: string;
  text: string;
  order: number;
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
  private apiUrl = '/api/interview'; // Can be adjusted based on actual backend configurations

  constructor(private http: HttpClient) {}

  /**
   * Fetches an interview question from the backend.
   * If the API fails or doesn't exist yet, it returns a high-quality mock question as fallback.
   */
  getQuestion(questionId: string): Observable<Question> {
    return this.http.get<Question>(`${this.apiUrl}/questions/${questionId}`);
  }

  /**
   * Submits the transcribed answer back to the backend.
   */
  submitAnswer(questionId: string, answerText: string): Observable<SubmitAnswerResponse> {
    return this.http.post<SubmitAnswerResponse>(`${this.apiUrl}/answers`, {
      questionId,
      answer: answerText
    });
  }
}
