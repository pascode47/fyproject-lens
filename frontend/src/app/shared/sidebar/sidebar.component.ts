import { Component, EventEmitter, Output, OnInit, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { filter } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatSidenavModule, 
    MatListModule, 
    MatIconModule, 
    MatButtonModule,
    MatDividerModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() sidebarToggled = new EventEmitter<boolean>();
  @Input() isDrawerOpen = false;
  
  isCollapsed = false;
  isAdminRoute = false;
  
  // Admin-specific navigation items
  adminMenuItems: any[] = [];

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
      label: 'Project Ideas', 
      path: '/popular-ideas', 
      icon: '🚀',
      requiresAuth: false
    },
    {
      label: 'Similarity History',
      path: '/similarity-history',
      icon: '📊',
      requiresAuth: true
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
    private router: Router,
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
    
    // Listen for route changes to detect admin routes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const currentUrl = this.router.url;
      this.isAdminRoute = currentUrl.includes('/admin');
      this.updateMenuItems();
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
    
    if (this.isAdminRoute && isAdmin) {
      // When in admin routes, show only admin-specific items
      this.adminMenuItems = this.allMenuItems.filter(item => 
        item.requiresAdmin && item.path.includes('/admin/')
      );
      
      // For regular menu items, show non-admin items
      this.menuItems = this.allMenuItems.filter(item => 
        !item.requiresAdmin && 
        (!item.requiresAuth || isAuthenticated)
      );
    } else {
      // For non-admin routes, show regular navigation
      this.adminMenuItems = [];
      
      // Filter main menu items
      this.menuItems = this.allMenuItems.filter(item => {
        // Skip items that require authentication when user is not authenticated
        if (item.requiresAuth && !isAuthenticated) {
          return false;
        }
        
        // In non-admin routes, skip admin sub-pages but keep the main admin link
        if (item.requiresAdmin && item.path.includes('/admin/')) {
          return false;
        }
        
        return true;
      });
    }
  }
  
  toggleSidebar() {
    // Close the drawer
    this.isDrawerOpen = false;
    // Emit an event to notify the parent component that the drawer is closed
    this.sidebarToggled.emit(false);
  }
  
  /**
   * Navigate to a specific route and close the sidebar
   * This prevents the default navigation behavior which might cause
   * unwanted redirects through the default route
   */
  navigateTo(path: string): void {
    // Close the sidebar
    this.toggleSidebar();
    
    console.log('Attempting navigation to:', path);
    
    // Check if the path requires authentication
    const targetMenuItem = this.allMenuItems.find(item => item.path === path);
    if (targetMenuItem && targetMenuItem.requiresAuth && !this.authService.isAuthenticated()) {
      console.log('Navigation blocked: User not authenticated for protected route:', path);
      this.router.navigateByUrl('/auth/login');
      return;
    }
    
    // Special handling for check-proposal to preserve navigation state
    if (path === '/check-proposal') {
      // Get the current URL to use as the return URL
      const currentUrl = this.router.url;
      
      // Remove the leading slash if present
      const returnUrlParam = currentUrl.startsWith('/') ? currentUrl.substring(1) : currentUrl;
      
      console.log('Navigating to check-proposal from sidebar with returnUrl:', returnUrlParam);
      
      // Navigate to the check-proposal route with the returnUrl parameter
      this.router.navigate(['/check-proposal', returnUrlParam]);
    } else {
      // For other paths, navigate directly
      this.router.navigateByUrl(path).then(success => {
        console.log('Navigation to', path, 'successful:', success);
      }).catch(error => {
        console.error('Navigation to', path, 'failed:', error);
      });
    }
  }
}
