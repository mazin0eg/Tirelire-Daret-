import mongoose from "mongoose";

const tourSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  
  groupId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Group", 
    required: true 
  },
  
  amount: { 
    type: Number, 
    required: true,
    min: 1
  }, 
  
  frequency: { 
    type: String, 
    required: true,
    enum: ["daily", "weekly", "biweekly", "monthly", "quarterly"]
  },
  
  totalRounds: { 
    type: Number, 
    required: true,
    min: 2
  }, 
  
  currentRound: { 
    type: Number, 
    default: 1,
    min: 1
  },
  

  status: { 
    type: String, 
    enum: ["pending", "active", "paused", "completed", "cancelled"],
    default: "pending"
  },
  

  startDate: { 
    type: Date,
    required: true
  },
  
  nextRoundDate: { 
    type: Date 
  }, 
  
  completedAt: { 
    type: Date 
  },
  
  
  members: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    username: { 
      type: String, 
      required: true 
    },
    position: { 
      type: Number, 
      required: true,
      min: 1
    }, 
    hasReceived: { 
      type: Boolean, 
      default: false 
    },
    receivedDate: { 
      type: Date 
    },
    joinedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  rules: {
    allowLatePayments: { 
      type: Boolean, 
      default: false 
    },
    latePenaltyAmount: { 
      type: Number, 
      default: 0 
    },
    maxLatenessDays: { 
      type: Number, 
      default: 7 
    },
    requireAllPaymentsBeforeDistribution: { 
      type: Boolean, 
      default: true 
    }
  }
});

tourSchema.index({ groupId: 1 });
tourSchema.index({ status: 1 });
tourSchema.index({ createdBy: 1 });
tourSchema.index({ startDate: 1 });

tourSchema.virtual('totalTourValue').get(function() {
  return this.amount * this.totalRounds;
});

tourSchema.virtual('currentBeneficiary').get(function() {
  return this.members.find(member => member.position === this.currentRound);
});

tourSchema.methods.getNextBeneficiary = function() {
  const nextRound = this.currentRound + 1;
  if (nextRound <= this.totalRounds) {
    return this.members.find(member => member.position === nextRound);
  }
  return null;
};

tourSchema.methods.isComplete = function() {
  return this.currentRound > this.totalRounds || 
         this.members.every(member => member.hasReceived);
};

tourSchema.methods.advanceToNextRound = function() {
  if (this.currentRound < this.totalRounds) {
    this.currentRound += 1;
    const nextDate = new Date(this.nextRoundDate || this.startDate);
    switch (this.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
    }
    this.nextRoundDate = nextDate;
    
    if (this.isComplete()) {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
};

tourSchema.pre('save', function(next) {
  if (this.members.length > 0 && this.totalRounds !== this.members.length) {
    return next(new Error('Total rounds must equal number of members'));
  }
  
  const positions = this.members.map(m => m.position).sort((a, b) => a - b);
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] !== i + 1) {
      return next(new Error('Member positions must be sequential starting from 1'));
    }
  }
  
  next();
});

const Tour = mongoose.model("Tour", tourSchema);
export default Tour;