import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IdeaService } from '../../services/idea.service';
import { Idea, CATEGORIES, CategoryInfo } from '../../models/idea';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recommendations.component.html',
  styleUrl: './recommendations.component.css'
})
export class RecommendationsComponent implements OnInit {
  categories: CategoryInfo[] = Object.values(CATEGORIES);
  
  difficulties = [
    { id: 'beginner', name: 'Beginner' },
    { id: 'intermediate', name: 'Intermediate' },
    { id: 'advanced', name: 'Advanced' }
  ];
  
  selectedCategories: string[] = [];
  selectedDifficulty = 'all';
  ideas: Idea[] = [];
  isLoading = false;

  constructor(private ideaService: IdeaService) { }

  ngOnInit(): void {
    this.fetchIdeas();
  }

  fetchIdeas(): void {
    this.isLoading = true;
    
    // If no categories are selected, fetch all ideas
    if (this.selectedCategories.length === 0) {
      this.ideaService.getAllIdeas()
        .subscribe({
          next: (response) => {
            this.ideas = response.data.ideas;
            this.filterIdeasByDifficulty();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error fetching ideas:', error);
            this.isLoading = false;
          }
        });
      return;
    }
    
    // If categories are selected, fetch ideas for each category
    const requests: Observable<any>[] = this.selectedCategories.map(category => 
      this.ideaService.getIdeasByCategory(category, this.selectedDifficulty === 'all' ? undefined : this.selectedDifficulty)
        .pipe(
          catchError(error => {
            console.error(`Error fetching ideas for ${category}:`, error);
            return of({ data: { ideas: [] } });
          })
        )
    );
    
    forkJoin(requests).subscribe(responses => {
      // Combine all ideas from different categories
      this.ideas = responses.flatMap(response => response.data.ideas);
      
      // Remove duplicates (if any) based on _id
      this.ideas = this.ideas.filter((idea, index, self) => 
        index === self.findIndex(i => i._id === idea._id)
      );
      
      this.filterIdeasByDifficulty();
      this.isLoading = false;
    });
  }
  
  filterIdeasByDifficulty(): void {
    if (this.selectedDifficulty !== 'all') {
      this.ideas = this.ideas.filter(idea => idea.difficulty === this.selectedDifficulty);
    }
  }

  onFilterChange(): void {
    this.fetchIdeas();
  }
  
  isSelectedCategory(categoryName: string): boolean {
    return this.selectedCategories.includes(categoryName);
  }
  
  toggleCategory(categoryName: string): void {
    if (this.isSelectedCategory(categoryName)) {
      this.removeCategory(categoryName);
    } else {
      this.selectedCategories.push(categoryName);
      this.fetchIdeas();
    }
  }
  
  removeCategory(categoryName: string): void {
    this.selectedCategories = this.selectedCategories.filter(cat => cat !== categoryName);
    this.fetchIdeas();
  }
  
  clearCategoryFilters(): void {
    this.selectedCategories = [];
    this.fetchIdeas();
  }

  getCategoryInfo(categoryName: string): CategoryInfo {
    return CATEGORIES[categoryName] || {
      name: categoryName,
      displayName: categoryName,
      icon: 'fa-question-circle',
      description: 'No description available',
      color: '#999999'
    };
  }

}
