import express from "express";
import 'dotenv/config';
import { getAllUsers, getMe, register, login } from "./controllers/user.controller.js";
import {createGroup, createGroupManual, addMemberToGroup, getAllGroups, removeMemberFromGroup} from "./controllers/group.controller.js"
import { submitKYC, getKYCStatus, approveKYC, rejectKYC, checkIdCardUnique } from "./controllers/kyc.controller.js";
import { 
  createStripeAccount, 
  createCustomerAccount, 
  attachPaymentMethod, 
  createPaymentSetup,
  processRoundPayments,
  getPaymentStatus,
  getUserStripeStatus,
  checkPaymentProgress,
  getAccountBalance,
  getUserBalance,
  getUserBalanceById,
  createPayout
} from "./controllers/stripe.controller.js";
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
import { createTour, createTourManual, getUserTours, getGroupTours, getTourById, startTour, startTourManual, checkToursProgress, advanceTour, getTourCurrentRound } from "./controllers/tour.controller.js";
import { authenticateToken } from "./middleware/auth.js";

const app = express();
app.use(express.json());

app.get("/users",getAllUsers);
app.get("/groups",getAllGroups);
app.get("/me",getMe);
app.post('/register' ,register)
app.post('/login',login)

app.post("/group", authenticateToken, createGroup)  
app.post("/group/manual", createGroupManual)
app.post("/group/add-member", addMemberToGroup)
app.post("/group/remove-member", removeMemberFromGroup)

app.post("/tour", authenticateToken, createTour)
app.post("/tour/manual", createTourManual) 
app.get("/tours", authenticateToken, getUserTours)
app.get("/group/:groupId/tours", authenticateToken, getGroupTours)
app.get("/tour/:tourId", authenticateToken, getTourById)
app.post("/tour/:tourId/start", authenticateToken, startTour)

app.post("/tours/check-progress", checkToursProgress)
app.post("/tour/:tourId/advance", authenticateToken, advanceTour)
app.get("/tour/:tourId/current-round", authenticateToken, getTourCurrentRound)

app.post('/kyc/submit', authenticateToken, upload.fields([{ name: 'idCard', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]), submitKYC);
app.get('/kyc/status', authenticateToken, getKYCStatus);
app.post('/kyc/check-unique', checkIdCardUnique);
app.post('/kyc/:userId/approve', approveKYC);
app.post('/kyc/:userId/reject', rejectKYC);

app.post('/stripe/create-account', authenticateToken, createStripeAccount);
app.post('/stripe/create-customer', authenticateToken, createCustomerAccount);
app.post('/stripe/attach-payment', authenticateToken, attachPaymentMethod);
app.post('/stripe/setup-payment', authenticateToken, createPaymentSetup);
app.post('/stripe/process-payments/:tourId', authenticateToken, processRoundPayments);
app.get('/stripe/payment-status/:tourId', authenticateToken, getPaymentStatus);
app.get('/stripe/user-status', authenticateToken, getUserStripeStatus);
app.post('/stripe/check-progress/:tourId', authenticateToken, checkPaymentProgress);
app.get('/stripe/balance', authenticateToken, getAccountBalance);
app.get('/stripe/balance/username/:username', getUserBalance);
app.get('/stripe/balance/id/:userId', getUserBalanceById);
app.post('/stripe/payout', authenticateToken, createPayout);

export default app;