import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private router = inject(Router);
  private interviewService = inject(InterviewService);

  user: any = null;
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
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    if (!this.user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loadUserSessions();
  }

  loadUserSessions(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.interviewService.getUserSessions(this.user.user_id).pipe(
      catchError((error) => {
        console.error('Error loading user sessions:', error);
        this.errorMessage.set('Failed to load your mock interview sessions. Please check backend connection.');
        this.loading.set(false);
        return of({ status: 'error', data: [] });
      })
    ).subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.sessions.set(res.data);
        }
        this.loading.set(false);
      }
    });
  }

  getUserInitials(): string {
    if (!this.user || !this.user.name) return 'U';
    const names = this.user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return this.user.name[0].toUpperCase();
  }

  checkProgress(session: any): void {
    this.loading.set(true);
    this.interviewService.checkSessionProgress(session.session_id, this.user.user_id).pipe(
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
            this.loadUserSessions();
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

  resumeSession(sessionId: number): void {
    this.router.navigate(['/interview'], { queryParams: { session_id: sessionId } });
  }

  viewFeedback(session: any): void {
    this.router.navigate(['/interview/feedback', session.session_id]);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  }
}
