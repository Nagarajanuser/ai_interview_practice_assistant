import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { InterviewService } from '../../../interview/services/interview.service';

@Component({
  selector: 'app-edit-topic',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './edit-topic.html',
})
export class EditTopic implements OnInit {
  private interviewService = inject(InterviewService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  rolesList = signal<string[]>([]);
  oldTopicName = '';
  editTopicNewName = '';
  selectedRoles = signal<string[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit(): void {
    const name = this.route.snapshot.paramMap.get('name');
    if (name) {
      this.oldTopicName = name;
      this.editTopicNewName = name;
      this.loadRolesAndTopicDetails();
    } else {
      this.errorMessage.set('Invalid topic name.');
    }
  }

  loadRolesAndTopicDetails(): void {
    this.loading.set(true);
    // 1. Load roles
    this.interviewService.getRoles().subscribe({
      next: (roleRes) => {
        if (roleRes && roleRes.status === 'success') {
          this.rolesList.set(roleRes.data.map((r: any) => typeof r === 'string' ? r : r.name));
        }
        
        // 2. Load topics to find detail mappings
        this.interviewService.getTopics().pipe(
          catchError((err) => {
            console.error('Error fetching topic details:', err);
            this.errorMessage.set('Failed to load topic details.');
            this.loading.set(false);
            return of({ status: 'error', data: [] });
          })
        ).subscribe({
          next: (topicRes) => {
            if (topicRes && topicRes.status === 'success') {
              const found = topicRes.data.find((t: any) => t.name === this.oldTopicName);
              if (found) {
                this.selectedRoles.set(found.roles || []);
              } else {
                this.errorMessage.set(`Topic "${this.oldTopicName}" was not found.`);
              }
            }
            this.loading.set(false);
          }
        });
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

  updateTopic(): void {
    const newName = this.editTopicNewName.trim();
    if (!newName) {
      this.errorMessage.set('Topic name is required.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.interviewService.updateTopic(this.oldTopicName, newName, this.selectedRoles()).pipe(
      catchError((error) => {
        console.error('Error updating topic:', error);
        this.errorMessage.set(error.error?.detail || 'Failed to update topic.');
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
