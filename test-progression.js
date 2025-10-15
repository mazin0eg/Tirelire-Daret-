import mongoose from 'mongoose';
import User from './src/moduls/user.model.js';
import Group from './src/moduls/group.model.js';
import Tour from './src/moduls/tour.model.js';
import { checkAndAdvanceTours } from './src/services/tourProgressionService.js';

// Test if automatic round progression works
async function testTourProgression() {
  try {
    console.log('🔄 Testing Tour Progression...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_PATH || 'mongodb://localhost:27017/tirelire-daret');
    console.log('✅ Connected to database');

    // Clean up previous test data
    await Tour.deleteMany({ name: 'Test Tour Progression' });
    await Group.deleteMany({ name: 'Test Group Progression' });
    await User.deleteMany({ username: { $in: ['test-owner', 'test-member1'] } });

    // Create test users
    const owner = await User.create({
      username: 'test-owner',
      password: 'password123'
    });

    const member1 = await User.create({
      username: 'test-member1', 
      password: 'password123'
    });

    console.log('✅ Created test users');

    // Create test group
    const group = await Group.create({
      name: 'Test Group Progression',
      description: 'Test group for progression',
      owner: {
        userId: owner._id,
        username: owner.username
      },
      members: [{
        userId: member1._id,
        username: member1.username,
        joinedAt: new Date()
      }]
    });

    console.log('✅ Created test group');

    // Create tour with PAST nextRoundDate (should be ready to advance)
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 30); // 30 minutes ago

    const tour = await Tour.create({
      name: 'Test Tour Progression',
      description: 'Testing automatic progression',
      groupId: group._id,
      amount: 1000,
      frequency: 'daily',
      totalRounds: 3,
      currentRound: 1, // Starting at round 1
      status: 'active',
      startDate: pastDate,
      nextRoundDate: pastDate, // This is in the PAST, so should trigger advancement
      members: [
        {
          userId: owner._id,
          username: owner.username,
          position: 1,
          hasReceived: false,
          joinedAt: new Date()
        },
        {
          userId: member1._id,
          username: member1.username,
          position: 2,
          hasReceived: false,
          joinedAt: new Date()
        },
        {
          userId: owner._id, // Using owner again for 3rd position
          username: owner.username + '-3',
          position: 3,
          hasReceived: false,
          joinedAt: new Date()
        }
      ],
      createdBy: owner._id
    });

    console.log('✅ Created test tour');
    console.log(`   📊 Initial state:`);
    console.log(`      - Current Round: ${tour.currentRound}`);
    console.log(`      - Next Round Date: ${tour.nextRoundDate}`);
    console.log(`      - Status: ${tour.status}`);
    console.log(`      - Current beneficiary (position ${tour.currentRound}): ${tour.members.find(m => m.position === tour.currentRound)?.username}`);

    // Test automatic progression
    console.log('\n🚀 Testing automatic progression...');
    const advancedCount = await checkAndAdvanceTours();

    console.log(`✅ Automatic check completed - ${advancedCount} tour(s) advanced`);

    // Check the updated tour
    const updatedTour = await Tour.findById(tour._id);

    console.log(`\n📊 After progression:`);
    console.log(`   - Current Round: ${updatedTour.currentRound} (was ${tour.currentRound})`);
    console.log(`   - Next Round Date: ${updatedTour.nextRoundDate}`);
    console.log(`   - Status: ${updatedTour.status}`);
    
    // Check beneficiary status
    const previousBeneficiary = updatedTour.members.find(m => m.position === 1);
    const currentBeneficiary = updatedTour.members.find(m => m.position === updatedTour.currentRound);
    
    console.log(`   - Previous beneficiary (position 1): hasReceived = ${previousBeneficiary.hasReceived}`);
    console.log(`   - Current beneficiary (position ${updatedTour.currentRound}): ${currentBeneficiary?.username || 'None'}`);

    // Test results
    if (updatedTour.currentRound > tour.currentRound) {
      console.log('\n🎉 SUCCESS: Current round advanced automatically!');
      console.log(`   ✅ Round progressed from ${tour.currentRound} to ${updatedTour.currentRound}`);
      console.log(`   ✅ Previous beneficiary marked as received: ${previousBeneficiary.hasReceived}`);
      console.log(`   ✅ Next round date updated: ${updatedTour.nextRoundDate}`);
    } else {
      console.log('\n❌ FAILED: Current round did NOT advance');
      console.log('   This could happen if:');
      console.log('   - The nextRoundDate is not in the past');
      console.log('   - The tour status is not "active"');
      console.log('   - The tour is already at the final round');
    }

    // Clean up
    await Tour.findByIdAndDelete(tour._id);
    await Group.findByIdAndDelete(group._id);
    await User.findByIdAndDelete(owner._id);
    await User.findByIdAndDelete(member1._id);

    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from database');
  }
}

// Run the test
testTourProgression();