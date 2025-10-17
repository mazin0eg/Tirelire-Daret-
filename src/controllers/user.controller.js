import jwt from "jsonwebtoken";
import User from "../moduls/user.model.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import StripeService from "../services/stripeService.js";
dotenv.config();

export const getAllUsers = async (req, res) => {
  try {
    const allUsers = await User.find();
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


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





export const register = async(req , res)=>{
try{
  const {username , password, email} = req.body;

 const  existingusers = await User.findOne({username});

 if (existingusers) {
  return res.status(400).json({message : "User already exist "})
 }

 const salt  = await bcrypt.genSalt(10)
const hashpassword =  await bcrypt.hash(password , salt)


const newUser = new User({
      username,
      password: hashpassword,
      email: email || `${username}@example.com`
    });

await newUser.save()

try {
  const stripeCustomer = await StripeService.createCustomer(newUser._id, newUser.email, username);
  console.log(`Stripe customer created for user ${username}: ${stripeCustomer.id}`);
} catch (stripeError) {
  console.error('Stripe customer creation failed:', stripeError.message);
}

res.status(201).json({ 
  message: "User registered successfully",
  user: {
    id: newUser._id,
    username: newUser.username,
    email: newUser.email
  }
});

}catch(error){

  res.status(500).json({message : error.message})

}

};


export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username});

    if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch)  return res.status(401).json({ message: "Invalid password" });

    const payload = { 
      userId: user._id,
      username: user.username 
    };
    const accessToken = jwt.sign(payload, process.env.ACCESS_WEB_TOKEN, { expiresIn: "1h" });

    res.json({ accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


