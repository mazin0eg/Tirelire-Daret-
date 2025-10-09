import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  model: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
});

export default mongoose.model("Counter", counterSchema);
