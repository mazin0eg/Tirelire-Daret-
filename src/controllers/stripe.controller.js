import StripeService from '../services/stripeService.js';
import User from '../moduls/user.model.js';
import Tour from '../moduls/tour.model.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createStripeAccount = async (req, res) => {
  try {
    const { email, country } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.stripeAccount?.accountId) {
      return res.status(400).json({ message: 'User already has a Stripe account' });
    }

    const account = await StripeService.createConnectAccount(userId, email || user.email, country);
    const accountLink = await StripeService.createAccountLink(account.id, userId);

    res.json({
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      message: 'Stripe account created. Complete onboarding to receive payments.'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const createCustomerAccount = async (req, res) => {
  try {
    const { email, name } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.stripeAccount?.customerId) {
      return res.status(400).json({ message: 'User already has a customer account' });
    }

    const customer = await StripeService.createCustomer(
      userId, 
      email || user.email, 
      name || user.username
    );

    res.json({
      success: true,
      customerId: customer.id,
      message: 'Customer account created successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const attachPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user || !user.stripeAccount?.customerId) {
      return res.status(400).json({ message: 'User must have a customer account first' });
    }

    await StripeService.attachPaymentMethod(user.stripeAccount.customerId, paymentMethodId);
    
    await User.findByIdAndUpdate(userId, {
      'stripeAccount.defaultPaymentMethod': paymentMethodId,
      'stripeAccount.hasPaymentMethod': true
    });

    res.json({
      success: true,
      message: 'Payment method attached successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const createPaymentSetup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user.stripeAccount?.customerId) {
      return res.status(400).json({ message: 'Customer account required' });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeAccount.customerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    });

    res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      message: 'Setup intent created. Complete payment method setup.'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const processRoundPayments = async (req, res) => {
  try {
    const { tourId } = req.params;

    const tour = await Tour.findById(tourId).populate('members.userId');
    if (!tour) {
      return res.status(404).json({ message: 'Tour not found' });
    }

    if (tour.status !== 'active') {
      return res.status(400).json({ message: 'Tour is not active' });
    }

    const result = await StripeService.chargeAllMembers(tourId);

    res.json({
      success: true,
      message: 'Payment processing initiated',
      ...result
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { tourId } = req.params;
    const userId = req.user.userId;

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ message: 'Tour not found' });
    }

    const userMember = tour.members.find(m => m.userId.toString() === userId);
    if (!userMember) {
      return res.status(403).json({ message: 'User not a member of this tour' });
    }

    const currentRound = tour.rounds[tour.currentRound - 1];
    const userPayment = currentRound?.payments?.find(p => p.userId.toString() === userId);

    res.json({
      success: true,
      tour: {
        id: tour._id,
        name: tour.name,
        currentRound: tour.currentRound,
        totalRounds: tour.totalRounds,
        amount: tour.amount,
        nextRoundDate: tour.nextRoundDate
      },
      userPayment: userPayment || null,
      isRecipient: userMember.position === tour.currentRound
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const getUserStripeStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('stripeAccount username email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let accountStatus = null;
    if (user.stripeAccount?.accountId) {
      try {
        const account = await stripe.accounts.retrieve(user.stripeAccount.accountId);
        accountStatus = {
          id: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          requirementsDisabled: account.requirements?.disabled_reason || null,
          requirementsPending: account.requirements?.currently_due || []
        };
      } catch (error) {
        console.error('Error retrieving account:', error);
      }
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      stripeAccount: user.stripeAccount || null,
      accountStatus
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const checkPaymentProgress = async (req, res) => {
  try {
    const { tourId } = req.params;

    await StripeService.checkPaymentStatusAndAdvance(tourId);

    res.json({
      success: true,
      message: 'Payment status checked and tour advanced if needed'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const getAccountBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for the stripe account ID in your database field
    const stripeAccountId = user.strip_user_id || user.stripeAccount?.accountId;
    
    if (!stripeAccountId) {
      return res.status(400).json({ 
        message: 'No Stripe account found',
        user: {
          username: user.username,
          hasStripeAccount: false
        }
      });
    }

    const balance = await StripeService.getAccountBalance(stripeAccountId);

    res.json({
      success: true,
      user: {
        username: user.username,
        stripeAccountId: stripeAccountId
      },
      balance: {
        available: balance.available,
        pending: balance.pending,
        currency: balance.available[0]?.currency || 'usd',
        totalAvailable: balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100,
        totalPending: balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
};

export const getUserBalance = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for the stripe account ID in your database field
    const stripeAccountId = user.strip_user_id || user.stripeAccount?.accountId;
    
    if (!stripeAccountId) {
      return res.status(400).json({ 
        message: 'User has no Stripe account',
        user: {
          username: user.username,
          hasStripeAccount: false,
          userData: user // Show full user data for debugging
        }
      });
    }

    const balance = await StripeService.getAccountBalance(stripeAccountId);

    res.json({
      success: true,
      user: {
        username: user.username,
        stripeAccountId: stripeAccountId
      },
      balance: {
        available: balance.available,
        pending: balance.pending,
        currency: balance.available[0]?.currency || 'usd',
        totalAvailable: balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100,
        totalPending: balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
};

export const getUserBalanceById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Debug: Show what we're checking
    console.log('User data:', {
      username: user.username,
      strip_user_id: user.strip_user_id,
      stripeAccount: user.stripeAccount?.accountId
    });

    // Check for the stripe account ID in your database field
    const stripeAccountId = user.strip_user_id || user.stripeAccount?.accountId;
    
    console.log('Found Stripe Account ID:', stripeAccountId);

    if (!stripeAccountId) {
      return res.status(400).json({ 
        message: 'User has no Stripe account',
        debug: {
          strip_user_id: user.strip_user_id,
          stripeAccount: user.stripeAccount,
          hasStripUserId: !!user.strip_user_id,
          hasStripeAccount: !!user.stripeAccount?.accountId
        },
        user: {
          id: user._id,
          username: user.username,
          hasStripeAccount: false
        }
      });
    }

    try {
      const balance = await StripeService.getAccountBalance(stripeAccountId);

      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          stripeAccountId: stripeAccountId
        },
        balance: {
          available: balance.available,
          pending: balance.pending,
          currency: balance.available[0]?.currency || 'usd',
          totalAvailable: balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100,
          totalPending: balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100
        }
      });
    } catch (stripeError) {
      res.status(500).json({
        success: false,
        message: 'Stripe API error',
        error: stripeError.message,
        stripeAccountId: stripeAccountId
      });
    }

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
};

export const createPayout = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user.stripeAccount?.accountId) {
      return res.status(400).json({ message: 'No Stripe account found' });
    }

    const payout = await StripeService.createPayout(user.stripeAccount.accountId, amount);

    res.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: payout.arrival_date
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export default {
  createStripeAccount,
  createCustomerAccount,
  attachPaymentMethod,
  createPaymentSetup,
  processRoundPayments,
  getPaymentStatus,
  getUserStripeStatus,
  checkPaymentProgress,
  getAccountBalance,
  getUserBalance,
  getUserBalanceById,
  createPayout
};