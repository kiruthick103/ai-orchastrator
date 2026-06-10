const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Meal = require("./server/models/Meal");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Increase body size limit for base64 image data
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---- MongoDB Connection ----
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/spideytracker";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("🕷️ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

// ---- API: Meals CRUD ----

// GET /api/meals — fetch meals with optional filters
app.get("/api/meals", async (req, res) => {
  try {
    const { date, type, search, limit = 500 } = req.query;
    const filter = {};

    if (date) filter.date = date;
    if (type && type !== "all") filter.type = type;
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const meals = await Meal.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, meals });
  } catch (error) {
    console.error("GET /api/meals error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/meals — create a new meal
app.post("/api/meals", async (req, res) => {
  try {
    const { name, calories, type, date } = req.body;

    if (!name || !calories || !type) {
      return res
        .status(400)
        .json({ success: false, error: "name, calories, and type are required" });
    }

    const meal = await Meal.create({
      name: name.trim(),
      calories: parseInt(calories),
      type,
      date: date || new Date().toISOString().split("T")[0],
    });

    res.status(201).json({ success: true, meal });
  } catch (error) {
    console.error("POST /api/meals error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/meals/:id — update a meal
app.put("/api/meals/:id", async (req, res) => {
  try {
    const { name, calories, type } = req.body;
    const meal = await Meal.findByIdAndUpdate(
      req.params.id,
      { name: name?.trim(), calories, type },
      { new: true, runValidators: true }
    );

    if (!meal) {
      return res.status(404).json({ success: false, error: "Meal not found" });
    }

    res.json({ success: true, meal });
  } catch (error) {
    console.error("PUT /api/meals error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/meals/all — clear all meals (must be before /:id)
app.delete("/api/meals/all", async (req, res) => {
  try {
    await Meal.deleteMany({});
    res.json({ success: true, message: "All meals deleted" });
  } catch (error) {
    console.error("DELETE /api/meals/all error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/meals/:id — delete a meal
app.delete("/api/meals/:id", async (req, res) => {
  try {
    // Prevent "all" from being treated as an ID (should be caught above, but safety check)
    if (req.params.id === "all") {
      return res.status(400).json({ success: false, error: "Use DELETE /api/meals/all for bulk delete" });
    }
    const meal = await Meal.findByIdAndDelete(req.params.id);
    if (!meal) {
      return res.status(404).json({ success: false, error: "Meal not found" });
    }
    res.json({ success: true, message: "Meal deleted" });
  } catch (error) {
    console.error("DELETE /api/meals error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- AI Food Recognition Endpoint ----
app.post("/api/analyze-food", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image data provided." });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GOOGLE_API_KEY not configured. Create a .env file with your Gemini API key.",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a nutrition expert. Analyze this food image and provide:
1. The name of the food item(s) visible
2. Estimated calorie count
3. A brief nutritional breakdown (protein, carbs, fat if identifiable)
4. A confidence level (high, medium, low)

Respond in JSON format with these fields:
- food_name: string (the main food identified)
- estimated_calories: number (total estimated calories)
- calories_range: string (e.g., "300-400")
- protein_g: number (estimated grams of protein)
- carbs_g: number (estimated grams of carbs)
- fat_g: number (estimated grams of fat)
- confidence: string ("high", "medium", "low")
- description: string (brief 1-sentence description of what you see)`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image,
          mimeType: mimeType || "image/jpeg",
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    // Try to parse JSON response
    let analysis;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fall back to raw text
        analysis = { raw_response: text };
      }
    } catch (parseError) {
      analysis = { raw_response: text };
    }

    res.json({ success: true, analysis });
  } catch (error) {
    console.error("AI Food Analysis Error:", error.message);
    res.status(500).json({
      error: "Failed to analyze food image. Please try again.",
      details: error.message,
    });
  }
});

// ---- Health Check (for Render monitoring) ----
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🕷️ Spider-Man Calorie Tracker running at http://localhost:${PORT}`);
});
