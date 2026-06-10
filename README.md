# 🕷️ Spider-Man Calorie Tracker

A **Spider-Man themed** Calorie Tracker web application built with HTML, CSS, JavaScript, and Node.js/Express. Track your daily nutrition with the style and spirit of your friendly neighborhood Spider-Man!

> **"With great power comes great nutrition!"**

![Spider-Man Theme](https://img.shields.io/badge/theme-spiderman-red?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![PWA Ready](https://img.shields.io/badge/PWA-ready-brightgreen?style=flat-square)

---

## ✨ Features

### 📊 Dashboard
- **Daily calorie goal** with progress tracking
- **Calories consumed** vs **calories remaining** counter
- **Animated progress bar** with color-coded status
- **Today's meals preview** and **weekly summary** with emoji indicators

### 🧮 Calorie Calculator
- Uses the **Mifflin-St Jeor equation** for accurate BMR calculation
- Calculates **maintenance**, **weight loss**, and **weight gain** calorie targets
- Accounts for **age, gender, height, weight, and activity level**

### 🍽️ Meal Management
- **Add, edit, and delete** meals with name, calories, and type
- Meal types: **Breakfast**, **Lunch**, **Dinner**, **Snacks**
- **Search and filter** meals by name, type, and date
- **Local storage** persistence (data stays even after browser close)
- **CSV export** for data analysis

### 📸 Food Camera
- **Browser-based camera** using `getUserMedia` API
- **Capture food photos** with preview
- **AI calorie estimation** placeholder (ready for food-recognition integration)

### 📈 Charts & Statistics
- **Daily bar chart** (this week) with color-coded bars
- **Meal type doughnut chart** (today's distribution)
- **Weekly line chart** with goal comparison
- **Daily average per meal type**

### 🌙 Dark/Light Mode
- Toggle between dark and light themes
- Theme preference saved to local storage

### 📱 Mobile Responsive
- Fully responsive grid layout
- Touch-friendly controls
- Adaptive sidebar navigation

### 📥 PWA Support
- **Service Worker** for offline caching
- **Manifest.json** for installable web app

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/kiruthick103/spiderman-calorie-tracker.git
cd spiderman-calorie-tracker

# Install dependencies
npm install

# Start the server
npm start
```

Open your browser and navigate to: **http://localhost:3000**

### Development
```bash
# Run with auto-reload (using nodemon)
npx nodemon server.js
```

---

## 🕸️ Project Structure

```
spiderman-calorie-tracker/
├── public/
│   ├── index.html          # Main HTML page
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service Worker
│   ├── css/
│   │   └── style.css       # Spider-Man themed styles
│   ├── js/
│   │   └── app.js          # Application logic
│   └── icons/              # PWA icons directory
├── server.js               # Express server
├── package.json            # Dependencies & scripts
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

---

## 🎨 Design

The app features a **Spider-Man inspired** color palette:
- **Red** (`#cc0000`) — Primary accent, danger/energy
- **Blue** (`#1565C0`) — Secondary accent, trust/calm
- **Dark** (`#1a1a2e`) — Background base
- **Web patterns** — CSS-generated repeating web backgrounds
- **Shimmer animations** — Progress bar glow effects
- **Superhero cards** — Elevated card components with hover effects

---

## 📊 Calorie Calculation

The app uses the **Mifflin-St Jeor equation**:

- **Male**: `BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5`
- **Female**: `BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161`

**Activity multipliers**:
| Level | Description | Multiplier |
|-------|-------------|-----------|
| Sedentary | Little/no exercise | 1.2 |
| Lightly active | 1-3 days/week | 1.375 |
| Moderately active | 3-5 days/week | 1.55 |
| Very active | 6-7 days/week | 1.725 |
| Extra active | Athlete/physical job | 1.9 |

**Targets**:
- **Weight loss**: Maintenance - 500 cal/day
- **Weight gain**: Maintenance + 500 cal/day

---

## 🌐 Deployment

### Deploy to Render

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **"New +"** → **"Web Service"**
4. Connect your `kiruthick103/spiderman-calorie-tracker` repo
5. Use these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway up
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

---

## 🔧 GitHub Setup

```bash
# Initialize git
git init
git add .
git commit -m "🎉 Initial commit: Spider-Man Calorie Tracker"

# Add remote and push
git remote add origin https://github.com/kiruthick103/spiderman-calorie-tracker.git
git branch -M main
git push -u origin main
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🕷️ Made with ❤️ by Kiruthick103

> **"With great power comes great nutrition!"**
