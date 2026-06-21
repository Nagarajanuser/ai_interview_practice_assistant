import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-create-session',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-session.html',
})
export class CreateSession implements OnInit {
  private interviewService = inject(InterviewService);
  private router = inject(Router);

  usersList = signal<any[]>([]);
  topicsList = signal<string[]>([]);
  jobRolesList = signal<string[]>([]);

  selectedUserId = 0;
  selectedTopic = '';
  selectedJobRole = '';
  selectedDifficulty = '';
  questionLimit: number | string = 5;

  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit(): void {
    this.loadDropdowns();
  }

  loadDropdowns(): void {
    // 1. Fetch Users
    this.interviewService.getUsers().subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.usersList.set(res.data);
          if (res.data.length > 0) {
            this.selectedUserId = res.data[0].user_id;
          }
        }
      }
    });

    // 2. Fetch Topics
    this.interviewService.getTopics().subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.topicsList.set(res.data.map((t: any) => typeof t === 'string' ? t : t.name));
        }
      }
    });

    // 3. Fetch Job Roles
    this.interviewService.getRoles().subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.jobRolesList.set(res.data.map((r: any) => typeof r === 'string' ? r : r.name));
        }
      }
    });
  }

  createSession(): void {
    if (!this.selectedUserId) {
      this.errorMessage.set('Please select a Candidate user.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const payload = {
      user_id: Number(this.selectedUserId),
      topic: this.selectedTopic,
      job_role: this.selectedJobRole,
      difficulty: this.selectedDifficulty,
      limit: this.questionLimit === 'All' ? 'All' : Number(this.questionLimit)
    };

    this.interviewService.adminCreateSession(payload).pipe(
      catchError((error) => {
        console.error('Error creating interview session:', error);
        this.errorMessage.set(error.error?.detail || 'Failed to generate interview session. Check database questions matching criteria.');
        this.submitting.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          // Direct redirect to list of sessions page
          this.router.navigate(['/admin/sessions']);
        } else {
          this.submitting.set(false);
        }
      }
    });
  }
}
