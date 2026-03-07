# Trunal Backend

The robust API powering the Trunal Digital Agency platform. Built with Express, TypeScript, and Prisma.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js (v5)
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Real-time**: Socket.io
- **Validation**: Zod
- **Security**: JWT, Bcrypt

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL instance

### Setup

1. **Install dependencies**:

    ```bash
    npm install
    ```

2. **Configure environment**:
   Create a `.env` file based on the environment variables required:
    - `DATABASE_URL`: PostgreSQL connection string
    - `JWT_SECRET`: Secret for token signing
    - `FRONTEND_URL`: URL of the frontend application (for CORS)
    - `PORT`: Server port (default: 4001)

3. **Database Migration**:

    ```bash
    npx prisma migrate dev
    ```

4. **Run Development Server**:
    ```bash
    npm run dev
    ```

## Project Structure

- `src/app.ts`: Express application configuration and middleware.
- `src/server.ts`: Entry point for starting the server and Socket.io.
- `src/routes/`: API endpoint definitions (Auth, Projects, Members).
- `src/middleware/`: Custom middleware like authentication guards.
- `prisma/`: Database schema and migrations.

## API Endpoints

- `POST /api/auth/register`: User registration.
- `POST /api/auth/login`: User authentication.
- `GET /api/projects`: List projects for current user.
- `POST /api/projects`: Create a new project.
- `GET /api/projects/:projectId/members`: Manage project contributors.

## Deployment

The project is configured for deployment on Render via `render.yaml`. Use `npm run build` to generate the distribution files in the `dist` folder.
