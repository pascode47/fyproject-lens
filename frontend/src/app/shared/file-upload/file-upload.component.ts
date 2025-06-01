import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true, // Ensuring it's standalone
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css'
})
export class FileUploadComponent {
  @Input() label: string = 'Choose a file';
  @Input() accept: string = '.docx';
  @Input() maxSizeMB: number = 10; // Default max size: 10MB
  @Input() multiple: boolean = false; // New input for multiple files
  @Output() filesSelected: EventEmitter<File[]> = new EventEmitter<File[]>(); // Explicitly typed EventEmitter

  selectedFiles: File[] = []; // Store multiple files
  error: string | null = null;
  
  onFileChange(event: any): void {
    const fileList: FileList = event.target.files;
    this.selectedFiles = []; // Reset
    this.error = null;

    if (fileList.length === 0) {
      this.filesSelected.emit([]); // Emit empty array if no files
      return;
    }

    const filesArray: File[] = Array.from(fileList);
    const validFiles: File[] = [];

    for (const file of filesArray) {
      // Validate file type
      if (this.accept && !this.isValidFileType(file)) {
        this.error = `Invalid file type: ${file.name}. Only ${this.accept} files are allowed.`;
        this.selectedFiles = []; // Clear selection on error
        this.filesSelected.emit([]);
        return; // Reject whole batch on first error
      }
      
      // Validate file size
      if (this.maxSizeMB && file.size > this.maxSizeMB * 1024 * 1024) {
        this.error = `File size exceeds ${this.maxSizeMB}MB limit: ${file.name}.`;
        this.selectedFiles = []; // Clear selection on error
        this.filesSelected.emit([]);
        return; // Reject whole batch on first error
      }
      validFiles.push(file);
    }
    
    this.selectedFiles = validFiles;
    if (this.selectedFiles.length > 0) {
      this.filesSelected.emit(this.selectedFiles);
    } else {
      // This case might not be reached if we return on first error,
      // but good for safety if error handling changes.
      this.filesSelected.emit([]);
    }
  }
  
  private isValidFileType(file: File): boolean {
    if (!this.accept) return true;
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptTypes = this.accept.split(',').map(type => type.trim().toLowerCase());
    
    return acceptTypes.includes(fileExtension);
  }
  
  clearFiles(): void {
    this.selectedFiles = [];
    this.error = null;
    this.filesSelected.emit([]); // Emit empty array on clear
    // Reset the file input element so the same file(s) can be selected again
    const fileInput = document.getElementById('fileInput-' + this.label.replace(/\s+/g, '-')) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Helper to generate a unique ID for the input for the label
  get inputId(): string {
    return 'fileInput-' + this.label.replace(/\s+/g, '-');
  }
}
