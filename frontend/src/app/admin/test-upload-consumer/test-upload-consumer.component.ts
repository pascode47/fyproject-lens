import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// Corrected path: from frontend/src/app/admin/test-upload-consumer/ to frontend/src/app/shared/components/file-upload/
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';

@Component({
  selector: 'app-test-upload-consumer',
  standalone: true,
  imports: [CommonModule, FileUploadComponent],
  template: `
    <p>Test Upload Consumer</p>
    <app-file-upload
      label="Test Multiple Upload"
      [multiple]="true"
      (filesSelected)="onTestFilesSelected($event)">
    </app-file-upload>
    <div *ngIf="testFilesMultiple.length > 0">
      <p>{{ testFilesMultiple.length }} file(s) selected for multiple test.</p>
      <ul><li *ngFor="let f of testFilesMultiple">{{f.name}}</li></ul>
    </div>

    <hr style="margin: 20px 0;">

    <app-file-upload
      label="Test Single Upload"
      [multiple]="false" 
      (filesSelected)="onTestFileSingleSelected($event)">
    </app-file-upload>
    <div *ngIf="testFileSingle">
       <p>{{ testFileSingle.name }} selected for single test.</p>
    </div>
  `
})
export class TestUploadConsumerComponent {
  testFilesMultiple: File[] = [];
  testFileSingle: File | null = null;

  constructor() {}

  onTestFilesSelected(files: File[]) {
    console.log('Test (multiple) files selected:', files);
    this.testFilesMultiple = files;
  }

  onTestFileSingleSelected(files: File[]) {
    console.log('Test (single) file selected:', files);
    this.testFileSingle = (files && files.length > 0) ? files[0] : null;
  }
}
