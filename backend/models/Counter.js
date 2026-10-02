// Counter model — named monotonic sequences.
//
// One document per sequence, keyed by a string _id (e.g. "receipt-2026").
// nextSequence() is a single atomic findOneAndUpdate with $inc and upsert,
// so concurrent callers (the /verify request and the Razorpay webhook for
// the same payment, or two different payments) can never draw the same
// number.
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

const Counter = mongoose.model("Counter", counterSchema);

export const nextSequence = async (key) => {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc.seq;
};

export default Counter;
