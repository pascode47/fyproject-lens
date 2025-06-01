// services/project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Project } from '../models/project';

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
  private apiUrl = `${environment.apiUrl}/projects`; 

  constructor(private http: HttpClient) {
    console.log('ProjectService instance created. DIAGNOSTIC VERSION.');
  }

  // The method in question
  public fetchAllProjectsWithFilters(
    department?: string, 
    page: number = 1, 
    limit: number = 10, 
    academicYear?: string, 
    search?: string
  ): Observable<PaginatedProjectsResponse> { 
    console.log('DIAGNOSTIC: fetchAllProjectsWithFilters called with:', department, page, limit, academicYear, search);
    let httpCallParams = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (department && department !== 'All Departments') {
      httpCallParams = httpCallParams.set('department', department);
    }
    if (academicYear && academicYear !== 'All Years') {
      httpCallParams = httpCallParams.set('academicYear', academicYear);
    }
    if (search) {
      httpCallParams = httpCallParams.set('search', search);
    }
    
    // Simplified mock return for diagnosis
    const mockProjects: Project[] = [
      { _id: 'mock1', title: 'Mock Project 1', academicYear: '2023', department: 'DoCS&E' }
    ];
    const mockResponse: PaginatedProjectsResponse = {
      data: mockProjects,
      pagination: { currentPage: 1, itemsPerPage: 10, totalItems: 1, totalPages: 1 }
    };
    // return of(mockResponse); // Forcing mock data for simplicity

    return this.http.get<PaginatedProjectsResponse>(this.apiUrl, { params: httpCallParams }).pipe(
      catchError(error => {
        console.error('Error fetching projects (DIAGNOSTIC VERSION):', error);
        return of(mockResponse); // Return mock on error
      })
    );
  }

  // New, uniquely named diagnostic method
  public diagnosticTestMethod(): string {
    console.log('DIAGNOSTIC: diagnosticTestMethod was called!');
    return 'Diagnostic method executed successfully!';
  }

  // Keeping getAcademicYears as it's used in ngOnInit of the component
  public getAcademicYears(): Observable<string[]> {
    if (environment.production || environment.useMockData) {
      return of(['2023', '2022', '2021']); 
    }
    return this.http.get<string[]>(`${this.apiUrl}/years`).pipe(
      catchError(error => {
        console.error('Error fetching academic years:', error);
        return of([]); 
      })
    );
  }
}
