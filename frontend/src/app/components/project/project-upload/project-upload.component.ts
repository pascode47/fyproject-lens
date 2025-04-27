import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjectService } from '../../../services/project.service';
import { SimilarityService } from '../../../services/similarity.service';
import { FileUploadComponent } from '../../../shared/file-upload/file-upload.component';
import { ProjectCardComponent } from '../../../shared/project-card/project-card.component';
import { SimilarityResult } from '../../../models/similarity-result';

@Component({
  selector: 'app-project-upload',
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
  file: File | null = null;
  isUploading: boolean = false;
  uploadSuccess: boolean = false;
  uploadError: string | null = null;
  extractedInfo: any = {};
  similarityResults: SimilarityResult[] = [];

  constructor(
    private projectService: ProjectService,
    private similarityService: SimilarityService
  ) {}

  onFileSelected(file: File) {
    this.file = file;
    // Reset states
    this.uploadSuccess = false;
    this.uploadError = null;
    this.extractedInfo = {};
    this.similarityResults = [];
  }

  uploadFile() {
    if (!this.file) {
      this.uploadError = 'Please select a file to upload';
      return;
    }

    if (!this.file.name.endsWith('.docx')) {
      this.uploadError = 'Only .docx files are allowed';
      return;
    }

    this.isUploading = true;
    this.uploadError = null;

    const formData = new FormData();
    formData.append('projectFile', this.file);

    this.projectService.uploadProject(formData).subscribe(
      (response) => {
        this.isUploading = false;
        this.uploadSuccess = true;
        this.extractedInfo = response.extractedInfo;
        this.similarityResults = response.similarityResults || [];
      },
      (error) => {
        this.isUploading = false;
        this.uploadError = error.message || 'Error uploading file. Please try again.';
        console.error('Error uploading file:', error);
      }
    );
  }
}
