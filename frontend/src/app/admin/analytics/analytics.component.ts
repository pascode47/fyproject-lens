import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../shared/services/admin.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnInit {
  metrics: any = null;
  isLoading: boolean = true;
  error: string | null = null;
  
  constructor(private adminService: AdminService) {}
  
  ngOnInit(): void {
    this.loadMetrics();
  }
  
  loadMetrics(): void {
    this.isLoading = true;
    this.error = null;
    
    this.adminService.getSystemMetrics().subscribe({
      next: (data) => {
        this.metrics = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load system metrics. Please try again.';
        this.isLoading = false;
        console.error('Error loading system metrics:', error);
      }
    });
  }
  
  // Helper method to calculate percentage
  calculatePercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
  
  // Helper method to get color based on similarity level
  getSimilarityColor(level: string): string {
    switch (level) {
      case 'high':
        return '#dc3545'; // Red
      case 'medium':
        return '#ffc107'; // Yellow
      case 'low':
        return '#28a745'; // Green
      default:
        return '#6c757d'; // Gray
    }
  }
}
