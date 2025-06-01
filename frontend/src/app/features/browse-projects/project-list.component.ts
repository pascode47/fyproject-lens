import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Ensure FormsModule is imported
import { ProjectService, PaginatedProjectsResponse } from '../../shared/services/project.service'; // Import PaginatedProjectsResponse
import { Project } from '../../models/project';
import { ProjectCardComponent } from '../../shared/project-card/project-card.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectCardComponent], // FormsModule added
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css']
})
export class ProjectListComponent implements OnInit {
  // Explicitly type the injected service
  private projectService: ProjectService = inject(ProjectService);

  projects: Project[] = []; // Renamed from filteredProjects
  academicYears: string[] = [];
  departments: string[] = [
    'All Departments',
    'Department of Computer Science and Engineering (DoCS&E)',
    'Department of Electronics and Telecommunications Engineering (ETE)',
    'Department of Information Systems and Technology (DIS&T)',
    'Other'
  ];

  selectedYear: string | null = 'All Years'; // Default
  selectedDepartment: string = 'All Departments'; // Default

  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  isLoadingYears = false;
  isLoadingProjects = false;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadAcademicYears();
    this.loadProjects();

    // Call the new diagnostic method
    if (this.projectService.diagnosticTestMethod) {
      const diagnosticResult = this.projectService.diagnosticTestMethod();
      console.log('DIAGNOSTIC_COMPONENT_CALL:', diagnosticResult);
    } else {
      console.error('DIAGNOSTIC_COMPONENT_CALL: diagnosticTestMethod does NOT exist on projectService instance!');
    }
  }

  loadAcademicYears(): void {
    this.isLoadingYears = true;
    this.errorMessage = null;
    this.projectService.getAcademicYears().subscribe({ // Correct: 0 arguments
      next: (years) => {
        this.academicYears = ['All Years', ...years.sort()];
        this.isLoadingYears = false;
      },
      error: (err) => {
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

    // This is line 68/69 where the TS2554 error was reported.
    // The call signature matches ProjectService.fetchAllProjectsWithFilters.
    this.projectService.fetchAllProjectsWithFilters(departmentFilter, this.currentPage, this.itemsPerPage, yearFilter).subscribe({
      next: (response: PaginatedProjectsResponse) => { // Explicitly type response
        this.projects = response.data || []; // Ensure projects is an array
        this.totalItems = response.pagination?.totalItems || 0;
        this.isLoadingProjects = false;
      },
      error: (err: any) => { // Explicitly type err
        console.error('Error loading projects:', err);
        this.projects = []; // Clear projects on error
        this.totalItems = 0;
        this.errorMessage = 'Failed to load projects. Please try again later.';
        this.isLoadingProjects = false;
      }
    });
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
