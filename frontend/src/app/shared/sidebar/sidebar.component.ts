import { Component, EventEmitter, Output, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() sidebarToggled = new EventEmitter<boolean>();
  
  isCollapsed = false;

  allMenuItems = [
    { 
      label: 'Home', 
      path: '/home', 
      icon: '🏠',
      requiresAuth: false
    },
    // { 
    //   label: 'Upload Proposal', 
    //   path: '/upload-analysis', 
    //   icon: '📤', // Icon for uploading final project
    //   requiresAuth: true // Assuming uploading final project requires auth
    // }, // This menu item is removed
    {
      label: 'Check Proposal',
      path: '/check-proposal',
      icon: '🔍', // Icon for checking/analyzing a proposal
      requiresAuth: true 
    },
    { 
      label: 'Existing Projects', // Changed label
      path: '/browse-projects', 
      icon: '📚',
      requiresAuth: false
    },
    { 
      label: 'Popular Ideas', 
      path: '/popular-ideas', 
      icon: '💡',
      requiresAuth: false
    },
    { 
      label: 'Profile', 
      path: '/profile', 
      icon: '👤',
      requiresAuth: true
    },
    // Add specific Admin links instead of a single top-level one
    { 
      label: 'Analytics', 
      path: '/admin/analytics', // Link directly to analytics
      icon: '📊', // Changed icon
      requiresAuth: true,
      requiresAdmin: true
    },
    { 
      label: 'Manage Users', 
      path: '/admin/manage-users', 
      icon: '👥', // Changed icon
      requiresAuth: true,
      requiresAdmin: true
    },
    { 
      label: 'Manage Projects', 
      path: '/admin/manage-projects', 
      icon: '📂', // Changed icon
      requiresAuth: true,
      requiresAdmin: true
    }
    // Remove the old generic '/admin' link if it existed above
  ];
  
  authMenuItems = [
    { 
      label: 'Login', 
      path: '/auth/login', 
      icon: '🔑'
    },
    { 
      label: 'Sign Up', 
      path: '/auth/signup', 
      icon: '📝'
    }
  ];
  
  menuItems: any[] = [];

  private authSubscription: any;
  
  constructor(
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit() {
    this.updateMenuItems();
    
    // Subscribe to authentication state changes
    this.authSubscription = this.authService.authStateChanged.subscribe(() => {
      console.log('Auth state changed, updating menu items');
      this.updateMenuItems();
      // Trigger change detection to update the view
      this.cdr.detectChanges();
    });
  }
  
  ngOnDestroy() {
    // Unsubscribe to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
  
  updateMenuItems() {
    const isAuthenticated = this.authService.isAuthenticated();
    const isAdmin = this.authService.isAdmin();
    
    // Filter main menu items
    this.menuItems = this.allMenuItems.filter(item => {
      // Skip items that require authentication when user is not authenticated
      if (item.requiresAuth && !isAuthenticated) {
        return false;
      }
      
      // Skip items that require admin when user is not admin
      if (item.requiresAdmin && !isAdmin) {
        return false;
      }
      
      return true;
    });
  }
  
  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
  }
}
