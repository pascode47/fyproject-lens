import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/header/header.component';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { Subscription } from 'rxjs';

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
  private authSubscription: Subscription | undefined;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.isUserLoggedIn = this.authService.isAuthenticated();
    this.authSubscription = this.authService.authStateChanged.subscribe(() => {
      this.isUserLoggedIn = this.authService.isAuthenticated();
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  onSidebarToggle(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }
}
