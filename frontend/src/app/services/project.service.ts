// services/project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getStatistics(): Observable<any> {
    if (environment.production || environment.useMockData) {
      return this.getMockStatistics();
    }
    
    return this.http.get(`${this.apiUrl}/statistics`).pipe(
      catchError(error => {
        console.error('Error fetching statistics:', error);
        return this.getMockStatistics();
      })
    );
  }

  getRecentActivities(): Observable<any> {
    if (environment.production || environment.useMockData) {
      return this.getMockRecentActivities();
    }
    
    return this.http.get(`${this.apiUrl}/activities/recent`).pipe(
      catchError(error => {
        console.error('Error fetching recent activities:', error);
        return this.getMockRecentActivities();
      })
    );
  }

  uploadProject(formData: FormData): Observable<any> {
    if (environment.production || environment.useMockData) {
      return of({
        success: true,
        message: 'Project uploaded successfully (mock data)',
        projectId: '12345'
      });
    }
    
    return this.http.post(`${this.apiUrl}/projects/upload`, formData).pipe(
      catchError(error => {
        console.error('Error uploading project:', error);
        return of({
          success: false,
          message: 'Failed to upload project. Please try again later.'
        });
      })
    );
  }

  getAllProjects(): Observable<any> {
    if (environment.production || environment.useMockData) {
      return this.getMockProjects();
    }
    
    return this.http.get(`${this.apiUrl}/projects`).pipe(
      catchError(error => {
        console.error('Error fetching projects:', error);
        return this.getMockProjects();
      })
    );
  }

  getProjectById(id: string): Observable<any> {
    if (environment.production || environment.useMockData) {
      return this.getMockProjectById(id);
    }
    
    return this.http.get(`${this.apiUrl}/projects/${id}`).pipe(
      catchError(error => {
        console.error(`Error fetching project with ID ${id}:`, error);
        return this.getMockProjectById(id);
      })
    );
  }

  // Mock data for build/SSR process
  private getMockStatistics(): Observable<any> {
    return of({
      totalProjects: 156,
      projectsThisYear: 42,
      popularDomains: ['Machine Learning', 'Web Development', 'Mobile Apps', 'IoT']
    });
  }

  private getMockRecentActivities(): Observable<any> {
    return of([
      {
        id: 1,
        description: 'New project uploaded: "AI-based Recommendation System"',
        time: '2 hours ago',
        icon: '📄'
      },
      {
        id: 2,
        description: 'Similarity analysis completed for "Web-based Learning Platform"',
        time: '5 hours ago',
        icon: '🔍'
      },
      {
        id: 3,
        description: 'New recommendation generated for Computer Science department',
        time: '1 day ago',
        icon: '💡'
      },
      {
        id: 4,
        description: 'System update: Added new similarity detection algorithm',
        time: '2 days ago',
        icon: '🔄'
      }
    ]);
  }

  private getMockProjects(): Observable<any> {
    return of({
      projects: [
        {
          id: '1',
          title: 'Machine Learning for Image Recognition',
          description: 'A project that uses deep learning to recognize objects in images',
          year: '2023',
          department: 'Computer Science',
          tags: ['Machine Learning', 'AI', 'Computer Vision']
        },
        {
          id: '2',
          title: 'Natural Language Processing System',
          description: 'A system that processes and understands human language',
          year: '2022',
          department: 'Computer Science',
          tags: ['NLP', 'AI', 'Machine Learning']
        },
        {
          id: '3',
          title: 'Data Visualization Dashboard',
          description: 'Interactive dashboard for visualizing complex datasets',
          year: '2023',
          department: 'Information Systems',
          tags: ['Data Visualization', 'Dashboard', 'Analytics']
        }
      ]
    });
  }

  private getMockProjectById(id: string): Observable<any> {
    return of({
      id: id,
      title: `Project ${id}`,
      description: 'This is a mock project description for the build process',
      year: '2023',
      department: 'Computer Science',
      author: 'John Doe',
      tags: ['Mock', 'Data', 'Build Process'],
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    });
  }
}
