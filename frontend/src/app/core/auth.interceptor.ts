import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service'; // Assuming AuthService is in the same core folder
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authToken = this.authService.getToken(); // Assuming AuthService has a getToken() method

    let authReq = req;
    if (authToken) {
      // Clone the request and add the authorization header
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`
        }
      });
    }

    // Pass on the cloned request instead of the original request
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Handle unauthorized errors, e.g., redirect to login
          console.error('Unauthorized request, redirecting to login.');
          this.authService.logout(); // Assuming AuthService has a logout method
          this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url }});
        }
        return throwError(() => error);
      })
    );
  }
}
