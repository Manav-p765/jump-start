// Booking model — one document per counselling slot reservation.
//
// Separate collection rather than an array on User (unlike purchaseHistory)
// because the uniqueness constraint that makes slots exclusive is a
// collection-level index, and an embedded array cannot carry one.
//
// SLOT REPRESENTATION
// -------------------
// `slotStart` is the single canonical key: the UTC instant the session
// begins. Chosen over a (slotDate, slotTime) string pair because:
//   - "is this slot in the past" is a direct comparison against now, with no
//     parsing and no ambiguity;
//   - the Phase 3 admin view wants date-range queries and chronological
//     sort, which are native on a Date and awkward on strings;
//   - one field cannot drift out of sync with itself. A pair can.
// `slotLabel` and `slotDate` are denormalised DISPLAY snapshots — never
// queried for uniqueness, never authoritative. config/counselling.js owns
// the conversion in both directions.
//
// SLOT EXCLUSIVITY
// ----------------
// `activeSlotKey` holds the slot's ISO instant while this booking occupies
// it, and is set to null the moment the booking stops occupying it
// (expired / cancelled). The unique partial index below therefore contains
// exactly the live holds.
//
// Why a nullable key rather than filtering the index on
// `status: { $in: ["reserved", "booked"] }`: $in inside a
// partialFilterExpression is not supported on every server version this
// might be deployed against, whereas `$type` is supported universally.
// Releasing a slot also becomes a single field write instead of depending on
// the index re-evaluating a status transition.
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // --- Slot ---------------------------------------------------------
    slotStart: { type: Date, required: true, index: true },
    // Display snapshots (IST wall clock), for the admin table and receipts.
    slotDate: { type: String, default: "" }, // "YYYY-MM-DD"
    slotLabel: { type: String, default: "" }, // "03:00 PM"

    // Null unless this booking currently occupies the slot. See the note
    // above — this is what the unique index keys on.
    activeSlotKey: { type: String, default: null },

    status: {
      type: String,
      enum: ["reserved", "booked", "expired", "cancelled"],
      default: "reserved",
      index: true,
    },

    reservedAt: { type: Date, default: Date.now },
    reservationExpiresAt: { type: Date, required: true },

    // --- Gateway ------------------------------------------------------
    // orderId is assigned when the reservation is created; paymentId only
    // once a payment succeeds. Both sparse-unique so unpaid reservations'
    // nulls do not collide.
    razorpayOrderId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    // Deliberately NO `default: null`. A sparse index skips documents where
    // the field is ABSENT, but an explicit null is a value and IS indexed —
    // so a default made every unpaid reservation insert null, and the second
    // one collided with E11000 on the duplicate null. That surfaced as a 500
    // and masked the real slot-conflict 409. Left unset here; only assigned
    // once a real payment id exists (bookingService.confirmBookingPaid).
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    receipt: { type: String, default: null },
    amount: { type: Number, required: true }, // paise
    currency: { type: String, default: "INR" },
    notes: { type: mongoose.Schema.Types.Mixed, default: {} },

    // --- Session ------------------------------------------------------
    // One type today; the field exists so adding phone/in-person later is a
    // data change rather than a migration.
    sessionType: { type: String, default: "video" },
    // Snapshotted from config at reservation time, so editing the configured
    // duration never rewrites history.
    durationMinutes: { type: Number, required: true },

    // --- Webhook audit trail -------------------------------------------
    // Mirrors Payment. A FULL processed refund cancels the booking and
    // frees the slot (bookingService.cancelBookingForRefund); a partial
    // one is recorded only.
    refundId: { type: String, default: null },
    refundStatus: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    // PAISE, running total of processed refunds. Same rules as Payment.
    refundAmount: { type: Number, default: null },
    processedRefundIds: { type: [String], default: [] },
    // Set when the booking is cancelled. cancelReason "refunded" marks a
    // cancellation caused by a full refund.
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
    webhookEventsSeen: { type: [String], default: [] },
    failureReason: { type: String, default: null },

    // Set when a payment landed but the slot had already been taken by a
    // different booking. Flags the row for manual refund / rebooking.
    conflictedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// THE collision guard. One live hold per slot instant; expired and cancelled
// rows carry activeSlotKey: null and are invisible to it, so they neither
// block the slot nor lose their audit trail.
bookingSchema.index(
  { activeSlotKey: 1 },
  {
    unique: true,
    partialFilterExpression: { activeSlotKey: { $type: "string" } },
    name: "uniq_active_slot",
  }
);

// Availability reads one IST day at a time.
bookingSchema.index({ slotStart: 1, status: 1 });

export default mongoose.model("Booking", bookingSchema);
