import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService, Question } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-edit-question-answer',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './edit-question-answer.html',
  styleUrl: './edit-question-answer.scss',
})
export class EditQuestionAnswer implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private interviewService = inject(InterviewService);

  questionId = signal<string>('');
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  topicsList = signal<string[]>([]);
  jobRolesList = signal<string[]>([]);

  qaData = {
    q_id: 0,
    topic: '',
    job_role: '',
    difficulty: 'Easy',
    question: '',
    answer: '',
    answer_comment: ''
  };

  ngOnInit(): void {
    this.loadDropdowns();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.questionId.set(id);
      this.loadQuestionDetails(id);
    } else {
      this.errorMessage.set('Invalid Question ID.');
    }
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

  loadQuestionDetails(id: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.interviewService.getQuestionAnswers({ limit: 100 }).pipe(
      catchError((error) => {
        console.error('Error fetching question details:', error);
        this.errorMessage.set('Failed to load question details. Verify the backend connection.');
        this.loading.set(false);
        return of({ status: 'error', count: 0, data: [] });
      })
    ).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          const found = response.data.find(q => String(q.q_id) === String(id));
          if (found) {
            this.qaData = {
              q_id: Number(found.q_id),
              topic: found.topic || '',
              job_role: found.job_role || '',
              difficulty: found.difficulty || 'Easy',
              question: found.question,
              answer: found.answer || '',
              answer_comment: found.answer_comment || ''
            };
          } else {
            this.errorMessage.set(`Question with ID ${id} was not found in the repository.`);
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('An unexpected error occurred while loading.');
        this.loading.set(false);
      }
    });
  }

  updateQA(): void {
    if (!this.qaData.topic || !this.qaData.question || !this.qaData.answer) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const updatedQuestion: Question = {
      q_id: this.qaData.q_id,
      topic: this.qaData.topic.trim(),
      job_role: this.qaData.job_role.trim(),
      difficulty: this.qaData.difficulty,
      question: this.qaData.question.trim(),
      answer: this.qaData.answer.trim(),
      answer_comment: this.qaData.answer_comment.trim()
    };

    this.interviewService.updateQuestionAnswer(updatedQuestion).pipe(
      catchError((error) => {
        console.error('Error updating question:', error);
        this.errorMessage.set('Failed to update question. Ensure your backend database connection is healthy.');
        this.submitting.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.router.navigate(['/admin']);
        } else if (response) {
          this.errorMessage.set(response.message || 'Failed to update question.');
          this.submitting.set(false);
        }
      }
    });
  }
}
