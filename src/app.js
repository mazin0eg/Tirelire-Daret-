import express from "express";
import jwt from "jsonwebtoken";
import 'dotenv/config';
import mongoose from "mongoose";
import { getAllUsers , getMe ,register, login} from "./controllers/user.controller.js"
const app = express();
app.use(express.json());



app.get("/users",getAllUsers);




app.get("/me",getMe);

app.post('/register' ,register)

app.post('/login',login)


export default app;