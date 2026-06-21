import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../services/interview.service';

@Component({
  selector: 'app-session-feedback',
  imports: [CommonModule],
  templateUrl: './session-feedback.html',
  styleUrl: './session-feedback.scss',
})
export class SessionFeedback implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private interviewService = inject(InterviewService);

  sessionId = signal<number | null>(null);
  interviewName = signal<string>('');
  sessionStatus = signal<string>('');
  questions = signal<any[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('session_id');
    if (idParam) {
      const id = Number(idParam);
      if (!isNaN(id)) {
        this.sessionId.set(id);
        this.loadFeedback(id);
      } else {
        this.errorMessage.set('Invalid Session ID.');
      }
    } else {
      this.errorMessage.set('Session ID is missing.');
    }
  }

  loadFeedback(sessionId: number): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.interviewService.getSessionQuestions(sessionId).pipe(
      catchError((error) => {
        console.error('Error loading session feedback:', error);
        this.errorMessage.set('Failed to load feedback details. Make sure the backend is running.');
        this.loading.set(false);
        return of(null);
      })
    ).subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.questions.set(res.data);
          this.sessionStatus.set(res.session_status);
          
          if (res.data.length > 0) {
            const first = res.data[0];
            if (first.topic && first.job_role) {
              this.interviewName.set(`${first.topic} (${first.job_role})`);
            } else {
              this.interviewName.set(first.topic || 'General Practice');
            }
          } else {
            this.interviewName.set('Interview Practice');
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('An unexpected error occurred while loading feedback.');
        this.loading.set(false);
      }
    });
  }

  getSessionScore(): { score: number, max: number } {
    const qList = this.questions();
    let total = 0;
    qList.forEach(q => {
      total += q.score || 0;
    });
    return {
      score: total,
      max: qList.length * 10
    };
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
