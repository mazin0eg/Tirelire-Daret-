import Tour from "../moduls/tour.model.js";
import Group from "../moduls/group.model.js";
import { checkAndAdvanceTours, advanceTourRound } from "../services/tourProgressionService.js";

const calculateNextRoundDate = (startDate, frequency) => {
  const nextDate = new Date(startDate);
  
  switch (frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "biweekly":
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "quarterly":
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    default:
      nextDate.setDate(nextDate.getDate() + 7);
  }
  
  return nextDate;
};

export const createTourManual = async (req, res) => {
  const { 
    name, 
    description, 
    groupId, 
    totalRounds,
    amount,
    frequency, 
    startDate, 
    rules 
  } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Groupe introuvable" });
    }

    if (!group.owner || !group.owner.userId) {
      return res.status(400).json({ message: "Groupe sans propriétaire" });
    }

    let allGroupMembers = [];
    
    allGroupMembers.push({
      userId: group.owner.userId,
      username: group.owner.username
    });

    group.members.forEach(member => {
      allGroupMembers.push({
        userId: member.userId,
        username: member.username
      });
    });

    if (allGroupMembers.length < 2) {
      return res.status(400).json({ 
        message: "Le groupe doit avoir au moins 2 membres pour créer un tour" 
      });
    }

    const shuffledMembers = allGroupMembers.sort(() => Math.random() - 0.5);
    
    const tourMembers = shuffledMembers.map((member, index) => ({
      userId: member.userId,
      username: member.username,
      position: index + 1,
      hasReceived: false,
      joinedAt: new Date()
    }));

    const startDateObj = startDate ? new Date(startDate) : new Date();
    let nextRoundDate = calculateNextRoundDate(startDateObj, frequency);
    
    const newTour = new Tour({
      name,
      description,
      groupId,
      amount: amount || 1000,
      frequency,
      totalRounds: totalRounds || tourMembers.length,
      startDate: startDateObj,
      nextRoundDate,
      members: tourMembers,
      createdBy: group.owner.userId,
      rules: rules || {}
    });

    const savedTour = await newTour.save();
    const populatedTour = await Tour.findById(savedTour._id)
      .populate('groupId', 'name owner members')
      .populate('createdBy', 'username')
      .populate('members.userId', 'username');

    res.status(201).json({
      message: "Tour créé avec succès!",
      tour: populatedTour,
      membersIncluded: allGroupMembers.length
    });

  } catch (error) {
    console.error("Erreur lors de la création du tour:", error);
    res.status(500).json({ 
      message: "Erreur serveur lors de la création du tour",
      error: error.message 
    });
  }
};

export const createTour = async (req, res) => {
  const { 
    name, 
    description, 
    groupId, 
    amount, 
    frequency, 
    startDate, 
    rules 
  } = req.body;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Groupe introuvable" });
    }

    if (group.owner.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Seul le propriétaire du groupe peut créer des tours" });
    }

    let allGroupMembers = [];
    
    allGroupMembers.push({
      userId: group.owner.userId,
      username: group.owner.username
    });

    group.members.forEach(member => {
      allGroupMembers.push({
        userId: member.userId,
        username: member.username
      });
    });

    if (allGroupMembers.length < 2) {
      return res.status(400).json({ 
        message: "Le groupe doit avoir au moins 2 membres pour créer un tour" 
      });
    }

    const shuffledMembers = allGroupMembers.sort(() => Math.random() - 0.5);
    
    const tourMembers = shuffledMembers.map((member, index) => ({
      userId: member.userId,
      username: member.username,
      position: index + 1,
      hasReceived: false,
      joinedAt: new Date()
    }));

    const startDateObj = new Date(startDate);
    let nextRoundDate = calculateNextRoundDate(startDateObj, frequency);
    
    const newTour = new Tour({
      name,
      description,
      groupId,
      amount,
      frequency,
      totalRounds: tourMembers.length,
      startDate: startDateObj,
      nextRoundDate,
      members: tourMembers,
      createdBy: req.user._id,
      rules: rules || {}
    });

    await newTour.save();

    res.status(201).json({ 
      message: "Tour créé avec succès", 
      tour: newTour 
    });
  } catch (err) {
    console.error("CreateTour Error:", err);
    res.status(500).json({ message: err.message });
  }
};


