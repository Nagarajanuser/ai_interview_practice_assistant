import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService, Question } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-add-new-question-answer',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-new-question-answer.html',
  styleUrl: './add-new-question-answer.scss',
})
export class AddNewQuestionAnswer implements OnInit {
  private router = inject(Router);
  private interviewService = inject(InterviewService);

  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  topicsList = signal<string[]>([]);
  jobRolesList = signal<string[]>([]);

  qaData = {
    topic: '',
    job_role: '',
    difficulty: 'Easy',
    question: '',
    answer: '',
    answer_comment: ''
  };

  ngOnInit(): void {
    this.loadDropdowns();
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

  saveQA(): void {
    if (!this.qaData.topic || !this.qaData.question || !this.qaData.answer) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const newQuestion: Question = {
      q_id: 0, // Backend will auto-increment
      topic: this.qaData.topic.trim(),
      job_role: this.qaData.job_role.trim(),
      difficulty: this.qaData.difficulty,
      question: this.qaData.question.trim(),
      answer: this.qaData.answer.trim(),
      answer_comment: this.qaData.answer_comment.trim()
    };

    this.interviewService.addQuestionAnswer(newQuestion).pipe(
      catchError((error) => {
        console.error('Error saving question:', error);
        this.errorMessage.set('Failed to save question. Make sure your database is running and credentials match.');
        this.submitting.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.router.navigate(['/admin']);
        } else if (response) {
          this.errorMessage.set(response.message || 'Failed to save question.');
          this.submitting.set(false);
        }
      }
    });
  }
}
