import { Component, ChangeDetectorRef, OnInit } from '@angular/core'; // Added OnInit
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router'; // Added Router and ActivatedRoute
import { AnalysisService } from '../../shared/services/analysis.service';
import { ProposalCheckApiResponse, ProposalDetails } from '../../models/proposal-check.model'; // Removed ProposalCheckData as it's not used
import { SimilarityResult } from '../../models/similarity-result';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';

@Component({
  selector: 'app-proposal-check',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FileUploadComponent,
    ProjectCardComponent
  ],
  templateUrl: './proposal-check.component.html',
  styleUrls: ['./proposal-check.component.css']
})
export class ProposalCheckComponent implements OnInit {
  selectedFile: File | null = null;
  isProcessing: boolean = false;
  processingError: string | null = null;
  
  analysisResult: ProposalCheckApiResponse | null = null;
  extractedProposalDetails: ProposalDetails | null = null;
  similarProjectsList: SimilarityResult[] = [];
  recommendationsList: string[] = [];
  returnUrl: string | null = null;
  cachedAnalysis: any[] = [];
  showCachedResults: boolean = false;

  constructor(
    private analysisService: AnalysisService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {
    console.log('ProposalCheckComponent initialized');
    
    // Get navigation state if available
    const navigation = this.router.getCurrentNavigation();
    if (navigation && navigation.extras.state) {
      this.returnUrl = navigation.extras.state['returnUrl'];
      console.log('Return URL from navigation state:', this.returnUrl);
    }
  }
  
  ngOnInit() {
    // Check if we have a returnUrl parameter in the route
    this.route.paramMap.subscribe(params => {
      const returnUrlParam = params.get('returnUrl');
      if (returnUrlParam) {
        // Add a leading slash if not present
        this.returnUrl = returnUrlParam.startsWith('/') ? returnUrlParam : '/' + returnUrlParam;
        console.log('Return URL from route parameter:', this.returnUrl);
      } else {
        // Check if we have a return URL in the history state as fallback
        if (history.state.returnUrl) {
          this.returnUrl = history.state.returnUrl;
          console.log('Return URL from history state:', this.returnUrl);
        }
      }
    });
    // Check for cached analysis results
    this.loadCachedAnalysis();
  }
  
  // Public method to navigate back to the previous page
  navigateBack(): void {
    if (this.returnUrl) {
      console.log('Navigating back to:', this.returnUrl);
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  onFilesSelected(files: File[]): void { // Method name is onFilesSelected, expects File[]
    if (files && files.length > 0) {
      const file = files[0]; 
      console.log('File selected:', file.name);
      this.selectedFile = file;
    } else {
      this.selectedFile = null;
    }
    this.processingError = null;
    this.analysisResult = null;
    this.extractedProposalDetails = null;
    this.similarProjectsList = [];
    this.recommendationsList = [];
    this.isProcessing = false;
    this.showCachedResults = false; 
  }

  analyzeProposal(): void {
    console.log('analyzeProposal called. Selected file:', this.selectedFile?.name);
    if (!this.selectedFile) {
      this.processingError = 'Please select a proposal file.';
      console.error('No file selected for analysis.');
      return;
    }

    if (!this.selectedFile.name.endsWith('.docx') && !this.selectedFile.name.endsWith('.pdf')) {
      this.processingError = 'Only .docx and .pdf files are allowed.';
      this.selectedFile = null; 
      return;
    }

    this.isProcessing = true;
    this.processingError = null;
    this.analysisResult = null;
    this.extractedProposalDetails = null;
    this.similarProjectsList = [];
    this.recommendationsList = [];
    this.showCachedResults = false;
    console.log('State reset before API call.');

    const formData = new FormData();
    formData.append('proposalFile', this.selectedFile, this.selectedFile.name); 
    console.log('FormData prepared:', formData.has('proposalFile'));

    this.analysisService.checkProposalSimilarity(formData).subscribe({
      next: (response) => {
        console.log('API response received:', response);
        this.analysisResult = response; 

        if (response && response.success && response.data) {
          this.extractedProposalDetails = response.data.proposalDetails;
          this.similarProjectsList = response.data.similarProjects;
          this.recommendationsList = response.data.recommendations;
        } else {
          this.processingError = response.message || 'Received an unexpected response structure from the server.';
          this.extractedProposalDetails = null;
          this.similarProjectsList = [];
          this.recommendationsList = [];
        }
        
        this.isProcessing = false;
        console.log('Processing finished, isProcessing set to false.');
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        // Check if this is a metadata validation error (422 status code)
        const isMetadataError = err.status === 422;
        const backendError = err.error?.message || err.error?.error || err.message;
        
        if (isMetadataError) {
          // Format the error message for metadata validation errors
          this.processingError = backendError || 'The uploaded document is missing required information. Please ensure your proposal includes all necessary sections.';
        } else {
          // Generic error message for other errors
          this.processingError = backendError || 'Failed to analyze proposal. Please try again.';
        }
        
        console.error('Proposal analysis error in component:', err);
        this.isProcessing = false;
        console.log('Processing finished due to error, isProcessing set to false.');
        this.cdr.detectChanges(); 
      }
    });
    console.log('Subscription to checkProposalSimilarity initiated.');
  }

  loadCachedAnalysis(): void {
    this.analysisService.getUserHistory().subscribe({
      next: (history) => {
        console.log('Cached analysis history received:', history);
        this.cachedAnalysis = history.filter(analysis => analysis.analysisType === 'proposal');
        if (this.cachedAnalysis.length > 0) {
          this.showCachedResults = true;
          // Display the most recent analysis by default
          const latestAnalysis = this.cachedAnalysis[0];
          this.analysisResult = {
            success: true,
            message: 'Cached analysis result',
            data: {
              proposalDetails: latestAnalysis.proposalDetails,
              similarProjects: latestAnalysis.similarProjects,
              recommendations: latestAnalysis.recommendations
            }
          };
          this.extractedProposalDetails = latestAnalysis.proposalDetails;
          this.similarProjectsList = latestAnalysis.similarProjects;
          this.recommendationsList = latestAnalysis.recommendations;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching cached analysis history:', err);
        this.cachedAnalysis = [];
        this.showCachedResults = false;
        this.cdr.detectChanges();
      }
    });
  }

  reAnalyzeProposal(): void {
    this.showCachedResults = false;
    this.analyzeProposal();
  }
}
