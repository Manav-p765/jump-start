// Regression test: a user's jumpstartId must never be re-issued on save.
//
// patchTestProgress used to load the user with a .select() that omitted
// jumpstartId, and the User pre-save hook read the empty field as "no ID"
// and assigned a new one, so every test autosave changed the student's ID.
//
// Needs a THROWAWAY MongoDB (the database is dropped at the end):
//   docker run -d --rm --name js-test -p 127.0.0.1:27098:27017 mongo:7
//   JUMPSTART_TEST_MONGODB_URI=mongodb://127.0.0.1:27098/jumpstart_test \
//     node --test tests/
// Refuses to run against anything that isn't localhost.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const URI = process.env.JUMPSTART_TEST_MONGODB_URI || "";
const isLocalUri = /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(URI);
const skip = !isLocalUri
  ? "set JUMPSTART_TEST_MONGODB_URI to a local throwaway mongodb:// URI"
  : false;

let User;
let patchTestProgress;

before(async () => {
  if (skip) return;
  process.env.JWT_SECRET ||= "test-secret";
  ({ default: User } = await import("../models/User.js"));
  ({ patchTestProgress } = await import("../controllers/userController.js"));
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await User.init();
});

after(async () => {
  if (skip) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const PACKAGE_ID = "complete-aptitude-500q-gujarati";

const createStudent = async (email) => {
  const user = await User.create({
    name: "Test Student",
    email,
    password: "secret123",
    purchasedPackages: [PACKAGE_ID],
    selectedPackageId: PACKAGE_ID,
  });
  return user;
};

const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const storedId = async (userId) =>
  (await User.findById(userId).select("jumpstartId").lean()).jumpstartId;

test("5 test autosaves keep the same jumpstartId", { skip }, async () => {
  // A second user first, so the count-based candidate differs from the
  // student's own ID (the old bug flipped between N and N+1).
  await createStudent("other@test.local");
  const student = await createStudent("autosave@test.local");
  const original = await storedId(student._id);
  assert.match(original, /^JS-\d{4}-\d{5}$/);

  for (let i = 0; i < 5; i += 1) {
    const res = mockRes();
    await patchTestProgress(
      {
        user: { id: String(student._id) },
        body: {
          sectionId: 1,
          questionIndex: i,
          answers: { [`1-${i}`]: 3 },
          timeRemainingSeconds: 1500 - i * 10,
        },
      },
      res
    );
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(await storedId(student._id), original, `changed on autosave ${i + 1}`);
  }
});

test("saving a document loaded without jumpstartId keeps the stored ID", { skip }, async () => {
  const student = await createStudent("partial@test.local");
  const original = await storedId(student._id);

  for (let i = 0; i < 5; i += 1) {
    const partial = await User.findById(student._id).select("testsInProgress");
    partial.testsInProgress = i;
    await partial.save();
    assert.equal(await storedId(student._id), original, `changed on save ${i + 1}`);
  }
});

test("a user with no stored jumpstartId gets one, once", { skip }, async () => {
  const student = await createStudent("legacy@test.local");
  await User.collection.updateOne({ _id: student._id }, { $unset: { jumpstartId: "" } });
  assert.equal(await storedId(student._id), undefined);

  const legacy = await User.findById(student._id);
  legacy.testsInProgress = 1;
  await legacy.save();
  const assigned = await storedId(student._id);
  assert.match(assigned, /^JS-\d{4}-\d{5}$/);

  const again = await User.findById(student._id).select("testsInProgress");
  again.testsInProgress = 2;
  await again.save();
  assert.equal(await storedId(student._id), assigned);
});
