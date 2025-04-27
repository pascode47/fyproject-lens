import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AnalysisService } from '../../shared/services/analysis.service';
import { SimilarityResult } from '../../models/similarity-result';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';

@Component({
  selector: 'app-similarity-results',
  imports: [CommonModule, RouterModule, ProjectCardComponent],
  templateUrl: './similarity-results.component.html',
  styleUrl: './similarity-results.component.css'
})
export class SimilarityResultsComponent implements OnInit {
  projectId: string | null = null;
  projectTitle: string = '';
  isLoading: boolean = true;
  error: string | null = null;
  similarityResults: SimilarityResult[] = [];

  constructor(
    private route: ActivatedRoute,
    private analysisService: AnalysisService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.projectId = params.get('id');
      if (this.projectId) {
        this.loadSimilarityResults(this.projectId);
      } else {
        this.error = 'Project ID not found';
        this.isLoading = false;
      }
    });
  }

  loadSimilarityResults(projectId: string): void {
    this.isLoading = true;
    this.error = null;
    
    this.analysisService.getSimilarityResults(projectId).subscribe(
      (data: {projectTitle: string, results: SimilarityResult[]}) => {
        this.similarityResults = data.results;
        this.projectTitle = data.projectTitle;
        this.isLoading = false;
      },
      (error: any) => {
        this.error = 'Failed to load similarity results. Please try again.';
        this.isLoading = false;
        console.error('Error loading similarity results:', error);
      }
    );
  }

  getSimilarityClass(percentage: number): string {
    if (percentage >= 70) {
      return 'high-similarity';
    } else if (percentage >= 40) {
      return 'medium-similarity';
    } else {
      return 'low-similarity';
    }
  }
}
