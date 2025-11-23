# Student Authentication App

Folders:
- `client/frontend` - React frontend (Vite)
- `backend` - Node.js + Express + Mongoose backend

Prerequisites:
- Node.js (16+)
- MongoDB running locally at `mongodb://localhost:27017`. Your data appears in database `capstone` in the screenshots.

Backend setup:
1. Open a terminal in the `backend` folder.
2. Run `npm install` to install dependencies.
3. Ensure MongoDB is running. If your MongoDB database name or URL is different, create a `.env` file with `MONGO_URI="mongodb://localhost:27017/yourDbName"`.
4. Start the server: `npm run dev` (uses nodemon) or `npm start`.

API endpoints:
- POST /api/auth/login { email, password } => returns user object (without password) on success
- POST /api/auth/register { "roll no", name, email, password, ... } => creates user

Frontend setup:
1. Open a terminal in `client/frontend`.
2. Run `npm install`.
3. Start dev server: `npm run dev`.
4. Open browser at the Vite dev URL (usually http://localhost:5173) and go to `/login`.

Notes:
- The backend accepts existing plain-text passwords (from your DB) and will attempt to upgrade them to hashed form on first successful login.
- For quick testing, if you already have student documents in your `capstone.users` collection as shown in attachments, use their `email` and `password` fields to login.
