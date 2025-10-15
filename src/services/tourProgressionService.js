import Tour from '../moduls/tour.model.js';

// Function to check and advance tours that are due for next round
export const checkAndAdvanceTours = async () => {
  try {
    const now = new Date();
    
    // Find all active tours where nextRoundDate has passed
    const toursToAdvance = await Tour.find({
      status: 'active',
      nextRoundDate: { $lte: now },
      $expr: { $lt: ['$currentRound', '$totalRounds'] } // currentRound < totalRounds
    });

    console.log(`Found ${toursToAdvance.length} tours ready to advance`);

    for (const tour of toursToAdvance) {
      try {
        console.log(`Advancing tour ${tour._id} from round ${tour.currentRound} to ${tour.currentRound + 1}`);
        
        // Mark current round beneficiary as received if not already
        const currentBeneficiary = tour.members.find(member => member.position === tour.currentRound);
        if (currentBeneficiary && !currentBeneficiary.hasReceived) {
          currentBeneficiary.hasReceived = true;
          currentBeneficiary.receivedDate = new Date();
        }
        
        // Advance to next round
        tour.advanceToNextRound();
        
        // Save the updated tour
        await tour.save();
        
        console.log(`Tour ${tour._id} advanced to round ${tour.currentRound}`);
        
      } catch (error) {
        console.error(`Error advancing tour ${tour._id}:`, error.message);
      }
    }
    
    return toursToAdvance.length;
  } catch (error) {
    console.error('Error in checkAndAdvanceTours:', error);
    return 0;
  }
};

// Function to manually advance a specific tour
export const advanceTourRound = async (tourId) => {
  try {
    const tour = await Tour.findById(tourId);
    
    if (!tour) {
      throw new Error('Tour not found');
    }
    
    if (tour.status !== 'active') {
      throw new Error(`Cannot advance tour with status: ${tour.status}`);
    }
    
    if (tour.currentRound >= tour.totalRounds) {
      throw new Error('Tour is already complete');
    }
    
    // Mark current round beneficiary as received
    const currentBeneficiary = tour.members.find(member => member.position === tour.currentRound);
    if (currentBeneficiary && !currentBeneficiary.hasReceived) {
      currentBeneficiary.hasReceived = true;
      currentBeneficiary.receivedDate = new Date();
    }
    
    // Advance to next round
    tour.advanceToNextRound();
    
    await tour.save();
    
    return tour;
  } catch (error) {
    throw error;
  }
};

// Cron job function - call this every hour or daily
export const startTourProgressionCron = () => {
  // Check tours every hour
  setInterval(async () => {
    console.log('Checking tours for round progression...');
    const advancedCount = await checkAndAdvanceTours();
    if (advancedCount > 0) {
      console.log(`Advanced ${advancedCount} tours`);
    }
  }, 60 * 60 * 1000); // 1 hour = 60 * 60 * 1000 milliseconds
  
  console.log('Tour progression cron job started (runs every hour)');
};