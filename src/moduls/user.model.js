import mongoose from "mongoose";

const kycSchema = new mongoose.Schema({
  status: { type: String, enum: ["not_submitted", "pending", "verified", "rejected"], default: "not_submitted" },
  idCardNumber: { type: String },
  idCardImage: { type: String },
  selfieImage: { type: String },
  faceVerification: {
    facesMatch: { type: Boolean, default: false },
    similarity: { type: Number, default: null },
    details: { type: Object, default: {} }
  },
  submittedAt: { type: Date },
  verifiedAt: { type: Date }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  kyc: { type: kycSchema, default: () => ({}) }
});

userSchema.index({ 'kyc.idCardNumber': 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { 'kyc.idCardNumber': { $exists: true, $ne: null } }
});

export default mongoose.model("User", userSchema);
