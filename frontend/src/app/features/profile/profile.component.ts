import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { User } from '../../models/user';
import { Programme } from '../../models/programme';
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
  programmeName: string = '';
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
      return;
    }
    this.setProgrammeName();
  }
  
  setProgrammeName(): void {
    if (this.user && typeof this.user.programme === 'string') {
      this.authService.getProgrammes().subscribe({
        next: (programmes: Programme[]) => {
          console.log('Programmes fetched from API:', programmes);
          const programme = programmes.find(p => p.id === this.user!.programme);
          if (programme) {
            this.programmeName = programme.fullName;
          } else {
            this.programmeName = this.getHardcodedProgrammeName(this.user!.programme as string);
          }
        },
        error: (err) => {
          console.error('Error fetching programmes:', err);
          this.programmeName = this.getHardcodedProgrammeName(this.user!.programme as string);
        }
      });
    } else if (this.user && this.user.programme && typeof this.user.programme !== 'string') {
      this.programmeName = (this.user.programme as Programme).fullName;
    }
  }
  
  getHardcodedProgrammeName(programmeId: string): string {
    const programmeMap: { [key: string]: string } = {
      '682f00b4a04e5b8d9bedb872': 'Bachelor of Science in Information Systems',
      '682f00b4a04e5b8d9bedb873': 'Bachelor of Science in Software Engineering',
      '682f00b4a04e5b8d9bedb874': 'Bachelor of Science in Information Technology',
      '682f00b4a04e5b8d9bedb875': 'Bachelor of Science in Network Security',
      '682f00b4a04e5b8d9bedb876': 'Bachelor of Science in Computer Engineering',
      '682f00b4a04e5b8d9bedb877': 'Bachelor of Science in Electrical Engineering'
    };
    return programmeMap[programmeId] || `Unknown Programme (${programmeId})`;
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
          analysisType: 'project', // Added required property
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
          analysisType: 'project', // Added required property
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
