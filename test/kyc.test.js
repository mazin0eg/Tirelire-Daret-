import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import User from "../src/moduls/user.model.js";
import path from "path";
import fs from "fs";

let mongoServer;
let authToken;
let userId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany();
});

beforeEach(async () => {
  const registerRes = await request(app)
    .post("/register")
    .send({ username: "testuser", password: "testpass123" });
    
  const loginRes = await request(app)
    .post("/login")
    .send({ username: "testuser", password: "testpass123" });
    
  authToken = loginRes.body.accessToken;
  
  const user = await User.findOne({ username: "testuser" });
  userId = user._id;
});

describe("KYC API", () => {
  test("should check if ID card number is unique", async () => {
    const res = await request(app)
      .post("/kyc/check-unique")
      .send({ idCardNumber: "K01234567" });

    expect(res.statusCode).toBe(200);
    expect(res.body.unique).toBe(true);
    expect(res.body.message).toBe("Numéro de carte d'identité disponible");
  });

  test("should return error for missing ID card number in unique check", async () => {
    const res = await request(app)
      .post("/kyc/check-unique")
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("idCardNumber requis");
  });

  test("should get KYC status for authenticated user", async () => {
    const res = await request(app)
      .get("/kyc/status")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.kyc).toBeDefined();
    expect(res.body.kyc.status).toBe("not_submitted");
  });

  test("should return unauthorized for KYC status without token", async () => {
    const res = await request(app)
      .get("/kyc/status");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("No token provided");
  });

  test("should submit KYC with mock files", async () => {
    const testImageBuffer = Buffer.from("fake image data");
    
    const res = await request(app)
      .post("/kyc/submit")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("idCard", testImageBuffer, "idcard.jpg")
      .attach("selfie", testImageBuffer, "selfie.jpg")
      .field("idCardNumber", "K01234567");

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("KYC soumis");
    expect(res.body.result).toBeDefined();
    expect(res.body.user).toBeDefined();
  });

  test("should return error for KYC submission without files", async () => {
    const res = await request(app)
      .post("/kyc/submit")
      .set("Authorization", `Bearer ${authToken}`)
      .field("idCardNumber", "K01234567");

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Veuillez fournir idCard et selfie");
  });

  test("should return error for KYC submission without ID card number", async () => {
    const testImageBuffer = Buffer.from("fake image data");
    
    const res = await request(app)
      .post("/kyc/submit")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("idCard", testImageBuffer, "idcard.jpg")
      .attach("selfie", testImageBuffer, "selfie.jpg");

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("idCardNumber requis");
  });

  test("should detect duplicate ID card number", async () => {
    const user1 = new User({
      username: "user1",
      password: "pass123",
      kyc: { idCardNumber: "K01234567", status: "verified" }
    });
    await user1.save();

    const res = await request(app)
      .post("/kyc/check-unique")
      .send({ idCardNumber: "K01234567" });

    expect(res.statusCode).toBe(200);
    expect(res.body.unique).toBe(false);
    expect(res.body.message).toBe("Ce numéro de carte d'identité est déjà utilisé");
  });

  test("should approve KYC by admin", async () => {
    const res = await request(app)
      .post(`/kyc/${userId}/approve`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("KYC approuvé");
    expect(res.body.user).toBeDefined();
  });

  test("should reject KYC by admin", async () => {
    const res = await request(app)
      .post(`/kyc/${userId}/reject`)
      .send({ reason: "Invalid documents" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("KYC rejeté");
    expect(res.body.user).toBeDefined();
  });

  test("should return error for approving non-existent user", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const res = await request(app)
      .post(`/kyc/${fakeId}/approve`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  test("should return error for rejecting non-existent user", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const res = await request(app)
      .post(`/kyc/${fakeId}/reject`)
      .send({ reason: "Test rejection" });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
  });
});