import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";
import User from "../src/moduls/user.model.js";

let mongoServer;

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

describe("User API", () => {
  test("register a new user", async () => {
    const res = await request(app).post("/register")
      .send({ username: "mazine", password: "mazine123" });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("User registered successfully");
  });


  test("login the user ", async () => {
    await request(app).post("/register")
      .send({ username: "mazine", password: "mazine123" });

    const res = await request(app).post("/login")
      .send({ username: "mazine", password: "mazine123" })
    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });


  test("get  the user ", async () => {
    await request(app).post("/register")
      .send({ username: "mazine", password: "mazine123" });

    const loginRes = await request(app)
      .post("/login")
      .send({ username: "mazine", password: "mazine123" });

    const accessToken = loginRes.body.accessToken;
    expect(accessToken).toBeDefined();

    const res = await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.username).toBe("mazine");
  });
});
