import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-edit-role',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './edit-role.html',
})
export class EditRole implements OnInit {
  private interviewService = inject(InterviewService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  topicsList = signal<string[]>([]);
  oldRoleName = '';
  editRoleNewName = '';
  selectedTopics = signal<string[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit(): void {
    const name = this.route.snapshot.paramMap.get('name');
    if (name) {
      this.oldRoleName = name;
      this.editRoleNewName = name;
      this.loadTopicsAndRoleDetails();
    } else {
      this.errorMessage.set('Invalid job role name.');
    }
  }

  loadTopicsAndRoleDetails(): void {
    this.loading.set(true);
    // 1. Load topics
    this.interviewService.getTopics().subscribe({
      next: (topicRes) => {
        if (topicRes && topicRes.status === 'success') {
          this.topicsList.set(topicRes.data.map((t: any) => typeof t === 'string' ? t : t.name));
        }
        
        // 2. Load roles to find detail mappings
        this.interviewService.getRoles().pipe(
          catchError((err) => {
            console.error('Error fetching role details:', err);
            this.errorMessage.set('Failed to load job role details.');
            this.loading.set(false);
            return of({ status: 'error', data: [] });
          })
        ).subscribe({
          next: (roleRes) => {
            if (roleRes && roleRes.status === 'success') {
              const found = roleRes.data.find((r: any) => r.name === this.oldRoleName);
              if (found) {
                this.selectedTopics.set(found.topics || []);
              } else {
                this.errorMessage.set(`Job role "${this.oldRoleName}" was not found.`);
              }
            }
            this.loading.set(false);
          }
        });
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

  updateRole(): void {
    const newName = this.editRoleNewName.trim();
    if (!newName) {
      this.errorMessage.set('Job role name is required.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.interviewService.updateRole(this.oldRoleName, newName, this.selectedTopics()).pipe(
      catchError((error) => {
        console.error('Error updating role:', error);
        this.errorMessage.set(error.error?.detail || 'Failed to update job role.');
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
