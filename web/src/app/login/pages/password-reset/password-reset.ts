import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-reset',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './password-reset.html',
  styleUrl: './password-reset.scss',
})
export class PasswordReset {
  private router = inject(Router);
  private authService = inject(AuthService);

  emailid = '';
  newPassword = '';
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  onResetPassword(): void {
    if (!this.emailid || !this.newPassword) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.resetPassword(this.emailid.trim(), this.newPassword).pipe(
      catchError((error) => {
        console.error('Password reset error:', error);
        const detail = error?.error?.detail || 'An error occurred during password reset.';
        this.errorMessage.set(detail);
        this.submitting.set(false);
        return of(null);
      })
    ).subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.successMessage.set('Password reset successfully! Redirecting to login...');
          setTimeout(() => {
            this.router.navigate(['/auth']);
          }, 2000);
        } else {
          this.submitting.set(false);
        }
      }
    });
  }
}
