import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../shared/services/project.service'; // Adjust path if needed
import { Project } from '../../models/project'; // Adjust path if needed
import { ProjectCardComponent } from '../../shared/project-card/project-card.component'; // Adjust path if needed

@Component({
  selector: 'app-project-list',
  standalone: true, // Assuming standalone based on previous files
  imports: [CommonModule, ProjectCardComponent], // Add ProjectCardComponent if you have one
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.css'] // Corrected property name
})
export class ProjectListComponent implements OnInit {
  private projectService = inject(ProjectService);

  academicYears: string[] = [];
  // courses: string[] = []; // Removed courses array
  filteredProjects: Project[] = [];

  selectedYear: string | null = null;
  // selectedCourse: string | null = null; // Removed selectedCourse

  isLoadingYears = false;
  // isLoadingCourses = false; // Removed isLoadingCourses
  isLoadingProjects = false; // Keep isLoadingProjects
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.loadAcademicYears();
  }

  loadAcademicYears(): void {
    this.isLoadingYears = true;
    this.errorMessage = null;
    this.projectService.getAcademicYears().subscribe({
      next: (years) => {
        this.academicYears = years.sort(); // Sort years
        this.isLoadingYears = false;
      },
      error: (err) => {
        console.error('Error loading academic years:', err);
        this.errorMessage = 'Failed to load academic years. Please try again later.';
        this.isLoadingYears = false;
      }
    });
  }

  onYearSelected(year: string): void {
    if (this.selectedYear === year) {
      // Optional: Deselect if clicking the same year again
      // this.resetFilters();
      return; 
    }
    this.selectedYear = year;
    // this.selectedCourse = null; // Removed course selection reset
    this.filteredProjects = []; // Clear projects before loading new ones
    this.errorMessage = null;
    this.isLoadingProjects = true; // Set loading projects flag

    // Directly load projects for the selected year
    this.projectService.getProjectsByYear(year).subscribe({
      next: (projects) => {
        this.filteredProjects = projects; // Assign fetched projects
        this.isLoadingProjects = false; // Clear loading projects flag
      },
      error: (err) => {
        console.error(`Error loading projects for year ${year}:`, err);
        this.errorMessage = `Failed to load projects for ${year}. Please try again later.`;
        this.isLoadingProjects = false; // Clear loading projects flag
      }
    });
  }

  // Removed onCourseSelected method entirely

  resetFilters(): void {
    this.selectedYear = null;
    // this.selectedCourse = null; // Removed course reset
    // this.courses = []; // Removed courses reset
    this.filteredProjects = []; // Keep project reset
    this.errorMessage = null;
    // Optionally reload academic years if needed, but usually not necessary
    // this.loadAcademicYears(); 
  }
}
