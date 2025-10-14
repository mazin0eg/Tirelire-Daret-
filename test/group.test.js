import supertest from "supertest";
import app from "../src/app.js";
import User from "../src/moduls/user.model.js";
import Group from "../src/moduls/group.model.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

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
});

describe("group API", () => {
    
    test("create new group successfully", async () => {
        const owner = await User.create({ username: "owner", password: "pass123" });
        const user1 = await User.create({ username: "hind", password: "pass123" });
        const user2 = await User.create({ username: "youssef", password: "pass456" });

        // Use manual endpoint for testing (no auth required)
        const res = await supertest(app)
            .post("/group/manual")
            .send({name: "Group A", ownerId: owner._id, memberIds: [user1._id, user2._id] });


        expect(res.statusCode).toBe(201);
        expect(res.body.group).toBeDefined();
        expect(res.body.group.name).toBe("Group A");
        expect(res.body.group.owner).toBeDefined();
        expect(res.body.group.owner.username).toBe("owner");
        expect(res.body.group.members.length).toBe(2);
        expect(res.body.group.members[0]).toHaveProperty("username");
        expect(res.body.group.members[0]).toHaveProperty("userId");
        expect(res.body.group.members[0]).toHaveProperty("joinedAt");

    });
});
