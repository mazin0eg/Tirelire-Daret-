# Tirelire-Daret

A group savings platform with face verification and Stripe payments for rotating savings groups (tours).

## Features

- 🔐 **User Authentication** - JWT-based authentication system
- 👤 **Face Verification** - KYC using face-api.js for identity verification
- 💰 **Stripe Payments** - Integrated payment processing with Stripe Connect
- 🏦 **Group Savings Tours** - Rotating savings groups with automatic progression
- 📱 **RESTful API** - Complete API for frontend integration

## Quick Start

### Prerequisites
- Node.js (v20+)
- MongoDB
- Stripe Account

### Installation

1. Clone the repository
```bash
git clone https://github.com/mazin0eg/Tirelire-Daret-.git
cd Tirelire-Daret-
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.exemple .env
# Edit .env with your configuration
```

4. Start the application
```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tirelire-daret
ACCESS_WEB_TOKEN=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_key
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login

### Groups
- `POST /groups` - Create group
- `GET /groups` - Get user groups
- `POST /groups/join` - Join group

### Tours
- `GET /tours` - Get tours
- `POST /tours` - Create tour

### Payments
- `POST /stripe/create-account` - Create Stripe account
- `POST /stripe/charge-members/:tourId` - Process payments
- `GET /stripe/balance/id/:userId` - Get user balance

### KYC
- `POST /upload-id-card` - Upload ID card
- `POST /upload-face-image` - Upload face image
- `POST /verify-face` - Verify face against ID

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm test users.test.js
```

## Project Structure

```
src/
├── controllers/     # API controllers
├── middleware/      # Express middleware
├── moduls/         # Database models
├── services/       # Business logic
├── app.js          # Express app setup
└── server.js       # Server entry point
test/               # Test files
uploads/            # File uploads
```

## Contributing

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

ISC License