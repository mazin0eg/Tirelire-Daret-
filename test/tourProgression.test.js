import supertest from "supertest";
import app from "../src/app.js";
import User from "../src/moduls/user.model.js";
import Group from "../src/moduls/group.model.js";
import Tour from "../src/moduls/tour.model.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";

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
    await Group.deleteMany();
    await Tour.deleteMany();
});

describe("Tour Progression API", () => {
    
    test("get current round info for a tour", async () => {
        const owner = await User.create({ username: "owner", password: "pass123" });
        const member1 = await User.create({ username: "member1", password: "pass123" });

        const group = await Group.create({
            name: "Test Group",
            owner: { userId: owner._id, username: owner.username },
            members: [{ userId: member1._id, username: member1.username }]
        });

        const tour = await Tour.create({
            name: "Test Tour",
            groupId: group._id,
            amount: 1000,
            frequency: 'weekly',
            totalRounds: 2,
            currentRound: 1,
            status: 'active',
            startDate: new Date(),
            nextRoundDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            members: [
                { userId: owner._id, username: owner.username, position: 1, hasReceived: false, joinedAt: new Date() },
                { userId: member1._id, username: member1.username, position: 2, hasReceived: false, joinedAt: new Date() }
            ],
            createdBy: owner._id
        });

        const token = jwt.sign({ userId: owner._id }, process.env.ACCESS_WEB_TOKEN || 'test-secret');

        const res = await supertest(app)
            .get(`/tour/${tour._id}/current-round`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.currentRound).toBe(1);
        expect(res.body.totalRounds).toBe(2);
        expect(res.body.status).toBe('active');
    });

    test("manually advance tour to next round", async () => {
        const owner = await User.create({ username: "owner", password: "pass123" });
        const member1 = await User.create({ username: "member1", password: "pass123" });

        const group = await Group.create({
            name: "Test Group",
            owner: { userId: owner._id, username: owner.username },
            members: [{ userId: member1._id, username: member1.username }]
        });

        const tour = await Tour.create({
            name: "Test Tour",
            groupId: group._id,
            amount: 1000,
            frequency: 'weekly',
            totalRounds: 2,
            currentRound: 1,
            status: 'active',
            startDate: new Date(),
            members: [
                { userId: owner._id, username: owner.username, position: 1, hasReceived: false, joinedAt: new Date() },
                { userId: member1._id, username: member1.username, position: 2, hasReceived: false, joinedAt: new Date() }
            ],
            createdBy: owner._id
        });

        const token = jwt.sign({ userId: owner._id }, process.env.ACCESS_WEB_TOKEN || 'test-secret');

        const res = await supertest(app)
            .post(`/tour/${tour._id}/advance`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('Tour avancé au round 2');
        expect(res.body.tour.currentRound).toBe(2);
    });

    test("check tours progress", async () => {
        const res = await supertest(app).post('/tours/check-progress');

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('Vérifié les tours en cours');
        expect(res.body.toursAdvanced).toBeDefined();
    });

    test("should not allow non-creator to advance tour", async () => {
        const owner = await User.create({ username: "owner", password: "pass123" });
        const member1 = await User.create({ username: "member1", password: "pass123" });

        const group = await Group.create({
            name: "Test Group",
            owner: { userId: owner._id, username: owner.username },
            members: [{ userId: member1._id, username: member1.username }]
        });

        const tour = await Tour.create({
            name: "Test Tour",
            groupId: group._id,
            amount: 1000,
            frequency: 'weekly',
            totalRounds: 2,
            currentRound: 1,
            status: 'active',
            startDate: new Date(),
            members: [
                { userId: owner._id, username: owner.username, position: 1, hasReceived: false, joinedAt: new Date() },
                { userId: member1._id, username: member1.username, position: 2, hasReceived: false, joinedAt: new Date() }
            ],
            createdBy: owner._id
        });

        const token = jwt.sign({ userId: member1._id }, process.env.ACCESS_WEB_TOKEN || 'test-secret');

        const res = await supertest(app)
            .post(`/tour/${tour._id}/advance`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(403);
        expect(res.body.message).toContain('Seul le créateur peut avancer le tour');
    });
});