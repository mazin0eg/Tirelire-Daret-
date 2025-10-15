// Quick test to verify tour progression is working

import mongoose from 'mongoose';
import User from './src/moduls/user.model.js';  
import Group from './src/moduls/group.model.js';
import Tour from './src/moduls/tour.model.js';

async function quickTest() {
  console.log('🔍 Quick Tour Progression Verification\n');
  
  try {
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/tirelire-daret-test');
    console.log('✅ Connected to test database');

    // Clean up any existing test data
    await User.deleteMany({ username: /^test-/ });
    await Group.deleteMany({ name: /^Test/ });
    await Tour.deleteMany({ name: /^Test/ });

    // Create test data
    const owner = await User.create({ username: 'test-owner', password: 'pass123' });
    const member = await User.create({ username: 'test-member', password: 'pass123' });
    
    const group = await Group.create({
      name: 'Test Group',
      owner: { userId: owner._id, username: owner.username },
      members: [{ userId: member._id, username: member.username, joinedAt: new Date() }]
    });

    // Create tour with overdue nextRoundDate
    const overdueDate = new Date();
    overdueDate.setHours(overdueDate.getHours() - 2); // 2 hours ago

    const tour = await Tour.create({
      name: 'Test Tour',
      groupId: group._id,
      amount: 1000,
      frequency: 'daily',
      totalRounds: 2,
      currentRound: 1, // Starting at round 1
      status: 'active',
      startDate: overdueDate,
      nextRoundDate: overdueDate, // This is overdue!
      members: [
        { userId: owner._id, username: owner.username, position: 1, hasReceived: false, joinedAt: new Date() },
        { userId: member._id, username: member.username, position: 2, hasReceived: false, joinedAt: new Date() }
      ],
      createdBy: owner._id
    });

    console.log('📊 Created tour:');
    console.log(`   - Current Round: ${tour.currentRound}`);
    console.log(`   - Next Round Date: ${tour.nextRoundDate} (${overdueDate < new Date() ? 'OVERDUE' : 'future'})`);
    console.log(`   - Status: ${tour.status}`);

    // Now test the progression by calling the API
    const response = await fetch('http://localhost:3000/tours/check-progress', {
      method: 'POST'
    });
    
    const result = await response.json();
    console.log(`\n🚀 API Response: ${JSON.stringify(result)}`);

    // Check the tour again
    const updatedTour = await Tour.findById(tour._id);
    
    console.log('\n📊 After progression check:');
    console.log(`   - Current Round: ${updatedTour.currentRound} (was ${tour.currentRound})`);
    console.log(`   - Status: ${updatedTour.status}`);
    console.log(`   - Position 1 received: ${updatedTour.members[0].hasReceived}`);

    if (updatedTour.currentRound > tour.currentRound) {
      console.log('\n🎉 SUCCESS: Tour progression is WORKING!');
      console.log(`   ✅ Round advanced from ${tour.currentRound} to ${updatedTour.currentRound}`);
    } else {
      console.log('\n⚠️  No advancement occurred (this could be normal if no tours were overdue)');
    }

    // Cleanup
    await Tour.deleteMany({ name: /^Test/ });
    await Group.deleteMany({ name: /^Test/ });
    await User.deleteMany({ username: /^test-/ });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected');
  }
}

quickTest();