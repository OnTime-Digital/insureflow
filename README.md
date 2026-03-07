# InsureFlow CRM

A full-stack CRM (Customer Relationship Management) application for insurance businesses, built with **React** (frontend) and **Node.js/Express** (backend).

## 📁 Project Structure

```
├── backend/                # Node.js + Express + TypeScript API
│   ├── prisma/             # Prisma ORM schema & migrations
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/      # Auth, error handling
│   │   ├── routes/          # API route definitions
│   │   ├── scripts/         # Seed scripts
│   │   ├── utils/           # Helper utilities
│   │   └── server.ts        # Express app entry point
│   ├── uploads/             # User-uploaded files (gitignored)
│   └── package.json
│
├── frontend/               # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page-level components
│   │   ├── context/         # React context providers
│   │   └── App.tsx          # Root component
│   ├── public/              # Static assets
│   └── package.json
│
├── .env.example             # Environment variable template
├── ecosystem.config.js      # PM2 config for backend deployment
├── package.json             # Root convenience scripts
└── README.md
```

## ⚙️ Prerequisites

- **Node.js** v18+ and **npm** v9+
- **MySQL** 8.0+ (or compatible MariaDB)
- **PM2** (for production deployment): `npm install -g pm2`

## 🚀 Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2. Set up environment variables

```bash
# Copy the template
cp .env.example backend/.env

# Edit backend/.env with your database credentials and secrets
# (see the .env.example file for all required variables)
```

For the frontend in development, no `.env` is needed — it defaults to `http://localhost:5005`.

### 3. Install dependencies

```bash
# Install both backend and frontend dependencies
npm run install:all
```

### 4. Set up the database

```bash
# Push the Prisma schema to your MySQL database
npm run db:push

# (Optional) Seed the database with initial data
npm run seed
```

### 5. Start development servers

Open **two terminals**:

```bash
# Terminal 1 — Backend (runs on http://localhost:5005)
npm run dev:backend

# Terminal 2 — Frontend (runs on http://localhost:5173)
npm run dev:frontend
```

## 🏗️ Production Build

### Build backend

```bash
cd backend
npm run build
# Output: backend/dist/
```

### Build frontend

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Or build both at once

```bash
npm run build
```

## 🖥️ VPS Deployment

### 1. Server setup

```bash
# Install Node.js (v18+), MySQL, Nginx, PM2
sudo apt update && sudo apt install -y nginx mysql-server
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Clone & install

```bash
cd /var/www
git clone https://github.com/your-username/your-repo.git crm
cd crm
npm run install:all
```

### 3. Configure environment

```bash
cp .env.example backend/.env
nano backend/.env
# Fill in your production database URL, JWT secrets, SMTP credentials
```

Create the frontend production env:
```bash
echo "VITE_API_URL=https://your-domain.com" > frontend/.env.production
```

### 4. Build everything

```bash
npm run build
```

### 5. Set up the database

```bash
npm run db:push
npm run seed   # Optional: seed initial data
```

### 6. Start backend with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # Auto-start on server reboot
```

### 7. Configure Nginx

**Option A: Frontend & Backend on same domain**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (static files)
    location / {
        root /var/www/crm/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API (reverse proxy)
    location /api/ {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploaded files
    location /uploads/ {
        alias /var/www/crm/backend/uploads/;
    }
}
```

**Option B: Separate subdomains**

```nginx
# api.your-domain.com → Backend
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# your-domain.com → Frontend
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/crm/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

After configuring Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

> 💡 **Tip:** Use [Certbot](https://certbot.eff.org/) to add free SSL: `sudo certbot --nginx -d your-domain.com`

## 📝 Useful Commands

| Command | Description |
|---------------------|----------------------------------------------|
| `npm run install:all` | Install all dependencies (backend + frontend) |
| `npm run dev:backend` | Start backend dev server |
| `npm run dev:frontend` | Start frontend dev server |
| `npm run build` | Build both backend and frontend |
| `npm run db:push` | Push Prisma schema to database |
| `npm run seed` | Seed database with initial data |
| `pm2 start ecosystem.config.js` | Start backend with PM2 |
| `pm2 logs crm-backend` | View backend logs |
| `pm2 restart crm-backend` | Restart backend |

## 🔐 Environment Variables Reference

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Backend | MySQL connection string |
| `JWT_SECRET` | Backend | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Backend | Secret for signing refresh tokens |
| `SMTP_*` | Backend | Email server configuration |
| `VITE_API_URL` | Frontend | Backend API URL for production builds |

## 📄 License

ISC
