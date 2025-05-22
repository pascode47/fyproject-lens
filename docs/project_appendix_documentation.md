# Project Report Appendices

## Appendix B: Technology Stack Documentation

### Justification for using MEAN Stack

The MEAN (MongoDB, Express.js, Angular, Node.js) stack was chosen for this project due to several key advantages:

*   **Full-Stack JavaScript:** Using JavaScript across the entire stack (database, backend, frontend) simplifies development, allows for code reuse, and reduces the context switching required for developers.
*   **JSON Data Flow:** MongoDB's document-based nature aligns well with the JSON format used for data transfer between the Angular frontend and the Express/Node.js backend, creating a seamless data flow.
*   **Scalability:** Node.js's non-blocking I/O model makes it efficient for handling concurrent requests, and MongoDB's flexible schema is well-suited for evolving application requirements. Angular provides a robust framework for building scalable frontend applications.
*   **Large Community and Ecosystem:** The MEAN stack components are widely adopted, benefiting from extensive community support, readily available libraries (NPM for Node.js, Angular modules), and ample documentation.
*   **Rapid Development:** The combination of these technologies facilitates rapid prototyping and development cycles.

### Claude API Integration Notes

*   No specific code related to Claude or Anthropic API integration was found within the project's backend JavaScript files during the automated scan. *(Developer Note: Please add details here if integration exists elsewhere or provide specifics on how it's intended to be used).*

### Tools Used

The following external tools were utilized during the project lifecycle:

*   **Camscanner:** Used for digitizing physical documents or notes.
*   **Adobe Acrobat:** Used for creating, editing, and managing PDF documents, potentially for report generation or handling project documentation.
*   **Postman:** Used for API testing and development, allowing for sending requests to the backend endpoints and inspecting responses.

---

## Appendix C: Database Schema and Data Dictionary (MongoDB)

Schemas are defined using Mongoose. Timestamps (`createdAt`, `updatedAt`) are automatically added to all schemas.

### 1. Users (`User` model)

| Field           | Type            | Required | Constraints/Validation                     | Description                                      |
| :-------------- | :-------------- | :------- | :----------------------------------------- | :----------------------------------------------- |
| `name`          | String          | Yes      | Trimmed                                    | User's full name.                                |
| `email`         | String          | Yes      | Unique, Trimmed, Lowercase, Valid Email    | User's unique email address (used for login).    |
| `password`      | String          | Yes      | Minlength: 6, Not selected by default      | Hashed user password.                            |
| `role`          | String          | Yes      | Enum: ['user', 'admin'], Default: 'user' | User role (determines permissions).              |
| `programme`     | ObjectId (ref)  | Yes      | References 'Programme' collection          | The academic programme the user belongs to.      |
| `registrationNo`| String          | Yes      | Unique, Trimmed, Format: `TXX-XX-XXXXX`    | User's unique registration number.             |
| `status`        | String          | Yes      | Enum: ['active', 'suspended'], Default: 'active' | User account status.                           |
| `createdAt`     | Date            | Auto     |                                            | Timestamp of user creation.                      |
| `updatedAt`     | Date            | Auto     |                                            | Timestamp of last user update.                   |

### 2. Projects (`Project` model)

| Field            | Type            | Required | Constraints/Validation                     | Description                                      |
| :--------------- | :-------------- | :------- | :----------------------------------------- | :----------------------------------------------- |
| `title`          | String          | Yes      | Trimmed                                    | Title of the final year project.                 |
| `problemStatement`| String          | Yes      | Trimmed                                    | Description of the problem the project addresses.|
| `objectives`     | [String]        | No       | Default: []                                | List of project objectives.                      |
| `programme`      | String          | Yes      | Trimmed                                    | Academic programme associated with the project.  |
| `academicYear`   | String          | Yes      | Trimmed                                    | Academic year the project was submitted.         |
| `supervisor`     | String          | No       | Trimmed                                    | Name of the project supervisor.                  |
| `students`       | [String]        | No       | Default: []                                | List of student names involved in the project.   |
| `filePath`       | String          | Yes      |                                            | Path to the stored project document file.        |
| `uploadedBy`     | ObjectId (ref)  | Yes      | References 'User' collection               | User who uploaded the project.                   |
| `embeddings`     | [Number]        | No       | Default: []                                | Vector embeddings generated from the document.   |
| `createdAt`      | Date            | Auto     |                                            | Timestamp of project creation.                   |
| `updatedAt`      | Date            | Auto     |                                            | Timestamp of last project update.                |
* **Indexes:** Text index on `title`, `problemStatement`, `programme`, `objectives`.

