import api from "../api/api";

// Download a server-rendered PDF receipt through the authenticated API
// client (so the Bearer token is attached) and save it under the filename
// the server chose in Content-Disposition.
//
// Shared by the student confirmation page
//   /v1/user/payment/:id/receipt
// and the admin Payments table
//   /v1/admin/payments/:id/receipt
//
// Throws an Error carrying the server's `msg` on failure. With
// responseType "blob" an error body arrives as a Blob, so it is read back
// as JSON here rather than left for every caller to unpack.
const FALLBACK_FILENAME = "jumpstride-receipt.pdf";

const filenameFrom = (disposition) => {
  const match = /filename="?([^";]+)"?/i.exec(String(disposition || ""));
  return match ? match[1] : FALLBACK_FILENAME;
};

export default async function downloadReceipt(url) {
  let response;
  try {
    response = await api.get(url, { responseType: "blob", timeout: 30000 });
  } catch (err) {
    let msg = "Could not download the receipt. Please try again.";
    const data = err?.response?.data;
    if (data instanceof Blob) {
      try {
        msg = JSON.parse(await data.text())?.msg || msg;
      } catch {
        // Non-JSON error body; keep the generic message.
      }
    }
    throw new Error(msg);
  }

  const blob = new Blob([response.data], { type: "application/pdf" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filenameFrom(response.headers?.["content-disposition"]);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick: some browsers cancel the download if the URL
  // is revoked synchronously after click().
  setTimeout(() => URL.revokeObjectURL(href), 0);
}
