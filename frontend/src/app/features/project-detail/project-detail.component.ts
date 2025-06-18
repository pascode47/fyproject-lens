import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { SimilarityService } from '../../services/similarity.service';
import { Project } from '../../models/project';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css'
})
export class ProjectDetailComponent implements OnInit {
  project: Project | null = null;
  isLoading = true;
  error: string | null = null;
  projectId: string | null = null;
  returnUrl: string | null = null;
  
  // Similarity analysis properties
  isAnalyzing = false;
  analysisMessage: string | null = null;
  analysisSuccess = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private projectService: ProjectService,
    private similarityService: SimilarityService
  ) {
    // Get navigation state if available
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.returnUrl = navigation.extras.state['returnUrl'];
      console.log('Return URL from navigation state:', this.returnUrl);
    }
  }

  ngOnInit(): void {
    // Subscribe to route params to handle navigation between different project details
    this.route.paramMap.subscribe(params => {
      this.projectId = params.get('id');
      console.log('Project detail component initialized with ID:', this.projectId);
      
      if (this.projectId) {
        this.fetchProjectDetails(this.projectId);
      } else {
        this.error = 'Project ID not found in URL.';
        this.isLoading = false;
        console.error('No project ID found in route parameters');
      }
    });
  }

  fetchProjectDetails(id: string): void {
    this.isLoading = true;
    this.projectService.getProjectById(id).subscribe({
      next: (projectDetails: Project) => { // Type response as Project
        console.log('Received API response for project details:', projectDetails); 
        
        if (!projectDetails || !projectDetails._id) {
          this.error = 'Invalid project data received from server.';
          this.project = null;
        } else {
          this.project = projectDetails;
          this.error = null;
          
          // Log successful project load for debugging
          console.log('Project details loaded successfully:', {
            id: projectDetails._id,
            title: projectDetails.title,
            year: projectDetails.academicYear,
            department: projectDetails.department
          });
        }
        
        this.isLoading = false;
      },
      error: (err: any) => { // Explicitly type err
        console.error('Error fetching project details:', err);
        
        // More specific error handling based on error type
        if (err.status === 404) {
          this.error = 'Project not found. The project may have been removed or you may not have permission to view it.';
        } else if (err.status === 403) {
          this.error = 'You do not have permission to view this project.';
        } else if (err.status === 401) {
          this.error = 'Authentication required. Please log in to view this project.';
        } else if (err.message && typeof err.message === 'string') {
          this.error = err.message;
        } else {
          this.error = 'Failed to load project details. Please try again later.';
        }
        
        this.isLoading = false;
        this.project = null;
      }
    });
  }

  getReportDownloadUrl(): string | null {
    if (this.projectId) {
      // Construct the URL to the backend endpoint that serves the file
      // Assuming the backend route is /api/projects/:id/download
      return `${environment.apiUrl}/projects/${this.projectId}/download`;
    }
    return null;
  }
  
  /**
   * Navigate back to the previous page
   * If a returnUrl was provided in the navigation state, use that
   * Otherwise, use the browser's history
   */
  goBack(): void {
    if (this.returnUrl) {
      console.log('Navigating to return URL:', this.returnUrl);
      this.router.navigateByUrl(this.returnUrl);
    } else {
      console.log('Using browser history to go back');
      this.location.back();
    }
  }
  
  /**
   * Analyze the current project for similarities with other projects
   */
  analyzeProject(): void {
    if (!this.projectId) {
      this.analysisMessage = 'Project ID is missing. Cannot analyze.';
      this.analysisSuccess = false;
      return;
    }
    
    this.isAnalyzing = true;
    this.analysisMessage = null;
    
    this.similarityService.analyzeSimilarity(this.projectId).subscribe({
      next: (response) => {
        if (response.success) {
          this.analysisMessage = 'Analysis completed successfully! You can view the results in your similarity history.';
          this.analysisSuccess = true;
        } else {
          this.analysisMessage = response.message || 'Analysis failed. Please try again.';
          this.analysisSuccess = false;
        }
        this.isAnalyzing = false;
      },
      error: (err) => {
        console.error('Error analyzing project:', err);
        this.analysisMessage = err.error?.message || 'Failed to analyze project. Please try again later.';
        this.analysisSuccess = false;
        this.isAnalyzing = false;
      }
    });
  }
}
