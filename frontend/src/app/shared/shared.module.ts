import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { FileUploadComponent } from './file-upload/file-upload.component';
import { ProjectCardComponent } from './project-card/project-card.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    FileUploadComponent,
    ProjectCardComponent
  ],
  exports: [
    HeaderComponent,
    SidebarComponent,
    FileUploadComponent,
    ProjectCardComponent
  ]
})
export class SharedModule { }
