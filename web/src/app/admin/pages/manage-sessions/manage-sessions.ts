import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-manage-sessions',
  imports: [CommonModule, RouterLink],
  templateUrl: './manage-sessions.html',
  styleUrl: './manage-sessions.scss',
})
export class ManageSessions implements OnInit {
  private interviewService = inject(InterviewService);

  sessions = signal<any[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Modal signals
  modalOpen = signal<boolean>(false);
  modalTitle = signal<string>('');
  modalMessage = signal<string>('');
  modalType = signal<'success' | 'warning' | 'error' | 'info'>('info');

  openModal(title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
    this.modalTitle.set(title);
    this.modalMessage.set(message);
    this.modalType.set(type);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.interviewService.getSessions().pipe(
      catchError((error) => {
        console.error('Error fetching sessions:', error);
        this.errorMessage.set('Failed to load interview sessions. Please check backend connection.');
        this.loading.set(false);
        return of({ status: 'error', data: [] });
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.sessions.set(response.data);
        }
        this.loading.set(false);
      }
    });
  }

  deleteSession(sessionId: number | string): void {
    if (confirm(`Are you sure you want to delete session #${sessionId}? This will wipe all recorded candidate answers and scores.`)) {
      this.loading.set(true);
      this.interviewService.deleteSession(sessionId).pipe(
        catchError((error) => {
          console.error('Error deleting session:', error);
          alert('Failed to delete session.');
          this.loading.set(false);
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response && response.status === 'success') {
            this.loadSessions();
          } else {
            this.loading.set(false);
          }
        }
      });
    }
  }

  checkProgress(session: any): void {
    this.loading.set(true);
    this.interviewService.checkSessionProgress(session.session_id, session.user_id).pipe(
      catchError((error) => {
        console.error('Error checking progress:', error);
        this.loading.set(false);
        this.openModal('Error', 'Failed to check progress. Make sure the backend is running.', 'error');
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response) {
          if (response.status === 'success') {
            this.openModal('Success', response.message || 'All evaluations completed! Total score compiled.', 'success');
            this.loadSessions();
          } else if (response.status === 'pending') {
            this.openModal('Evaluation In Progress', response.message || 'Evaluation is still in progress. Some answers do not have AI comments yet.', 'warning');
          } else {
            this.openModal('Status', response.message || 'Verification complete.', 'info');
          }
        }
      }
    });
  }

  getSessionStatusClass(status: string | undefined): string {
    if (!status) return 'bg-secondary';
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-success text-white';
      case 'in_progress': return 'bg-warning text-dark';
      case 'created': return 'bg-info text-white';
      case 'failed': return 'bg-danger text-white';
      default: return 'bg-secondary text-white';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  }
}
