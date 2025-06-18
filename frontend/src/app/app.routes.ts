import { Routes } from "@angular/router";
import { LoginComponent } from "./auth/login/login.component";
import { SignupComponent } from "./auth/signup/signup.component";
import { HomeComponent } from "./features/home/home.component";
import { ProjectListComponent } from "./features/browse-projects/project-list.component";
// import { ProjectUploadComponent } from "./features/upload-analysis/project-upload.component"; // Removed
import { SimilarityResultsComponent } from "./features/upload-analysis/similarity-results.component";
import { RecommendationsComponent } from "./components/recommendations/recommendations.component";
import { ProfileComponent } from "./features/profile/profile.component";
import { ProjectDetailComponent } from "./features/project-detail/project-detail.component";
import { SimilarityHistoryComponent } from "./features/similarity-history/similarity-history.component";
import { AuthGuard } from "./core/auth.guard";
import { AdminGuard } from "./core/admin.guard";

export const routes: Routes = [
  // Auth routes
  { path: 'auth/login', component: LoginComponent },
  { path: 'auth/signup', component: SignupComponent },
  
  // Feature routes
  { path: 'home', component: HomeComponent },
  { path: 'browse-projects', component: ProjectListComponent, canActivate: [AuthGuard] },
  // { path: 'upload-analysis', component: ProjectUploadComponent, canActivate: [AuthGuard] }, // This route is removed
  { 
    path: 'check-proposal', 
    loadComponent: () => import('./features/proposal-check/proposal-check.component').then(m => m.ProposalCheckComponent),
    canActivate: [AuthGuard] 
  },
  // Add a new route for check-proposal with a returnUrl parameter
  { 
    path: 'check-proposal/:returnUrl', 
    loadComponent: () => import('./features/proposal-check/proposal-check.component').then(m => m.ProposalCheckComponent),
    canActivate: [AuthGuard] 
  },
  { path: 'project/similarity/:id', component: SimilarityResultsComponent, canActivate: [AuthGuard] },
  { 
    path: 'projects/:id', 
    component: ProjectDetailComponent, 
    canActivate: [AuthGuard],
    // Add data property to indicate this is a detail page
    data: { title: 'Project Details' }
  },
  { path: 'popular-ideas', component: RecommendationsComponent },
  { path: 'similarity-history', component: SimilarityHistoryComponent, canActivate: [AuthGuard] },
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
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  
  // Catch-all route for handling direct URL access
  { path: '**', redirectTo: '/home' }
];
