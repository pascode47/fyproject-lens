import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Programme } from '../../models/programme';
import { User } from '../../models/user';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent implements OnInit {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  registrationNo: string = '';
  selectedProgramme: string = '';
  isLoading: boolean = false;
  error: string | null = null;
  
  // Grouped programmes by discipline
  programmes: { [discipline: string]: Programme[] } = {};
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadProgrammes();
  }
  
  signup(): void {
    this.isLoading = true;
    this.error = null;
    
    // Validate form
    if (!this.name || !this.email || !this.password || !this.registrationNo || !this.selectedProgramme) {
      this.error = 'Please fill in all required fields';
      this.isLoading = false;
      return;
    }
    
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      this.isLoading = false;
      return;
    }
    
    // Validate registration number format (TXX-XX-XXXXX)
    const regNoPattern = /^T\d{2}-\d{2}-\d{5}$/;
    if (!regNoPattern.test(this.registrationNo)) {
      this.error = 'Invalid registration number format. Use TXX-XX-XXXXX format';
      this.isLoading = false;
      return;
    }
    
    const user: Partial<User> = {
      name: this.name,
      email: this.email,
      password: this.password,
      registrationNo: this.registrationNo,
      programme: this.selectedProgramme,
      role: 'user' as 'user' | 'admin',
      status: 'active' as 'active' | 'suspended'
    };
    
    this.authService.signup(user).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.error = err.message || 'Registration failed. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private loadProgrammes(): void {
    this.isLoading = true; // Start loading indicator
    this.error = null;     // Clear previous errors

    this.authService.getProgrammes().subscribe({
      next: (programmesList) => {
        // Group programmes by discipline
        this.programmes = programmesList.reduce((groups, programme) => {
          const discipline = programme.discipline;
          if (!groups[discipline]) {
            groups[discipline] = [];
          }
          groups[discipline].push(programme);
          return groups;
        }, {} as { [discipline: string]: Programme[] });
        
        this.isLoading = false; // Stop loading indicator
      },
      error: (err) => {
        console.error('Error loading programmes:', err);
        this.error = 'Failed to load programmes. Please try refreshing the page.';
        this.isLoading = false; // Stop loading indicator even on error
      }
    });
  }

  // Helper method to get the keys (disciplines) of the programmes object for the template
  getDisciplines(): string[] {
    return Object.keys(this.programmes);
  }
}
