# Deployment Guide (Free Tier)

Deploy the **backend** on **Render** (free tier), **database** on **Neon** (free), and **frontend** on **Vercel** (free). All three have free tiers suitable for side projects and demos.

---

## Step-by-step (follow in order)

Do these in order. Have your **axum-chat-service** repo pushed to **GitHub** before starting.

---

### Step 1: Create the database (Neon)

1. Open **https://neon.tech** and sign up / log in.
2. Click **New Project**.
3. Pick a name (e.g. `axum-chat`), region, and click **Create Project**.
4. On the project page, find **Connection string** and choose **URI**.
5. Copy the full string (it looks like `postgres://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
6. **Save it somewhere** — you’ll paste it into Render in Step 2 as `DATABASE_URL`.

---

### Step 2: Deploy the backend (Render)

1. Open **https://dashboard.render.com** and sign up / log in.
2. Click **New +** → **Web Service**.
3. Connect **GitHub** if you haven’t, then select the **axum-chat-service** repository and click **Connect**.
4. Fill in:
   - **Name:** `axum-chat-service` (or any name; this becomes part of your URL).
   - **Region:** choose one (e.g. Oregon).
   - **Branch:** `main` (or your default branch).
   - **Runtime:** **Docker** (important — Render will use your `Dockerfile`).
   - **Instance type:** **Free**.
5. Scroll to **Environment Variables** → **Add Environment Variable**.
   - Add:
     - **Key:** `DATABASE_URL`  
       **Value:** paste the Neon connection string from Step 1.
     - **Key:** `JWT_SECRET`  
       **Value:** a long random string (e.g. 32+ characters; you can use a password generator).
6. Click **Create Web Service**. Render will build from the Dockerfile and deploy (can take a few minutes).
7. When it’s **Live**, copy your service URL from the top (e.g. `https://axum-chat-service.onrender.com`).  
   **Save this URL** — you’ll use it for the frontend and for CORS.
8. Check the backend: open **`https://<your-service-url>/api/health`** in a browser. You should see **ok**.

---

### Step 3: Deploy the frontend (Vercel)

1. Open **https://vercel.com** and sign up / log in (e.g. with GitHub).
2. Click **Add New…** → **Project**.
3. Import the **axum-chat-service** repo (if needed, connect GitHub first).
4. **Before** clicking Deploy, set:
   - **Root Directory:** click **Edit**, set to **`web`**, confirm.
   - **Environment Variables:** add two variables (use the **same** Render URL from Step 2, no trailing slash):
     - **Name:** `VITE_API_BASE`  
       **Value:** `https://<your-render-url>.onrender.com`  
       (e.g. `https://axum-chat-service.onrender.com`)
     - **Name:** `VITE_WS_BASE`  
       **Value:** `wss://<your-render-url>.onrender.com`  
       (e.g. `wss://axum-chat-service.onrender.com`)
5. Click **Deploy**. Wait for the build to finish.
6. When it’s done, Vercel shows the live URL (e.g. `https://axum-chat-service-xxx.vercel.app`).  
   **Copy this URL** — you need it for Step 4.

---

### Step 4: Allow the frontend in the backend (CORS)

1. Go back to **Render** → your **axum-chat-service** web service.
2. Open **Environment** (left sidebar).
3. Click **Add Environment Variable**:
   - **Key:** `ALLOWED_ORIGINS`
   - **Value:** the **exact** Vercel URL from Step 3 (e.g. `https://axum-chat-service-xxx.vercel.app`).  
     No trailing slash. If you have multiple URLs (e.g. preview deployments), add them comma-separated.
4. Click **Save Changes**. Render will redeploy automatically (wait until it’s Live again).

---

### Step 5: Test the app

1. Open your **Vercel URL** (the frontend) in a browser.
2. **Register** with a username and password.
3. **Create a channel** (e.g. type “general” and click Create).
4. **Send a message** in the channel.
5. If you see your message and the status shows **Connected**, deployment is working.

**Note:** On the free tier, Render spins down the backend after ~15 minutes of no traffic. The first time you open the app after that, it may take 30–60 seconds to respond while the service wakes up.

---

## Free tier notes

- **Render**: Free web services get **750 instance hours/month**. The service **spins down after ~15 minutes of no traffic**; the first request after that may take 30–60 seconds to wake up. WebSockets work; connections drop when the service spins down.
- **Neon**: Free Postgres (e.g. 0.5 GB storage, compute scales to zero when idle).
- **Vercel**: Free tier for static/React apps; no spin-down for the frontend itself.

If you need always-on backend with no spin-down, you’d need a paid plan (e.g. Render paid, or another host).

---

## Prerequisites

- A [Render](https://render.com) account
- A [Neon](https://neon.tech) account (free Postgres)
- A [Vercel](https://vercel.com) account
- Your code pushed to GitHub (or GitLab/Bitbucket) so Render and Vercel can deploy from the repo

---

## 1. Database (Neon, free)

1. Go to [neon.tech](https://neon.tech) and create a project.
2. In the Neon dashboard, open the connection string (e.g. **Connection string** → **URI**). It looks like:
   ```text
   postgres://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
3. Copy it; you’ll use it as `DATABASE_URL` for the backend.

---

## 2. Backend on Render (free tier)

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect your GitHub (or Git) account and select the **axum-chat-service** repo.
3. Configure the service:
   - **Name**: e.g. `axum-chat-service`
   - **Region**: choose one close to you
   - **Branch**: `main` (or your default)
   - **Runtime**: **Docker** (Render will use the repo’s `Dockerfile`).
   - **Instance type**: **Free** (to stay on the free tier).
4. **Environment variables** (Add in the Render dashboard; **do not** commit secrets):
   - `DATABASE_URL` = (paste the Neon connection string)
   - `JWT_SECRET` = a long random string (e.g. 32+ chars from a password generator)
   - **Optional:** `ALLOWED_ORIGINS` = your Vercel frontend URL, e.g. `https://your-app.vercel.app`  
     (Add this after you deploy the frontend; use a comma-separated list if you have multiple.)
5. Click **Create Web Service**. Render will build the Docker image and deploy.  
   Your backend URL will be like: `https://axum-chat-service.onrender.com`.
6. Confirm it’s up: open `https://<your-service>.onrender.com/api/health` — it should return `ok`.

**Note:** Render sets `PORT` for the container; this app already uses `PORT` when set (see `config.rs`), so no extra config is needed.

---

## 3. Frontend on Vercel (free)

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import your **axum-chat-service** repo.
3. Settings:
   - **Root Directory**: set to **`web`** (so Vite and `package.json` are used).
   - **Build Command**: `npm run build` (default).
   - **Output Directory**: `dist` (default for Vite).
4. **Environment variables** (add in Vercel project settings):
   - `VITE_API_BASE` = `https://<your-render-service>.onrender.com`  
     (same as your Render backend URL, no trailing slash)
   - `VITE_WS_BASE` = `wss://<your-render-service>.onrender.com`  
     (same host, `wss` for WebSocket)
5. Deploy. Your app will be at e.g. `https://axum-chat-service-xxx.vercel.app`.
6. **CORS:** In the Render dashboard, add or update:
   - `ALLOWED_ORIGINS` = `https://your-app.vercel.app`  
     (use the exact Vercel URL you see in the browser).

---

## 4. Checklist

- [ ] Neon: project created; connection string copied.
- [ ] Render: Web Service created from repo; **Runtime = Docker**; **Free** instance.
- [ ] Render: `DATABASE_URL` and `JWT_SECRET` set; after frontend is live, set `ALLOWED_ORIGINS`.
- [ ] Render: `https://<app>.onrender.com/api/health` returns `ok`.
- [ ] Vercel: repo imported; **Root Directory = `web`**; `VITE_API_BASE` and `VITE_WS_BASE` set to the Render URL.
- [ ] Open the Vercel URL; register, create a channel, send a message (first load after spin-down may be slow).

---

## Deploy with Docker (your own server or any host)

If you want to run the backend as a Docker container yourself (VPS, cloud VM, or local), use the repo’s **Dockerfile**.

### 1. Build the image

From the **project root** (where `Dockerfile` and `Cargo.toml` are):

```bash
docker build -t axum-chat-service .
```

### 2. Run the container

You must pass **`DATABASE_URL`** and **`JWT_SECRET`**. The app listens on port **8080** inside the container (or use **`PORT`** to override).

```bash
docker run -d \
  --name axum-chat \
  -p 8080:8080 \
  -e DATABASE_URL="postgres://user:pass@host:5432/dbname?sslmode=require" \
  -e JWT_SECRET="your-long-random-secret" \
  axum-chat-service
```

Optional env vars: `ALLOWED_ORIGINS`, `JWT_ISSUER`, `JWT_EXP_HOURS`, `DATABASE_MAX_CONNECTIONS`, `PORT`.

### 3. Deploy on a server (VPS / cloud VM)

- Copy the image to the server (e.g. push to Docker Hub or another registry, then `docker pull` on the server), or build on the server with the same `docker build` command.
- Run the container with `docker run` as above, and put a reverse proxy (e.g. Nginx or Caddy) in front for HTTPS and to forward to port 8080.
- Point your frontend’s `VITE_API_BASE` / `VITE_WS_BASE` to the server’s public URL (e.g. `https://api.yourdomain.com` and `wss://api.yourdomain.com`).

**Note:** Render (section 2) also uses this same Dockerfile: when you choose **Runtime: Docker**, Render builds and runs this image for you. You don’t need to run Docker yourself to use Render.

---

## Optional: Run Docker locally (test only)

To test the production image on your machine:

```bash
docker build -t axum-chat-service .
docker run --rm -e DATABASE_URL="..." -e JWT_SECRET="test-secret" -p 8080:8080 axum-chat-service
```

Then use the frontend at `http://localhost:5173` with `VITE_API_BASE=http://localhost:8080` and `VITE_WS_BASE=ws://localhost:8080`.

---

## Optional: Fly.io (paid)

If you later want a paid host that doesn’t spin down, you can use Fly.io:

- **Dockerfile** and **fly.toml** are in the repo.
- From the project root: `fly launch --no-deploy`, then set secrets and `fly deploy`.

See the repo’s `fly.toml` and [Fly docs](https://fly.io/docs) for details.
