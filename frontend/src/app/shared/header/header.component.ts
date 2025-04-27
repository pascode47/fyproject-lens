// header.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  isMobileMenuOpen = false;
  isUserMenuOpen = false;
  currentPageTitle = 'Dashboard';

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

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    if (this.isUserMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  getCurrentPageTitle(): string {
    return this.currentPageTitle;
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
}
