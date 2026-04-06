const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose.
 * Handles connection errors gracefully and logs success.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 7+ doesn't need useNewUrlParser or useUnifiedTopology
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // Exit process with failure code if DB connection fails
    process.exit(1);
  }
};

// Handle connection events for ongoing monitoring
mongoose.connection.on('error', (err) => {
  console.error(`MongoDB runtime error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting reconnection...');
});

module.exports = connectDB;
