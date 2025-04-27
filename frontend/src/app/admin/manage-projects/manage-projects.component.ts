import { Component, OnInit, OnDestroy } from '@angular/core'; // Add OnDestroy
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../shared/services/admin.service';
import { Project } from '../../models/project';
import { PaginatedResponse } from '../../models/paginated-response'; // Import PaginatedResponse
import { Subject } from 'rxjs'; // Import Subject
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators'; // Import operators

@Component({
  selector: 'app-manage-projects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-projects.component.html',
  styleUrl: './manage-projects.component.css'
})
export class ManageProjectsComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  isLoading: boolean = true;
  error: string | null = null;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  // Filters & Search
  searchTerm: string = '';
  departmentFilter: string = ''; // Use empty string for 'all'
  yearFilter: string = '';     // Use empty string for 'all'

  // Single Project Upload
  selectedProjectFile: File | null = null;
  isUploading: boolean = false;
  uploadProgress: number = 0; // Optional for progress bar
  uploadSuccessMessage: string | null = null;
  uploadErrorMessage: string | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>(); // For unsubscribing

  constructor(private adminService: AdminService) {}
  
  ngOnInit(): void {
    this.loadProjects();

    // Debounce search input
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadProjects();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadProjects(): void {
    this.isLoading = true;
    this.error = null;

    // Prepare filter parameters
    const department = this.departmentFilter || undefined;
    const year = this.yearFilter || undefined;
    const search = this.searchTerm || undefined;

    this.adminService.getProjects(this.currentPage, this.itemsPerPage, department, year, search)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<Project>) => {
          this.projects = response.data;
          this.totalItems = response.total;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load projects.';
          this.isLoading = false;
          this.projects = [];
          this.totalItems = 0;
          console.error('Error loading projects:', err);
        }
    });
  }

  // --- Filter and Pagination Handlers ---

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadProjects();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadProjects();
  }

  // --- Single Project Upload Handlers ---

  onProjectFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      // Validate file type (DOCX or PDF)
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/pdf'
      ];
      if (allowedTypes.includes(file.type)) {
        this.selectedProjectFile = file;
        this.uploadErrorMessage = null; // Clear previous error
        this.uploadSuccessMessage = null;
      } else {
        this.selectedProjectFile = null;
        this.uploadErrorMessage = 'Invalid file type. Please select a DOCX or PDF file.';
        element.value = ''; // Clear the input
      }
    } else {
       this.selectedProjectFile = null;
    }
  }

  uploadSingleProject(): void {
    if (!this.selectedProjectFile) {
      this.uploadErrorMessage = 'Please select a project file (DOCX or PDF) to upload.';
      return;
    }

    this.isUploading = true;
    this.uploadErrorMessage = null;
    this.uploadSuccessMessage = null;
    this.uploadProgress = 0; // Reset progress

    this.adminService.uploadProject(this.selectedProjectFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isUploading = false;
          this.uploadSuccessMessage = `Project "${response.extractedInfo?.title || 'Unknown'}" uploaded successfully! (ID: ${response.projectId})`;
          this.selectedProjectFile = null; 
          // Optionally clear the file input visually if needed
          // Reset and reload projects to see the new one
          this.currentPage = 1; 
          this.loadProjects(); 
        },
        error: (error) => {
          this.isUploading = false;
          this.uploadErrorMessage = error?.error?.message || 'An error occurred during upload.';
          console.error('Error uploading project:', error);
        }
        // Add progress tracking here if using HttpClient reportProgress
      });
  }

  // --- Delete Project Handler ---

  deleteProject(projectId: string, projectTitle: string): void {
    if (confirm(`Are you sure you want to delete the project "${projectTitle}"? This action cannot be undone.`)) {
      this.adminService.deleteProject(projectId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Reload projects after successful deletion
            if (this.projects.length === 1 && this.currentPage > 1) {
              this.currentPage--;
            }
            this.loadProjects();
            // Optionally show success message
          },
          error: (error) => {
            const message = error?.error?.message || 'An error occurred while deleting the project.';
            alert(`${message} Please try again.`);
            console.error('Error deleting project:', error);
          }
      });
    }
  }

  // Helper for calculating total pages
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  // Helper method to safely get uploader name
  getUploaderName(uploadedBy: string | { _id?: string; id?: string; name: string }): string {
    if (typeof uploadedBy === 'object' && uploadedBy !== null && uploadedBy.name) {
      return uploadedBy.name;
    }
    // If it's just a string (ID) or null/undefined object, return 'N/A' or the ID itself if needed
    return uploadedBy?.toString() || 'N/A'; 
  }
}
