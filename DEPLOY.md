# Deployment Troubleshooting Guide

If you are seeing **"Failed to fetch"** on your server but it works locally, follow these steps.

## 1. Configure the API URL
The frontend needs to know where the backend is. By default, it tries to connect to port `8000` on the same domain.

**If your backend is on a different IP or Domain, or if you are using HTTPS:**

Create a `.env` file in the `frontend` directory **on your server**:

```bash
VITE_API_URL=http://YOUR_SERVER_IP:8000
```
*(Replace `YOUR_SERVER_IP` with your actual server IP or domain)*

**Rebuild the frontend** after changing this file:
```bash
cd frontend
npm run build
```

## 2. Check Firewall (Most Common Cause)
Your server must allow incoming traffic on port **8000**.

*   **AWS/Cloud:** Check "Security Groups" -> Inbound Rules -> Add Custom TCP Rule for Port 8000 (Source: 0.0.0.0/0).
*   **Linux (UFW):** Run `sudo ufw allow 8000`.

## 3. Mixed Content Error (HTTPS vs HTTP)
If your website is loaded via **HTTPS** (e.g., `https://myapp.com`), the browser **BLOCKS** requests to **HTTP** (e.g., `http://myapp.com:8000`).

**Fix:**
*   **Option A (Easiest):** Load your site via HTTP for testing (`http://myapp.com`).
*   **Option B (Production):** Set up a Reverse Proxy (Nginx/Apache) to serve the backend via HTTPS (e.g., `https://myapp.com/api`).

## 4. Check Backend Logs
Ensure the backend is running and listening on `0.0.0.0`:
```bash
# On the server
cd backend
source venv/bin/activate
python main.py
```
It should say: `Uvicorn running on http://0.0.0.0:8000`
