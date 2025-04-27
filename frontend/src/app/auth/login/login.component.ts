import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    this.isLoading = true;
    this.error = null;

    // Trim inputs to avoid whitespace issues
    const trimmedEmail = this.email.trim();
    const trimmedPassword = this.password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      this.error = 'Please enter both email and password';
      this.isLoading = false;
      return;
    }

    console.log('Login component: Attempting login with email:', trimmedEmail);

    this.authService.login(trimmedEmail, trimmedPassword).subscribe({
      next: (response) => {
        console.log('Login component: Login successful, response received');
        this.isLoading = false;
        
        // Check if authentication was successful
        if (this.authService.isAuthenticated()) {
          console.log('Login component: User is authenticated, navigating to home');
          this.router.navigate(['/home']);
        } else {
          console.error('Login component: Authentication failed - user not authenticated after successful response');
          this.error = 'Authentication failed. Please try again.';
        }
      },
      error: (err) => {
        console.error('Login component: Login error:', err);
        this.error = err.message || 'Login failed. Please try again.';
        this.isLoading = false;
      }
    });
  }
}
