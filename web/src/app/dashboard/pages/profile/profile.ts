import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InterviewService } from '../../../interview/services/interview.service';
import { AuthService } from '../../../login/services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private router = inject(Router);
  private interviewService = inject(InterviewService);
  private authService = inject(AuthService);

  user: any = null;
  name: string = '';
  emailid: string = '';
  login_id: string = '';
  password: string = '';
  photo: string | null = null;

  errorMessage: string | null = null;
  successMessage: string | null = null;
  isSubmitting = false;

  checkingLoginId = false;
  loginIdAvailable = true;
  loginIdSuggestions: string[] = [];

  ngOnInit(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
        this.name = this.user.name || '';
        this.emailid = this.user.emailid || '';
        this.login_id = this.user.login_id || '';
        this.password = this.user.password || '';
        this.photo = this.user.photo || null;
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    if (!this.user) {
      this.router.navigate(['/auth/login']);
    }
  }

  getUserInitials(): string {
    if (!this.name) return 'US';
    const nameStr = this.name.trim();
    const parts = nameStr.split(/\s+/);
    if (parts.length >= 2) {
      const firstInitial = parts[0].charAt(0);
      const secondInitial = parts[1].charAt(0);
      return (firstInitial + secondInitial).toUpperCase();
    } else if (nameStr.length >= 2) {
      return nameStr.substring(0, 2).toUpperCase();
    } else if (nameStr.length === 1) {
      return nameStr.toUpperCase();
    }
    return 'US';
  }

  onLoginIdChange(): void {
    const val = this.login_id.trim();
    if (!val || val.length < 3) {
      this.loginIdAvailable = true;
      this.loginIdSuggestions = [];
      return;
    }

    if (this.user && val.toLowerCase() === this.user.login_id.toLowerCase()) {
      this.loginIdAvailable = true;
      this.loginIdSuggestions = [];
      this.checkingLoginId = false;
      return;
    }

    this.checkingLoginId = true;
    this.authService.checkLoginIdAvailability(val, this.user?.user_id).subscribe({
      next: (res) => {
        this.checkingLoginId = false;
        if (res) {
          this.loginIdAvailable = res.available;
          this.loginIdSuggestions = res.suggestions || [];
        }
      },
      error: () => {
        this.checkingLoginId = false;
      }
    });
  }

  selectSuggestion(suggestion: string): void {
    this.login_id = suggestion;
    this.loginIdAvailable = true;
    this.loginIdSuggestions = [];
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limit file size to 2MB (Base64 can grow large, and LONGTEXT supports up to 4GB, but 2MB keeps API responsive)
    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage = 'Image size must be less than 2MB.';
      this.successMessage = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.photo = reader.result as string;
      this.errorMessage = null;
    };
    reader.onerror = () => {
      this.errorMessage = 'Error reading the file.';
    };
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.photo = null;
    // Clear the file input if possible
    const fileInput = document.getElementById('photoInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit(): void {
    if (!this.name.trim() || !this.emailid.trim() || !this.login_id.trim() || !this.password.trim()) {
      this.errorMessage = 'Name, email, login ID, and password cannot be empty.';
      this.successMessage = null;
      return;
    }

    if (!this.loginIdAvailable) {
      this.errorMessage = 'Please choose an available Login ID.';
      this.successMessage = null;
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.successMessage = null;

    const payload = {
      user_id: this.user.user_id,
      name: this.name,
      emailid: this.emailid,
      login_id: this.login_id,
      password: this.password,
      photo: this.photo
    };

    this.interviewService.updateUserProfile(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res && res.status === 'success') {
          this.successMessage = 'Profile updated successfully!';
          this.user = res.user;
          localStorage.setItem('user', JSON.stringify(res.user));
          
          // Notify other components (like Header) to sync their user data
          window.dispatchEvent(new Event('user-profile-updated'));
        } else {
          this.errorMessage = res.message || 'Failed to update profile.';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error updating profile:', err);
        this.errorMessage = err.error?.detail || 'An unexpected error occurred while updating profile.';
      }
    });
  }
}
