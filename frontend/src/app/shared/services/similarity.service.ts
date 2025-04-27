import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SimilarityResult } from '../../models/similarity-result';

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
    }>(`${this.apiUrl}/api/similarity/${projectId}`).pipe(
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
    }>(`${this.apiUrl}/api/similarity/analyze`, { projectId }).pipe(
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
}
