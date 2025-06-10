import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Idea } from '../models/idea';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IdeaService {
  private apiUrl = `${environment.apiUrl}/ideas`;

  constructor(private http: HttpClient) { }

  getIdeasByCategory(category: string, difficulty?: string): Observable<any> {
    const params: any = { category };
    if (difficulty) params.difficulty = difficulty;
    return this.http.get(`${this.apiUrl}`, { params });
  }

  getRandomIdeas(limit: number = 10): Observable<any> {
    return this.http.get(this.apiUrl, { params: { limit: limit.toString() } });
  }
  
  getAllIdeas(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
  
  getIdeaById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
  
  getIdeaCategories(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories`);
  }
  
  searchIdeas(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/search`, { params: { q: query } });
  }
}
