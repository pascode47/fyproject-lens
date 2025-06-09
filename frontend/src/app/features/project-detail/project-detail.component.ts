import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project.service'; // Adjust path if needed
import { Project } from '../../models/project'; // Adjust path if needed
import { environment } from '../../../environments/environment'; // For API URL

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

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService
  ) {}

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
}