export const getUserTours = async (req, res) => {
  try {
    const userId = req.user._id;
    
   
    const tours = await Tour.find({
      $or: [
        { createdBy: userId },
        { "members.userId": userId }
      ]
    })
    .populate('groupId', 'name')
    .sort({ createdAt: -1 });

    res.status(200).json(tours);
  } catch (err) {
    console.error("GetUserTours Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getGroupTours = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Groupe introuvable" });
    }

    const userId = req.user._id;
    const isMember = group.members.some(member => 
      member.userId.toString() === userId.toString()
    );
    const isOwner = group.owner.userId.toString() === userId.toString();

    if (!isMember && !isOwner) {
      return res.status(403).json({ message: "Accès non autorisé à ce groupe" });
    }

    const tours = await Tour.find({ groupId })
      .sort({ createdAt: -1 });

    res.status(200).json(tours);
  } catch (err) {
    console.error("GetGroupTours Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getTourById = async (req, res) => {
  const { tourId } = req.params;

  try {
    const tour = await Tour.findById(tourId)
      .populate('groupId', 'name owner members')
      .populate('createdBy', 'username');

    if (!tour) {
      return res.status(404).json({ message: "Tour introuvable" });
    }

    const userId = req.user._id;
    const isTourMember = tour.members.some(member => 
      member.userId.toString() === userId.toString()
    );
    const isCreator = tour.createdBy._id.toString() === userId.toString();

    if (!isTourMember && !isCreator) {
      return res.status(403).json({ message: "Accès non autorisé à ce tour" });
    }

    res.status(200).json(tour);
  } catch (err) {
    console.error("GetTourById Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const startTourManual = async (req, res) => {
  const { tourId } = req.params;

  try {
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ message: "Tour introuvable" });
    }

    if (tour.status !== 'pending') {
      return res.status(400).json({ 
        message: `Impossible de démarrer un tour avec le statut: ${tour.status}` 
      });
    }

    if (tour.members.length < 2) {
      return res.status(400).json({ 
        message: "Un tour doit avoir au moins 2 membres" 
      });
    }

    tour.status = 'active';
    await tour.save();

    res.status(200).json({ 
      message: "Tour démarré avec succès", 
      tour 
    });

  } catch (error) {
    console.error("Erreur lors du démarrage du tour:", error);
    res.status(500).json({ 
      message: "Erreur serveur", 
      error: error.message 
    });
  }
};

export const startTour = async (req, res) => {
  const { tourId } = req.params;

  try {
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ message: "Tour introuvable" });
    }

    if (tour.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Seul le créateur peut démarrer le tour" });
    }

    if (tour.status !== 'pending') {
      return res.status(400).json({ 
        message: `Impossible de démarrer un tour avec le statut: ${tour.status}` 
      });
    }

    if (tour.members.length < 2) {
      return res.status(400).json({ 
        message: "Un tour doit avoir au moins 2 membres" 
      });
    }

    tour.status = 'active';
    await tour.save();

    res.status(200).json({ 
      message: "Tour démarré avec succès", 
      tour 
    });
  } catch (err) {
    console.error("StartTour Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const checkToursProgress = async (req, res) => {
  try {
    const advancedCount = await checkAndAdvanceTours();
    
    res.status(200).json({
      message: `Vérifié les tours en cours`,
      toursAdvanced: advancedCount
    });
  } catch (error) {
    console.error("CheckToursProgress Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const advanceTour = async (req, res) => {
  const { tourId } = req.params;

  try {
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ message: "Tour introuvable" });
    }

    if (tour.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Seul le créateur peut avancer le tour" });
    }

    const updatedTour = await advanceTourRound(tourId);
    
    res.status(200).json({
      message: `Tour avancé au round ${updatedTour.currentRound}`,
      tour: updatedTour
    });
  } catch (error) {
    console.error("AdvanceTour Error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const getTourCurrentRound = async (req, res) => {
  const { tourId } = req.params;

  try {
    const tour = await Tour.findById(tourId)
      .populate('groupId', 'name')
      .populate('createdBy', 'username')
      .populate('members.userId', 'username');

    if (!tour) {
      return res.status(404).json({ message: "Tour introuvable" });
    }

    const userId = req.user._id;
    const isTourMember = tour.members.some(member => 
      member.userId._id.toString() === userId.toString()
    );
    const isCreator = tour.createdBy._id.toString() === userId.toString();

    if (!isTourMember && !isCreator) {
      return res.status(403).json({ message: "Accès non autorisé à ce tour" });
    }

    const currentBeneficiary = tour.currentBeneficiary;
    const nextBeneficiary = tour.getNextBeneficiary();
    const isOverdue = tour.nextRoundDate && new Date() > tour.nextRoundDate;

    res.status(200).json({
      tourId: tour._id,
      tourName: tour.name,
      currentRound: tour.currentRound,
      totalRounds: tour.totalRounds,
      nextRoundDate: tour.nextRoundDate,
      isOverdue,
      status: tour.status,
      currentBeneficiary,
      nextBeneficiary,
      isComplete: tour.isComplete()
    });
  } catch (error) {
    console.error("GetTourCurrentRound Error:", error);
    res.status(500).json({ message: error.message });
  }
};

