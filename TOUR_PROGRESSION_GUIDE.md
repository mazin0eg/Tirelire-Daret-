# Tour Progression System

## Problem Solved
Your tours now automatically advance to the next round when the `nextRoundDate` arrives. The `currentRound` will increment automatically without manual intervention.

## How It Works

### 1. Automatic Progression (Recommended)
- **Cron Job**: Runs every hour to check if any tours need to advance
- **Automatic Detection**: Finds tours where `nextRoundDate` has passed
- **Auto-Advance**: Moves to next round, marks previous beneficiary as received
- **Auto-Complete**: Sets status to 'completed' when tour finishes

### 2. Manual Progression (Backup Option)
- **Creator Control**: Tour creators can manually advance rounds
- **Admin Check**: Special endpoint to check all tours at once

## API Endpoints

### Check All Tours for Progression
```http
POST /tours/check-progress
```
**Response:**
```json
{
  "message": "Vérifié les tours en cours",
  "toursAdvanced": 2
}
```

### Get Current Round Info
```http
GET /tour/:tourId/current-round
Authorization: Bearer <token>
```
**Response:**
```json
{
  "tourId": "67890...",
  "tourName": "Family Savings",
  "currentRound": 3,
  "totalRounds": 5,
  "nextRoundDate": "2025-10-22T10:00:00Z",
  "isOverdue": false,
  "status": "active",
  "currentBeneficiary": {
    "userId": "12345...",
    "username": "Alice",
    "position": 3,
    "hasReceived": false
  },
  "nextBeneficiary": {
    "userId": "67890...",
    "username": "Bob",
    "position": 4,
    "hasReceived": false
  },
  "isComplete": false
}
```

### Manually Advance Tour (Creator Only)
```http
POST /tour/:tourId/advance
Authorization: Bearer <token>
```
**Response:**
```json
{
  "message": "Tour avancé au round 4",
  "tour": { /* tour object */ }
}
```

## Tour Progression Logic

### When Tour Advances:
1. **Current Beneficiary**: Marked as `hasReceived: true`, `receivedDate` set
2. **Current Round**: Incremented by 1
3. **Next Round Date**: Calculated based on frequency
4. **Status Check**: If all rounds complete, status becomes 'completed'

### Frequency Calculations:
- `daily`: +1 day
- `weekly`: +7 days  
- `biweekly`: +14 days
- `monthly`: +1 month
- `quarterly`: +3 months

## Testing the System

### 1. Create a Test Tour
```javascript
// Create tour with near-future nextRoundDate
const tour = {
  name: "Test Tour",
  groupId: "your-group-id",
  amount: 1000,
  frequency: "daily",
  startDate: "2025-10-15T10:00:00Z" // Today
}
```

### 2. Check Progression
```bash
# Wait for cron job (runs hourly) OR manually trigger
curl -X POST http://localhost:3000/tours/check-progress
```

### 3. Monitor Round Changes
```bash
# Check current round info
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/tour/TOUR_ID/current-round
```

## System Features

### ✅ Automatic Features
- Hourly cron job checks all active tours
- Auto-advance when `nextRoundDate` passes
- Auto-mark beneficiaries as received
- Auto-complete tours when finished
- Calculates next round dates correctly

### 🎛️ Manual Controls  
- Force advance any tour (creator only)
- Check all tours progress on demand
- Get detailed round information
- Override automatic system if needed

### 🔒 Safety Features
- Only advances active tours
- Validates tour isn't already complete
- Preserves tour creator permissions
- Handles edge cases (missing dates, etc.)

## Example Tour Lifecycle

```
Round 1: Alice receives (hasReceived: true)
  ↓ (7 days later for weekly tour)
Round 2: Bob receives (hasReceived: true) 
  ↓ (7 days later)
Round 3: Charlie receives (hasReceived: true)
  ↓ (all rounds complete)
Status: completed, completedAt: timestamp
```

Your tours will now progress automatically! The cron job runs every hour, so tours will advance shortly after their `nextRoundDate` arrives.