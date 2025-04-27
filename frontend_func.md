# FYProject Lens Frontend Functionality Summary

This document provides a comprehensive overview of the frontend components, functionalities, and APIs for the FYProject Lens application. This summary will help guide the backend implementation by clarifying how the frontend interacts with the backend services.

## Table of Contents

1. [Application Structure](#application-structure)
2. [Components Overview](#components-overview)
3. [Authentication Flow](#authentication-flow)
4. [Project Management](#project-management)
5. [Similarity Analysis](#similarity-analysis)
6. [Recommendations](#recommendations)
7. [Admin Features](#admin-features)
8. [API Endpoints Used](#api-endpoints-used)

## Application Structure

The FYProject Lens frontend is built using Angular, with the following main directories:

- **src/app/components**: Contains all the main feature components
- **src/app/shared**: Contains reusable components, directives, and pipes
- **src/app/models**: Contains TypeScript interfaces for data models
- **src/app/services**: Contains services for API communication
- **src/app/core**: Contains core functionality like authentication

## Components Overview

### Main Components

1. **HomeComponent** (`src/app/components/home/home.component.ts`)
   - Landing page with overview statistics and recent activities
   - Displays project count, similarity statistics, and recent uploads

2. **ProjectComponent** (`src/app/components/project/project.component.ts`)
   - Parent component for project-related features
   - Manages routing between project list, upload, and similarity results

3. **ProjectListComponent** (`src/app/components/project/project-list/project-list.component.ts`)
   - Displays a list of projects with filtering and pagination
   - Allows searching by title, department, and year

4. **ProjectUploadComponent** (`src/app/components/project/project-upload/project-upload.component.ts`)
   - Handles file upload for project documents
   - Displays extracted information and initiates similarity analysis

5. **SimilarityResultsComponent** (`src/app/components/project/similarity-results/similarity-results.component.ts`)
   - Displays similarity analysis results
   - Shows similar projects with similarity percentages and similar sections

6. **RecommendationsComponent** (`src/app/components/recommendations/recommendations.component.ts`)
   - Parent component for recommendation-related features
   - Manages routing to recommendation list

7. **RecommendationListComponent** (`src/app/components/recommendations/recommendation-list/recommendation-list.component.ts`)
   - Displays recommendations based on similarity analysis
   - Shows actionable suggestions to improve the project

### Shared Components

1. **HeaderComponent** (`src/app/shared/header/header.component.ts`)
   - Top navigation bar with user menu and authentication options
   - Displays user name and role

2. **SidebarComponent** (`src/app/shared/sidebar/sidebar.component.ts`)
   - Side navigation with links to main features
   - Shows different options based on user role

3. **FileUploadComponent** (`src/app/shared/file-upload/file-upload.component.ts`)
   - Reusable component for file uploads
   - Supports drag-and-drop and file selection

4. **ProjectCardComponent** (`src/app/shared/project-card/project-card.component.ts`)
   - Card display for project information
   - Shows title, department, year, and similarity percentage

## Authentication Flow

The frontend uses JWT (JSON Web Token) for authentication, managed by the `AuthService` (`src/app/core/auth.service.ts`):

1. **Login Process**:
   - User enters credentials on login form
   - Frontend sends credentials to `/api/auth/login` endpoint
   - On success, JWT token is stored in localStorage
   - User is redirected to home page

2. **Registration Process**:
   - User fills registration form with name, email, password, registration number, and programme
   - Frontend sends data to `/api/auth/signup` endpoint
   - On success, JWT token is stored and user is redirected to home page

3. **Authentication State**:
   - `AuthService` provides methods to check if user is logged in
   - Guards are used to protect routes based on authentication status
   - Token is sent with each API request in Authorization header

4. **Logout Process**:
   - Removes token from localStorage
   - Redirects to login page

## Project Management

Project management functionality is handled by the `ProjectService` (`src/app/services/project.service.ts`):

1. **Project Listing**:
   - Fetches projects with pagination and filtering
   - Supports filtering by department, year, and search term
   - Displays projects in a grid or list view

2. **Project Upload**:
   - Uses `FileUploadComponent` to handle file selection
   - Sends file to backend using FormData
   - Displays extracted information (title, problem statement, objectives)
   - Initiates similarity analysis after upload

3. **Project Details**:
   - Shows complete project information
   - Displays similarity results if available
   - Provides option to view recommendations

## Similarity Analysis

Similarity analysis is managed by the `SimilarityService` (`src/app/services/similarity.service.ts`):

1. **Analysis Process**:
   - Triggered after project upload
   - Sends request to analyze project similarity
   - Displays loading indicator during analysis

2. **Results Display**:
   - Shows list of similar projects sorted by similarity percentage
   - Highlights similar sections between projects
   - Provides option to view full details of similar projects

3. **Visualization**:
   - Uses charts to visualize similarity percentages
   - Color-codes similarity levels (high, medium, low)

## Recommendations

Recommendations functionality is handled by the `RecommendationService` (`src/app/services/recommendation.service.ts`):

1. **Recommendation Generation**:
   - Based on similarity analysis results
   - Fetched from backend after analysis completes

2. **Recommendation Display**:
   - Shows list of actionable recommendations
   - Categorizes recommendations by type (problem statement, objectives, methodology)
   - Allows user to mark recommendations as helpful

## Admin Features

Admin features are available only to users with the admin role:

1. **User Management**:
   - View list of all users
   - Suspend or activate user accounts
   - Delete user accounts

2. **Bulk Upload**:
   - Upload multiple projects via CSV file
   - View upload status and results

3. **Analytics Dashboard**:
   - View system statistics
   - Monitor usage patterns
   - Track similarity trends

## API Endpoints Used

The frontend interacts with the following API endpoints:

### Authentication

- `POST /api/auth/login`: Authenticate user
- `POST /api/auth/signup`: Register new user
- `GET /api/auth/me`: Get current user information
- `PATCH /api/auth/password`: Change password

### Programmes

- `GET /api/programmes`: Get all programmes
- `GET /api/programmes/:id`: Get programme by ID
- `POST /api/programmes`: Create new programme (admin only)
- `PUT /api/programmes/:id`: Update programme (admin only)
- `DELETE /api/programmes/:id`: Delete programme (admin only)

### Projects

- `GET /api/projects`: Get all projects with pagination and filtering
- `GET /api/projects/:id`: Get project by ID
- `POST /api/projects/upload`: Upload new project
- `GET /api/projects/statistics`: Get project statistics
- `GET /api/projects/activities`: Get recent activities
- `DELETE /api/projects/:id`: Delete project (admin only)
- `POST /api/projects/bulk`: Bulk upload projects via CSV (admin only)

### Similarity

- `GET /api/similarity/:projectId`: Get similarity results for a project
- `POST /api/similarity/analyze`: Analyze a project for similarities
- `GET /api/similarity/recommend/:projectId`: Get recommendations for a project

### User Management

- `GET /api/profile`: Get user profile
- `GET /api/profile/history`: Get user's analysis history
- `GET /api/admin/users`: Get all users (admin only)
- `GET /api/admin/users/:id`: Get user by ID (admin only)
- `PATCH /api/admin/users/:id/status`: Update user status (admin only)
- `DELETE /api/admin/users/:id`: Delete user (admin only)
- `GET /api/admin/analytics`: Get system analytics (admin only)

## Data Models

The frontend uses the following main data models:

### Project (`src/app/models/project.ts`)

```typescript
interface Project {
  _id: string;
  title: string;
  problemStatement: string;
  objectives: string[];
  department: string;
  year: string;
  uploadedBy: User | string;
  createdAt: Date;
  updatedAt: Date;
}
```

### SimilarityResult (`src/app/models/similarity-result.ts`)

```typescript
interface SimilarityResult {
  _id: string;
  projectId: string;
  comparedProjectId: string;
  projectTitle: string;
  similarityPercentage: number;
  year: string;
  department: string;
  similarSections: string[];
  createdAt: Date;
}
```

### User

```typescript
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  programme: Programme | string;
  registrationNo: string;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}
```

### Programme

```typescript
interface Programme {
  _id: string;
  abbreviation: string;
  fullName: string;
  discipline: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Conclusion

The FYProject Lens frontend provides a comprehensive interface for project similarity analysis and recommendations. The backend implementation should focus on providing the API endpoints described above, with appropriate authentication, data validation, and error handling to support the frontend functionality.

Key considerations for backend implementation:
1. Ensure JWT authentication is properly implemented
2. Implement role-based access control for admin features
3. Provide efficient file processing for DOCX and CSV uploads
4. Implement robust similarity analysis algorithm
5. Generate meaningful recommendations based on similarity results
6. Ensure proper error handling and validation
7. Optimize database queries for performance
