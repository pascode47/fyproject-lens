import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, Subject } from 'rxjs';
import { catchError, tap, delay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUser: User | null = null;
  private token: string | null = null;
  
  // Subject to emit when auth state changes
  private authStateSubject = new Subject<void>();
  
  // Observable that components can subscribe to
  authStateChanged = this.authStateSubject.asObservable();

  constructor(private http: HttpClient) {
    // Try to load user from localStorage on service initialization
    // Only if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.loadUserFromStorage();
    }
  }

  /**
   * Authenticate user and return JWT token
   * @param email User email
   * @param password User password
   * @returns Observable with authentication result
   */
  login(email: string, password: string): Observable<{ token: string, user: User }> {
    // Clean inputs before submitting
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    
    console.log('AuthService: Attempting login with cleaned email:', cleanEmail);
    
    // Use mock data if in production or if useMockData is set to true
    if (environment.production || environment.useMockData) {
      return this.getMockLoginResponse(cleanEmail, cleanPassword);
    }
    
    // The backend response is wrapped in a data property
    interface BackendResponse {
      success: boolean;
      message: string;
      data?: {
        token: string;
        user: User;
      };
    }
    
    return this.http.post<BackendResponse>(
      `${this.apiUrl}/auth/login`, 
      { email: cleanEmail, password: cleanPassword },
      { headers: { 'Content-Type': 'application/json' } }
    ).pipe(
      tap(response => {
        console.log('Login response:', response);
        
        // Check if the response has the expected structure
        if (response && response.success && response.data && response.data.token && response.data.user) {
          console.log('Login successful, setting session');
          this.setSession(response.data.token, response.data.user);
        } else {
          console.error('Invalid login response format:', response);
        }
      }),
      // Map the response to match the expected return type
      map((response: BackendResponse) => {
        if (response && response.success && response.data) {
          return {
            token: response.data.token,
            user: response.data.user
          };
        }
        console.error('Error mapping response - invalid format:', response);
        throw new Error('Invalid response format');
      }),
      catchError(error => {
        console.error('Login error:', error);
        
        // Try to get the error message from the server response if available
        let errorMessage = 'Invalid email or password. Please try again.';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  /**
   * Register a new user
   * @param user User details
   * @returns Observable with registration result
   */
  signup(user: Partial<User>): Observable<{ token: string, user: User }> {
    // Use mock data if in production or if useMockData is set to true
    if (environment.production || environment.useMockData) {
      return this.getMockSignupResponse(user);
    }
    
    // The backend response is wrapped in a data property
    interface BackendResponse {
      success: boolean;
      message: string;
      data?: {
        token: string;
        user: User;
      };
    }
    
    return this.http.post<BackendResponse>(`${this.apiUrl}/auth/signup`, user)
      .pipe(
        tap(response => {
          console.log('Signup response:', response);
          
          // Check if the response has the expected structure
          if (response && response.success && response.data && response.data.token && response.data.user) {
            this.setSession(response.data.token, response.data.user);
          } else {
            console.error('Invalid signup response format:', response);
          }
        }),
        // Map the response to match the expected return type
        map((response: BackendResponse) => {
          if (response && response.success && response.data) {
            return {
              token: response.data.token,
              user: response.data.user
            };
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Signup error:', error);
          return throwError(() => new Error('Registration failed. Please try again.'));
        })
      );
  }

  /**
   * Log out the current user
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
    this.currentUser = null;
    this.token = null;
    
    // Notify subscribers that auth state has changed
    this.authStateSubject.next();
  }

  /**
   * Check if user is authenticated
   * @returns Boolean indicating if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.currentUser;
  }

  /**
   * Check if current user is an admin
   * @returns Boolean indicating if user is an admin
   */
  isAdmin(): boolean {
    return this.isAuthenticated() && this.currentUser?.role === 'admin';
  }

  /**
   * Get current user information
   * @returns Current user or null if not authenticated
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get authentication token
   * @returns JWT token or null if not authenticated
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Store authentication session
   * @param token JWT token
   * @param user User information
   */
  private setSession(token: string, user: User): void {
    console.log('Setting session with token:', token);
    console.log('Setting session with user:', user);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        console.log('Session data stored in localStorage');
      } catch (e) {
        console.error('Error storing session in localStorage:', e);
      }
    }
    
    this.token = token;
    this.currentUser = user;
    console.log('Session variables set in memory:', this.isAuthenticated());
    
    // Notify subscribers that auth state has changed
    this.authStateSubject.next();
  }

  /**
   * Load user from localStorage
   */
  private loadUserFromStorage(): void {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const userJson = localStorage.getItem('user');
      
      if (token && userJson) {
        try {
          this.token = token;
          this.currentUser = JSON.parse(userJson);
          
          // Notify subscribers that auth state has been restored from storage
          this.authStateSubject.next();
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
          this.logout(); // Clear invalid data
        }
      }
    }
  }
  
  /**
   * Get mock login response
   * @param email User email
   * @param password User password
   * @returns Observable with mock authentication result
   */
  private getMockLoginResponse(email: string, password: string): Observable<{ token: string, user: User }> {
    // Simple validation for demo purposes
    if (email === 'admin@example.com' && password === 'password') {
      const mockUser: User = {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        registrationNo: 'T20-12-12345',
        programme: '1',
        role: 'admin',
        status: 'active'
      };
      
      const mockToken = 'mock-jwt-token-for-admin-user';
      
      // Simulate network delay
      return of({ token: mockToken, user: mockUser }).pipe(
        delay(500),
        tap(response => {
          this.setSession(response.token, response.user);
        })
      );
    } else if (email === 'user@example.com' && password === 'password') {
      const mockUser: User = {
        id: '2',
        name: 'Regular User',
        email: 'user@example.com',
        registrationNo: 'T21-12-12345',
        programme: '2',
        role: 'user',
        status: 'active'
      };
      
      const mockToken = 'mock-jwt-token-for-regular-user';
      
      // Simulate network delay
      return of({ token: mockToken, user: mockUser }).pipe(
        delay(500),
        tap(response => {
          this.setSession(response.token, response.user);
        })
      );
    }
    
    // Invalid credentials
    return throwError(() => new Error('Invalid email or password. Please try again.')).pipe(
      delay(500)
    );
  }
  
  /**
   * Get mock signup response
   * @param user User details
   * @returns Observable with mock registration result
   */
  private getMockSignupResponse(user: Partial<User>): Observable<{ token: string, user: User }> {
    // Create a mock user with the provided details
    const mockUser: User = {
      id: Math.random().toString(36).substring(2, 15),
      name: user.name || 'New User',
      email: user.email || 'newuser@example.com',
      registrationNo: user.registrationNo || 'T22-12-12345',
      programme: user.programme || '1',
      role: 'user',
      status: 'active'
    };
    
    const mockToken = `mock-jwt-token-for-${mockUser.id}`;
    
    // Simulate network delay
    return of({ token: mockToken, user: mockUser }).pipe(
      delay(500),
      tap(response => {
        this.setSession(response.token, response.user);
      })
    );
  }
}
