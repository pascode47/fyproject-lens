import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SimilarityResult } from '../models/similarity-result';
import { Analysis } from '../models/analysis';

@Injectable({
  providedIn: 'root'
})
export class SimilarityService {
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
    }>(`${this.apiUrl}/similarity/${projectId}`).pipe(
      catchError(error => {
        console.error('Error fetching similarity results:', error);
        return this.getMockSimilarityResults(projectId);
      })
    );
  }

  /**
   * Analyze a project for similarities
   * @param projectId The ID of the project to analyze
   * @returns Observable with analysis results
   */
  analyzeSimilarity(projectId: string): Observable<{
    success: boolean;
    message: string;
  }> {
    // Use mock data if in production or if useMockData is set to true
    if (environment.production || environment.useMockData) {
      return of({
        success: true,
        message: 'Analysis completed successfully (mock data)'
      });
    }

    return this.http.post<{
      success: boolean;
      message: string;
    }>(`${this.apiUrl}/similarity/analyze`, { projectId }).pipe(
      catchError(error => {
        console.error('Error analyzing similarity:', error);
        return of({
          success: false,
          message: 'Failed to analyze project. Please try again later.'
        });
      })
    );
  }

  /**
   * Get user's similarity history (both project analyses and proposal checks)
   * @param filters Optional filters for the history (e.g., date range, type)
   * @returns Observable with analysis history data
   */
  getUserSimilarityHistory(filters?: { 
    startDate?: string; 
    endDate?: string;
    type?: 'project' | 'proposal';
  }): Observable<{
    history: Analysis[];
  }> {
    // Use mock data if in production or if useMockData is set to true
    if (environment.production || environment.useMockData) {
      return this.getMockSimilarityHistory().pipe(
        catchError(error => {
          console.warn('Error fetching similarity history, using mock data:', error);
          return this.getMockSimilarityHistory();
        })
      );
    }

    // Build query parameters
    let queryParams = '';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type) params.append('type', filters.type);
      
      if (params.toString()) {
        queryParams = `?${params.toString()}`;
      }
    }

    return this.http.get<{
      success: boolean;
      message: string;
      data: { history: Analysis[] };
    }>(`${this.apiUrl}/similarity/history${queryParams}`).pipe(
      // Map the response to match the expected return type
      map((response: {success: boolean; message: string; data: any}) => {
        // Check if the response has the expected structure
        if (response.success && response.data && response.data.history) {
          return { history: response.data.history };
        } else {
          console.error('Unexpected response format:', response);
          return { history: [] };
        }
      }),
      catchError(error => {
        console.error('Error fetching similarity history:', error);
        return this.getMockSimilarityHistory();
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
          similarSections: ['Abstract', 'Methodology', 'Results'],
          createdAt: new Date('2023-05-15')
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
   * Get mock similarity history for build/SSR process
   * @returns Observable with mock similarity history
   */
  private getMockSimilarityHistory(): Observable<{
    history: Analysis[];
  }> {
    // Mock data for build/SSR process
    return of({
      history: [
        {
          id: '1',
          userId: 'user123',
          projectId: 'project456',
          similarityPercentage: 75,
          recommendations: [
            'Consider expanding your literature review to include more recent papers',
            'Add more diagrams to illustrate your system architecture'
          ],
          analysisType: 'project',
          timestamp: new Date('2023-11-15')
        },
        {
          id: '2',
          userId: 'user123',
          proposalDetails: {
            title: 'Machine Learning for Healthcare',
            problemStatement: 'Healthcare data is often underutilized...',
            objectives: ['Develop a predictive model', 'Evaluate on real-world data'],
            department: 'Computer Science'
          },
          similarProjects: [
            {
              id: '101',
              projectId: '101',
              projectTitle: 'AI in Medical Diagnosis',
              similarityPercentage: 68,
              year: '2023',
              department: 'Computer Science',
              similarSections: ['Methodology', 'Literature Review']
            }
          ],
          similarityPercentage: 68,
          recommendations: [
            'Consider focusing more on privacy concerns in healthcare data',
            'Include more evaluation metrics specific to healthcare outcomes'
          ],
          analysisType: 'proposal',
          timestamp: new Date('2023-12-01')
        }
      ]
    });
  }
}
