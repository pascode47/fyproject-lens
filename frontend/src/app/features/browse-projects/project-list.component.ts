// frontend/src/app/features/browse-projects/project-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, PaginatedProjectsResponse } from '../../shared/services/project.service';
import { Project } from '../../models/project';
import { ProjectCardComponent } from '../../shared/project-card/project-card.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectCardComponent],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  private projectService: ProjectService = inject(ProjectService);

  projects: Project[] = [];
  academicYears: string[] = [];
  departments: string[] = [
    'All Departments',
    'Department of Computer Science and Engineering (DoCS&E)',
    'Department of Electronics and Telecommunications Engineering (ETE)',
    'Department of Information Systems and Technology (DIS&T)',
    'Other'
  ];

  selectedYear: string | null = 'All Years';
  selectedDepartment: string = 'All Departments';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  isLoadingYears = false;
  isLoadingProjects = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadAcademicYears();
    this.loadProjects();

    // Diagnostic call
    if (typeof this.projectService.diagnosticTestMethod === 'function') {
      const diagnosticMsg = this.projectService.diagnosticTestMethod();
      console.log('DIAGNOSTIC_CALL_PROJECT_LIST:', diagnosticMsg);
    } else {
      console.error('DIAGNOSTIC_CALL_PROJECT_LIST: diagnosticTestMethod is NOT a function or does not exist on projectService.');
    }
  }

  loadAcademicYears(): void {
    this.isLoadingYears = true;
    this.errorMessage = null;
    this.projectService.getAcademicYears().subscribe({
      next: (years: string[]) => {
        this.academicYears = ['All Years', ...years.sort()];
        this.isLoadingYears = false;
      },
      error: (err: any) => {
        console.error('Error loading academic years:', err);
        this.errorMessage = 'Failed to load academic years.';
        this.isLoadingYears = false;
      }
    });
  }

  loadProjects(): void {
    this.isLoadingProjects = true;
    this.errorMessage = null;
    
    const departmentFilter = this.selectedDepartment === 'All Departments' ? undefined : this.selectedDepartment;
    const yearFilter = this.selectedYear === 'All Years' || this.selectedYear === null ? undefined : this.selectedYear;

    if (typeof this.projectService.fetchAllProjectsWithFilters === 'function') {
      this.projectService.fetchAllProjectsWithFilters(departmentFilter, this.currentPage, this.itemsPerPage, yearFilter).subscribe({
        next: (response: PaginatedProjectsResponse) => {
          this.projects = response.data || [];
          this.totalItems = response.pagination?.totalItems || 0;
          this.isLoadingProjects = false;
        },
        error: (err: any) => {
          console.error('Error loading projects:', err);
          this.projects = [];
          this.totalItems = 0;
          this.errorMessage = 'Failed to load projects. Please try again later.';
          this.isLoadingProjects = false;
        }
      });
    } else {
      console.error('CRITICAL_ERROR: projectService.fetchAllProjectsWithFilters is NOT a function or does not exist!');
      this.errorMessage = 'Critical error: Project fetching service is misconfigured.';
      this.isLoadingProjects = false;
    }
  }

  onYearSelected(year: string | null): void {
    this.selectedYear = year;
    this.currentPage = 1;
    this.loadProjects();
  }

  onDepartmentSelected(department: string): void {
    this.selectedDepartment = department;
    this.currentPage = 1;
    this.loadProjects();
  }
  
  onPageChange(page: number): void {
    if (page < 1 || page > this.getTotalPages()) {
      return;
    }
    this.currentPage = page;
    this.loadProjects();
  }

  resetFilters(): void {
    this.selectedYear = 'All Years';
    this.selectedDepartment = 'All Departments';
    this.currentPage = 1;
    this.loadProjects();
    this.errorMessage = null;
  }

  getTotalPages(): number {
    if (this.totalItems === 0 || this.itemsPerPage === 0) {
      return 0;
    }
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }
}
