import fs from 'fs';
import path from 'path';
import User from '../moduls/user.model.js';
import { compareFaces } from '../services/faceVerification.service.js';

export const submitKYC = async (req, res) => {
  try {
    if (!req.files || !req.files.idCard || !req.files.selfie) {
      return res.status(400).json({ message: 'Veuillez fournir idCard et selfie' });
    }

    const idCardPath = req.files.idCard[0].path;
    const selfiePath = req.files.selfie[0].path;
    const { idCardNumber } = req.body;

    if (!idCardNumber) {
      try { fs.unlinkSync(idCardPath); } catch(e) {}
      try { fs.unlinkSync(selfiePath); } catch(e) {}
      return res.status(400).json({ message: 'idCardNumber requis' });
    }

    const existingUser = await User.findOne({ 
      'kyc.idCardNumber': idCardNumber,
      '_id': { $ne: req.user._id }
    });

    if (existingUser) {
      try { fs.unlinkSync(idCardPath); } catch(e) {}
      try { fs.unlinkSync(selfiePath); } catch(e) {}
      return res.status(400).json({ 
        message: 'Ce numéro de carte d\'identité est déjà utilisé par un autre utilisateur' 
      });
    }

    const result = await compareFaces(idCardPath, selfiePath);

    const kycUpdate = {
      'kyc.status': result.facesMatch ? 'verified' : 'pending',
      'kyc.idCardNumber': idCardNumber,
      'kyc.idCardImage': idCardPath,
      'kyc.selfieImage': selfiePath,
      'kyc.faceVerification.facesMatch': !!result.facesMatch,
      'kyc.faceVerification.similarity': result.similarity,
      'kyc.faceVerification.details': result.details,
      'kyc.submittedAt': new Date(),
      'kyc.verifiedAt': result.facesMatch ? new Date() : null
    };

    const user = await User.findByIdAndUpdate(req.user._id, kycUpdate, { new: true }).select('-password');

    return res.status(200).json({ message: 'KYC soumis', result, user });
  } catch (error) {
    console.error('submitKYC error', error);
    return res.status(500).json({ message: error.message });
  }
};

export const getKYCStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kyc');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ kyc: user.kyc });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const checkIdCardUnique = async (req, res) => {
  try {
    const { idCardNumber } = req.body;
    
    if (!idCardNumber) {
      return res.status(400).json({ message: 'idCardNumber requis' });
    }

    const existingUser = await User.findOne({ 'kyc.idCardNumber': idCardNumber });
    
    if (existingUser) {
      return res.status(200).json({ 
        unique: false, 
        message: 'Ce numéro de carte d\'identité est déjà utilisé' 
      });
    }
    
    return res.status(200).json({ 
      unique: true, 
      message: 'Numéro de carte d\'identité disponible' 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const approveKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(userId, { 'kyc.status': 'verified', 'kyc.verifiedAt': new Date(), 'kyc.faceVerification.facesMatch': true }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'KYC approuvé', user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const rejectKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(userId, { 'kyc.status': 'rejected', 'kyc.verifiedAt': null, 'kyc.faceVerification.details': { reason } }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'KYC rejeté', user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export default { submitKYC, getKYCStatus, approveKYC, rejectKYC };
