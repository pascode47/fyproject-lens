import { Component, ChangeDetectorRef } from '@angular/core'; // Import ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Required if using ngModel in template
import { AnalysisService } from '../../shared/services/analysis.service';
import { ProposalCheckApiResponse, ProposalDetails, ProposalCheckData } from '../../models/proposal-check.model'; // Updated import
import { SimilarityResult } from '../../models/similarity-result';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component'; // If you plan to use it for similar projects

@Component({
  selector: 'app-proposal-check',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Add if using ngModel
    FileUploadComponent, // Assuming FileUploadComponent is standalone or part of a shared module imported here
    ProjectCardComponent // Assuming ProjectCardComponent is standalone or part of a shared module imported here
  ],
  templateUrl: './proposal-check.component.html',
  styleUrls: ['./proposal-check.component.css']
})
export class ProposalCheckComponent {
  selectedFile: File | null = null;
  isProcessing: boolean = false;
  processingError: string | null = null;
  
  // Store the full response if needed, or individual parts
  analysisResult: ProposalCheckApiResponse | null = null; // Updated type
  extractedProposalDetails: ProposalDetails | null = null;
  similarProjectsList: SimilarityResult[] = [];
  recommendationsList: string[] = [];

  constructor(
    private analysisService: AnalysisService,
    private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
  ) {
    console.log('ProposalCheckComponent initialized');
  }

  onFileSelected(file: File): void {
    console.log('File selected:', file.name);
    this.selectedFile = file;
    this.processingError = null;
    this.analysisResult = null;
    this.extractedProposalDetails = null;
    this.similarProjectsList = [];
    this.recommendationsList = [];
    this.isProcessing = false; // Reset processing state
  }

  analyzeProposal(): void {
    console.log('analyzeProposal called. Selected file:', this.selectedFile?.name);
    if (!this.selectedFile) {
      this.processingError = 'Please select a proposal file.';
      console.error('No file selected for analysis.');
      return;
    }

    // Basic file type validation (optional, can also be handled by app-file-upload)
    if (!this.selectedFile.name.endsWith('.docx') && !this.selectedFile.name.endsWith('.pdf')) {
      this.processingError = 'Only .docx and .pdf files are allowed.';
      this.selectedFile = null; // Clear invalid file
      return;
    }

    this.isProcessing = true;
    this.processingError = null;
    this.analysisResult = null;
    this.extractedProposalDetails = null;
    this.similarProjectsList = [];
    this.recommendationsList = [];
    console.log('State reset before API call.');

    const formData = new FormData();
    // 'proposalFile' must match the key expected by Multer on the backend
    formData.append('proposalFile', this.selectedFile, this.selectedFile.name); 
    console.log('FormData prepared:', formData.has('proposalFile'));

    this.analysisService.checkProposalSimilarity(formData).subscribe({
      next: (response) => {
        console.log('API response received:', response);
        this.analysisResult = response; // Store the full response if needed for 'success' or 'message'

        if (response && response.success && response.data) {
          this.extractedProposalDetails = response.data.proposalDetails;
          this.similarProjectsList = response.data.similarProjects;
          this.recommendationsList = response.data.recommendations;
        } else {
          // Handle cases where response might not be successful or data is missing
          this.processingError = response.message || 'Received an unexpected response structure from the server.';
          this.extractedProposalDetails = null;
          this.similarProjectsList = [];
          this.recommendationsList = [];
        }
        
        console.log('Extracted Details:', this.extractedProposalDetails);
        console.log('Similar Projects:', this.similarProjectsList);
        console.log('Recommendations:', this.recommendationsList);
        
        this.isProcessing = false;
        console.log('Processing finished, isProcessing set to false.');
        this.cdr.detectChanges(); // Explicitly trigger change detection
      },
      error: (err) => {
        // Attempt to get a more specific error message from the backend response
        const backendError = err.error?.message || err.error?.error || err.message;
        this.processingError = backendError || 'Failed to analyze proposal. Please try again.';
        console.error('Proposal analysis error in component:', err);
        console.log('Error object:', JSON.stringify(err, null, 2));
        this.isProcessing = false;
        console.log('Processing finished due to error, isProcessing set to false.');
        this.cdr.detectChanges(); // Explicitly trigger change detection
      }
    });
    console.log('Subscription to checkProposalSimilarity initiated.');
  }
}
