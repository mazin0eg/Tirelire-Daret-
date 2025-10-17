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

const stripeAccountSchema = new mongoose.Schema({
  accountId: { type: String },
  customerId: { type: String },
  status: { type: String, enum: ["pending", "active", "restricted"], default: "pending" },
  defaultPaymentMethod: { type: String },
  hasPaymentMethod: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String },
  kyc: { type: kycSchema, default: () => ({}) },
  stripeAccount: { type: stripeAccountSchema, default: () => ({}) },
  strip_user_id: { type: String }
});

userSchema.index({ 'kyc.idCardNumber': 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { 'kyc.idCardNumber': { $exists: true, $ne: null } }
});

export default mongoose.model("User", userSchema);
