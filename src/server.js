
import mongoose from "mongoose";
import app from "./app.js";
import 'dotenv/config';

// Connect to database
mongoose.connect(process.env.MONGO_PATH)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
