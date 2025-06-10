import { SimilarityResult } from './similarity-result';
import { ProposalDetails } from './proposal-check.model';

export interface Analysis {
  id: string;
  userId: string;
  projectId?: string; // Optional for proposal checks
  // Project details (populated from backend)
  project?: {
    id: string;
    title: string;
    department?: string;
    academicYear?: string;
  };
  proposalDetails?: ProposalDetails; // For proposal checks
  similarProjects?: SimilarityResult[]; // For proposal checks
  similarityPercentage: number;
  recommendations: string[];
  analysisType: 'project' | 'proposal'; // Type of analysis
  timestamp: Date;
}
