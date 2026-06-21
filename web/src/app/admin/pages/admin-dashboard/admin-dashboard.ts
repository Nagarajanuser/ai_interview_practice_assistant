import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {
  private router = inject(Router);
  private interviewService = inject(InterviewService);

  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  
  // Dashboard stats signals
  totalQuestions = signal<number>(0);
  totalTopics = signal<number>(0);
  totalRoles = signal<number>(0);
  topics = signal<any[]>([]);
  roles = signal<any[]>([]);
  sessions = signal<any[]>([]);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.interviewService.getDashboardStats().pipe(
      catchError((error) => {
        console.error('Error fetching dashboard stats:', error);
        this.errorMessage.set('Failed to load dashboard statistics. Make sure the backend is running.');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.totalQuestions.set(response.total_questions);
          this.totalTopics.set(response.total_topics);
          this.totalRoles.set(response.total_roles);
          this.topics.set(response.topics);
          this.roles.set(response.roles);
          this.sessions.set(response.sessions);
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('An unexpected error occurred while fetching statistics.');
        this.loading.set(false);
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
