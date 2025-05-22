// services/project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // Import HttpHeaders
import { Observable, of, throwError } from 'rxjs'; // Import throwError
import { catchError, map } from 'rxjs/operators'; // Import map
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service'; // Import AuthService
import { Project } from '../../models/project'; // Import Project model

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = environment.apiUrl;

  // Inject AuthService
  constructor(private http: HttpClient, private authService: AuthService) {}

  // Helper to get auth headers
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
        // Note: Content-Type for FormData is set automatically by the browser/HttpClient
      });
    }
    // It's generally better to prevent the request if no token,
    // but returning empty headers might work depending on backend setup.
    // Throwing an error might be safer.
    console.error("Attempted to make authenticated request without token.");
    return new HttpHeaders(); // Or throw an error
  }


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

    // --- Explicitly get token and create headers here ---
    const token = this.authService.getToken();
    if (!token) {
      console.error('Upload failed: No authorization token found directly in uploadProject method.');
      return throwError(() => new Error('Authentication token is missing. Please log in again.'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Content-Type for FormData is set automatically
    });
    console.log('Upload Project Headers:', headers.keys()); // Log header keys to confirm

    // Pass headers in the options object
    return this.http.post(`${this.apiUrl}/projects/upload`, formData, { headers: headers }).pipe(
      catchError(error => {
        console.error('Error uploading project:', error);
        // Try to return a more specific error message from the backend if possible
        const message = error?.error?.message || 'Failed to upload project. Please try again later.';
        return throwError(() => new Error(message)); // Propagate error
        /* return of({ // Old way: swallowing the error
          success: false,
          message: message
        }); */
      })
    );
  }

  getAllProjects(): Observable<any> {
    // Assuming this might need auth in the future, let's add headers
    const headers = this.getAuthHeaders();
    if (!headers.has('Authorization')) {
       // Decide how to handle - maybe allow public access? For now, log warning.
       console.warn('Fetching all projects without auth token.');
       // return throwError(() => new Error('Authentication token is missing.'));
    }

    if (environment.production || environment.useMockData) {
      return this.getMockProjects();
    }

    // Pass headers if they exist
    const options = headers.has('Authorization') ? { headers: headers } : {};
    return this.http.get(`${this.apiUrl}/projects`, options).pipe(
      catchError(error => {
        console.error('Error fetching projects:', error);
        // Decide if mock data is appropriate fallback here
        // return this.getMockProjects();
        const message = error?.error?.message || 'Failed to fetch projects.';
        return throwError(() => new Error(message));
      })
    );
  }

  getProjectById(id: string): Observable<any> {
    // Assuming this might need auth in the future, let's add headers
    const headers = this.getAuthHeaders();
     if (!headers.has('Authorization')) {
       // Decide how to handle - maybe allow public access? For now, log warning.
       console.warn(`Fetching project ${id} without auth token.`);
       // return throwError(() => new Error('Authentication token is missing.'));
    }

    if (environment.production || environment.useMockData) {
      return this.getMockProjectById(id);
    }

    // Pass headers if they exist
    const options = headers.has('Authorization') ? { headers: headers } : {};
    return this.http.get(`${this.apiUrl}/projects/${id}`, options).pipe(
      catchError(error => {
        console.error(`Error fetching project with ID ${id}:`, error);
        // Decide if mock data is appropriate fallback here
        // return this.getMockProjectById(id);
         const message = error?.error?.message || `Failed to fetch project ${id}.`;
        return throwError(() => new Error(message));
      })
    );
  }

  // --- New methods for browsing ---

  getAcademicYears(): Observable<string[]> {
    // No auth needed for public browsing data typically
    return this.http.get<string[]>(`${this.apiUrl}/projects/years`).pipe(
      catchError(error => {
        console.error('Error fetching academic years:', error);
        const message = error?.error?.message || 'Failed to fetch academic years.';
        return throwError(() => new Error(message));
      })
    );
  }

  getProjectsByYear(year: string): Observable<Project[]> {
    // No auth needed for public browsing data typically
    // Backend now returns Project[] directly for this endpoint
    return this.http.get<Project[]>(`${this.apiUrl}/projects/year/${year}`).pipe(
      catchError(error => {
        console.error(`Error fetching projects for year ${year}:`, error);
        const message = error?.error?.message || `Failed to fetch projects for year ${year}.`;
        return throwError(() => new Error(message));
      })
    );
  }

  // --- End of new methods ---


  // Mock data for build/SSR process (Keep as is)
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
