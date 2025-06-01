export interface Project {
  _id: string; // Use _id as the identifier, common in MongoDB
  title: string;
  description?: string; // Make description optional
  academicYear: string; // Use academicYear
  department: string; // Changed from programme
  tags?: string[]; // Make tags optional
  // uploadedBy can be a string (ID) or a populated object with at least name
  uploadedBy?: string | { _id?: string; id?: string; name: string }; 
  similarityPercentage?: number; // Optional: If backend ever includes this
  // Add fields returned by the getProject endpoint for the detail view
  extractedProblemStatement?: string; 
  extractedObjectives?: string[];
  filePath?: string; 
  supervisor?: string; // Added for mock data consistency
  students?: string[]; // Added for mock data consistency
}
