import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Output() sidebarToggled = new EventEmitter<boolean>();
  
  isCollapsed = false;

  menuItems = [
    { 
      label: 'Home', 
      path: '/home', 
      icon: '🏠'
    },
    { 
      label: 'Upload Proposal', 
      path: '/project/upload', 
      icon: '📄'
    },
    { 
      label: 'Existing Projects', 
      path: '/project/list', 
      icon: '📚'
    },
    { 
      label: 'Recommendations', 
      path: '/recommendations', 
      icon: '💡'
    }
  ];

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }
}
