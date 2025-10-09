import express from "express";
import jwt from "jsonwebtoken";
import 'dotenv/config';
import mongoose from "mongoose";
import { getAllUsers , getMe ,register, login} from "./controllers/user.controller.js"

const app = express();
app.use(express.json());


mongoose.connect(process.env.MONGO_PATH)
  .then(() => {
    console.log("Database connected successfully");
    console.log("Connected to DB:", mongoose.connection.name);
  })
  .catch((error) => console.error("Database connection error:", error));


app.get("/users",getAllUsers);




app.get("/me",getMe);

app.post('/register' ,register)

app.post('/login',login)




app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});

export default app;