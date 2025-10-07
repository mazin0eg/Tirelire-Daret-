import express from "express";
import jwt from "jsonwebtoken";
import 'dotenv/config';

const serveur = express();

serveur.use(express.json());

const users = [
    {
        username : "mazine",
        password : "mazine123",
        role : "admin"
    },
    {
        username : "anouar",
        password : "anouar123",
        role : "costumer"
    }
]

serveur.get('/' , (res ,req)=>{
     
})


serveur.post('/login' , (res ,req)=>{
    //  const {username , password} = req.body;

    //  const user  = users.find( ({ username : u , password : p , role : r}) => username ===  u && password === p  && role === "admin");
    //  if (!user) {
    //     res.status(404).json({message : "user not found "})
    //     return
    //  }
    //     const payload = {username}
    //  const accestoken = jwt.sign(payload , process.env.ACCESS_WEB_TOKEN) 
    //  res.json({accestoken : accestoken})

    const {username , password} = req.body;
      const user = users.find(({username: u, password:p }) => username === u && password === p);
      if(!user){
        res.status(404).json({message: "User not found"})
        return;
      }
      const payload = { username};
      const accestoken = jwt.sign(payload, process.env.ACCESS_WEB_TOKEN);
      res.json({accestoken :  accestoken})
})




serveur.listen(3001,()=>{
    console.log("serveur running on 3001")
})