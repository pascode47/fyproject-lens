// header.component.ts
import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatInputModule,
    MatFormFieldModule,
    MatBadgeModule,
    MatDividerModule,
    MatTabsModule,
    FormsModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  @Input() isDrawerOpen = false;
  isUserMenuOpen = false;
  currentPageTitle = 'Dashboard';
  activeTabIndex = 0;
  searchQuery: string = '';
  
  // Primary navigation items for tabs
  primaryNavItems = [
    { 
      label: 'Home', 
      path: '/home', 
      icon: 'home'
    },
    { 
      label: 'Browse Projects', 
      path: '/browse-projects', 
      icon: 'library_books'
    },
    { 
      label: 'Popular Ideas', 
      path: '/popular-ideas', 
      icon: 'lightbulb'
    }
  ];
  
  // Add admin tab if user is admin
  get visibleNavItems() {
    const items = [...this.primaryNavItems];
    
    // Add Admin tab for admin users
    if (this.authService.isAdmin()) {
      items.push({
        label: 'Admin',
        path: '/admin',
        icon: 'admin_panel_settings'
      });
    }
    
    return items;
  }
  
  @Output() toggleDrawer = new EventEmitter<void>();

  allMenuItems = [
    { 
      label: 'Home', 
      path: '/home', 
      icon: '🏠',
      requiresAuth: false
    },
    { 
      label: 'Upload Project', 
      path: '/upload-analysis', 
      icon: '📄',
      requiresAuth: false
    },
    { 
      label: 'Browse Projects', 
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
    { 
      label: 'Admin', 
      path: '/admin', 
      icon: '⚙️',
      requiresAuth: true,
      requiresAdmin: true
    }
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

  constructor(private router: Router, public authService: AuthService) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updatePageTitle();
      this.updateActiveTab();
    });
  }
  
  getUserName(): string {
    const user = this.authService.getCurrentUser();
    return user ? user.name || 'User' : 'User';
  }
  
  getUserEmail(): string {
    const user = this.authService.getCurrentUser();
    return user ? user.email || 'user@example.com' : 'user@example.com';
  }
  
  ngOnInit() {
    this.updateMenuItems();
  }
  
  updateMenuItems() {
    const isAuthenticated = this.authService.isAuthenticated();
    const isAdmin = this.authService.isAdmin();
    
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
  
  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
  
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/browse-projects'], { 
        queryParams: { search: this.searchQuery.trim() } 
      });
      this.searchQuery = ''; // Clear the search input after searching
    }
  }

  toggleMobileMenu() {
    // Emit an event to toggle the drawer
    this.toggleDrawer.emit();
    
    // The isDrawerOpen property will be updated by the parent component
    if (this.isDrawerOpen) {
      this.isUserMenuOpen = false;
    }
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    if (this.isUserMenuOpen) {
      // Close the drawer if the user menu is opened
      if (this.isDrawerOpen) {
        this.toggleDrawer.emit();
      }
    }
  }

  getCurrentPageTitle(): string {
    return this.currentPageTitle;
  }
  
  // Navigate when tab is clicked
  onTabClick(index: number) {
    const navItem = this.visibleNavItems[index];
    this.router.navigate([navItem.path]);
    
    // If clicking on the Admin tab, also toggle the drawer
    if (navItem.path === '/admin') {
      this.toggleDrawer.emit();
    }
  }
  
  // Navigate to check proposal page with returnUrl parameter
  navigateToCheckProposal() {
    // Get the current URL to use as the return URL
    const currentUrl = this.router.url;
    
    // Remove the leading slash if present
    const returnUrlParam = currentUrl.startsWith('/') ? currentUrl.substring(1) : currentUrl;
    
    console.log('Navigating to check-proposal with returnUrl:', returnUrlParam);
    
    // Navigate to the check-proposal route with the returnUrl parameter
    this.router.navigate(['/check-proposal', returnUrlParam]);
  }
  
  // Update active tab based on current route
  updateActiveTab() {
    const currentUrl = this.router.url;
    
    // Check if we're in an admin route
    if (currentUrl.includes('/admin')) {
      // Find the admin tab index
      const adminIndex = this.visibleNavItems.findIndex(item => item.path === '/admin');
      if (adminIndex >= 0) {
        this.activeTabIndex = adminIndex;
        return;
      }
    }
    
    // Special case for project detail pages - highlight the Browse Projects tab
    if (currentUrl.includes('/projects/')) {
      const browseProjectsIndex = this.visibleNavItems.findIndex(item => item.path === '/browse-projects');
      if (browseProjectsIndex >= 0) {
        this.activeTabIndex = browseProjectsIndex;
        return;
      }
    }
    
    // For other routes, find the matching tab
    const index = this.visibleNavItems.findIndex(item => 
      currentUrl.includes(item.path) || 
      (item.path === '/home' && currentUrl === '/')
    );
    
    // Only update the active tab if a match is found; otherwise, keep the current tab or set to a neutral state
    if (index >= 0) {
      this.activeTabIndex = index;
    }
    // If no match is found, do not default to 0 (Home), keep the current active tab
  }

  private updatePageTitle() {
    const currentUrl = this.router.url;
    
    if (currentUrl.includes('/home')) {
      this.currentPageTitle = 'Dashboard';
    } else if (currentUrl.includes('/upload-analysis')) {
      this.currentPageTitle = 'Upload Project';
    } else if (currentUrl.includes('/browse-projects')) {
      this.currentPageTitle = 'Browse Projects';
    } else if (currentUrl.includes('/popular-ideas')) {
      this.currentPageTitle = 'Popular Ideas';
    } else if (currentUrl.includes('/project/similarity')) {
      this.currentPageTitle = 'Similarity Results';
    } else if (currentUrl.includes('/projects/')) {
      this.currentPageTitle = 'Project Details';
    } else if (currentUrl.includes('/profile')) {
      this.currentPageTitle = 'Profile';
    } else if (currentUrl.includes('/auth/login')) {
      this.currentPageTitle = 'Login';
    } else if (currentUrl.includes('/auth/signup')) {
      this.currentPageTitle = 'Sign Up';
    } else if (currentUrl.includes('/admin')) {
      this.currentPageTitle = 'Admin Dashboard';
    } else {
      this.currentPageTitle = 'FYProject Lens';
    }
  }
  
  // Helper method to check if current page is a project detail page
  isProjectDetailPage(): boolean {
    return this.router.url.includes('/projects/');
  }
  
  // Helper method to handle mobile menu item click
  handleMobileMenuItemClick(path: string): void {
    if (path === '/check-proposal') {
      this.navigateToCheckProposal();
    }
    this.toggleMobileMenu();
  }
}
