import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Get recommendations based on department, interests, etc.
   */
  getRecommendations(filters?: any): Observable<any> {
    if (environment.production || environment.useMockData) {
      return this.getMockRecommendations();
    }

    return this.http.get(`${this.apiUrl}/recommendations`, { params: filters }).pipe(
      catchError(error => {
        console.error('Error fetching recommendations:', error);
        return this.getMockRecommendations();
      })
    );
  }

  /**
   * Get recommendation details by ID
   */
  getRecommendationById(id: string): Observable<any> {
    if (environment.production || environment.useMockData) {
      return this.getMockRecommendationById(id);
    }

    return this.http.get(`${this.apiUrl}/recommendations/${id}`).pipe(
      catchError(error => {
        console.error(`Error fetching recommendation with ID ${id}:`, error);
        return this.getMockRecommendationById(id);
      })
    );
  }

  /**
   * Generate recommendations based on user preferences
   */
  generateRecommendations(preferences: any): Observable<any> {
    if (environment.production || environment.useMockData) {
      return of({
        success: true,
        message: 'Recommendations generated successfully (mock data)',
        recommendations: this.getMockRecommendationsList()
      });
    }

    return this.http.post(`${this.apiUrl}/recommendations/generate`, preferences).pipe(
      catchError(error => {
        console.error('Error generating recommendations:', error);
        return of({
          success: false,
          message: 'Failed to generate recommendations. Please try again later.'
        });
      })
    );
  }

  // Mock data for build/SSR process
  private getMockRecommendations(): Observable<any> {
    return of({
      recommendations: this.getMockRecommendationsList()
    });
  }

  private getMockRecommendationById(id: string): Observable<any> {
    const mockRecommendations = this.getMockRecommendationsList();
    const recommendation = mockRecommendations.find(r => r.id === id) || {
      id: id,
      title: `Recommendation ${id}`,
      description: 'This is a mock recommendation description for the build process',
      category: 'Technology',
      difficulty: 'Medium',
      estimatedTime: '3-4 months',
      skills: ['Programming', 'Research', 'Analysis'],
      relatedProjects: [
        { id: '1', title: 'Related Project 1', similarity: 75 },
        { id: '2', title: 'Related Project 2', similarity: 60 }
      ]
    };
    
    return of(recommendation);
  }

  private getMockRecommendationsList(): any[] {
    return [
      {
        id: '1',
        title: 'AI-Based Student Performance Prediction System',
        description: 'Develop a system that uses machine learning to predict student performance based on various factors.',
        category: 'Artificial Intelligence',
        difficulty: 'High',
        estimatedTime: '4-6 months',
        skills: ['Machine Learning', 'Data Analysis', 'Programming'],
        relatedProjects: [
          { id: '101', title: 'Student Performance Analytics', similarity: 85 },
          { id: '102', title: 'ML-based Grade Prediction', similarity: 70 }
        ]
      },
      {
        id: '2',
        title: 'Blockchain-based Academic Credential Verification',
        description: 'Create a system for verifying academic credentials using blockchain technology.',
        category: 'Blockchain',
        difficulty: 'Medium',
        estimatedTime: '3-5 months',
        skills: ['Blockchain', 'Smart Contracts', 'Web Development'],
        relatedProjects: [
          { id: '201', title: 'Secure Document Verification', similarity: 65 },
          { id: '202', title: 'Blockchain Certificate System', similarity: 80 }
        ]
      },
      {
        id: '3',
        title: 'Virtual Reality Campus Tour Application',
        description: 'Develop a VR application that allows prospective students to tour the campus virtually.',
        category: 'Virtual Reality',
        difficulty: 'Medium',
        estimatedTime: '3-4 months',
        skills: ['VR Development', '3D Modeling', 'UI/UX Design'],
        relatedProjects: [
          { id: '301', title: 'Interactive Campus Map', similarity: 60 },
          { id: '302', title: 'VR Educational Environment', similarity: 75 }
        ]
      }
    ];
  }
}
