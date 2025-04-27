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
    // In a real app, this would come from an API
    // For now, we'll use mock data
    const programmesList: Programme[] = [
      { id: '1', abbreviation: 'BSc CS', fullName: 'Bachelor of Science in Computer Science', discipline: 'Computer Science' },
      { id: '2', abbreviation: 'BSc IS', fullName: 'Bachelor of Science in Information Systems', discipline: 'Computer Science' },
      { id: '3', abbreviation: 'BSc SE', fullName: 'Bachelor of Science in Software Engineering', discipline: 'Computer Science' },
      { id: '4', abbreviation: 'BSc IT', fullName: 'Bachelor of Science in Information Technology', discipline: 'Information Technology' },
      { id: '5', abbreviation: 'BSc NS', fullName: 'Bachelor of Science in Network Security', discipline: 'Information Technology' },
      { id: '6', abbreviation: 'BSc CE', fullName: 'Bachelor of Science in Computer Engineering', discipline: 'Engineering' },
      { id: '7', abbreviation: 'BSc EE', fullName: 'Bachelor of Science in Electrical Engineering', discipline: 'Engineering' }
    ];
    
    // Group programmes by discipline
    this.programmes = programmesList.reduce((groups, programme) => {
      const discipline = programme.discipline;
      if (!groups[discipline]) {
        groups[discipline] = [];
      }
      groups[discipline].push(programme);
      return groups;
    }, {} as { [discipline: string]: Programme[] });
  }
}
