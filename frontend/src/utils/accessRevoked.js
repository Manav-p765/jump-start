// A package taken away after a full refund. Every backend gate (test
// progress, submit, package/current, select, report detail) answers 403
// with this error code; pages key their message off the code, not the
// English `msg`, so it can be translated.
// Mirrors ACCESS_REVOKED_REFUND in backend/services/entitlementService.js.
export const ACCESS_REVOKED_REFUND = "ACCESS_REVOKED_REFUND";

export const isAccessRevokedError = (err) =>
  err?.response?.data?.error === ACCESS_REVOKED_REFUND;
