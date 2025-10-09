import jwt from "jsonwebtoken";
import User from "../moduls/user.model.js";
import Counter from "../moduls/counter.model.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config();

// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find();
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /me
export const getMe = (req, res) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.ACCESS_WEB_TOKEN);
    res.json(decoded);
  } catch {
    res.status(401).json({ message: "Invalid Token" });
  }
};




// POST / REGISTER 

export const register = async(req , res)=>{
try{
  const {username , password} = req.body;

 const  existingusers = await User.findOne({username});

 if (existingusers) {
  return res.status(400).json({message : "Ures already exist "})
 }


    const counter = await Counter.findOneAndUpdate(
      { model: "User" },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );

 const salt  = await bcrypt.genSalt(10)
const hashpassword =  await bcrypt.hash(password , salt)

console.log(hashpassword)

const newUser = new User({
      _id: counter.count, 
      username,
      password: hashpassword,
    });


await newUser.save()
res.status(201).json({ message: "User registered successfully" });

}catch(error){

  res.status(500).json({message : error.message})

}

};


// POST /login
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username});

    if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch)  return res.status(401).json({ message: "Invalid password" });

    const payload = { username };
    const accessToken = jwt.sign(payload, process.env.ACCESS_WEB_TOKEN, { expiresIn: "1h" });

    res.json({ accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


