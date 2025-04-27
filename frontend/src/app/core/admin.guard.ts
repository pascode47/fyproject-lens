import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isAuthenticated() && this.authService.isAdmin()) {
      return true;
    }
    
    if (!this.authService.isAuthenticated()) {
      // Redirect to login page with return url if not authenticated
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    } else {
      // Redirect to home page if authenticated but not admin
      this.router.navigate(['/home']);
    }
    
    return false;
  }
}
