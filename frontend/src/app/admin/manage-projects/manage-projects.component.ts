import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core'; // Add OnDestroy, ViewChild
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../shared/services/admin.service';
import { Project } from '../../models/project';
import { PaginatedResponse } from '../../models/paginated-response'; // Import PaginatedResponse
import { Subject } from 'rxjs'; // Import Subject
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators'; // Import operators
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component'; // Import FileUploadComponent

// Interface for tracking bulk upload status
interface AdminFileUploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  successMessage?: string;
  // Add any other relevant fields from the upload response if needed
}

@Component({
  selector: 'app-manage-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent], // Added FileUploadComponent
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
  departmentFilter: string = ''; // Changed from programmeFilter
  academicYearFilter: string = ''; 

  // Bulk Project Upload
  selectedProjectFiles: File[] = [];
  fileUploadStatuses: AdminFileUploadStatus[] = [];
  isUploading: boolean = false; // Re-used for bulk operation
  bulkUploadProgress: string = '';
  currentBulkUploadIndex: number = -1;

  // General messages for single/old upload logic (can be reused or adapted)
  uploadSuccessMessage: string | null = null; 
  uploadErrorMessage: string | null = null;

  // Project Edit Modal
  showEditModal: boolean = false;
  editingProject: any = null;
  originalProject: any = null; // To keep a copy of the original project data
  isUpdating: boolean = false;
  editError: string | null = null;
  editSuccess: string | null = null;


  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>(); // For unsubscribing

  @ViewChild(FileUploadComponent) private fileUploadComponentRef!: FileUploadComponent;

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
    const department = this.departmentFilter || undefined; // Changed from programme
    const academicYear = this.academicYearFilter || undefined;
    const search = this.searchTerm || undefined;

    // Pass filters to the service call
    this.adminService.getProjects(this.currentPage, this.itemsPerPage, department, academicYear, search)
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

  // --- Bulk Project Upload Handlers ---

  onProjectFilesSelected(files: File[]): void {
    this.selectedProjectFiles = files;
    this.fileUploadStatuses = files.map(file => ({
      file,
      status: 'pending'
    }));
    this.uploadErrorMessage = null; // Clear general error message
    this.uploadSuccessMessage = null; // Clear general success message
  }

  async uploadSelectedProjects(): Promise<void> {
    if (this.selectedProjectFiles.length === 0) {
      this.uploadErrorMessage = 'Please select one or more project files to upload.';
      return;
    }

    this.isUploading = true;
    this.uploadErrorMessage = null;
    this.uploadSuccessMessage = null;
    this.currentBulkUploadIndex = 0;

    for (let i = 0; i < this.fileUploadStatuses.length; i++) {
      const currentFileStatus = this.fileUploadStatuses[i];
      this.currentBulkUploadIndex = i;
      this.updateBulkUploadProgress();

      // Basic client-side validation (can be enhanced)
      const allowedExtensions = ['.docx', '.pdf', '.doc'];
      const fileExtension = '.' + currentFileStatus.file.name.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        currentFileStatus.status = 'error';
        currentFileStatus.errorMessage = `Invalid file type: ${currentFileStatus.file.name}. Only DOCX, PDF, DOC allowed.`;
        continue; // Skip to next file
      }
      
      currentFileStatus.status = 'uploading';
      try {
        // Assuming adminService.uploadProject takes a single File and returns relevant info
        // The actual response structure from adminService.uploadProject will determine what to store.
        const response: any = await this.adminService.uploadProject(currentFileStatus.file).toPromise();
        currentFileStatus.status = 'success';
        currentFileStatus.successMessage = `Project "${response.extractedInfo?.title || currentFileStatus.file.name}" uploaded. ID: ${response.projectId}`;
        // Optionally store more details from response onto currentFileStatus if needed
      } catch (error: any) {
        currentFileStatus.status = 'error';
        currentFileStatus.errorMessage = error?.error?.message || error?.message || 'Upload failed.';
        console.error(`Error uploading ${currentFileStatus.file.name}:`, error);
      }
    }

    this.isUploading = false;
    this.currentBulkUploadIndex = -1;
    this.updateBulkUploadProgress(); // Final progress update
    this.loadProjects(); // Refresh the project list
    // Do not clear selectedProjectFiles here, user might want to see statuses
  }
  
  clearSelectedProjectFiles(): void {
    this.selectedProjectFiles = [];
    this.fileUploadStatuses = [];
    this.uploadErrorMessage = null;
    this.uploadSuccessMessage = null;
    this.isUploading = false;
    this.currentBulkUploadIndex = -1;
    this.bulkUploadProgress = '';
    if (this.fileUploadComponentRef) {
      this.fileUploadComponentRef.clearFiles();
    }
  }

  private updateBulkUploadProgress(): void {
    if (!this.isUploading || this.currentBulkUploadIndex < 0 || this.fileUploadStatuses.length === 0) {
      this.bulkUploadProgress = '';
      return;
    }
    const currentIndex = this.currentBulkUploadIndex + 1;
    const totalFiles = this.fileUploadStatuses.length;
    const currentFileName = this.fileUploadStatuses[this.currentBulkUploadIndex].file.name;
    this.bulkUploadProgress = `Processing ${currentIndex} of ${totalFiles}: ${currentFileName}`;
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
  getUploaderName(uploadedBy: string | { _id?: string; id?: string; name: string } | undefined): string { // Allow undefined
    if (typeof uploadedBy === 'object' && uploadedBy !== null && uploadedBy.name) {
      return uploadedBy.name;
    }
    // If it's just a string (ID) or null/undefined object, return 'N/A' or the ID itself if needed
    return uploadedBy?.toString() || 'N/A'; 
  }

  // --- Project Edit Handlers ---

  /**
   * Open the edit modal for a project
   * @param project The project to edit
   */
  editProject(project: any): void {
    // Create a deep copy of the project to avoid modifying the original directly
    this.originalProject = { ...project };
    this.editingProject = {
      _id: project._id,
      title: project.title,
      department: project.department,
      academicYear: project.academicYear,
      problemStatement: project.problemStatement,
      objectives: project.objectives ? [...project.objectives] : [],
      supervisor: project.supervisor || '',
      students: project.students ? [...project.students] : []
    };
    
    this.showEditModal = true;
    this.editError = null;
    this.editSuccess = null;
  }

  /**
   * Close the edit modal without saving changes
   */
  cancelEdit(): void {
    if (this.isUpdating) {
      return; // Don't allow canceling while update is in progress
    }
    
    this.showEditModal = false;
    this.editingProject = null;
    this.originalProject = null;
    this.editError = null;
    this.editSuccess = null;
  }

  /**
   * Save the changes to the project
   */
  saveProjectChanges(): void {
    if (!this.editingProject || this.isUpdating) {
      return;
    }

    // Basic validation
    if (!this.editingProject.title || !this.editingProject.department || !this.editingProject.academicYear) {
      this.editError = 'Title, Department, and Academic Year are required fields.';
      return;
    }

    this.isUpdating = true;
    this.editError = null;
    this.editSuccess = null;

    // Prepare data for update
    const projectData = {
      title: this.editingProject.title,
      department: this.editingProject.department,
      academicYear: this.editingProject.academicYear,
      problemStatement: this.editingProject.problemStatement,
      objectives: this.editingProject.objectives,
      supervisor: this.editingProject.supervisor,
      students: this.editingProject.students
    };

    this.adminService.updateProject(this.editingProject._id, projectData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isUpdating = false;
          this.editSuccess = 'Project updated successfully.';
          
          // Update the project in the local list
          const index = this.projects.findIndex(p => p._id === this.editingProject._id);
          if (index !== -1) {
            this.projects[index] = { ...this.projects[index], ...projectData };
          }
          
          // Close modal after a short delay to show success message
          setTimeout(() => {
            this.showEditModal = false;
            this.editingProject = null;
            this.originalProject = null;
            this.editSuccess = null;
            
            // Reload projects to ensure we have the latest data
            this.loadProjects();
          }, 1500);
        },
        error: (error) => {
          this.isUpdating = false;
          this.editError = error?.error?.message || 'Failed to update project. Please try again.';
          console.error('Error updating project:', error);
        }
      });
  }

  /**
   * Add a new empty objective to the editing project
   */
  addObjective(): void {
    if (this.editingProject) {
      if (!this.editingProject.objectives) {
        this.editingProject.objectives = [];
      }
      this.editingProject.objectives.push('');
    }
  }

  /**
   * Remove an objective at the specified index
   * @param index The index of the objective to remove
   */
  removeObjective(index: number): void {
    if (this.editingProject && this.editingProject.objectives && index >= 0 && index < this.editingProject.objectives.length) {
      this.editingProject.objectives.splice(index, 1);
    }
  }

  /**
   * Add a new empty student to the editing project
   */
  addStudent(): void {
    if (this.editingProject) {
      if (!this.editingProject.students) {
        this.editingProject.students = [];
      }
      this.editingProject.students.push('');
    }
  }

  /**
   * Remove a student at the specified index
   * @param index The index of the student to remove
   */
  removeStudent(index: number): void {
    if (this.editingProject && this.editingProject.students && index >= 0 && index < this.editingProject.students.length) {
      this.editingProject.students.splice(index, 1);
    }
  }
}
