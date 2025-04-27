import { Routes } from "@angular/router";
import { LoginComponent } from "./auth/login/login.component";
import { SignupComponent } from "./auth/signup/signup.component";
import { HomeComponent } from "./features/home/home.component";
import { ProjectListComponent } from "./features/browse-projects/project-list.component";
import { ProjectUploadComponent } from "./features/upload-analysis/project-upload.component";
import { SimilarityResultsComponent } from "./features/upload-analysis/similarity-results.component";
import { RecommendationListComponent } from "./features/popular-ideas/recommendation-list.component";
import { ProfileComponent } from "./features/profile/profile.component";
import { AuthGuard } from "./core/auth.guard";
import { AdminGuard } from "./core/admin.guard";

export const routes: Routes = [
  // Auth routes
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/signup', component: SignupComponent },
  
  // Feature routes
  { path: 'home', component: HomeComponent },
  { path: 'browse-projects', component: ProjectListComponent, canActivate: [AuthGuard] },
  { path: 'upload-analysis', component: ProjectUploadComponent, canActivate: [AuthGuard] },
  { path: 'project/similarity/:id', component: SimilarityResultsComponent, canActivate: [AuthGuard] },
  { path: 'popular-ideas', component: RecommendationListComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  
  // Admin routes
  { 
    path: 'admin', 
    canActivate: [AdminGuard],
    children: [
      { path: 'manage-projects', loadComponent: () => import('./admin/manage-projects/manage-projects.component').then(m => m.ManageProjectsComponent) },
      { path: 'manage-users', loadComponent: () => import('./admin/manage-users/manage-users.component').then(m => m.ManageUsersComponent) },
      { path: 'analytics', loadComponent: () => import('./admin/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: '', redirectTo: 'analytics', pathMatch: 'full' }
    ]
  },
  
  // Default route
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];
