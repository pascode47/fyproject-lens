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
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.fetchProjectDetails(this.projectId);
    } else {
      this.error = 'Project ID not found in URL.';
      this.isLoading = false;
    }
  }

  fetchProjectDetails(id: string): void {
    this.isLoading = true;
    this.projectService.getProjectById(id).subscribe({
      next: (projectDetails: Project) => { // Type response as Project
        console.log('Received API response for project details:', projectDetails); 
        // Assuming getProjectById returns the Project object directly
        this.project = projectDetails; 
        this.isLoading = false;
        this.error = null;
      },
      error: (err: any) => { // Explicitly type err
        console.error('Error fetching project details:', err);
        this.error = 'Failed to load project details. Please try again later.';
        // More specific error handling based on backend response
        if (err.status === 404) {
          this.error = 'Project not found.';
        }
        this.isLoading = false;
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
