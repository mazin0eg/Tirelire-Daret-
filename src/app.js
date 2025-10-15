import express from "express";
import 'dotenv/config';
import { getAllUsers, getMe, register, login } from "./controllers/user.controller.js";
import {createGroup, createGroupManual, addMemberToGroup, getAllGroups, removeMemberFromGroup} from "./controllers/group.controller.js"
import { createTour, createTourManual, getUserTours, getGroupTours, getTourById, startTour, startTourManual, checkToursProgress, advanceTour, getTourCurrentRound } from "./controllers/tour.controller.js";
import { authenticateToken } from "./middleware/auth.js";

const app = express();
app.use(express.json());



app.get("/users",getAllUsers);
app.get("/groups",getAllGroups);
app.get("/me",getMe);
app.post('/register' ,register)
app.post('/login',login)

// Group routes
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

// Tour progression routes
app.post("/tours/check-progress", checkToursProgress) // Check all tours for progression
app.post("/tour/:tourId/advance", authenticateToken, advanceTour) // Manually advance a tour
app.get("/tour/:tourId/current-round", authenticateToken, getTourCurrentRound) // Get current round info


export default app;