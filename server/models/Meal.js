const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    calories: { type: Number, required: true, min: 1, max: 10000 },
    type: {
      type: String,
      required: true,
      enum: ["breakfast", "lunch", "dinner", "snacks"],
    },
    date: { type: String, required: true },
  },
  { timestamps: true }
);

// Compound index for efficient queries by date
mealSchema.index({ date: -1, createdAt: -1 });

module.exports = mongoose.model("Meal", mealSchema);
