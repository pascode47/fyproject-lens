import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SimilarityService } from '../../services/similarity.service';
import { Analysis } from '../../models/analysis';

@Component({
  selector: 'app-similarity-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './similarity-history.component.html',
  styleUrls: ['./similarity-history.component.css']
})
export class SimilarityHistoryComponent implements OnInit {
  historyItems: Analysis[] = [];
  loading = true;
  error = '';
  
  // Filter options
  startDate: string = '';
  endDate: string = '';
  selectedType: 'all' | 'project' | 'proposal' = 'all';
  
  constructor(private similarityService: SimilarityService) {}
  
  ngOnInit(): void {
    this.loadHistory();
  }
  
  loadHistory(): void {
    this.loading = true;
    this.error = '';
    
    // Build filters
    const filters: any = {};
    if (this.startDate) filters.startDate = this.startDate;
    if (this.endDate) filters.endDate = this.endDate;
    if (this.selectedType !== 'all') filters.type = this.selectedType;
    
    this.similarityService.getUserSimilarityHistory(filters).subscribe({
      next: (response) => {
        console.log('Received history data:', response);
        this.historyItems = response.history || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading similarity history:', err);
        this.error = 'Failed to load similarity history. Please try again later.';
        this.loading = false;
      }
    });
  }
  
  applyFilters(): void {
    this.loadHistory();
  }
  
  resetFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.selectedType = 'all';
    this.loadHistory();
  }
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
