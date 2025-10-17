import Stripe from 'stripe';
import User from '../moduls/user.model.js';
import Tour from '../moduls/tour.model.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class StripeService {
  
  static async createConnectAccount(userId, email, country = 'US') {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: country,
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      await User.findByIdAndUpdate(userId, {
        'stripeAccount.accountId': account.id,
        'stripeAccount.status': 'pending'
      });

      return account;
    } catch (error) {
      throw new Error(`Stripe account creation failed: ${error.message}`);
    }
  }

  static async createAccountLink(accountId, userId) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.FRONTEND_URL}/stripe/refresh?userId=${userId}`,
        return_url: `${process.env.FRONTEND_URL}/stripe/success?userId=${userId}`,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error) {
      throw new Error(`Account link creation failed: ${error.message}`);
    }
  }

  static async createCustomer(userId, email, name) {
    try {
      const customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: { userId: userId }
      });

      await User.findByIdAndUpdate(userId, {
        'stripeAccount.customerId': customer.id
      });

      return customer;
    } catch (error) {
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  static async attachPaymentMethod(customerId, paymentMethodId) {
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return true;
    } catch (error) {
      throw new Error(`Payment method attachment failed: ${error.message}`);
    }
  }

  static async chargeAllMembers(tourId) {
    try {
      const tour = await Tour.findById(tourId).populate('members.userId');
      if (!tour) throw new Error('Tour not found');

      const currentMember = tour.members.find(m => m.position === tour.currentRound);
      if (!currentMember) throw new Error('Current member not found');

      const recipients = tour.members.filter(m => m.position !== tour.currentRound);
      const charges = [];

      for (const member of recipients) {
        const user = member.userId;
        if (!user.stripeAccount?.customerId) {
          throw new Error(`User ${user.username} has no payment method`);
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: tour.amount * 100,
          currency: 'usd',
          customer: user.stripeAccount.customerId,
          payment_method: user.stripeAccount.defaultPaymentMethod,
          confirm: true,
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          transfer_data: {
            destination: currentMember.userId.stripeAccount.accountId,
          },
          application_fee_amount: Math.round(tour.amount * 0.03 * 100),
          metadata: {
            tourId: tourId,
            round: tour.currentRound,
            payerId: user._id.toString(),
            recipientId: currentMember.userId._id.toString()
          }
        });

        charges.push({
          userId: user._id,
          paymentIntentId: paymentIntent.id,
          amount: tour.amount,
          status: paymentIntent.status
        });
      }

      await Tour.findByIdAndUpdate(tourId, {
        [`rounds.${tour.currentRound - 1}.payments`]: charges,
        [`rounds.${tour.currentRound - 1}.status`]: 'processing'
      });

      setTimeout(() => {
        this.checkPaymentStatusAndAdvance(tourId);
      }, 5000);

      return {
        success: true,
        totalAmount: tour.amount * recipients.length,
        recipientAmount: tour.amount * recipients.length * 0.97,
        feeAmount: tour.amount * recipients.length * 0.03,
        charges
      };

    } catch (error) {
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  static async checkPaymentStatusAndAdvance(tourId) {
    try {
      const tour = await Tour.findById(tourId);
      if (!tour) return;

      const currentRoundPayments = tour.rounds[tour.currentRound - 1]?.payments || [];
      
      for (let payment of currentRoundPayments) {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
        
        await Tour.updateOne(
          { 
            _id: tourId, 
            'rounds.payments.paymentIntentId': payment.paymentIntentId 
          },
          { 
            $set: { 
              'rounds.$.payments.$.status': paymentIntent.status,
              'rounds.$.payments.$.completedAt': paymentIntent.status === 'succeeded' ? new Date() : null
            } 
          }
        );
      }

      const updatedTour = await Tour.findById(tourId);
      const updatedPayments = updatedTour.rounds[tour.currentRound - 1]?.payments || [];
      const allPaid = updatedPayments.every(p => p.status === 'succeeded');

      if (allPaid) {
        await Tour.findByIdAndUpdate(tourId, {
          [`rounds.${tour.currentRound - 1}.status`]: 'completed',
          [`rounds.${tour.currentRound - 1}.completedAt`]: new Date()
        });

        if (tour.currentRound < tour.totalRounds) {
          await this.advanceToNextRound(tourId);
        } else {
          await Tour.findByIdAndUpdate(tourId, { status: 'completed' });
        }
      }

    } catch (error) {
      console.error('Payment status check failed:', error);
    }
  }

  static async advanceToNextRound(tourId) {
    const tour = await Tour.findById(tourId);
    const nextRound = tour.currentRound + 1;
    const nextRoundDate = this.calculateNextRoundDate(tour.nextRoundDate, tour.frequency);

    await Tour.findByIdAndUpdate(tourId, {
      currentRound: nextRound,
      nextRoundDate: nextRoundDate,
      [`rounds.${nextRound - 1}`]: {
        round: nextRound,
        recipient: tour.members.find(m => m.position === nextRound),
        startDate: new Date(),
        endDate: nextRoundDate,
        status: 'active',
        payments: []
      }
    });

    setTimeout(() => {
      this.chargeAllMembers(tourId);
    }, 1000);
  }

  static calculateNextRoundDate(currentDate, frequency) {
    const nextDate = new Date(currentDate);
    
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
  }

  static async getAccountBalance(accountId) {
    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: accountId,
      });
      return balance;
    } catch (error) {
      throw new Error(`Balance retrieval failed: ${error.message}`);
    }
  }

  static async createPayout(accountId, amount, currency = 'usd') {
    try {
      const payout = await stripe.payouts.create({
        amount: amount * 100,
        currency: currency,
      }, {
        stripeAccount: accountId,
      });
      return payout;
    } catch (error) {
      throw new Error(`Payout creation failed: ${error.message}`);
    }
  }
}

export default StripeService;