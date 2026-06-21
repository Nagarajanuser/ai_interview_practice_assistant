import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService, Question } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-all-question-answer',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './all-question-answer.html',
  styleUrl: './all-question-answer.scss',
})
export class AllQuestionAnswer implements OnInit {
  private router = inject(Router);
  private interviewService = inject(InterviewService);

  questions = signal<Question[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Dropdown filter selections
  selectedTopic = signal<string>('');
  selectedJobRole = signal<string>('');

  topicsList = signal<string[]>([]);
  jobRolesList = signal<string[]>([]);

  ngOnInit(): void {
    this.loadDropdowns();
    this.loadQuestions();
  }

  loadDropdowns(): void {
    this.interviewService.getTopics().subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.topicsList.set(res.data.map((t: any) => typeof t === 'string' ? t : t.name));
        }
      }
    });

    this.interviewService.getRoles().subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.jobRolesList.set(res.data.map((r: any) => typeof r === 'string' ? r : r.name));
        }
      }
    });
  }

  loadQuestions(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const filters: any = { limit: 100 };
    if (this.selectedTopic()) {
      filters.topic = this.selectedTopic();
    }
    if (this.selectedJobRole()) {
      filters.job_role = this.selectedJobRole();
    }

    this.interviewService.getQuestionAnswers(filters).pipe(
      catchError((error) => {
        console.error('Error fetching questions:', error);
        this.errorMessage.set('Failed to load questions. Please check if backend is running.');
        return of({ status: 'error', count: 0, data: [] });
      })
    ).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.questions.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('An unexpected error occurred.');
        this.loading.set(false);
      }
    });
  }

  deleteQuestion(id: number | string): void {
    if (confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      this.loading.set(true);
      this.interviewService.deleteQuestionAnswer(id).pipe(
        catchError((error) => {
          console.error('Error deleting question:', error);
          alert('Failed to delete question. Please try again.');
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response && response.status === 'success') {
            this.loadQuestions();
          } else {
            this.loading.set(false);
          }
        }
      });
    }
  }

  getDifficultyClass(difficulty: string | undefined): string {
    if (!difficulty) return 'bg-secondary';
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-success';
      case 'medium': return 'bg-warning text-dark';
      case 'hard': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
