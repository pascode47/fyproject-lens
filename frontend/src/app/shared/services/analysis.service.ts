import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SimilarityResult } from '../../models/similarity-result';
import { Analysis } from '../../models/analysis';

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Get similarity results for a specific project
   * @param projectId The ID of the project to get similarity results for
   * @returns Observable with similarity results data
   */
  getSimilarityResults(projectId: string): Observable<{
    projectTitle: string;
    results: SimilarityResult[];
  }> {
    // Use mock data if in production or if useMockData is set to true
    if (environment.production || environment.useMockData) {
      return this.getMockSimilarityResults(projectId).pipe(
        catchError(error => {
          console.warn('Error fetching similarity results, using mock data:', error);
          return this.getMockSimilarityResults(projectId);
        })
      );
    }

    return this.http.get<{
      projectTitle: string;
      results: SimilarityResult[];
    }>(`${this.apiUrl}/api/similarity/${projectId}`).pipe(
      catchError(error => {
        console.error('Error fetching similarity results:', error);
        return this.getMockSimilarityResults(projectId);
      })
    );
  }

  /**
   * Get AI recommendations for a project
   * @param projectId The ID of the project to get recommendations for
   * @returns Observable with recommendations data
   */
  getRecommendations(projectId: string): Observable<string[]> {
    if (environment.production || environment.useMockData) {
      return this.getMockRecommendations();
    }

    return this.http.get<string[]>(`${this.apiUrl}/projects/recommend?projectId=${projectId}`).pipe(
      catchError(error => {
        console.error('Error fetching recommendations:', error);
        return this.getMockRecommendations();
      })
    );
  }

  /**
   * Get user's analysis history
   * @param filters Optional filters for the history (e.g., date range)
   * @returns Observable with analysis history data
   */
  getUserHistory(filters?: { startDate?: string; endDate?: string }): Observable<Analysis[]> {
    if (environment.production || environment.useMockData) {
      return this.getMockAnalysisHistory();
    }

    let url = `${this.apiUrl}/profile/history`;
    
    // Add query parameters if filters are provided
    if (filters) {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return this.http.get<Analysis[]>(url).pipe(
      catchError(error => {
        console.error('Error fetching analysis history:', error);
        return this.getMockAnalysisHistory();
      })
    );
  }

  /**
   * Get mock similarity results for build/SSR process
   * @param projectId The ID of the project
   * @returns Observable with mock similarity results
   */
  private getMockSimilarityResults(projectId: string): Observable<{
    projectTitle: string;
    results: SimilarityResult[];
  }> {
    // Mock data for build/SSR process
    return of({
      projectTitle: `Project ${projectId}`,
      results: [
        {
          id: '1',
          projectId: '101',
          projectTitle: 'Machine Learning for Image Recognition',
          similarityPercentage: 85,
          year: '2023',
          department: 'Computer Science',
          similarSections: ['Abstract', 'Methodology', 'Results']
        },
        {
          id: '2',
          projectId: '102',
          projectTitle: 'Natural Language Processing System',
          similarityPercentage: 65,
          year: '2022',
          department: 'Computer Science',
          similarSections: ['Introduction', 'Literature Review']
        },
        {
          id: '3',
          projectId: '103',
          projectTitle: 'Data Visualization Dashboard',
          similarityPercentage: 35,
          year: '2023',
          department: 'Information Systems',
          similarSections: ['Tools Used']
        }
      ]
    });
  }

  /**
   * Get mock recommendations
   * @returns Observable with mock recommendations
   */
  private getMockRecommendations(): Observable<string[]> {
    return of([
      'Consider expanding your literature review to include more recent papers from 2022-2023',
      'The methodology section could benefit from more detailed explanation of the algorithms used',
      'Add more diagrams to illustrate your system architecture',
      'Include a section on limitations and future work',
      'Consider adding more quantitative evaluation metrics'
    ]);
  }

  /**
   * Get mock analysis history
   * @returns Observable with mock analysis history
   */
  private getMockAnalysisHistory(): Observable<Analysis[]> {
    return of([
      {
        id: '1',
        userId: '123',
        projectId: '456',
        similarityPercentage: 75,
        recommendations: [
          'Add more details to the methodology section',
          'Include more references to recent research'
        ],
        timestamp: new Date('2023-11-15')
      },
      {
        id: '2',
        userId: '123',
        projectId: '789',
        similarityPercentage: 45,
        recommendations: [
          'Consider expanding the literature review',
          'Add more analysis of the results'
        ],
        timestamp: new Date('2023-12-01')
      },
      {
        id: '3',
        userId: '123',
        projectId: '101',
        similarityPercentage: 25,
        recommendations: [
          'Your approach is quite unique, consider publishing in a conference',
          'Add more examples to demonstrate your implementation'
        ],
        timestamp: new Date('2024-01-10')
      }
    ]);
  }
}
