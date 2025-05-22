import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http'; // Import HttpParams and HttpHeaders
import { Observable, of, throwError } from 'rxjs'; // Import throwError
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../../models/user';
import { Project } from '../../models/project'; // Import Project model
import { PaginatedResponse } from '../../models/paginated-response'; // Re-affirming the import path

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl; // Base API URL already includes /api

  constructor(private http: HttpClient) { }

  // Helper method to get the authentication token from localStorage
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }
  
  // Helper method to create headers with the auth token
  private createAuthHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    console.log('AdminService: Creating auth headers - Token exists:', !!token);
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  /**
   * Get all users
   * Get all users with pagination and filtering
   * @param page Page number
   * @param limit Items per page
   * @param status Filter by status (active/suspended)
   * @param role Filter by role (admin/user)
   * @param search Search term
   * @returns Observable with paginated list of users
   */
  getAllUsers(
    page: number = 1, 
    limit: number = 10, 
    status?: string, 
    role?: string, 
    search?: string
  ): Observable<PaginatedResponse<User>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
      
    if (status) {
      params = params.set('status', status);
    }
    if (role) {
      params = params.set('role', role);
    }
    if (search) {
      params = params.set('search', search);
    }

    // Remove mock data logic for now, assuming direct API call
    // if (environment.production || environment.useMockData) {
    //   return this.getMockUsersPaginated(page, limit, status, role, search);
    // }

    console.log('AdminService: getAllUsers - API URL:', this.apiUrl);
    console.log('AdminService: getAllUsers - Endpoint:', `${this.apiUrl}/admin/users`);
    console.log('AdminService: getAllUsers - Query params:', params.toString());
    
    const headers = this.createAuthHeaders();
    console.log('AdminService: getAllUsers - Headers:', headers);
    
    return this.http.get<any>(`${this.apiUrl}/admin/users`, { params, headers }).pipe(
      tap(response => {
        console.log('AdminService: getAllUsers - Raw response:', response);
      }),
      map(response => {
        // Map the backend response to the expected PaginatedResponse format
        if (response && response.success && response.data) {
          const mappedResponse = {
            data: response.data,
            page: response.pagination?.page || 1,
            limit: response.pagination?.limit || 10,
            total: response.pagination?.total || 0,
            totalPages: response.pagination?.pages || 0
          } as PaginatedResponse<User>;
          console.log('AdminService: getAllUsers - Mapped response:', mappedResponse);
          return mappedResponse;
        }
        console.warn('AdminService: getAllUsers - Unexpected response format:', response);
        // Return empty response if the format is unexpected
        return { data: [], page: 1, limit: 10, total: 0 } as PaginatedResponse<User>;
      }),
      catchError(error => {
        console.error('AdminService: Error fetching users:', error);
        // Return empty paginated response on error
        return of({ data: [], page: 1, limit: 10, total: 0 }); 
      })
    );
  }

  /**
   * Update user status (suspend/activate)
   * @param userId The ID of the user
   * @param status The new status ('active' or 'suspended')
   * @returns Observable with the updated user object from the backend
   */
  updateUserStatus(userId: string, status: 'active' | 'suspended'): Observable<{ user: User }> {
    // Remove mock data logic
    // if (environment.production || environment.useMockData) { ... }

    const headers = this.createAuthHeaders();
    
    return this.http.patch<any>( // Use any for the response type
      `${this.apiUrl}/admin/users/${userId}/status`, // Correct endpoint
      { status }, // Send status in the body
      { headers }
    ).pipe(
      map(response => {
        // Map the backend response to the expected format
        if (response && response.success && response.data) {
          return { user: response.data.user };
        }
        throw new Error('Invalid response format');
      }),
      catchError(error => {
        console.error(`Error updating status for user ${userId} to ${status}:`, error);
        throw error; // Re-throw error to be handled by the component
      })
    );
  }

  /**
   * Delete a user
   * @param userId The ID of the user to delete
   * @returns Observable with success status
   */
  deleteUser(userId: string): Observable<{ success: boolean, message: string }> {
    if (environment.production || environment.useMockData) {
      return of({
        success: true,
        message: 'User deleted successfully (mock data)'
      });
    }

    const headers = this.createAuthHeaders();
    
    return this.http.delete<any>(
      `${this.apiUrl}/admin/users/${userId}`,
      { headers }
    ).pipe(
      map(response => {
        // Map the backend response to the expected format
        if (response && response.success) {
          return {
            success: response.success,
            message: response.message || 'User deleted successfully'
          };
        }
        throw new Error('Invalid response format');
      }),
      catchError(error => {
        console.error(`Error deleting user with ID ${userId}:`, error);
         throw error; // Re-throw error
      })
    );
  }

  /**
   * Get projects with pagination and filtering (for admin view)
   * @param page Page number
   * @param limit Items per page
   * @param programme Filter by programme (department/course)
   * @param academicYear Filter by academic year
   * @param search Search term
   * @returns Observable with paginated list of projects
   */
  getProjects(
    page: number = 1, 
    limit: number = 10, 
    department?: string, // Changed from programme
    academicYear?: string, 
    search?: string
  ): Observable<PaginatedResponse<Project>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (department) {
      params = params.set('department', department); // Use 'department' for the query param
    }
    if (academicYear) {
      params = params.set('academicYear', academicYear);
    }
    if (search) {
      params = params.set('search', search);
    }

    // Assuming GET /api/projects is used for admin view as well
    const headers = this.createAuthHeaders();
    
    return this.http.get<any>(`${this.apiUrl}/projects`, { params, headers }).pipe(
      map(response => {
        // Map the backend response to the expected PaginatedResponse format
        if (response && response.success && response.data) {
          return {
            data: response.data,
            page: response.pagination?.page || 1,
            limit: response.pagination?.limit || 10,
            total: response.pagination?.total || 0,
            totalPages: response.pagination?.pages || 0
          } as PaginatedResponse<Project>;
        }
        // Return empty response if the format is unexpected
        return { data: [], page: 1, limit: 10, total: 0 } as PaginatedResponse<Project>;
      }),
      catchError(error => {
        console.error('Error fetching projects:', error);
        return of({ data: [], page: 1, limit: 10, total: 0 });
      })
    );
  }

  /**
   * Upload a single project file (DOCX or PDF)
   * @param projectFile The file to upload
   * @returns Observable with upload result (e.g., project ID and extracted info)
   */
  uploadProject(projectFile: File): Observable<{ projectId: string, extractedInfo: any }> {
    const formData = new FormData();
    // Use 'projectFile' as the key, matching the backend middleware upload.single('projectFile')
    formData.append('projectFile', projectFile, projectFile.name); 

    // --- Correctly handle headers for FormData ---
    const token = this.getAuthToken();
    let headers = new HttpHeaders(); // Start with empty headers

    if (!token) {
      console.error('Upload failed: No authorization token found in AdminService.');
      return throwError(() => new Error('Authentication token is missing. Please log in again.'));
    }

    // Assign the result of .set() back to the headers variable
    headers = headers.set('Authorization', `Bearer ${token}`);
    // DO NOT set Content-Type for FormData; the browser does this automatically with the correct boundary.

    console.log('AdminService Upload Project Headers:', headers.keys()); // Log header keys

    return this.http.post<any>(
      `${this.apiUrl}/projects/upload`, // Correct endpoint
      formData,
      { headers: headers } // Pass the correctly constructed headers
    ).pipe(
      map(response => {
        // Map the backend response to the expected format
        if (response && response.success && response.data) {
          return {
            projectId: response.data.projectId || '',
            extractedInfo: response.data.extractedInfo || {}
          };
        }
        throw new Error('Invalid response format');
      }),
      catchError(error => {
        console.error('Error uploading project:', error);
        throw error; // Re-throw error for component handling
      })
    );
  }
  
  /**
   * Delete a project
   * @param projectId The ID of the project to delete
   * @returns Observable with success status
   */
  deleteProject(projectId: string): Observable<{ success: boolean, message: string }> {
    const headers = this.createAuthHeaders();
    
    return this.http.delete<any>(
      `${this.apiUrl}/projects/${projectId}`, // Correct endpoint for deleting a project
      { headers }
    ).pipe(
      map(response => {
        // Map the backend response to the expected format
        if (response && response.success) {
          return {
            success: response.success,
            message: response.message || 'Project deleted successfully'
          };
        }
        throw new Error('Invalid response format');
      }),
      catchError(error => {
        console.error(`Error deleting project with ID ${projectId}:`, error);
        throw error; // Re-throw error
      })
    );
  }

  /**
   * Bulk upload projects from CSV file
   * @param csvFile The CSV file to upload
   * @returns Observable with success status, count, and total projects processed
   */
  bulkUploadProjects(csvFile: File): Observable<{ 
    success: boolean, 
    message: string,
    count?: number,
    total?: number // Add total from backend response
  }> {
    // Remove mock data logic
    // if (environment.production || environment.useMockData) { ... }

    const formData = new FormData();
    // Use 'csvFile' as the key, matching the backend middleware upload.single('csvFile')
    formData.append('csvFile', csvFile, csvFile.name); 

    // Don't use the createAuthHeaders for FormData - manually add the token
    const token = this.getAuthToken();
    const headers = new HttpHeaders();
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return this.http.post<any>(
      `${this.apiUrl}/projects/bulk`, // Correct endpoint for bulk upload
      formData,
      { headers }
    ).pipe(
      map(response => {
        // Map the backend response to the expected format
        if (response && response.success) {
          return {
            success: response.success,
            message: response.message || 'Projects uploaded successfully',
            count: response.data?.count,
            total: response.data?.total
          };
        }
        throw new Error('Invalid response format');
      }),
      catchError(error => {
        console.error('Error bulk uploading projects:', error);
        throw error; // Re-throw error
      })
    );
  }

  /**
   * Get system metrics and analytics
   * @returns Observable with system metrics data
   */
  getSystemMetrics(): Observable<any> {
    if (environment.production || environment.useMockData) {
      return this.getMockSystemMetrics();
    }

    const headers = this.createAuthHeaders();
    
    return this.http.get<any>(`${this.apiUrl}/admin/analytics`, { headers }).pipe(
      map(response => {
        // Map the backend response to the expected format
        if (response && response.success && response.data) {
          return response.data;
        }
        // Return empty response if the format is unexpected
        return { 
          userStats: {}, 
          projectStats: {}, 
          analysisStats: {} 
        };
      }),
      catchError(error => {
        console.error('Error fetching system metrics:', error);
        // Return a default structure or re-throw
        return of({ 
          userStats: {}, 
          projectStats: {}, 
          analysisStats: {} 
        }); // Return default empty object on error
      })
    );
  }

  // Mock data functions (keep for reference or remove if unused)
  private getMockUsers(): Observable<User[]> {
    return of([
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'user',
        programme: 'BSc CS',
        registrationNo: 'T20-01-12345',
        status: 'active'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'user',
        programme: 'BSc IS',
        registrationNo: 'T20-02-67890',
        status: 'active'
      },
      {
        id: '3',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        programme: 'BSc CS',
        registrationNo: 'T19-01-54321',
        status: 'active'
      }
    ]);
  }

  private getMockSystemMetrics(): Observable<any> {
    return of({
      userStats: {
        totalUsers: 156,
        activeUsers: 142,
        suspendedUsers: 14,
        newUsersThisMonth: 23
      },
      projectStats: {
        totalProjects: 324,
        projectsThisYear: 87,
        averageSimilarity: 42,
        topDepartments: [
          { name: 'Computer Science', count: 145 },
          { name: 'Information Systems', count: 98 },
          { name: 'Software Engineering', count: 81 }
        ]
      },
      analysisStats: {
        totalAnalyses: 512,
        analysesThisMonth: 78,
        highSimilarityCount: 112,
        mediumSimilarityCount: 245,
        lowSimilarityCount: 155
      }
    });
  }
}
