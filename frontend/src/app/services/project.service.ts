// frontend/src/app/services/project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Project } from '../models/project';
import { AuthService } from '../core/auth.service';

export interface PaginatedProjectsResponse { 
  data: Project[];
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = environment.apiUrl;
  private projectsUrl = `${environment.apiUrl}/projects`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('Consolidated ProjectService instance created.');
  }

  // Helper to get auth headers
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    console.warn("Attempted to make authenticated request without token.");
    return new HttpHeaders();
  }

  // Fetch projects with filters (pagination, department, year, search)
  public fetchAllProjectsWithFilters(
    department?: string, 
    page: number = 1, 
    limit: number = 10, 
    academicYear?: string, 
    search?: string
  ): Observable<PaginatedProjectsResponse> { 
    console.log('fetchAllProjectsWithFilters called with:', department, page, limit, academicYear, search);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (department && department !== 'All Departments') {
      params = params.set('department', department);
    }
    if (academicYear && academicYear !== 'All Years') {
      params = params.set('academicYear', academicYear);
    }
    if (search) {
      params = params.set('search', search);
    }

    // Get auth headers for authenticated requests
    const headers = this.getAuthHeaders();
    const options = headers.has('Authorization') ? { headers, params } : { params };

    // Only use mock data if explicitly set in environment
    if (environment.useMockData) {
      console.log('Using mock data for projects');
      return this.getMockProjects(department, academicYear, page, limit); 
    }
    
    console.log('Fetching real projects from API:', `${this.projectsUrl}`, options);
    return this.http.get<any>(this.projectsUrl, options).pipe(
      map(response => {
        console.log('API Response:', response);
        
        // Map the backend response to the expected PaginatedProjectsResponse format
        if (response && response.success && response.data) {
          // Backend response format: { success: true, data: [...], pagination: {...} }
          return {
            data: response.data,
            pagination: {
              currentPage: response.pagination?.page || page,
              itemsPerPage: response.pagination?.limit || limit,
              totalItems: response.pagination?.total || 0,
              totalPages: response.pagination?.pages || 0
            }
          } as PaginatedProjectsResponse;
        } else if (Array.isArray(response)) {
          // Handle case where response is directly an array of projects
          return {
            data: response,
            pagination: {
              currentPage: page,
              itemsPerPage: limit,
              totalItems: response.length,
              totalPages: Math.ceil(response.length / limit)
            }
          } as PaginatedProjectsResponse;
        } else if (response && response.data && Array.isArray(response.data)) {
          // Handle case where response has data array but no pagination
          return {
            data: response.data,
            pagination: {
              currentPage: page,
              itemsPerPage: limit,
              totalItems: response.data.length,
              totalPages: Math.ceil(response.data.length / limit)
            }
          } as PaginatedProjectsResponse;
        }
        
        // Fallback for unexpected response format
        console.warn('Unexpected API response format:', response);
        return {
          data: [],
          pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems: 0,
            totalPages: 0
          }
        } as PaginatedProjectsResponse;
      }),
      catchError(error => {
        console.error('Error fetching projects from API:', error);
        // Only fall back to mock data if explicitly set in environment
        if (environment.useMockData) {
          console.log('Falling back to mock data after API error');
          return this.getMockProjects(department, academicYear, page, limit);
        }
        return throwError(() => new Error('Failed to fetch projects. Please try again later.'));
      })
    );
  }

  // Get a specific project by ID
  public getProjectById(id: string): Observable<Project> { 
    console.log('getProjectById called with id:', id);
    
    // Get auth headers for authenticated requests
    const headers = this.getAuthHeaders();
    const options = headers.has('Authorization') ? { headers } : {};
    
    if (environment.useMockData) {
      console.log('Using mock data for project details');
      return this.getMockProjectById(id);
    }
    
    console.log('Fetching real project from API:', `${this.projectsUrl}/${id}`);
    return this.http.get<any>(`${this.projectsUrl}/${id}`, options).pipe(
      map(response => {
        console.log('API Response for project details:', response);
        
        // Handle different response formats
        if (response && response.success && response.data) {
          // Format: { success: true, data: Project }
          return response.data as Project;
        } else if (response && response._id) {
          // Format: Project object directly
          return response as Project;
        } else {
          // Unexpected format
          console.warn('Unexpected API response format for project details:', response);
          throw new Error('Invalid project data format received from server');
        }
      }),
      catchError(error => {
        console.error(`Error fetching project with ID ${id}:`, error);
        if (environment.useMockData) {
          return this.getMockProjectById(id);
        }
        return throwError(() => new Error(`Failed to fetch project details. Please try again later.`));
      })
    );
  }
  
  // Get list of academic years for filtering
  public getAcademicYears(): Observable<string[]> {
    if (environment.useMockData) {
      console.log('Using mock data for academic years');
      return of(['2023', '2022', '2021']); 
    }
    
    console.log('Fetching real academic years from API');
    return this.http.get<string[]>(`${this.projectsUrl}/years`).pipe(
      map(years => {
        console.log('API Response for academic years:', years);
        return years;
      }),
      catchError(error => {
        console.error('Error fetching academic years:', error);
        // Fallback to mock data even if not using mock data, to ensure UI works
        return of(['2023', '2022', '2021']); 
      })
    );
  }

  // Get projects by specific academic year
  public getProjectsByYear(year: string): Observable<Project[]> {
    if (environment.useMockData) {
      console.log('Using mock data for projects by year');
      const mockProjects = this.getMockProjects('', year);
      return mockProjects.pipe(
        map(response => response.data)
      );
    }
    
    console.log('Fetching real projects by year from API:', year);
    return this.http.get<Project[]>(`${this.projectsUrl}/year/${year}`).pipe(
      map(projects => {
        console.log(`API Response for projects in year ${year}:`, projects);
        return projects;
      }),
      catchError(error => {
        console.error(`Error fetching projects for year ${year}:`, error);
        const message = error?.error?.message || `Failed to fetch projects for year ${year}.`;
        return throwError(() => new Error(message));
      })
    );
  }

  // Get statistics for dashboard
  public getStatistics(): Observable<any> {
    if (environment.useMockData) {
      console.log('Using mock data for statistics');
      return this.getMockStatistics();
    }
    
    console.log('Fetching real statistics from API');
    return this.http.get(`${this.apiUrl}/statistics`).pipe(
      map(stats => {
        console.log('API Response for statistics:', stats);
        return stats;
      }),
      catchError(error => {
        console.error('Error fetching statistics:', error);
        if (environment.useMockData) {
          return this.getMockStatistics();
        }
        return throwError(() => new Error('Failed to fetch statistics. Please try again later.'));
      })
    );
  }

  // Get recent activities for dashboard
  public getRecentActivities(): Observable<any> {
    if (environment.useMockData) {
      console.log('Using mock data for recent activities');
      return this.getMockRecentActivities();
    }
    
    console.log('Fetching real recent activities from API');
    return this.http.get(`${this.apiUrl}/activities/recent`).pipe(
      map(activities => {
        console.log('API Response for recent activities:', activities);
        return activities;
      }),
      catchError(error => {
        console.error('Error fetching recent activities:', error);
        if (environment.useMockData) {
          return this.getMockRecentActivities();
        }
        return throwError(() => new Error('Failed to fetch recent activities. Please try again later.'));
      })
    );
  }

  // Upload a new project
  public uploadProject(formData: FormData): Observable<any> {
    if (environment.useMockData) {
      console.log('Using mock data for project upload');
      return of({
        success: true,
        message: 'Project uploaded successfully (mock data)',
        projectId: '12345'
      });
    }

    // Get auth token for upload
    const token = this.authService.getToken();
    if (!token) {
      console.error('Upload failed: No authorization token found.');
      return throwError(() => new Error('Authentication token is missing. Please log in again.'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    console.log('Uploading project to API');
    return this.http.post(`${this.projectsUrl}/upload`, formData, { headers }).pipe(
      map(response => {
        console.log('API Response for project upload:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error uploading project:', error);
        const message = error?.error?.message || 'Failed to upload project. Please try again later.';
        return throwError(() => new Error(message));
      })
    );
  }

  // Get all projects (without pagination)
  public getAllProjects(): Observable<any> {
    const headers = this.getAuthHeaders();
    const options = headers.has('Authorization') ? { headers } : {};

    if (environment.useMockData) {
      console.log('Using mock data for all projects');
      return this.getMockAllProjects();
    }

    console.log('Fetching all real projects from API');
    return this.http.get(`${this.projectsUrl}`, options).pipe(
      map(projects => {
        console.log('API Response for all projects:', projects);
        return projects;
      }),
      catchError(error => {
        console.error('Error fetching all projects:', error);
        const message = error?.error?.message || 'Failed to fetch projects.';
        return throwError(() => new Error(message));
      })
    );
  }

  // Diagnostic method for testing
  public diagnosticTestMethod(): string {
    console.log('DIAGNOSTIC: diagnosticTestMethod was called!');
    return 'Diagnostic method executed successfully!';
  }
  
  // --- Mock data methods ---
  
  private getMockProjects(department?: string, academicYear?: string, page: number = 1, limit: number = 10): Observable<PaginatedProjectsResponse> {
    // Generate a larger set of mock projects for better pagination testing
    const allMockProjects: Project[] = [];
    
    // Generate 30 mock projects
    for (let i = 1; i <= 30; i++) {
      // Alternate between departments and years to create a diverse dataset
      const dept = i % 3 === 0 
        ? 'Department of Computer Science and Engineering (DoCS&E)'
        : i % 3 === 1
          ? 'Department of Electronics and Telecommunications Engineering (ETE)'
          : 'Department of Information Systems and Technology (DIS&T)';
          
      const year = i % 2 === 0 ? '2023' : '2022';
      
      allMockProjects.push({
        _id: `mock${i}`,
        title: `Mock Project ${i}: ${this.getRandomProjectTitle(i)}`,
        academicYear: year,
        department: dept,
        extractedProblemStatement: `This is the problem statement for mock project ${i}.`,
        extractedObjectives: [
          `Objective 1 for project ${i}`,
          `Objective 2 for project ${i}`,
          `Objective 3 for project ${i}`
        ]
      });
    }
    
    // Add the original 4 mock projects to ensure we have some with detailed data
    allMockProjects.push(
      { 
        _id: 'detailed1', 
        title: 'Machine Learning for Image Recognition', 
        academicYear: '2023', 
        department: 'Department of Computer Science and Engineering (DoCS&E)', 
        extractedProblemStatement: 'The challenge of accurately identifying objects in images remains difficult for computer systems.', 
        extractedObjectives: ['Develop a deep learning model for image recognition', 'Achieve 95% accuracy on benchmark datasets', 'Optimize for mobile deployment']
      },
      { 
        _id: 'detailed2', 
        title: 'IoT-based Smart Agriculture System', 
        academicYear: '2022', 
        department: 'Department of Electronics and Telecommunications Engineering (ETE)', 
        extractedProblemStatement: 'Traditional farming lacks real-time monitoring capabilities leading to inefficient resource usage.', 
        extractedObjectives: ['Design sensor network for soil and climate monitoring', 'Develop mobile app for farmers', 'Implement automated irrigation system']
      },
      { 
        _id: 'detailed3', 
        title: 'Blockchain for Academic Credential Verification', 
        academicYear: '2023', 
        department: 'Department of Information Systems and Technology (DIS&T)', 
        extractedProblemStatement: 'Academic credential fraud is increasing and verification processes are time-consuming.', 
        extractedObjectives: ['Create blockchain-based credential storage system', 'Develop verification portal for employers', 'Ensure GDPR compliance']
      },
      { 
        _id: 'detailed4', 
        title: 'Augmented Reality for Engineering Education', 
        academicYear: '2022', 
        department: 'Department of Computer Science and Engineering (DoCS&E)', 
        extractedProblemStatement: 'Engineering students struggle to visualize complex 3D concepts from 2D textbooks.', 
        extractedObjectives: ['Develop AR application for engineering concepts', 'Create 3D models of key engineering principles', 'Evaluate learning outcomes']
      }
    );
    
    // Apply filters
    let filtered = allMockProjects;
    if (department && department !== 'All Departments') {
      filtered = filtered.filter(p => p.department === department);
    }
    if (academicYear && academicYear !== 'All Years') {
      filtered = filtered.filter(p => p.academicYear === academicYear);
    }
    
    // Calculate pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit);
    
    // Ensure page is within valid range
    const validPage = Math.max(1, Math.min(page, totalPages || 1));
    
    // Get the subset of projects for the current page
    const startIndex = (validPage - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);
    const paginatedProjects = filtered.slice(startIndex, endIndex);
    
    console.log(`Returning ${paginatedProjects.length} projects for page ${validPage} (total: ${totalItems})`);
    
    return of({
      data: paginatedProjects,
      pagination: { 
        currentPage: validPage, 
        itemsPerPage: limit, 
        totalItems: totalItems, 
        totalPages: totalPages 
      }
    });
  }
  
  // Helper method to generate random project titles
  private getRandomProjectTitle(seed: number): string {
    const topics = [
      'Machine Learning', 'Web Development', 'Mobile App', 'IoT', 'Blockchain',
      'Cloud Computing', 'Data Analytics', 'Cybersecurity', 'Artificial Intelligence',
      'Virtual Reality', 'Augmented Reality', 'Natural Language Processing'
    ];
    
    const applications = [
      'for Healthcare', 'for Education', 'for Agriculture', 'for Finance',
      'for Transportation', 'for Smart Cities', 'for Environmental Monitoring',
      'for E-commerce', 'for Social Media', 'for Gaming'
    ];
    
    const topicIndex = seed % topics.length;
    const appIndex = (seed * 3) % applications.length;
    
    return `${topics[topicIndex]} ${applications[appIndex]}`;
  }

  private getMockProjectById(id: string): Observable<Project> {
    const mockProject: Project = {
      _id: id, 
      title: `Mock Project ${id}`, 
      extractedProblemStatement: 'This is a detailed mock problem statement that describes the challenges and issues that this project aims to address. It provides context about why this project is important and what gap it fills in the current state of knowledge or technology.', 
      extractedObjectives: [
        'Design and implement a comprehensive solution to address the identified problem',
        'Evaluate the performance of the solution using appropriate metrics',
        'Compare the solution with existing approaches in the literature',
        'Document the findings and provide recommendations for future work'
      ],
      academicYear: '2023', 
      department: 'Department of Computer Science and Engineering (DoCS&E)',
      supervisor: 'Dr. Jane Smith', 
      students: ['John Doe', 'Mary Johnson'],
      filePath: `/uploads/mock-file-${id}.pdf`, 
      uploadedBy: 'user123', 
      tags: ['AI', 'Machine Learning', 'Computer Vision']
    };
    return of(mockProject);
  }

  private getMockStatistics(): Observable<any> {
    return of({
      totalProjects: 156,
      projectsThisYear: 42,
      popularDepartments: [
        { name: 'Computer Science and Engineering', count: 68 },
        { name: 'Information Systems and Technology', count: 45 },
        { name: 'Electronics and Telecommunications', count: 43 }
      ],
      popularTopics: ['Machine Learning', 'Web Development', 'Mobile Apps', 'IoT', 'Blockchain']
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

  private getMockAllProjects(): Observable<any> {
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
}
