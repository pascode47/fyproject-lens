export interface Analysis {
  id: string;
  userId: string;
  projectId: string;
  similarityPercentage: number;
  recommendations: string[];
  timestamp: Date;
}
