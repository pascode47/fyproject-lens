import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-project-card',
  standalone: true, // Added standalone: true
  imports: [CommonModule, RouterModule],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.css'
})
export class ProjectCardComponent {
  @Input() id: string = '';
  @Input() title: string = '';
  @Input() year: string = '';
  @Input() department: string = '';
  @Input() similarityPercentage?: number;
  @Input() tags: string[] = [];
  @Input() description?: string;
  @Input() showSimilarity: boolean = false;

  getSimilarityClass(): string {
    if (!this.similarityPercentage) return '';
    
    if (this.similarityPercentage >= 70) {
      return 'high-similarity';
    } else if (this.similarityPercentage >= 40) {
      return 'medium-similarity';
    } else {
      return 'low-similarity';
    }
  }
}
