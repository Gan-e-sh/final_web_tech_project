<<<<<<< HEAD
# Campus Lost and Found Portal

A responsive full-stack campus portal built with HTML, CSS, JavaScript, Node.js, Express and MongoDB.

## Features
- Register, login and logout using JWT authentication
- Password hashing with bcrypt
- Create lost/found reports with optional image upload
- Search by keyword, category, location and listing type
- Sort reports by newest or oldest date (additional feature)
- Submit claims and review/approve/reject claims
- User dashboard and admin dashboard
- Ten sample listings
- Postman collection with more than eight API test cases

## Requirements
- Node.js 18+
- MongoDB Community Server running locally, or a MongoDB Atlas connection
- Postman (for API testing)

## Setup on Windows / VS Code

1. Open this project folder in VS Code.
2. Open the terminal and install packages:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env` and set your MongoDB connection string and a private JWT secret.
4. Start MongoDB locally, or use your MongoDB Atlas URI in `MONGO_URI`.
5. Insert the sample data and admin account:

   ```powershell
   npm run seed
   ```

6. Start the application:

   ```powershell
   npm run dev
   ```

7. Open `http://localhost:5000`.

## Default admin account
- Email: value of `ADMIN_EMAIL` in `.env` (default `admin@campus.edu`)
- Password: value of `ADMIN_PASSWORD` in `.env` (default `ChangeMe123!`)

Change the default password before using this outside a local demonstration. The starter app uses the admin credentials from environment variables only when creating the first admin account.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/items` | Search and list items |
| POST | `/api/items` | Create item (protected) |
| GET | `/api/items/mine` | My listings (protected) |
| PATCH | `/api/items/:id/status` | Update status (owner/admin) |
| DELETE | `/api/items/:id` | Delete listing (owner/admin) |
| GET | `/api/items/admin/all` | Admin listing view |
| POST | `/api/claims` | Submit claim (protected) |
| GET | `/api/claims/mine` | My claims (protected) |
| GET | `/api/claims/admin/all` | Admin claims view |
| PATCH | `/api/claims/:id` | Approve/reject (owner/admin) |

## Postman testing
Import `postman/Campus-Lost-Found.postman_collection.json`. Register/login to obtain a token, then paste it into the collection's `token` variable. Replace `itemId` with a real item ID returned by the API. Test successful and failure cases; capture screenshots for your report.

## Important project notes
- This is a coursework starter implementation. Test every route and add your own improvements before submission.
- For production deployment, configure HTTPS, strict CORS, secure token storage (prefer secure, HttpOnly cookies), rate limiting, stronger file validation, and managed database backups.
- The current frontend stores the JWT in localStorage for simplicity in a student demonstration. Discuss this security trade-off in your viva.
- Add your institution's prescribed report format, screenshots, deployment URL and AI-use disclosure before final submission.
=======
# final_web_tech_project
>>>>>>> b8dd42c4650b7d27d92abfa51c6f2db68563bb11
