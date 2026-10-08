// Booking lifecycle helpers shared by the counselling controller and the
// Razorpay webhook.
//
// Lives in its own module for the same reason entitlementService does: two
// callers reach the same transition from different directions (the browser
// coming back through /verify, and Razorpay's webhook arriving with no
// session), and whichever lands second must be a clean no-op.
import Booking from "../models/Booking.js";

/**
 * Release any lapsed reservation holding `slotStart`.
 *
 * The lazy sweep. A TTL index is deliberately not used: it deletes the
 * document, which loses the audit trail of an abandoned checkout, and its
 * ~60s sweep granularity would leave a slot falsely blocked for up to a
 * minute after it should have freed.
 *
 * Availability (§ getAvailability) does not depend on this having run — it
 * filters expired reservations out at read time — so this is purely about
 * clearing the unique index before an insert attempt.
 *
 * @returns {Promise<number>} how many reservations were released
 */
export const sweepExpiredReservations = async (slotStart, now = new Date()) => {
  const res = await Booking.updateMany(
    {
      slotStart,
      status: "reserved",
      reservationExpiresAt: { $lt: now },
    },
    { $set: { status: "expired", activeSlotKey: null } }
  );
  return res.modifiedCount || 0;
};

/** Is some OTHER booking currently holding this slot? */
export const findActiveHolder = async (slotStart, now = new Date()) =>
  Booking.findOne({
    slotStart,
    activeSlotKey: { $type: "string" },
    $or: [
      { status: "booked" },
      { status: "reserved", reservationExpiresAt: { $gt: now } },
    ],
  });

/**
 * Confirm a paid booking. Idempotent on razorpayPaymentId, mirroring
 * grantPackageEntitlement — /verify and the webhook both call this and the
 * second caller does nothing.
 *
 * Returns one of:
 *   { ok: true,  alreadyBooked: bool, booking }  — slot is theirs
 *   { ok: false, reason: "not_found" }
 *   { ok: false, reason: "conflict", booking, holder } — someone else has it
 */
export const confirmBookingPaid = async ({
  booking,
  razorpayPaymentId,
  now = new Date(),
}) => {
  if (!booking) return { ok: false, reason: "not_found" };

  // Already done — either by the other caller, or by a webhook retry.
  if (booking.status === "booked") {
    return { ok: true, alreadyBooked: true, booking };
  }

  if (booking.status === "cancelled") {
    return { ok: false, reason: "cancelled", booking };
  }

  // The reservation may have lapsed while the student was inside the
  // Razorpay modal. Money has moved, so the default is to honour it — but
  // only if nobody else took the slot in the meantime.
  const holder = await findActiveHolder(booking.slotStart, now);
  if (holder && String(holder._id) !== String(booking._id)) {
    booking.status = "expired";
    booking.activeSlotKey = null;
    booking.razorpayPaymentId = razorpayPaymentId || booking.razorpayPaymentId;
    booking.conflictedAt = now;
    booking.failureReason = "slot_taken_before_payment_confirmed";
    await booking.save();

    // Loud on purpose: this is a paid session with no slot, and someone has
    // to refund or rebook it by hand.
    console.error("[counselling] PAID BUT SLOT TAKEN — manual action needed", {
      bookingId: String(booking._id),
      userId: String(booking.userId),
      slotStart: booking.slotStart?.toISOString?.(),
      razorpayOrderId: booking.razorpayOrderId,
      razorpayPaymentId,
      takenBy: String(holder._id),
    });

    return { ok: false, reason: "conflict", booking, holder };
  }

  // Free (or still ours) — take it.
  booking.status = "booked";
  booking.activeSlotKey = booking.slotStart.toISOString();
  booking.razorpayPaymentId = razorpayPaymentId || booking.razorpayPaymentId;
  booking.failureReason = null;
  await booking.save();

  return { ok: true, alreadyBooked: false, booking };
};

/**
 * Cancel a booking after a FULL refund and free its slot. Idempotent: the
 * write only matches a booking that is not cancelled yet, so a resent or
 * late refund event changes nothing. A cancelled booking also stays
 * cancelled when a late payment.captured arrives (confirmBookingPaid
 * refuses "cancelled").
 *
 * @returns {Promise<boolean>} true when this call cancelled it
 */
export const cancelBookingForRefund = async (bookingId, now = new Date()) => {
  const res = await Booking.updateOne(
    { _id: bookingId, status: { $ne: "cancelled" } },
    {
      $set: {
        status: "cancelled",
        activeSlotKey: null,
        cancelledAt: now,
        cancelReason: "refunded",
      },
    }
  );
  return res.modifiedCount === 1;
};

/** Record a webhook event against a booking, deduped. Mirrors Payment. */
export const noteBookingEvent = (booking, eventName) => {
  if (!Array.isArray(booking.webhookEventsSeen)) {
    booking.webhookEventsSeen = [];
  }
  if (!booking.webhookEventsSeen.includes(eventName)) {
    booking.webhookEventsSeen.push(eventName);
  }
};

/** True when a Mongo write failed the unique-slot index. */
export const isDuplicateSlotError = (err) =>
  Boolean(err) &&
  (err.code === 11000 || err.code === 11001) &&
  String(err.message || "").includes("activeSlotKey");
