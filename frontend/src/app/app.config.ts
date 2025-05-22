import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { 
  provideHttpClient, 
  withFetch, 
  withInterceptorsFromDi // Import withInterceptorsFromDi
} from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http'; // Import HTTP_INTERCEPTORS
import { AuthInterceptor } from './core/auth.interceptor'; // Import the interceptor class

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),
    
    // Provide the class-based interceptor using the traditional multi-provider
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    
    // Configure HttpClient to use fetch and to be aware of interceptors provided via DI
    provideHttpClient(withFetch(), withInterceptorsFromDi())
  ]
};
