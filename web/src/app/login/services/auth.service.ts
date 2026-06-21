import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private backendUrl = 'http://localhost:8000/api/v1';

  /**
   * Registers a new user.
   */
  signup(name: string, emailid: string, login_id: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/signup`, {
      name,
      emailid,
      login_id,
      password
    });
  }

  /**
   * Checks if login_id is available and returns suggestions if taken.
   */
  checkLoginIdAvailability(loginId: string, excludeUserId?: number): Observable<{ available: boolean; suggestions?: string[] }> {
    let url = `${this.backendUrl}/check_login_id?login_id=${encodeURIComponent(loginId)}`;
    if (excludeUserId) {
      url += `&exclude_user_id=${excludeUserId}`;
    }
    return this.http.get<{ available: boolean; suggestions?: string[] }>(url);
  }

  /**
   * Log in user using emailid and password.
   */
  login(emailid: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/login`, {
      emailid,
      password
    });
  }

  /**
   * Resets password for a given emailid.
   */
  resetPassword(emailid: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.backendUrl}/password_reset`, {
      emailid,
      new_password: newPassword
    });
  }
}
