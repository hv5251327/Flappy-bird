# 🐦 Flappy Bird Web Game

A modern, responsive Flappy Bird web game built with pure HTML5 Canvas and Web Audio API synthesized sound effects.

## 🚀 Features
- **No external asset dependencies**: Sounds are synthesized directly in the browser with Web Audio API.
- **Responsive & Mobile-ready**: Works with Spacebar, Mouse click, and Mobile touch.
- **Score & High Score**: Automatically saves your personal best in `localStorage`.
- **Particle & Shake Effects**: Screen shake on hit, score sparkles, and feathers.
- **Deploy Ready**: Supports **Render Static Site** (100% Free) or **Render Web Service**.

---

## 🛠️ Step-by-Step: Push to GitHub & Launch on Render

### Step 1: Initialize Git and Push to GitHub
In your project directory:
```bash
git init
git add .
git commit -m "Initial Flappy Bird commit"
git branch -M main
```

Create a new repository on [GitHub](https://github.com/new) (e.g. named `flappy-bird-game`).
Then link and push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/flappy-bird-game.git
git push -u origin main
```

---

### Step 2: Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and log in (or sign up with your GitHub account).
2. Click **"New +"** in the top right and select **"Static Site"** (Recommended, 100% free with fast CDN).
3. Connect your GitHub account and choose the **`flappy-bird-game`** repository.
4. Set the following settings:
   - **Name**: `my-flappy-bird` (or any name you like)
   - **Branch**: `main`
   - **Build Command**: *(leave empty)*
   - **Publish Directory**: `.`
5. Click **"Create Static Site"**.

Render will deploy your site in seconds and provide a live URL (e.g. `https://my-flappy-bird.onrender.com`).
