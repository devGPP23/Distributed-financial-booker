const mongoose = require('mongoose');

/**
 * User Model — Stored in MongoDB because portfolios are flexible documents.
 * 
 * Why MongoDB and not Postgres for this?
 * A user's portfolio is a dynamic key-value map: { "AAPL": 50, "GOOG": 20 }.
 * In Postgres, you'd need a separate "holdings" table with a JOIN.
 * In MongoDB, it's just a nested Map. Different tools for different jobs.
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
  },
  cashBalance: {
    type: Number,
    default: 10000,  // Every new user starts with $10,000 (paper trading)
  },
  portfolio: {
    type: Map,
    of: Number,      // Key = symbol (e.g. "AAPL"), Value = quantity owned
    default: {},
  },
}, {
  timestamps: true,  // Automatically adds createdAt and updatedAt
});

const User = mongoose.model('User', userSchema);

module.exports = User;
