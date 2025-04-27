# FYProject Lens Backend

Backend implementation for the FYProject Lens application, a system for analyzing similarity between final year projects and providing recommendations.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)

## Features

- User authentication and authorization with JWT
- Project file upload and processing (DOCX)
- Similarity analysis between projects using vector embeddings
- Recommendations generation using OpenAI
- Admin features for user management and bulk project uploads
- Comprehensive API for frontend integration

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Multer** - File uploads
- **Mammoth** - DOCX processing
- **OpenAI API** - Text analysis and embeddings
- **bcryptjs** - Password hashing

## Project Structure

```
├── config/             # Configuration files
├── controllers/        # Request handlers
├── middleware/         # Custom middleware
├── models/             # Database models
├── routes/             # API routes
├── services/           # Business logic
├── uploads/            # Uploaded files
├── utils/              # Utility functions
├── .env                # Environment variables
├── package.json        # Dependencies
└── server.js           # Entry point
```

## Setup Instructions

1. **Clone the repository**

```bash
git clone <repository-url>
cd fyproject-lens
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/fyproject-lens
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d
OPENAI_API_KEY=your_openai_api_key_here
```

4. **Start MongoDB**

Make sure MongoDB is running on your system.

5. **Create an admin user**

```bash
# Create the default admin user
npm run create-admin
```

This will create an admin user with the following credentials:
- Email: admin@fyprojectlens.com
- Password: Godslove2755
- Name: Paschal admin
- Registration Number: TAD-00-00000

6. **Start the server**

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Documentation

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/password` - Change password

### Programmes

- `GET /api/programmes` - Get all programmes
- `GET /api/programmes/:id` - Get programme by ID
- `POST /api/programmes` - Create new programme (admin only)
- `PUT /api/programmes/:id` - Update programme (admin only)
- `DELETE /api/programmes/:id` - Delete programme (admin only)

### Projects

- `GET /api/projects` - Get all projects with pagination and filtering
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects/upload` - Upload new project
- `GET /api/projects/statistics` - Get project statistics
- `GET /api/projects/activities` - Get recent activities
- `DELETE /api/projects/:id` - Delete project (admin only)
- `POST /api/projects/bulk` - Bulk upload projects via CSV (admin only)

### Similarity

- `GET /api/similarity/:projectId` - Get similarity results for a project
- `POST /api/similarity/analyze` - Analyze a project for similarities
- `GET /api/similarity/recommend/:projectId` - Get recommendations for a project

### User Management

- `GET /api/profile` - Get user profile
- `GET /api/profile/history` - Get user's analysis history
- `GET /api/admin/users` - Get all users (admin only)
- `GET /api/admin/users/:id` - Get user by ID (admin only)
- `PATCH /api/admin/users/:id/status` - Update user status (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)
- `GET /api/admin/analytics` - Get system analytics (admin only)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Port for the server | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/fyproject-lens |
| NODE_ENV | Environment (development/production) | development |
| JWT_SECRET | Secret key for JWT | - |
| JWT_EXPIRE | JWT expiration time | 30d |
| OPENAI_API_KEY | OpenAI API key for embeddings and recommendations | - |

## License

[MIT](LICENSE)
