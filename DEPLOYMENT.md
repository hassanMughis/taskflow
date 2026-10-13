# Kanvero free deployment

This deployment uses three non-trial free plans:

- Vercel Hobby for `frontend/`
- Render Free Web Service for `backend/`
- Neon Free for PostgreSQL

Free plans have quotas and sleeping/pausing behavior. They are suitable for a portfolio or demonstration deployment, not guaranteed production uptime.

## 1. Put the project on GitHub

Push the repository to GitHub. Never commit `backend/.env`; it contains secrets. The committed `.env.example` files document the required variables without exposing credentials.

## 2. Create the Neon database

1. Create a Neon Free project at `https://console.neon.tech`.
2. In the project dashboard, click **Connect** and enable **Pooled connection**.
3. Copy the PostgreSQL connection string. Keep the generated `sslmode=require` parameter in the URL.
4. Keep this value private. It will be used as Render's `DATABASE_URL`.

The backend runs `npm run db:migrate` whenever its Render service starts, so an empty Neon database receives all Kanvero tables automatically.

## 3. Deploy the Express backend on Render

1. In Render, choose **New > Blueprint**.
2. Connect the GitHub repository.
3. Render detects the root `render.yaml` file and creates `kanvero-api`.
4. When asked for `DATABASE_URL`, paste the Neon pooled connection string.
5. Deploy and wait for the health check to pass.
6. Open `https://YOUR-RENDER-DOMAIN/api/health`. It must return `{ "status": "ok" }`.

The free Render service sleeps after inactivity. Its first request after sleeping can be slow.

## 4. Deploy the Next.js frontend on Vercel

1. Import the same GitHub repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Keep the detected framework as **Next.js**.
4. Add this environment variable for Production, Preview, and Development:

   ```text
   API_BASE_URL=https://YOUR-RENDER-DOMAIN
   ```

5. Deploy.

The browser calls `/api/...` on the Vercel domain. The Next.js rewrite proxies those requests to Render, so no browser CORS configuration is required.

## 5. Move existing local data (optional)

Migrations create an empty hosted database. To keep existing users, boards, and cards, use pgAdmin:

1. Back up the local `taskflow` database in **Custom** format.
2. Register the Neon pooled endpoint as another pgAdmin server using the host, database, user, and password from the Neon connection string. Enable SSL mode `Require`.
3. Restore the backup into the Neon database.
4. Do not restore PostgreSQL ownership/role commands if pgAdmin offers that option.

Run this health check after deployment:

```text
https://YOUR-RENDER-DOMAIN/api/health
```

Then register or sign in through the Vercel URL and test board creation.
