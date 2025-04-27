# FYProject Lens Backend Implementation Guide

This document provides comprehensive instructions for implementing the backend of the FYProject Lens application, based on the frontend requirements and architecture.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication System](#authentication-system)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
5. [File Processing](#file-processing)
6. [Similarity & Recommendations Engine](#similarity--recommendations-engine)
7. [Database Optimization](#database-optimization)
8. [Implementation Notes](#implementation-notes)

## Architecture Overview

The backend should be implemented using:
- Node.js with Express.js for the API server
- MongoDB for the database
- JWT for authentication
- OpenAI API for text analysis and recommendations

The backend will serve the following main functions:
- User authentication and authorization
- Project file processing and data extraction
- Similarity analysis between projects
- Recommendations generation
- Admin functionality for user and project management

## Authentication System

### User Roles

- **Admin**: Can manage users, upload completed projects (CSV bulk upload), view system analytics
- **User (Student)**: Can upload proposals, view similarity results, get recommendations, manage profile

### Implementation

- Use JWT (JSON Web Tokens) for role-based access control
- Store hashed passwords using bcrypt
- Implement token refresh mechanism for extended sessions
- Use middleware to protect routes based on user roles

### Auth Flow

1. User registers or logs in
2. Backend validates credentials and issues JWT
3. Frontend stores JWT in localStorage
4. JWT is sent with subsequent requests in Authorization header
5. Backend middleware validates JWT and checks user role for protected routes

## Data Models

### User

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String, // Hashed
  role: String, // "user" or "admin"
  programme: String, // Reference to Programme collection
  registrationNo: String, // Format: TXX-XX-XXXXX
  status: String, // "active" or "suspended"
  createdAt: Date,
  updatedAt: Date
}
```

### Project

```javascript
{
  _id: ObjectId,
  title: String,
  problemStatement: String,
  objectives: [String], // Array of objectives
  department: String,
  year: String,
  filePath: String, // Path to stored file
  uploadedBy: ObjectId, // Reference to User
  embeddings: [Number], // Vector embeddings for similarity search
  createdAt: Date,
  updatedAt: Date
}
```

### Analysis

```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to User
  projectId: ObjectId, // Reference to Project
  similarityPercentage: Number,
  recommendations: [String], // Array of recommendation texts
  timestamp: Date
}
```

### SimilarityResult

```javascript
{
  _id: ObjectId,
  projectId: ObjectId, // Reference to original Project
  comparedProjectId: ObjectId, // Reference to compared Project
  projectTitle: String, // Denormalized for quick access
  similarityPercentage: Number,
  year: String, // Denormalized for quick access
  department: String, // Denormalized for quick access
  similarSections: [String], // Array of similar sections
  createdAt: Date
}
```

### Programme

```javascript
{
  _id: ObjectId,
  abbreviation: String, // e.g., "BSc CS"
  fullName: String, // e.g., "Bachelor of Science in Computer Science"
  discipline: String, // e.g., "Computer Science"
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Authentication

- `POST /api/auth/login`: Authenticate user and return JWT
  - Request: `{ email, password }`
  - Response: `{ token, user }`

- `POST /api/auth/signup`: Register new user
  - Request: `{ name, email, password, registrationNo, programme }`
  - Response: `{ token, user }`

### Projects

- `GET /api/projects`: Get all projects (with pagination and filtering)
  - Query params: `page`, `limit`, `department`, `year`, `search`
  - Response: `{ projects: [], total, page, limit }`

- `GET /api/projects/:id`: Get project by ID
  - Response: `{ project }`

- `POST /api/projects/upload`: Upload new project (for users)
  - Request: FormData with project file
  - Response: `{ success, projectId, extractedInfo, similarityResults }`

- `GET /api/projects/recommend`: Get project recommendations
  - Query params: `projectId`
  - Response: `{ recommendations: [] }`

### Similarity

- `GET /api/similarity/:projectId`: Get similarity results for a project
  - Response: `{ projectTitle, results: [] }`

- `POST /api/similarity/analyze`: Analyze a project for similarities
  - Request: `{ projectId }`
  - Response: `{ success, message }`

### User Profile

- `GET /api/profile/history`: Get user's analysis history
  - Query params: `startDate`, `endDate`
  - Response: `{ analyses: [] }`

- `PATCH /api/profile/password`: Change user password
  - Request: `{ currentPassword, newPassword }`
  - Response: `{ success, message }`

### Admin

- `GET /api/admin/users`: Get all users (with filtering)
  - Query params: `status`, `role`, `search`
  - Response: `{ users: [] }`

- `PATCH /api/admin/users/:userId/suspend`: Suspend a user
  - Response: `{ success, message }`

- `DELETE /api/admin/users/:userId`: Delete a user
  - Response: `{ success, message }`

- `POST /api/admin/projects`: Bulk upload projects via CSV
  - Request: FormData with CSV file
  - Response: `{ success, message, count }`

- `GET /api/admin/analytics`: Get system metrics and analytics
  - Response: `{ userStats, projectStats, analysisStats }`

## File Processing

### DOCX File Processing

For project uploads, the backend needs to extract key information:

1. **Extract Text**: Use libraries like mammoth.js to extract text from DOCX files

2. **Extract Key Sections**:
   - **Option 1 (AI-Powered)**: Use OpenAI API to parse unstructured text
     ```
     Prompt: "Extract the project title, problem statement, and objectives from this text: [TEXT]. 
     Return as JSON: {title: '', problemStatement: '', objectives: []}."
     ```
   - **Option 2 (Rule-Based)**: Use regex or keyword matching for structured documents

3. **Generate Embeddings**: Create vector embeddings of the extracted text using OpenAI's embedding API for similarity comparison

4. **Store Results**: Save the extracted information and file path in the database

### CSV Processing for Bulk Upload

For admin bulk uploads:

1. Parse CSV file with headers matching project fields
2. Validate each row for required fields
3. Process each project entry (extract data, generate embeddings)
4. Return count of successfully processed projects

## Similarity & Recommendations Engine

### Similarity Analysis Workflow

1. **Embedding Generation**:
   - Generate embeddings for the uploaded project using OpenAI's embedding API
   - Store embeddings in the database for future comparisons

2. **Similarity Calculation**:
   - Compare embeddings with existing projects using cosine similarity
   - Identify similar sections based on section-level embeddings
   - Calculate overall similarity percentage

3. **Results Storage**:
   - Store similarity results in the database
   - Create an analysis record for the user's history

### Recommendation Engine

1. **Input**: User's extracted project data and similarity results

2. **Processing**:
   - Identify top similar projects
   - Analyze gaps and potential improvements
   - Use OpenAI to generate specific recommendations

3. **Output**: List of actionable recommendations

4. **Implementation Options**:
   - **OpenAI Approach**: Use GPT to generate recommendations based on similarity results
     ```
     Prompt: "Based on the similarity analysis between the user's project and similar projects, 
     generate 3-5 specific recommendations to improve the project. 
     User project: [PROJECT_DATA]. 
     Similar projects: [SIMILAR_PROJECTS_DATA]."
     ```
   - **Rule-Based Approach**: Generate recommendations based on predefined rules and similarity thresholds

## Database Optimization

### Indexing Strategy

Create indexes for frequently queried fields:

```javascript
// User collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ registrationNo: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });

// Project collection
db.projects.createIndex({ title: 1 });
db.projects.createIndex({ department: 1, year: 1 });
db.projects.createIndex({ uploadedBy: 1 });

// Analysis collection
db.analyses.createIndex({ userId: 1 });
db.analyses.createIndex({ projectId: 1 });
db.analyses.createIndex({ timestamp: 1 });

// SimilarityResult collection
db.similarityResults.createIndex({ projectId: 1 });
db.similarityResults.createIndex({ similarityPercentage: -1 });
```

### Vector Search for Similarity

For MongoDB 7.0+, use vector search for efficient similarity comparisons:

```javascript
// Create vector index
db.projects.createIndex(
  { embeddings: "vector" },
  {
    name: "embeddings_index",
    vectorOptions: {
      dimensions: 1536, // OpenAI embedding dimensions
      similarity: "cosine"
    }
  }
);

// Query using vector search
db.projects.aggregate([
  {
    $vectorSearch: {
      queryVector: embeddings, // User's project embeddings
      path: "embeddings",
      limit: 5,
      index: "embeddings_index"
    }
  }
]);
```

### Caching Strategy

Implement caching for frequently accessed data:

1. Use Redis to cache:
   - Authentication tokens
   - Popular project listings
   - Similarity results for recent analyses

2. Set appropriate TTL (Time-To-Live) values:
   - Short TTL for dynamic data (e.g., 5 minutes for project listings)
   - Longer TTL for stable data (e.g., 1 hour for similarity results)

## Implementation Notes

### Technology Stack

- **Backend Framework**: Node.js + Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JWT + bcrypt
- **File Processing**: mammoth.js (DOCX), csv-parser (CSV)
- **AI Integration**: OpenAI API (GPT-4 + embeddings)
- **Caching**: Redis (optional)

### Development Approach

1. **Phase 1**: Core Authentication and User Management
   - Implement user registration and login
   - Set up JWT authentication
   - Create user management endpoints

2. **Phase 2**: Project Management and File Processing
   - Implement file upload and processing
   - Extract project information
   - Store projects in the database

3. **Phase 3**: Similarity Analysis and Recommendations
   - Implement embedding generation
   - Create similarity comparison logic
   - Develop recommendation engine

4. **Phase 4**: Admin Features and Analytics
   - Implement bulk upload functionality
   - Create analytics endpoints
   - Add user management features

### Performance Considerations

1. **Asynchronous Processing**:
   - Use job queues (like Bull) for long-running tasks
   - Process file uploads and similarity analyses asynchronously
   - Notify users when processing is complete

2. **Batch Processing**:
   - Process bulk uploads in batches
   - Limit concurrent API calls to OpenAI

3. **Error Handling**:
   - Implement comprehensive error handling
   - Use try-catch blocks for async operations
   - Return meaningful error messages to the frontend

4. **Logging**:
   - Implement structured logging
   - Log all API requests and responses
   - Monitor performance metrics

### Security Considerations

1. **Input Validation**:
   - Validate all user inputs
   - Sanitize file contents
   - Use middleware for request validation

2. **Rate Limiting**:
   - Implement rate limiting for authentication endpoints
   - Limit file upload size and frequency

3. **Environment Variables**:
   - Store sensitive information in environment variables
   - Use .env files for local development
   - Secure API keys and database credentials

4. **CORS Configuration**:
   - Configure CORS to allow only the frontend domain
   - Implement proper headers for security

This document provides a comprehensive guide for implementing the backend of the FYProject Lens application. Follow these instructions to create a robust, scalable, and secure backend that meets all the requirements of the frontend.
