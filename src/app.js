import express from "express";

import 'dotenv/config';
import { getAllUsers, getMe, register, login } from "./controllers/user.controller.js";
import {createGroup} from "./controllers/group.controller.js"
const app = express();
app.use(express.json());



app.get("/users",getAllUsers);
app.get("/me",getMe);
app.post('/register' ,register)
app.post('/login',login)


app.post("/group" , createGroup)


export default app;