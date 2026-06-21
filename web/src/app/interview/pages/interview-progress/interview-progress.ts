import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { InterviewService, Question } from '../../services/interview.service';

@Component({
  selector: 'app-interview-progress',
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-progress.html',
  styleUrl: './interview-progress.scss',
})
export class InterviewProgress implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private interviewService = inject(InterviewService);

  // Core session states
  status = signal<'idle' | 'loading' | 'speaking' | 'listening' | 'submitting' | 'preparing' | 'completed' | 'error'>('idle');
  currentQuestion = signal<Question | null>(null);
  currentSessionId = signal<number | null>(null);
  progressIndex = signal<number>(0);
  totalQuestions = signal<number>(5);
  transcript = signal<string>('');
  errorMessage = signal<string>('');

  // Dropdown filter selections
  selectedTopic = '';
  selectedJobRole = '';

  topicsList: string[] = [];
  jobRolesList: string[] = [];

  // Web Speech API references
  private recognition: any = null;
  private isSynthesisSpeaking = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private pollInterval: any = null;

  // Local mock questions database for fallback testing
  private mockQuestions: Question[] = [
    { q_id: 'q1', question: 'Welcome to your AI interview. Could you please introduce yourself and tell me about your background?', topic: 'Python', job_role: 'AI Engineer', order: 1 },
    { q_id: 'q2', question: 'Why are you interested in this position, and what strengths do you bring to our team?', topic: 'FastAPI', job_role: 'AI Developer', order: 2 },
    { q_id: 'q3', question: 'Describe a challenging technical problem you solved recently and the steps you took to resolve it.', topic: 'LangChain', job_role: 'AI Engineer', order: 3 },
    { q_id: 'q4', question: 'How do you handle disagreements or conflicts in a collaborative team project?', topic: 'RAG', job_role: 'AI/ML Engineer', order: 4 },
    { q_id: 'q5', question: 'Do you have any questions for us about the role, the team, or our company culture?', topic: 'AI Agents', job_role: 'AI/ML Engineer', order: 5 }
  ];

  // Store loaded questions
  questionsList = signal<Question[]>([]);

  ngOnInit(): void {
    this.loadDropdowns();
    this.initSpeechRecognition();

    // Check if resuming a session via query parameter
    const sessionIdParam = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionIdParam) {
      const sessionId = Number(sessionIdParam);
      if (!isNaN(sessionId)) {
        this.loadExistingSession(sessionId);
      }
    }
  }

  loadDropdowns(): void {
    this.interviewService.getTopics().subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.topicsList = res.data.map((t: any) => typeof t === 'string' ? t : t.name);
        }
      }
    });

    this.interviewService.getRoles().subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.jobRolesList = res.data.map((r: any) => typeof r === 'string' ? r : r.name);
        }
      }
    });
  }

  /**
   * Loads an existing session's questions and state from the backend.
   */
  loadExistingSession(sessionId: number): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.status.set('loading');
    this.transcript.set('');
    this.errorMessage.set('');
    this.currentSessionId.set(sessionId);

    this.interviewService.getSessionQuestions(sessionId).pipe(
      catchError((error) => {
        console.error('Error loading existing session:', error);
        this.errorMessage.set('Failed to load the interview session. Please check backend connection.');
        this.status.set('error');
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          const questions = response.data;
          if (!questions || questions.length === 0) {
            this.errorMessage.set('This session does not contain any questions.');
            this.status.set('error');
            return;
          }

          this.questionsList.set(questions);
          this.totalQuestions.set(questions.length);

          // Find the first unanswered question
          let firstUnansweredIdx = questions.findIndex((q: any) => !q.candidate_answer || q.candidate_answer.trim() === '');
          
          if (firstUnansweredIdx === -1) {
            // All questions have answers, mark as completed
            this.progressIndex.set(questions.length);
            this.status.set('completed');
          } else {
            this.progressIndex.set(firstUnansweredIdx);
            this.loadNextQuestion();

            // Transition status to IN_PROGRESS in the backend if it was in CREATED state
            if (response.session_status === 'CREATED') {
              this.interviewService.updateSessionStatus(sessionId, 'IN_PROGRESS').subscribe({
                next: () => console.log(`Session #${sessionId} auto-transitioned from CREATED to IN_PROGRESS`),
                error: (err) => console.error('Failed to update session status to IN_PROGRESS on resume:', err)
              });
            }
          }
        }
      },
      error: () => {
        this.errorMessage.set('An unexpected error occurred while loading the session.');
        this.status.set('error');
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanupSpeech();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Initializes the SpeechRecognition Web API.
   */
  private initSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser. Running with manual text input fallback.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        this.transcript.update(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.errorMessage.set('Microphone access denied. Please verify your system permissions.');
        this.status.set('error');
      }
    };

    this.recognition.onend = () => {
      // Auto restart if still in listening state (handles pauses)
      if (this.status() === 'listening') {
        try {
          this.recognition.start();
        } catch (e) {
          // Ignore if already started
        }
      }
    };
  }

  startInterview(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.status.set('loading');
    this.transcript.set('');
    this.errorMessage.set('');
    this.currentSessionId.set(null);

    let userId: number | undefined = undefined;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData && userData.user_id) {
          userId = Number(userData.user_id);
        }
      } catch (e) {
        console.error('Error parsing user session data:', e);
      }
    }

    const filters: any = { limit: 5 };
    if (userId) {
      filters.user_id = userId;
    }

    if (this.selectedTopic) {
      filters.topic = this.selectedTopic;
    }
    if (this.selectedJobRole) {
      filters.job_role = this.selectedJobRole;
    }

    this.interviewService.generateQuestionAnswers(filters).pipe(
      catchError((error) => {
        console.warn('Backend connection to get_question_answer failed. Using filtered local mock questions.');
        let filteredMocks = this.mockQuestions;
        if (this.selectedTopic) {
          filteredMocks = filteredMocks.filter(q => q.topic === this.selectedTopic);
        }
        if (this.selectedJobRole) {
          filteredMocks = filteredMocks.filter(q => q.job_role === this.selectedJobRole);
        }
        if (filteredMocks.length === 0) {
          filteredMocks = this.mockQuestions;
        }
        return of({
          status: 'success',
          session_id: undefined,
          count: filteredMocks.length,
          data: filteredMocks.slice(0, 5)
        });
      })
    ).subscribe({
      next: (response) => {
        if (response && response.session_id) {
          this.currentSessionId.set(response.session_id);
          // Transition the session to IN_PROGRESS
          this.interviewService.updateSessionStatus(response.session_id, 'IN_PROGRESS').subscribe({
            next: () => console.log(`Session #${response.session_id} marked as IN_PROGRESS`),
            error: (err) => console.error('Failed to update session status to IN_PROGRESS:', err)
          });
        } else {
          this.currentSessionId.set(null);
        }
        const questions = response.data && response.data.length > 0 ? response.data : this.mockQuestions;
        this.questionsList.set(questions);
        this.totalQuestions.set(questions.length);
        this.progressIndex.set(0);
        this.loadNextQuestion();
      },
      error: () => {
        this.errorMessage.set('Failed to initialize interview questions. Please try again.');
        this.status.set('error');
      }
    });
  }

  /**
   * Loads the next question from the pre-loaded questions list.
   */
  private loadNextQuestion(): void {
    this.transcript.set('');

    const nextIndex = this.progressIndex() + 1;

    if (nextIndex > this.totalQuestions()) {
      this.status.set('completed');
      return;
    }

    this.progressIndex.set(nextIndex);
    const nextQuestion = this.questionsList()[nextIndex - 1];

    if (nextQuestion) {
      this.currentQuestion.set(nextQuestion);
      this.speakQuestion(nextQuestion.question);
    } else {
      this.errorMessage.set('Question data is missing.');
      this.status.set('error');
    }
  }

  /**
   * TTS: Speaks out the interviewer question text.
   */
  speakQuestion(text: string): void {
    this.stopSpeaking();
    this.stopRecording();

    this.status.set('speaking');

    if (!window.speechSynthesis) {
      console.warn('Text-to-Speech not supported in this browser.');
      // Auto transition to listening after a small delay
      setTimeout(() => this.startListening(), 1500);
      return;
    }

    this.activeUtterance = new SpeechSynthesisUtterance(text);
    this.activeUtterance.lang = 'en-US';
    this.activeUtterance.rate = 0.95; // Slightly slower for clear interviewer delivery

    this.activeUtterance.onstart = () => {
      this.isSynthesisSpeaking = true;
    };

    this.activeUtterance.onend = () => {
      this.isSynthesisSpeaking = false;
      this.startListening();
    };

    this.activeUtterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      this.isSynthesisSpeaking = false;
      this.startListening();
    };

    window.speechSynthesis.speak(this.activeUtterance);
  }

  /**
   * Replays the current question text.
   */
  replayQuestion(): void {
    const question = this.currentQuestion();
    if (question) {
      this.speakQuestion(question.question);
    }
  }

  /**
   * STT: Initiates microphone capture for the user response.
   */
  startListening(): void {
    this.stopSpeaking();
    this.status.set('listening');

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        // Speech recognition already active
      }
    } else {
      this.errorMessage.set('Voice recognition is unavailable. Please type your answer below.');
    }
  }

  /**
   * Stops microphone recording.
   */
  stopRecording(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Recognition not running
      }
    }
  }

  /**
   * Submit the captured speech transcript to the backend.
   */
  submitAnswer(): void {
    this.stopRecording();
    const question = this.currentQuestion();

    if (!question) return;

    const answer = this.transcript().trim() || 'No response recorded.';

    let userId = 0;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData && userData.user_id) {
          userId = Number(userData.user_id);
        }
      } catch (e) {
        console.error('Error parsing user session data:', e);
      }
    }

    const sessionId = this.currentSessionId();
    if (sessionId === null || sessionId === undefined) {
      console.warn('No active session ID. Simulating local mock submit.');
      if (this.progressIndex() >= this.totalQuestions()) {
        this.status.set('completed');
      } else {
        this.loadNextQuestion();
      }
      return;
    }

    // Submit answer in parallel client-side process (silently in background)
    this.interviewService.submitAnswer(sessionId, userId, question.q_id, answer).pipe(
      catchError((error) => {
        console.error('Background submission failed for question:', question.q_id, error);
        return of({ success: false });
      })
    ).subscribe({
      next: () => {
        console.log(`Background submission completed for question #${question.q_id}`);
      }
    });

    // Immediately transition to next question or mark session completed (do NOT block on HTTP response)
    if (this.progressIndex() >= this.totalQuestions()) {
      this.status.set('completed');
      
      // Transition backend session status to COMPLETED
      this.interviewService.updateSessionStatus(sessionId, 'COMPLETED').subscribe({
        next: () => {
          console.log(`Session #${sessionId} marked as COMPLETED on the backend`);
        },
        error: (err) => {
          console.error('Failed to update session status to COMPLETED:', err);
        }
      });
    } else {
      this.loadNextQuestion();
    }
  }

  /**
   * Safely stops TTS and STT APIs.
   */
  private stopSpeaking(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isSynthesisSpeaking = false;
  }

  private cleanupSpeech(): void {
    this.stopSpeaking();
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onerror = null;
      this.recognition.onresult = null;
      try {
        this.recognition.stop();
      } catch (e) { }
    }
  }

  /**
   * Manually update the answer text for accessibility/typing fallback.
   */
  updateTranscriptManual(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.transcript.set(target.value);
  }

  /**
   * Navigate back to dashboard or home.
   */
  exitInterview(): void {
    this.cleanupSpeech();
    this.router.navigate(['/dashboard']);
  }
}
