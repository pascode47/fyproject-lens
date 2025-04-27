import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css'
})
export class FileUploadComponent {
  @Input() label: string = 'Choose a file';
  @Input() accept: string = '.docx';
  @Input() maxSizeMB: number = 10; // Default max size: 10MB
  @Output() fileSelected = new EventEmitter<File>();

  file: File | null = null;
  error: string | null = null;
  
  onFileChange(event: any): void {
    const files = event.target.files;
    
    if (files.length === 0) {
      this.file = null;
      return;
    }
    
    const selectedFile = files[0];
    
    // Validate file type
    if (this.accept && !this.isValidFileType(selectedFile)) {
      this.error = `Only ${this.accept} files are allowed`;
      this.file = null;
      return;
    }
    
    // Validate file size
    if (this.maxSizeMB && selectedFile.size > this.maxSizeMB * 1024 * 1024) {
      this.error = `File size exceeds ${this.maxSizeMB}MB limit`;
      this.file = null;
      return;
    }
    
    this.file = selectedFile;
    this.error = null;
    if (this.file) {
      this.fileSelected.emit(this.file);
    }
  }
  
  private isValidFileType(file: File): boolean {
    if (!this.accept) return true;
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptTypes = this.accept.split(',').map(type => type.trim().toLowerCase());
    
    return acceptTypes.includes(fileExtension);
  }
  
  clearFile(): void {
    this.file = null;
    this.error = null;
    // We don't emit here since we're clearing the file
  }
}
