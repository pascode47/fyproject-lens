import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationExtras } from '@angular/router';
import { Location } from '@angular/common';
import { Project } from '../../models/project'; // Import Project model

@Component({
  selector: 'app-project-card',
  standalone: true, // Add standalone flag based on other components
  imports: [CommonModule, RouterModule],
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.css'] // Use styleUrls
})
export class ProjectCardComponent {
  @Input() project!: Project; // Use single project input
  // Keep similarityPercentage and showSimilarity separate for now, 
  // as they might not be part of the base Project model fetched for browsing.
  @Input() similarityPercentage?: number; 
  @Input() showSimilarity: boolean = false;
  
  constructor(private router: Router, private location: Location) {}
  
  logProjectId(): void {
    console.log('Project ID:', this.project._id);
    console.log('Full project object:', this.project);
  }
  
  navigateToDetails(): void {
    console.log('Navigating to project details with ID:', this.project._id);
    if (this.project && this.project._id) {
      // Create navigation extras to preserve the navigation state
      const navigationExtras: NavigationExtras = {
        state: {
          // Store the current URL to return to when back button is pressed
          returnUrl: this.router.url
        }
      };
      
      // Navigate with state
      this.router.navigate(['/projects', this.project._id], navigationExtras);
    } else {
      console.error('Cannot navigate: Project ID is missing', this.project);
    }
  }

  getSimilarityClass(): string {
    // Use only the dedicated input property for similarity percentage
    const percentage = this.similarityPercentage; 

    if (percentage === undefined || percentage === null) return ''; // Check if the input is provided
    
    if (percentage >= 70) {
      return 'high-similarity';
    } else if (percentage >= 40) {
      return 'medium-similarity';
    } else {
      return 'low-similarity';
    }
  }
}
