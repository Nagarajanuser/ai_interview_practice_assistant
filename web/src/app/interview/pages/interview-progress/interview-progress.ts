import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { InterviewService, Question } from '../../services/interview.service';

@Component({
  selector: 'app-interview-progress',
  imports: [CommonModule],
  templateUrl: './interview-progress.html',
  styleUrl: './interview-progress.scss',
})
export class InterviewProgress implements OnInit, OnDestroy {
  private router = inject(Router);
  private interviewService = inject(InterviewService);

  // Core session states
  status = signal<'idle' | 'loading' | 'speaking' | 'listening' | 'submitting' | 'completed' | 'error'>('idle');
  currentQuestion = signal<Question | null>(null);
  progressIndex = signal<number>(0);
  totalQuestions = signal<number>(5);
  transcript = signal<string>('');
  errorMessage = signal<string>('');

  // Web Speech API references
  private recognition: any = null;
  private isSynthesisSpeaking = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  // Local mock questions database for fallback testing
  private mockQuestions: Question[] = [
    { id: 'q1', text: 'Welcome to your AI interview. Could you please introduce yourself and tell me about your background?', order: 1 },
    { id: 'q2', text: 'Why are you interested in this position, and what strengths do you bring to our team?', order: 2 },
    { id: 'q3', text: 'Describe a challenging technical problem you solved recently and the steps you took to resolve it.', order: 3 },
    { id: 'q4', text: 'How do you handle disagreements or conflicts in a collaborative team project?', order: 4 },
    { id: 'q5', text: 'Do you have any questions for us about the role, the team, or our company culture?', order: 5 }
  ];

  ngOnInit(): void {
    this.initSpeechRecognition();
  }

  ngOnDestroy(): void {
    this.cleanupSpeech();
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

  /**
   * Starts the interview session.
   */
  startInterview(): void {
    this.progressIndex.set(0);
    this.transcript.set('');
    this.errorMessage.set('');
    this.loadNextQuestion();
  }

  /**
   * Fetches and loads the next question.
   */
  private loadNextQuestion(): void {
    this.status.set('loading');
    this.transcript.set('');

    const nextIndex = this.progressIndex() + 1;
    this.progressIndex.set(nextIndex);

    if (nextIndex > this.totalQuestions()) {
      this.status.set('completed');
      return;
    }

    const questionId = `q${nextIndex}`;

    this.interviewService.getQuestion(questionId).pipe(
      catchError((error) => {
        console.warn(`Backend connection failed. Using local mock question for ID: ${questionId}`);
        // Return local mock question as fallback
        const mockQ = this.mockQuestions.find(q => q.order === nextIndex) || this.mockQuestions[0];
        return of(mockQ);
      }),
      finalize(() => {
        // Handled below
      })
    ).subscribe({
      next: (question) => {
        this.currentQuestion.set(question);
        this.speakQuestion(question.text);
      },
      error: () => {
        this.errorMessage.set('Failed to load interview question. Please try again.');
        this.status.set('error');
      }
    });
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
      this.speakQuestion(question.text);
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

    this.status.set('submitting');
    const answer = this.transcript().trim() || 'No response recorded.';

    this.interviewService.submitAnswer(question.id, answer).pipe(
      catchError((error) => {
        console.warn('Backend submit failed. Proceeding with local mock response.');
        return of({ success: true });
      })
    ).subscribe({
      next: (res) => {
        if (this.progressIndex() >= this.totalQuestions()) {
          this.status.set('completed');
        } else {
          this.loadNextQuestion();
        }
      },
      error: () => {
        this.errorMessage.set('Failed to save answer. Please try again.');
        this.status.set('error');
      }
    });
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
      } catch (e) {}
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
