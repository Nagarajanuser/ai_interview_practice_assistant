import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-add-role',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-role.html',
})
export class AddRole implements OnInit {
  private interviewService = inject(InterviewService);
  private router = inject(Router);

  topicsList = signal<string[]>([]);
  newRoleName = '';
  selectedTopics = signal<string[]>([]);
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit(): void {
    this.loadTopics();
  }

  loadTopics(): void {
    this.interviewService.getTopics().subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.topicsList.set(response.data.map((t: any) => typeof t === 'string' ? t : t.name));
        }
      }
    });
  }

  toggleTopic(topic: string): void {
    const current = this.selectedTopics();
    if (current.includes(topic)) {
      this.selectedTopics.set(current.filter(t => t !== topic));
    } else {
      this.selectedTopics.set([...current, topic]);
    }
  }

  createRole(): void {
    const name = this.newRoleName.trim();
    if (!name) {
      this.errorMessage.set('Role name is required.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.interviewService.createRole(name, this.selectedTopics()).pipe(
      catchError((error) => {
        console.error('Error creating role:', error);
        this.errorMessage.set(error.error?.detail || 'Failed to create job role.');
        this.submitting.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.router.navigate(['/admin/roles']);
        } else {
          this.submitting.set(false);
        }
      }
    });
  }
}
