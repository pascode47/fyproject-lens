import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
