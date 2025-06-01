import { Component, ViewChild } from '@angular/core'; // Added ViewChild
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectService } from '../../../services/project.service';
// SimilarityService might not be directly used here if results are per-file and displayed with project card
// import { SimilarityService } from '../../../services/similarity.service'; 
import { FileUploadComponent } from '../../../shared/file-upload/file-upload.component';
import { ProjectCardComponent } from '../../../shared/components/project-card/project-card.component';
import { SimilarityResult } from '../../../models/similarity-result';
import { finalize } from 'rxjs/operators';

interface FileUploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  extractedInfo?: any;
  similarityResults?: SimilarityResult[];
}

@Component({
  selector: 'app-project-upload',
  standalone: true, // Ensure this component is standalone
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    FileUploadComponent,
    ProjectCardComponent
  ],
  templateUrl: './project-upload.component.html',
  styleUrl: './project-upload.component.css'
})
export class ProjectUploadComponent {
  filesToUpload: FileUploadStatus[] = [];
  isBulkUploading: boolean = false; // Overall status for the batch
  overallUploadError: string | null = null; // For errors not specific to a file (e.g., no files selected)
  currentFileIndex: number = -1; // To track which file is currently being uploaded

  @ViewChild(FileUploadComponent) fileUploadComponent!: FileUploadComponent; // Reference to the child

  constructor(
    private projectService: ProjectService
  ) {}

  onFilesSelected(selectedFiles: File[]) {
    this.filesToUpload = selectedFiles.map(file => ({
      file,
      status: 'pending',
    }));
    this.overallUploadError = null; // Clear previous general errors
    this.currentFileIndex = -1; // Reset index
  }

  async uploadAllFiles() {
    if (this.filesToUpload.length === 0) {
      this.overallUploadError = 'Please select one or more .docx files to upload.';
      return;
    }

    this.isBulkUploading = true;
    this.overallUploadError = null;

    for (let i = 0; i < this.filesToUpload.length; i++) {
      this.currentFileIndex = i;
      const fileStatus = this.filesToUpload[i];

      if (!fileStatus.file.name.endsWith('.docx')) {
        fileStatus.status = 'error';
        fileStatus.errorMessage = 'Only .docx files are allowed.';
        // Optionally, continue to next file or stop batch
        // For now, we'll mark error and let loop continue to show all errors if desired
        // or could implement a "stop on first error" policy
        continue; 
      }

      fileStatus.status = 'uploading';
      const formData = new FormData();
      formData.append('projectFile', fileStatus.file);

      try {
        // Convert Observable to Promise for async/await sequence
        const response: any = await this.projectService.uploadProject(formData).toPromise();
        fileStatus.status = 'success';
        fileStatus.extractedInfo = response.extractedInfo;
        fileStatus.similarityResults = response.similarityResults || [];
      } catch (error: any) {
        fileStatus.status = 'error';
        fileStatus.errorMessage = error.message || 'Error uploading file. Please try again.';
        console.error(`Error uploading file ${fileStatus.file.name}:`, error);
        // Decide: stop batch on error or continue? For now, continue.
      }
    }
    this.isBulkUploading = false;
    this.currentFileIndex = -1; // Reset after all uploads attempted
  }

  get currentUploadingFileName(): string | null {
    if (this.isBulkUploading && this.currentFileIndex >= 0 && this.filesToUpload[this.currentFileIndex]) {
      return this.filesToUpload[this.currentFileIndex].file.name;
    }
    return null;
  }

  get overallProgress(): string {
    if (!this.isBulkUploading || this.filesToUpload.length === 0) return '';
    const doneCount = this.filesToUpload.filter(f => f.status === 'success' || f.status === 'error').length;
    return `Processed ${doneCount} of ${this.filesToUpload.length}. Current: ${this.currentUploadingFileName || 'N/A'}`;
  }

  // Helper to clear all files and statuses
  clearAllFiles() {
    this.filesToUpload = [];
    this.overallUploadError = null;
    this.isBulkUploading = false;
    this.currentFileIndex = -1;
    if (this.fileUploadComponent) {
      this.fileUploadComponent.clearFiles(); // Call child's clear method
    }
  }
}
