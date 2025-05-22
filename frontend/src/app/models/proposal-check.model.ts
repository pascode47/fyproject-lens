import { SimilarityResult } from './similarity-result';

// Interface for the metadata extracted from the uploaded proposal by the backend
export interface ProposalDetails {
  title?: string;
  problemStatement?: string;
  objectives?: string[];
  supervisor?: string;
  students?: string[];
  academicYear?: string;
  department?: string;
  // Add any other fields the backend might return in the 'proposalDetails' part
}

// Interface for the 'data' part of the API response
export interface ProposalCheckData {
  proposalDetails: ProposalDetails;
  similarProjects: SimilarityResult[];
  recommendations: string[];
}

// Interface for the entire API response from POST /api/similarity/check-proposal
export interface ProposalCheckApiResponse {
  success: boolean;
  message: string;
  data?: ProposalCheckData; // Make data optional in case of errors where it might be missing
}