### 3. Similarity Results (`SimilarityResult` model)

| Field                | Type            | Required | Constraints/Validation                     | Description                                         |
| :------------------- | :-------------- | :------- | :----------------------------------------- | :-------------------------------------------------- |
| `projectId`          | ObjectId (ref)  | Yes      | References 'Project' collection            | The original project being analyzed.                |
| `comparedProjectId`  | ObjectId (ref)  | Yes      | References 'Project' collection            | The project it's being compared against.            |
| `projectTitle`       | String          | Yes      | Trimmed                                    | Title of the compared project.                      |
| `similarityPercentage`| Number          | Yes      | Min: 0, Max: 100                           | Calculated similarity score between the two projects.|
| `year`               | String          | Yes      | Trimmed                                    | Academic year of the compared project.              |
| `department`         | String          | Yes      | Trimmed                                    | Department/Programme of the compared project.       |
| `similarSections`    | [String]        | No       | Default: []                                | Sections identified as similar (if applicable).     |
| `createdAt`          | Date            | Auto     |                                            | Timestamp of result creation.                       |
| `updatedAt`          | Date            | Auto     |                                            | Timestamp of last result update.                    |
* **Indexes:** Unique compound index on `projectId`, `comparedProjectId`. Index on `similarityPercentage` (descending).

### 4. Programmes (`Programme` model)

| Field        | Type   | Required | Constraints/Validation | Description                               |
| :----------- | :----- | :------- | :--------------------- | :---------------------------------------- |
| `abbreviation`| String | Yes      | Trimmed, Unique        | Short code for the programme (e.g., 'CS'). |
| `fullName`   | String | Yes      | Trimmed, Unique        | Full name of the academic programme.      |
| `discipline` | String | Yes      | Trimmed                | Broader discipline (e.g., 'Engineering'). |
| `createdAt`  | Date   | Auto     |                        | Timestamp of programme creation.          |
| `updatedAt`  | Date   | Auto     |                        | Timestamp of last programme update.       |

---

## Appendix E: API Documentation

*(Note: Base path is assumed to be `/api/v1`. Please verify in `server.js` or main application setup).*

### Authentication Flow

Authentication is handled using JSON Web Tokens (JWT).

1.  **Login:** A user submits their credentials (email/password) to the `POST /api/v1/auth/login` endpoint.
2.  **Token Issuance:** If credentials are valid, the server generates a JWT containing user information (like ID and role) and returns it to the client.
3.  **Token Storage:** The client (Angular frontend) stores this token securely (e.g., in localStorage or sessionStorage).
4.  **Authenticated Requests:** For subsequent requests to protected endpoints, the client includes the JWT in the `Authorization` header using the Bearer scheme: `Authorization: Bearer <token>`.
5.  **Server Verification:** The `auth.protect` middleware on the server intercepts requests to protected routes, verifies the JWT's validity and signature, and extracts user information, attaching it to the request object (e.g., `req.user`). If the token is invalid or missing, a 401 Unauthorized error is returned.
6.  **Authorization (Admin Routes):** For routes requiring specific roles (e.g., admin), the `auth.authorize('admin')` middleware checks if the authenticated user's role matches the required role. If not, a 403 Forbidden error is returned.

### Endpoint List

#### 1. Authentication (`/api/v1/auth`)

| Method | Path          | Protection | Description                     | Controller Method      |
| :----- | :------------ | :--------- | :------------------------------ | :--------------------- |
| POST   | `/signup`     | Public     | Register a new user.            | `authController.signup` |
| POST   | `/login`      | Public     | Log in a user, returns JWT.     | `authController.login`  |
| GET    | `/me`         | Protected  | Get current logged-in user info.| `authController.getMe`    |
| PATCH  | `/password`   | Protected  | Change logged-in user password. | `authController.changePassword` |

#### 2. Programmes (`/api/v1/programmes`)

| Method | Path   | Protection    | Description                     | Controller Method           |
| :----- | :----- | :------------ | :------------------------------ | :-------------------------- |
| GET    | `/`    | Public        | Get a list of all programmes.   | `programmeController.getProgrammes` |
| GET    | `/:id` | Public        | Get details of a single programme.| `programmeController.getProgramme`  |
| POST   | `/`    | Admin         | Create a new programme.         | `programmeController.createProgramme`|
| PUT    | `/:id` | Admin         | Update an existing programme.   | `programmeController.updateProgramme`|
| DELETE | `/:id` | Admin         | Delete a programme.             | `programmeController.deleteProgramme`|

