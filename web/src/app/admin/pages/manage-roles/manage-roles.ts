import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-manage-roles',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './manage-roles.html',
  styleUrl: './manage-roles.scss',
})
export class ManageRoles implements OnInit {
  private interviewService = inject(InterviewService);

  roles = signal<any[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.interviewService.getRoles().pipe(
      catchError((error) => {
        console.error('Error fetching roles:', error);
        this.errorMessage.set('Failed to load job roles. Please check backend connection.');
        this.loading.set(false);
        return of({ status: 'error', data: [] });
      })
    ).subscribe({
      next: (response) => {
        if (response && response.status === 'success') {
          this.roles.set(response.data);
        }
        this.loading.set(false);
      }
    });
  }

  deleteRole(name: string): void {
    if (confirm(`Are you sure you want to delete job role "${name}"? Existing questions will have their job role field cleared.`)) {
      this.loading.set(true);
      this.interviewService.deleteRole(name).pipe(
        catchError((error) => {
          console.error('Error deleting role:', error);
          alert('Failed to delete job role.');
          this.loading.set(false);
          return of(null);
        })
      ).subscribe({
        next: (response) => {
          if (response && response.status === 'success') {
            this.loadRoles();
          } else {
            this.loading.set(false);
          }
        }
      });
    }
  }
}
