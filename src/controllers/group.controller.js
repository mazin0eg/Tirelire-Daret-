import User from "../moduls/user.model.js";
import Group from "../moduls/group.model.js";


// Create group with authenticated user as owner (automatic)
export const createGroup = async (req, res) => {
  const { name, memberIds } = req.body;

  try {
    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res.status(400).json({ message: "Group déjà existant" });
    }

    // Use authenticated user as owner (req.user is set by auth middleware)
    const owner = req.user;

    let membersData = [];
    if (memberIds && memberIds.length > 0) {
      const validMembers = await User.find({ _id: { $in: memberIds } });
      if (validMembers.length !== memberIds.length) {
        return res.status(400).json({ message: "Un ou plusieurs membres introuvables" });
      }
      
      // Filter out owner from members if included
      membersData = validMembers
        .filter(user => user._id.toString() !== owner._id.toString())
        .map(user => ({
          userId: user._id,
          username: user.username,
          joinedAt: new Date()
        }));
    }

    const newGroup = new Group({ 
      name,
      owner: {
        userId: owner._id,
        username: owner.username
      },
      members: membersData
    });
    await newGroup.save();

    res.status(201).json({ message: "Groupe créé avec succès", group: newGroup });
  } catch (err) {
    console.error("CreateGroup Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Create group with manual owner assignment (for admin use)
export const createGroupManual = async (req, res) => {
  const { name, ownerId, memberIds } = req.body;

  try {
    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res.status(400).json({ message: "Group déjà existant" });
    }

    // Validate owner exists
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Propriétaire du groupe introuvable" });
    }

    let membersData = [];
    if (memberIds && memberIds.length > 0) {
      const validMembers = await User.find({ _id: { $in: memberIds } });
      if (validMembers.length !== memberIds.length) {
        return res.status(400).json({ message: "Un ou plusieurs membres introuvables" });
      }
      
      // Filter out owner from members if included
      membersData = validMembers
        .filter(user => user._id.toString() !== ownerId.toString())
        .map(user => ({
          userId: user._id,
          username: user.username,
          joinedAt: new Date()
        }));
    }

    const newGroup = new Group({ 
      name,
      owner: {
        userId: owner._id,
        username: owner.username
      },
      members: membersData
    });
    await newGroup.save();

    res.status(201).json({ message: "Groupe créé avec succès", group: newGroup });
  } catch (err) {
    console.error("CreateGroup Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find();
    res.status(200).json(groups);
  } catch (err) {
    console.error("GetAllGroups Error:", err);
    res.status(500).json({ message: err.message });
  }
};


export const addMemberToGroup = async (req, res) => {
  const { groupId, userId, requesterId } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Groupe introuvable" });
    }

    // Check if requester is the owner (optional - for authorization)
    if (requesterId && group.owner.userId.toString() !== requesterId.toString()) {
      return res.status(403).json({ message: "Seul le propriétaire peut ajouter des membres" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Check if user is already the owner
    if (group.owner.userId.toString() === userId.toString()) {
      return res.status(400).json({ message: "L'utilisateur est déjà le propriétaire du groupe" });
    }

    // Check if user is already a member
    const isAlreadyMember = group.members.some(
      member => member.userId.toString() === userId.toString()
    );
    
    if (isAlreadyMember) {
      return res.status(400).json({ message: "L'utilisateur fait déjà partie du groupe" });
    }

    const newMember = {
      userId: user._id,
      username: user.username,
      joinedAt: new Date()
    };

    group.members.push(newMember);
    await group.save();

    res.status(200).json({ 
      message: "Membre ajouté avec succès au groupe", 
      group: group 
    });
  } catch (err) {
    console.error("AddMemberToGroup Error:", err);
    res.status(500).json({ message: err.message });
  }
};


export const removeMemberFromGroup = async (req, res) => {
  const { groupId, userId, ownerId } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Groupe introuvable" });
    }

    
    if (group.owner.userId.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: "Seul le propriétaire peut supprimer des membres" });
    }

    // Check if trying to remove the owner
    if (group.owner.userId.toString() === userId.toString()) {
      return res.status(400).json({ message: "Le propriétaire ne peut pas être supprimé du groupe" });
    }

    // Find and remove the member
    const memberIndex = group.members.findIndex(
      member => member.userId.toString() === userId.toString()
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: "Membre introuvable dans le groupe" });
    }

    group.members.splice(memberIndex, 1);
    await group.save();

    res.status(200).json({ 
      message: "Membre supprimé avec succès du groupe", 
      group: group 
    });
  } catch (err) {
    console.error("RemoveMemberFromGroup Error:", err);
    res.status(500).json({ message: err.message });
  }
};
