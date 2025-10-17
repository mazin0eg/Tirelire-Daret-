import Tour from '../moduls/tour.model.js';

export const checkAndAdvanceTours = async () => {
  try {
    const now = new Date();
    
    const toursToAdvance = await Tour.find({
      status: 'active',
      nextRoundDate: { $lte: now },
      $expr: { $lt: ['$currentRound', '$totalRounds'] }
    });

    console.log(`Found ${toursToAdvance.length} tours ready to advance`);

    for (const tour of toursToAdvance) {
      try {
        console.log(`Advancing tour ${tour._id} from round ${tour.currentRound} to ${tour.currentRound + 1}`);
        
        const currentBeneficiary = tour.members.find(member => member.position === tour.currentRound);
        if (currentBeneficiary && !currentBeneficiary.hasReceived) {
          currentBeneficiary.hasReceived = true;
          currentBeneficiary.receivedDate = new Date();
        }
        
        tour.advanceToNextRound();
        
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
    
    const currentBeneficiary = tour.members.find(member => member.position === tour.currentRound);
    if (currentBeneficiary && !currentBeneficiary.hasReceived) {
      currentBeneficiary.hasReceived = true;
      currentBeneficiary.receivedDate = new Date();
    }
    
    tour.advanceToNextRound();
    
    await tour.save();
    
    return tour;
  } catch (error) {
    throw error;
  }
};

export const startTourProgressionCron = () => {
  setInterval(async () => {
    console.log('Checking tours for round progression...');
    const advancedCount = await checkAndAdvanceTours();
    if (advancedCount > 0) {
      console.log(`Advanced ${advancedCount} tours`);
    }
  }, 60 * 60 * 1000);
  
  console.log('Tour progression cron job started (runs every hour)');
};