export interface Project {
  id: string;
  title: string;
  problemStatement: string;
  objectives: string[];
  department: string;
  year: string;
  filePath: string;
  // uploadedBy can be a string (ID) or a populated object with at least name
  uploadedBy: string | { _id?: string; id?: string; name: string }; 
}