#### 3. Projects (`/api/v1/projects`)

| Method | Path                 | Protection | Description                                       | Controller Method           |
| :----- | :------------------- | :--------- | :------------------------------------------------ | :-------------------------- |
| GET    | `/`                  | Public     | Get a list of projects (supports filtering/pagination). | `projectController.getProjects` |
| GET    | `/statistics`        | Public     | Get project statistics (e.g., count by year).     | `projectController.getStatistics` |
| GET    | `/activities`        | Public     | Get recent project upload activities.             | `projectController.getRecentActivities` |
| GET    | `/years`             | Public     | Get a list of distinct academic years with projects.| `projectController.getAcademicYears` |
| GET    | `/year/:year`        | Public     | Get projects for a specific academic year.        | `projectController.getProjectsByYear` |
| GET    | `/:id`               | Public     | Get details of a single project.                  | `projectController.getProject`  |
| GET    | `/:id/download`      | Public     | Download the report file for a specific project.  | `projectController.downloadProjectReport` |
| POST   | `/upload`            | Protected  | Upload a new project document (.docx).            | `projectController.uploadProject` |
| DELETE | `/:id`               | Admin      | Delete a project.                                 | `projectController.deleteProject` |
| POST   | `/bulk`              | Admin      | Bulk upload projects via CSV file.                | `projectController.bulkUpload` |

#### 4. Similarity Analysis (`/api/v1/similarity`)

| Method | Path             | Protection | Description                                  | Controller Method                |
| :----- | :--------------- | :--------- | :------------------------------------------- | :------------------------------- |
| GET    | `/:projectId`    | Protected  | Get similarity results for a project.        | `similarityController.getSimilarityResults` |
| POST   | `/analyze`       | Protected  | Trigger similarity analysis for a project.   | `similarityController.analyzeSimilarity` |
| GET    | `/recommend/:projectId` | Protected  | Get project recommendations based on similarity. | `similarityController.getRecommendations` |

#### 5. Users (`/api/v1/users`)

| Method | Path                   | Protection | Description                                  | Controller Method             |
| :----- | :--------------------- | :--------- | :------------------------------------------- | :---------------------------- |
| GET    | `/profile`             | Protected  | Get profile details of the logged-in user.   | `userController.getProfile`     |
| GET    | `/profile/history`     | Protected  | Get analysis history for the logged-in user. | `userController.getAnalysisHistory` |
| GET    | `/admin/users`         | Admin      | Get a list of all users (admin only).        | `userController.getUsers`       |
| GET    | `/admin/users/:id`     | Admin      | Get details of a specific user (admin only). | `userController.getUser`        |
| PATCH  | `/admin/users/:id/status` | Admin      | Update a user's status (admin only).       | `userController.updateUserStatus` |
| DELETE | `/admin/users/:id`     | Admin      | Delete a user (admin only).                  | `userController.deleteUser`     |
| GET    | `/admin/analytics`     | Admin      | Get application analytics data (admin only). | `userController.getAnalytics`   |

### Sample Requests and Responses

*(Developer Note: Add sample JSON request bodies and response examples for key endpoints like Login, Project Upload, Get Projects, Get Similarity Results etc. here)*

```json
// Example: POST /api/v1/auth/login Request Body
{
  "email": "student@example.com",
  "password": "password123"
}

// Example: POST /api/v1/auth/login Response Body (Success)
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "60b8d295f1d2a54b8c8e8f1a",
    "name": "Test Student",
    "email": "student@example.com",
    "role": "user"
  }
}

// Example: GET /api/v1/projects Response Body (Success - Paginated)
{
    "success": true,
    "count": 25,
    "pagination": {
        "next": {
            "page": 2,
            "limit": 10
        }
    },
    "data": [
        {
            "_id": "60c7a7f5b1d3b4a5c6d7e8f1",
            "title": "Project Alpha",
            "programme": "Computer Science",
            "academicYear": "2023-2024",
            "uploadedBy": "60b8d295f1d2a54b8c8e8f1a",
            "createdAt": "2023-06-14T10:00:00.000Z",
            // ... other fields
        },
        // ... more projects
    ]
}
