import express from "express";
import jwt from "jsonwebtoken";
import 'dotenv/config';
import mongoose from "mongoose"

const app = express();
app.use(express.json());

// mongoose.connect(process.env.MONGO_PATH).then(()=>{
//     console.log("database connected succefuly");
    
// }).catch((error)=>console.log(error))

mongoose.connect(process.env.MONGO_PATH)
  .then(() => {
    console.log("Database connected successfully");
    console.log("Connected to DB:", mongoose.connection.name);
  })
  .catch((error) => console.error("Database connection error:", error));


const userSchema = new mongoose.Schema({
  _id: Number,
  username: String,
  password: String,
});

const users = mongoose.model("users", userSchema);


// const users = [
//     {
//         username : "mazine",
//         password : "mazine123",
//         role : "admin"
//     },
//     {
//         username : "anouar",
//         password : "anouar123",
//         role : "costumer"
//     }
// ]

app.get("/users", async (req, res) => {
  try {
    const allUsers = await users.find(); 
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get("/me", (req, res) => {
    const token = req.header('Authorization').split(' ')[1];
    try{
        const decoded = jwt.verify(token, process.env.ACCESS_WEB_TOKEN);
        res.json(decoded)
    }catch{
        res.status(404).json({message: "Invalid Token"});

    }

});


app.post('/login', (req,res)=>{
  const {username, password} = req.body;
  const user = users.find(({username: u, password:p }) => username === u && password === p);
  if(!user){
    res.status(404).json({message: "User not found"})
    return;
  }
  const payload = { username};
  const accestoken = jwt.sign(payload, process.env.ACCESS_WEB_TOKEN);
  res.json({accestoken :  accestoken})

})


app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
});