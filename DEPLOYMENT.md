# Kanvero free deployment

This deployment uses two non-trial free plans:

- Vercel Hobby for `frontend/` and `backend/` as separate projects
- Neon Free for PostgreSQL

Free plans have quotas and sleeping/pausing behavior. They are suitable for a portfolio or demonstration deployment, not guaranteed production uptime.

## 1. Put the project on GitHub

Push the repository to GitHub. Never commit `backend/.env`; it contains secrets. The committed `.env.example` files document the required variables without exposing credentials.

## 2. Create the Neon database

1. Create a Neon Free project at `https://console.neon.tech`.
2. In the project dashboard, click **Connect** and enable **Pooled connection**.
3. Copy the PostgreSQL connection string. Keep the generated `sslmode=require` parameter in the URL.
4. Keep this value private. It will be used as the backend Vercel project's `DATABASE_URL`.

The backend runs `npm run db:migrate` during each Vercel build, so an empty Neon database receives all Kanvero tables automatically.

## 3. Deploy the Express backend on Vercel

1. Import the GitHub repository in Vercel again as a new project.
2. Set **Root Directory** to `backend`.
3. Name the project `kanvero-api` and keep the detected framework as **Express**.
4. Add `DATABASE_URL` with the Neon pooled connection string for Production, Preview, and Development.
5. Add `DB_SSL=true` and `DB_POOL_MAX=5`.
6. Add `JWT_SECRET` with a long random value and `JWT_EXPIRES_IN=7d`.
7. Deploy and wait for the migration and deployment to complete.
8. Open `https://YOUR-BACKEND-DOMAIN/api/health`. It must return `{ "status": "ok" }`.

The Express application is deployed as a Vercel Function and scales down when it is idle.

## 4. Deploy the Next.js frontend on Vercel

1. Import the same GitHub repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Keep the detected framework as **Next.js**.
4. Add this environment variable for Production, Preview, and Development:

   ```text
   API_BASE_URL=https://YOUR-BACKEND-DOMAIN
   ```

5. Deploy.

The browser calls `/api/...` on the frontend Vercel domain. The Next.js rewrite proxies those requests to the backend Vercel project, so no browser CORS configuration is required.

## 5. Move existing local data (optional)

Migrations create an empty hosted database. To keep existing users, boards, and cards, use pgAdmin:

1. Back up the local `taskflow` database in **Custom** format.
2. Register the Neon pooled endpoint as another pgAdmin server using the host, database, user, and password from the Neon connection string. Enable SSL mode `Require`.
3. Restore the backup into the Neon database.
4. Do not restore PostgreSQL ownership/role commands if pgAdmin offers that option.

Run this health check after deployment:

```text
https://YOUR-BACKEND-DOMAIN/api/health
```

Then register or sign in through the Vercel URL and test board creation.
