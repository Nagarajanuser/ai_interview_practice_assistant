import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  private router = inject(Router);
  user: any = null;
  isDarkTheme = true;

  ngOnInit(): void {
    this.loadUser();
    this.applyTheme();
  }

  @HostListener('window:user-profile-updated')
  onUserProfileUpdated(): void {
    this.loadUser();
  }

  toggleTheme(): void {
    // Theme switching is disabled, keep dark theme active
    this.isDarkTheme = true;
    this.applyTheme();
  }

  applyTheme(): void {
    document.body.classList.remove('light-theme');
  }

  loadUser(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user data:', e);
        this.user = null;
      }
    } else {
      this.user = null;
    }
  }

  getUserInitials(): string {
    if (!this.user || !this.user.name) return 'US';
    const nameStr = this.user.name.trim();
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

  onLogout(): void {
    localStorage.removeItem('user');
    this.user = null;
    this.router.navigate(['/auth']);
  }
}
