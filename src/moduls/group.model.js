import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  owner: {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    username: { type: String, required: true }
  },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    username: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Group = mongoose.model("Group", groupSchema);
export default Group;
