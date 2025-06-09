import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './shared/header/header.component';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'fyproject-lens';
  sidebarCollapsed = false;
  isUserLoggedIn = false;
  isDrawerOpen = false;
  private authSubscription: Subscription | undefined;
  
  @ViewChild(SidebarComponent) sidebar!: SidebarComponent;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.isUserLoggedIn = this.authService.isAuthenticated();
    this.authSubscription = this.authService.authStateChanged.subscribe(() => {
      this.isUserLoggedIn = this.authService.isAuthenticated();
    });
    
    // Listen for route changes to detect admin routes and project detail routes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const currentUrl = event.url;
      
      // Check if the current route is an admin route
      if (currentUrl.includes('/admin')) {
        // Open the drawer when navigating to admin routes
        this.isDrawerOpen = true;
      }
      
      // Log navigation to project detail pages for debugging
      if (currentUrl.includes('/projects/')) {
        console.log('Navigated to project detail page:', currentUrl);
        // Make sure the drawer is closed for project detail pages
        this.isDrawerOpen = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  onSidebarToggle(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
    // Update the drawer state when the sidebar emits an event
    this.isDrawerOpen = false;
    console.log('Drawer closed from sidebar');
  }
  
  toggleDrawer() {
    this.isDrawerOpen = !this.isDrawerOpen;
    console.log('Drawer toggled:', this.isDrawerOpen);
  }
}
