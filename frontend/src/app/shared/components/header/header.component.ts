// header.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isMobileMenuOpen = false;
  isUserMenuOpen = false;
  currentPageTitle = 'Dashboard';

  menuItems = [
    { 
      label: 'Home', 
      path: '/home', 
      icon: '🏠'
    },
    { 
      label: 'Upload Project', 
      path: '/project/upload', 
      icon: '📄'
    },
    { 
      label: 'Browse Projects', 
      path: '/project/list', 
      icon: '📚'
    },
    { 
      label: 'Recommendations', 
      path: '/recommendations', 
      icon: '💡'
    }
  ];

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updatePageTitle();
    });
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
    } else if (currentUrl.includes('/project/upload')) {
      this.currentPageTitle = 'Upload Project';
    } else if (currentUrl.includes('/project/list')) {
      this.currentPageTitle = 'Browse Projects';
    } else if (currentUrl.includes('/recommendations')) {
      this.currentPageTitle = 'Recommendations';
    } else if (currentUrl.includes('/project/similarity')) {
      this.currentPageTitle = 'Similarity Results';
    } else {
      this.currentPageTitle = 'FYProject Lens';
    }
  }
}
