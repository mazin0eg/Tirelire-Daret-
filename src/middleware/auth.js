import jwt from "jsonwebtoken";
import User from "../moduls/user.model.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_WEB_TOKEN);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};