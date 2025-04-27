import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { User } from '../../models/user';
import { Analysis } from '../../models/analysis';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  analyses: Analysis[] = [];
  isLoading: boolean = true;
  error: string | null = null;
  
  // Password change
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  passwordChangeSuccess: boolean = false;
  passwordChangeError: string | null = null;
  
  // Filters
  startDate: string = '';
  endDate: string = '';
  
  constructor(private authService: AuthService) {}
  
  ngOnInit(): void {
    this.loadUserProfile();
    this.loadAnalysisHistory();
  }
  
  loadUserProfile(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.error = 'User not authenticated';
    }
  }
  
  loadAnalysisHistory(): void {
    // In a real app, this would call a service to get the user's analysis history
    // For now, we'll use mock data
    this.isLoading = true;
    
    setTimeout(() => {
      this.analyses = [
        {
          id: '1',
          userId: '123',
          projectId: '456',
          similarityPercentage: 75,
          recommendations: [
            'Add more details to the methodology section',
            'Include more references to recent research'
          ],
          timestamp: new Date('2023-11-15')
        },
        {
          id: '2',
          userId: '123',
          projectId: '789',
          similarityPercentage: 45,
          recommendations: [
            'Consider expanding the literature review',
            'Add more analysis of the results'
          ],
          timestamp: new Date('2023-12-01')
        }
      ];
      this.isLoading = false;
    }, 1000);
  }
  
  changePassword(): void {
    this.passwordChangeSuccess = false;
    this.passwordChangeError = null;
    
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordChangeError = 'Please fill in all password fields';
      return;
    }
    
    if (this.newPassword !== this.confirmPassword) {
      this.passwordChangeError = 'New passwords do not match';
      return;
    }
    
    // In a real app, this would call a service to change the password
    // For now, we'll just simulate success
    setTimeout(() => {
      this.passwordChangeSuccess = true;
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    }, 1000);
  }
  
  applyDateFilter(): void {
    // In a real app, this would filter the analyses based on the date range
    // For now, we'll just log the filter values
    console.log('Filtering by date range:', this.startDate, 'to', this.endDate);
  }
  
  clearDateFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadAnalysisHistory();
  }
}
