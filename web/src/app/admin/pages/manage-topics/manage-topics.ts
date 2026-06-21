import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-manage-topics',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './manage-topics.html',
  styleUrl: './manage-topics.scss',
})
export class ManageTopics implements OnInit {
  private interviewService = inject(InterviewService);

  topics = signal<any[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit(): void {
    this.loadTopics();
  }

  loadTopics(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.interviewService.getTopics().pipe(
      catchError((error) => {
        console.error('Error fetching topics:', error);
        this.errorMessage.set('Failed to load topics. Please check backend connection.');
        this.loading.set(false);
        return of({ status: 'error', data: [] });
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.topics.set(response.data);
        }
        this.loading.set(false);
      }
    });
  }

  deleteTopic(name: string): void {
    if (confirm(`Are you sure you want to delete topic "${name}"? Existing questions will have their topic field cleared.`)) {
      this.loading.set(true);
      this.interviewService.deleteTopic(name).pipe(
        catchError((error) => {
          console.error('Error deleting topic:', error);
          alert('Failed to delete topic.');
          this.loading.set(false);
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response && response.status === 'success') {
            this.loadTopics();
          } else {
            this.loading.set(false);
          }
        }
      });
    }
  }
}
