import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-add-topic',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-topic.html',
})
export class AddTopic implements OnInit {
  private interviewService = inject(InterviewService);
  private router = inject(Router);

  rolesList = signal<string[]>([]);
  newTopicName = '';
  selectedRoles = signal<string[]>([]);
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.interviewService.getRoles().subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.rolesList.set(response.data.map((r: any) => typeof r === 'string' ? r : r.name));
        }
      }
    });
  }

  toggleRole(role: string): void {
    const current = this.selectedRoles();
    if (current.includes(role)) {
      this.selectedRoles.set(current.filter(r => r !== role));
    } else {
      this.selectedRoles.set([...current, role]);
    }
  }

  createTopic(): void {
    const name = this.newTopicName.trim();
    if (!name) {
      this.errorMessage.set('Topic name is required.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.interviewService.createTopic(name, this.selectedRoles()).pipe(
      catchError((error) => {
        console.error('Error creating topic:', error);
        this.errorMessage.set(error.error?.detail || 'Failed to create topic.');
        this.submitting.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.router.navigate(['/admin/topics']);
        } else {
          this.submitting.set(false);
        }
      }
    });
  }
}
