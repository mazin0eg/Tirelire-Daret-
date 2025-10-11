import User from "../moduls/user.model.js";
import Group from "../moduls/group.model.js";


export const createGroup = async (req, res) => {
  const { name, memberIds } = req.body;

  try {
    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res.status(400).json({ message: "Group déjà existant" });
    }

    let membersData = [];
    if (memberIds && memberIds.length > 0) {
      const validMembers = await User.find({ _id: { $in: memberIds } });
      if (validMembers.length !== memberIds.length) {
        return res.status(400).json({ message: "Un ou plusieurs membres introuvables" });
      }
      
      membersData = validMembers.map(user => ({
        userId: user._id,
        username: user.username,
        joinedAt: new Date()
      }));
    }

    const newGroup = new Group({ 
      name, 
      members: membersData
    });
    await newGroup.save();

    res.status(201).json({ message: "Groupe créé avec succès", group: newGroup });
  } catch (err) {
    console.error("CreateGroup Error:", err);
    res.status(500).json({ message: err.message });
  }
};
