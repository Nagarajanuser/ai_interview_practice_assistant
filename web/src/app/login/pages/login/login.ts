import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private router = inject(Router);
  private authService = inject(AuthService);

  emailid = '';
  password = '';
  submitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  onLogin(): void {
    if (!this.emailid || !this.password) {
      this.errorMessage.set('Please provide both email and password.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authService.login(this.emailid.trim(), this.password).pipe(
      catchError((error) => {
        console.error('Login error:', error);
        const detail = error?.error?.detail || 'Invalid email or password.';
        this.errorMessage.set(detail);
        this.submitting.set(false);
        return of(null);
      })
    ).subscribe({
      next: (res) => {
        if (res && res.status === 'success') {
          // Store user session info
          localStorage.setItem('user', JSON.stringify(res.user));
          this.router.navigate(['/dashboard']);
        }
      }
    });
  }
}
