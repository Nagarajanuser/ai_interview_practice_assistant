import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private router = inject(Router);
  private authService = inject(AuthService);

  name = '';
  emailid = '';
  loginid = '';
  password = '';
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  checkingLoginId = false;
  loginIdAvailable = true;
  loginIdSuggestions: string[] = [];

  onLoginIdChange(): void {
    const val = this.loginid.trim();
    if (!val || val.length < 3) {
      this.loginIdAvailable = true;
      this.loginIdSuggestions = [];
      return;
    }

    this.checkingLoginId = true;
    this.authService.checkLoginIdAvailability(val).subscribe({
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
    this.loginid = suggestion;
    this.loginIdAvailable = true;
    this.loginIdSuggestions = [];
  }

  onSignup(): void {
    if (!this.name || !this.emailid || !this.loginid || !this.password) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }

    if (!this.loginIdAvailable) {
      this.errorMessage.set('Please choose an available Login ID.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.signup(this.name.trim(), this.emailid.trim(), this.loginid.trim(), this.password).pipe(
      catchError((error) => {
        console.error('Signup error:', error);
        const detail = error?.error?.detail || 'An error occurred during registration.';
        this.errorMessage.set(detail);
        this.submitting.set(false);
        return of(null);
      })
    ).subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          this.successMessage.set('Account created successfully! Redirecting to login...');
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
