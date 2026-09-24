import React, { useContext, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaCheck } from "react-icons/fa";
import secure from "../assets/secure.svg";
import lck from "../assets/lck.svg";
import { formatPaise, splitInclusiveGST } from "../utils/money";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { invalidateApiCache } from "../utils/apiCache";
import { loadRazorpayCheckout } from "../utils/loadRazorpay";
import { company } from "../config/company";

// The site's primary teal, handed to Razorpay's modal so the checkout does
// not look like a different product bolted on at the last step.
const BRAND_COLOR = "#188B8B";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [agree, setAgree] = useState(false);

  // True from the moment the buy button is pressed until the flow reaches a
  // terminal state. It covers the Razorpay modal being open too, so a second
  // click cannot create a second order.
  const [submitting, setSubmitting] = useState(false);
  // { tone: "error" | "info", text } — rendered above the buy button.
  const [checkoutNotice, setCheckoutNotice] = useState(null);

  // Coupon checkout state. `appliedCoupon` is the validated payload from
  // /v1/user/coupon/validate — null until the student successfully applies
  // a code. Once set, the order summary recalculates pre-GST.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountAmount, finalPrice }
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Billing details. Controlled, and local to this page only — nothing here
  // is sent to the backend yet, so the values live and die with the page.
  // Razorpay reads three of them via `prefill` below; the rest are collected
  // for the invoice record a later change will persist.
  const [billing, setBilling] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstNumber: "",
  });

  // Which fields the student has actually interacted with. An error is only
  // rendered once a field is touched (blur) or once they have attempted to
  // pay — a form that greets you in red before you have typed anything is
  // worse than no validation at all.
  const [billingTouched, setBillingTouched] = useState({});

  const handleBillingChange = (key) => (event) => {
    const { value } = event.target;
    setBilling((prev) => ({ ...prev, [key]: value }));
  };

  const handleBillingBlur = (key) => () => {
    setBillingTouched((prev) => ({ ...prev, [key]: true }));
  };

  const plan = location.state?.plan;

  useEffect(() => {
    if (!plan || !plan.id) {
      navigate("/test", { replace: true });
    }
  }, [plan, navigate]);

  // Seed the billing form from what we already know about the student, so
  // the common case is "check and pay" rather than "retype what you told us
  // at signup".
  //
  // Note the fallbacks: the auth payload nests only `{ isComplete }` under
  // studentProfile (User.toAuthJSON), so studentProfile.phone/.city are
  // undefined on the client. The values actually reach us as the top-level
  // `mobile` / `city`. Both paths are read so this keeps working if the
  // auth payload is widened later.
  //
  // Only non-empty values are written, and only into fields the student has
  // not already edited — a late-arriving user object must never clobber
  // typing in progress.
  useEffect(() => {
    if (!user) return;

    const seeds = {
      fullName: user.name,
      email: user.email,
      phone: user.studentProfile?.phone || user.mobile,
      city: user.studentProfile?.city || user.city,
      state: user.studentProfile?.state || user.state,
    };

    setBilling((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const [key, raw] of Object.entries(seeds)) {
        const value = typeof raw === "string" ? raw.trim() : "";
        if (value && !next[key]) {
          next[key] = value;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [user]);

  // Package prices are GST-INCLUSIVE. plan.amount already contains the GST,
  // so we must NOT add 18% on top — the split is a decomposition of a price
  // we already have, never an addition on top of one.
  const grossPrice = plan?.amount ?? 0; // GST-inclusive LIST price
  // Coupons discount the inclusive price directly. Backend's
  // purchasePackage applies the discount to pkg.amount, so the two agree
  // on the final collected amount.
  const discount = appliedCoupon?.discountAmount || 0;
  const total = Math.max(0, grossPrice - discount); // inclusive payable

  // The split is taken from `total` — the amount actually charged — NOT from
  // grossPrice. Tax is owed on the consideration received, so decomposing the
  // list price would report the GST on ₹1999 while collecting ₹1799.
  //
  // gstPaise is the REMAINDER, never rounded on its own, so
  // basePaise + gstPaise === totalPaise exactly for every input.
  //
  // Computed in integer PAISE with the shared splitInclusiveGST (a mirror of
  // backend/utils/money.js) and displayed with the shared formatPaise, so the
  // quote prints the same bytes as the confirmation receipt.
  const grossPaise = Math.round(grossPrice * 100);
  const discountPaise = Math.round(discount * 100);
  const totalPaise = Math.round(total * 100);
  const { base: basePaise, gst: gstPaise } = splitInclusiveGST(totalPaise);

  // --- Billing validation ------------------------------------------------
  // Inline predicates rather than a schema library: this is one form with
  // six rules, and nothing in the project pulls in zod/yup/react-hook-form.
  //
  // Deliberately permissive. The job here is to stop blank and obviously
  // malformed submissions, not to adjudicate what a real name or a real
  // address looks like — a false rejection at the pay button costs a sale.
  const billingErrors = {
    fullName: billing.fullName.trim() ? "" : "Enter your full name.",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email.trim())
      ? ""
      : "Enter a valid email address.",
    // Indian mobile: 10 digits once spaces, dashes and a +91/0 prefix are
    // stripped, so a number pasted as "+91 98765 43210" is accepted.
    phone: /^\d{10}$/.test(
      billing.phone.replace(/[\s-]/g, "").replace(/^(?:\+91|91|0)/, "")
    )
      ? ""
      : "Enter a 10-digit mobile number.",
    address: billing.address.trim() ? "" : "Enter your billing address.",
    city: billing.city.trim() ? "" : "Enter your city.",
    state: billing.state.trim() ? "" : "Enter your state.",
    pincode: /^\d{6}$/.test(billing.pincode.trim())
      ? ""
      : "Enter a 6-digit pincode.",
    // Optional — no rule. Present so the map is exhaustive.
    gstNumber: "",
  };

  const billingValid = Object.values(billingErrors).every((msg) => !msg);

  // An error surfaces only once the field has been blurred or a pay attempt
  // has marked everything touched.
  const billingErrorFor = (key) =>
    billingTouched[key] ? billingErrors[key] : "";

  const markAllBillingTouched = () =>
    setBillingTouched({
      fullName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
    });

  // Same input styling as before, with a red border swapped in while an
  // error is showing so the invalid field is findable without reading.
  const billingInputClass = (key) =>
    `w-full h-[46px] rounded-[14px] border bg-[#FAFAFA] px-4 text-sm outline-none ${
      billingErrorFor(key) ? "border-red-400" : "border-[#E1E7EF]"
    }`;

  // Mirrors the button's `disabled` condition. Kept as one value so the
  // enabled *look* and the enabled *behaviour* cannot drift apart.
  const payEnabled = agree && !submitting && billingValid;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError("Enter a code to apply.");
      return;
    }
    setCouponError("");
    setValidatingCoupon(true);
    try {
      const res = await api.post("/v1/user/coupon/validate", {
        code,
        packageId: plan.id,
      });
      const data = res?.data?.data;
      if (!data?.valid) {
        setCouponError(res?.data?.msg || "Coupon is not valid for this package.");
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({
        code: data.code,
        discountAmount: Number(data.discountAmount || 0),
        finalPrice: Number(data.finalPrice || 0),
        discountType: data.discountType,
        discountValue: data.discountValue,
      });
    } catch (err) {
      setCouponError(
        err?.response?.data?.msg || "Could not apply coupon — please try again."
      );
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
    setCouponInput("");
  };

  // Everything the confirmation screen needs. `paidTotal` is passed in
  // because the authoritative figure differs per path: the server's
  // finalAmount for a Razorpay order, the locally computed total for a
  // zero-rupee activation.
  //
  // `money` is the verify endpoint's paise block when we have it. The
  // confirmation screen prefers it over the rupee figures below, because the
  // invoice prints off the same ledger row and the two must agree exactly.
  // It is absent on the free-activation path (no gateway order, so no ledger
  // split) and when /verify failed — the rupee fields remain the fallback.
  const buildConfirmationState = (paidTotal, money = null) => ({
    plan,
    discount,
    couponCode: appliedCoupon?.code || null,
    total: paidTotal,
    money,
    paidAt: new Date().toISOString(),
  });

  // A 100%-off coupon or a free package has nothing to charge. Razorpay
  // cannot create a zero-amount order (the backend rejects it with 400 and
  // points here), so these keep the original free-activation route.
  const activateFreePackage = async () => {
    const payload = { packageId: plan.id };
    if (appliedCoupon?.code) payload.couponCode = appliedCoupon.code;

    try {
      await api.post("/v1/user/package/purchase", payload);
      invalidateApiCache("userInit");
      navigate("/payment-confirmation", {
        replace: true,
        state: buildConfirmationState(total),
      });
    } catch (err) {
      console.error("Free package activation failed", err);
      setCheckoutNotice({
        tone: "error",
        text: err?.response?.data?.msg || "Failed to activate package.",
      });
      setSubmitting(false);
    }
  };

  // Called from Razorpay's success handler. Note the failure branch: by the
  // time this runs the money has already moved, and the webhook grants
  // entitlement idempotently on its own. A failed /verify means we could not
  // CONFIRM the payment, never that it failed — so we say so honestly and
  // still send the student on, where the confirmation page's fallback
  // re-fetches the current package from the server.
  const verifyAndFinish = async (response, order) => {
    const paidTotal = Number(order.finalAmount ?? total);

    let money = null;
    try {
      const res = await api.post("/v1/user/payment/verify", {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });

      // Authoritative paise figures off the ledger row. Taken verbatim —
      // the confirmation screen must not re-derive the split, or it drifts
      // from the invoice again.
      const d = res?.data?.data;
      if (d && Number.isFinite(d.amount) && Number.isFinite(d.base)) {
        money = {
          amount: d.amount,
          base: d.base,
          gst: d.gst,
          gstRate: d.gstRate,
          originalAmount: d.originalAmount,
          discountAmount: d.discountAmount,
          couponCode: d.couponCode ?? null,
        };
      }
    } catch (err) {
      console.error("Payment verification failed", err);
      invalidateApiCache("userInit");
      // Blocking on purpose: we are about to navigate away, and this is the
      // one message the student must not miss.
      window.alert(
        "Payment received — confirming your access. If it doesn't unlock in a minute, refresh your dashboard."
      );
      navigate("/payment-confirmation", {
        replace: true,
        state: buildConfirmationState(paidTotal),
      });
      return;
    }

    invalidateApiCache("userInit");
    navigate("/payment-confirmation", {
      replace: true,
      state: buildConfirmationState(paidTotal, money),
    });
  };

  const handleCompletePayment = async () => {
    if (!plan?.id || submitting) return;

    // Safety belt behind the disabled button: reachable if the gate is ever
    // bypassed (a stale render, devtools, a future keyboard path). Surface
    // every outstanding error instead of failing silently, and do not spend
    // an order on an invalid form.
    if (!billingValid) {
      markAllBillingTouched();
      setCheckoutNotice({
        tone: "error",
        text: "Please complete your billing details before paying.",
      });
      return;
    }

    setCheckoutNotice(null);
    setSubmitting(true);

    if (total <= 0) {
      await activateFreePackage();
      return;
    }

    // 1. The checkout widget, fetched on demand.
    const sdkReady = await loadRazorpayCheckout();
    if (!sdkReady) {
      setCheckoutNotice({
        tone: "error",
        text: "Couldn't load the payment window. Check your connection and try again.",
      });
      setSubmitting(false);
      return;
    }

    // 2. The order. The coupon code goes up as the student entered it; the
    //    backend re-validates and re-prices, so the client total is display
    //    only and is never trusted.
    let order;
    try {
      const res = await api.post("/v1/user/payment/order", {
        packageId: plan.id,
        couponCode: appliedCoupon?.code || undefined,
        billing,
      });
      order = res?.data?.data;
      if (!order?.orderId || !order?.keyId) {
        throw new Error("Incomplete order response");
      }
    } catch (err) {
      console.error("Create payment order failed", err);
      const status = err?.response?.status;

      if (status === 409) {
        // Already owned — nothing to pay for. Send them where the package is.
        invalidateApiCache("userInit");
        setSubmitting(false);
        navigate("/dashboard", { replace: true });
        return;
      }

      // The server re-validates billing and can reject it independently of
      // our gate — the two should agree, so this means they drifted (or the
      // request was not made by our form). Reveal the field errors as well
      // as the notice, so there is something actionable to fix rather than
      // a message about details that all look filled in.
      if (status === 400) {
        markAllBillingTouched();
      }

      setCheckoutNotice({
        tone: "error",
        text:
          status === 503
            ? "Payments are temporarily unavailable. Please try again shortly."
            : err?.response?.data?.msg ||
              "Could not start the payment. Please try again.",
      });
      setSubmitting(false);
      return;
    }

    // 3. Hand over to Razorpay. `submitting` deliberately stays true while
    //    the modal is open so the button underneath cannot fire again.
    const checkout = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: company.brandName,
      description: order.packageTitle || plan.title,
      // Full URL, not a bundler import or a root-relative path: Razorpay's
      // modal is served from checkout.razorpay.com and fetches this over the
      // network, so it needs our origin spelled out. Built at runtime so it
      // points at whichever host (staging or production) served the page.
      // File lives at frontend/public/jumpstart-icon.png.
      image: `${window.location.origin}/jumpstart-icon.png`,
      // Fed from the billing form, which is validated before we get here —
      // so the student never re-types a number they just entered. `contact`
      // was previously unset, which is why Razorpay re-prompted for phone.
      prefill: {
        name: billing.fullName,
        email: billing.email,
        contact: billing.phone,
      },
      theme: { color: BRAND_COLOR },
      handler: (response) => {
        verifyAndFinish(response, order);
      },
      modal: {
        ondismiss: () => {
          setSubmitting(false);
          setCheckoutNotice({
            tone: "info",
            text: "Payment cancelled. You can try again whenever you're ready.",
          });
        },
      },
    });

    checkout.open();
  };

  if (!plan || !plan.id) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-[#65758B]">Redirecting to packages...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] px-4 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0F1729]">
            Complete Your Payment
          </h2>
          <p className="!text-base text-[#65758B] mt-1">
            Secure checkout powered by industry‑standard encryption
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT SIDE */}
          <div className="lg:col-span-2 space-y-8">
            {/* Billing Information */}
            <div className="bg-white rounded-2xl p-8 border border-[#E6ECF5]">
              <h3 className="text-2xl text-[#0F1729] font-semibold">
                Billing Information
              </h3>
              <p className="!text-sm text-[#65758B] mt-1 mb-8">
                Enter your billing details
              </p>

              <div className="space-y-5 font-inter">
                <div>
                  <label
                    htmlFor="billing-fullName"
                    className="block text-sm font-medium text-[#0F1729] mb-2"
                  >
                    Full Name *
                  </label>
                  <input
                    id="billing-fullName"
                    value={billing.fullName}
                    onChange={handleBillingChange("fullName")}
                    onBlur={handleBillingBlur("fullName")}
                    aria-invalid={Boolean(billingErrorFor("fullName"))}
                    className={billingInputClass("fullName")}
                    placeholder="John Doe"
                  />
                  {billingErrorFor("fullName") ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {billingErrorFor("fullName")}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="billing-email"
                    className="block text-sm font-medium text-[#0F1729] mb-2"
                  >
                    Email Address *
                  </label>
                  <input
                    id="billing-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={billing.email}
                    onChange={handleBillingChange("email")}
                    onBlur={handleBillingBlur("email")}
                    aria-invalid={Boolean(billingErrorFor("email"))}
                    className={billingInputClass("email")}
                    placeholder="john@example.com"
                  />
                  {billingErrorFor("email") ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {billingErrorFor("email")}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="billing-phone"
                    className="block text-sm font-medium text-[#0F1729] mb-2"
                  >
                    Phone Number *
                  </label>
                  <input
                    id="billing-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={billing.phone}
                    onChange={handleBillingChange("phone")}
                    onBlur={handleBillingBlur("phone")}
                    aria-invalid={Boolean(billingErrorFor("phone"))}
                    className={billingInputClass("phone")}
                    placeholder="+91 98765 43210"
                  />
                  {billingErrorFor("phone") ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {billingErrorFor("phone")}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="billing-address"
                    className="block text-sm font-medium text-[#0F1729] mb-2"
                  >
                    Address *
                  </label>
                  <input
                    id="billing-address"
                    autoComplete="street-address"
                    value={billing.address}
                    onChange={handleBillingChange("address")}
                    onBlur={handleBillingBlur("address")}
                    aria-invalid={Boolean(billingErrorFor("address"))}
                    className={billingInputClass("address")}
                    placeholder="Street address"
                  />
                  {billingErrorFor("address") ? (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {billingErrorFor("address")}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label
                      htmlFor="billing-city"
                      className="block text-sm font-medium text-[#0F1729] mb-2"
                    >
                      City *
                    </label>
                    <input
                      id="billing-city"
                      autoComplete="address-level2"
                      value={billing.city}
                      onChange={handleBillingChange("city")}
                      onBlur={handleBillingBlur("city")}
                      aria-invalid={Boolean(billingErrorFor("city"))}
                      className={billingInputClass("city")}
                      placeholder="Mumbai"
                    />
                    {billingErrorFor("city") ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {billingErrorFor("city")}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label
                      htmlFor="billing-state"
                      className="block text-sm font-medium text-[#0F1729] mb-2"
                    >
                      State *
                    </label>
                    <input
                      id="billing-state"
                      autoComplete="address-level1"
                      value={billing.state}
                      onChange={handleBillingChange("state")}
                      onBlur={handleBillingBlur("state")}
                      aria-invalid={Boolean(billingErrorFor("state"))}
                      className={billingInputClass("state")}
                      placeholder="Gujarat"
                    />
                    {billingErrorFor("state") ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {billingErrorFor("state")}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label
                      htmlFor="billing-pincode"
                      className="block text-sm font-medium text-[#0F1729] mb-2"
                    >
                      Pincode *
                    </label>
                    <input
                      id="billing-pincode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={billing.pincode}
                      onChange={handleBillingChange("pincode")}
                      onBlur={handleBillingBlur("pincode")}
                      aria-invalid={Boolean(billingErrorFor("pincode"))}
                      className={billingInputClass("pincode")}
                      placeholder="400001"
                    />
                    {billingErrorFor("pincode") ? (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {billingErrorFor("pincode")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="billing-gstNumber"
                    className="block text-sm font-medium text-[#0F1729] mb-2"
                  >
                    GST Number (Optional)
                  </label>
                  <input
                    id="billing-gstNumber"
                    value={billing.gstNumber}
                    onChange={handleBillingChange("gstNumber")}
                    onBlur={handleBillingBlur("gstNumber")}
                    className={billingInputClass("gstNumber")}
                    placeholder="22AAAA0000A1Z5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="bg-white rounded-2xl p-8 border border-[#E6ECF5] h-fit">
            <h3 className="text-2xl text-[#0F1729] font-semibold">
              Order Summary
            </h3>

            {/* Two groups, each reconciling to `total` on its own:
                  1. how we got to the price   — list − discount = total
                  2. what the price is made of — base + GST     = total
                The discount must NOT sit inside group 2: base and GST are
                already net of it, so a "− discount" line between them would
                double-count the saving. */}
            <div className="space-y-3 text-sm mt-4 font-inter">
              <div className="flex justify-between">
                <span className="text-[#0F1729] font-medium">{plan.title}</span>
                <span className="text-[#0F1729] text-base font-semibold">
                  {formatPaise(grossPaise)}
                </span>
              </div>
              {appliedCoupon ? (
                <div className="flex justify-between text-emerald-700">
                  <span className="font-medium">Coupon ({appliedCoupon.code})</span>
                  <span className="font-semibold">− {formatPaise(discountPaise)}</span>
                </div>
              ) : null}

              {/* GST is already INCLUDED in the amount payable. These two
                  rows decompose `total`; they are never added on top. */}
              <div className="pt-3 border-t border-[#EEF2F5] flex justify-between text-slate-500">
                <span className="text-[#65758B]">Taxable value</span>
                <span>{formatPaise(basePaise)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span className="text-[#65758B]">GST (18%, included)</span>
                <span>{formatPaise(gstPaise)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#E1E7EF]">
              <p className="text-xs font-semibold text-[#0F1729] mb-2">Included in this package</p>
              <ul className="space-y-1.5 text-xs text-[#65758B]">
                {plan.features?.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <FaCheck className={`${plan.checkColor || "text-[#0B908E]"} mt-0.5 shrink-0`} />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-400 mt-2">{plan.duration}</p>
            </div>

            {/* Discount Code */}
            <div className="mt-6 mb-6 border-t border-[#E1E7EF] pt-4 font-inter">
              <label className="block text-sm font-medium text-[#0F1729] mb-2">
                Discount Code
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                  <div className="text-sm">
                    <span className="font-semibold text-emerald-800">
                      {appliedCoupon.code}
                    </span>
                    <span className="ml-2 text-emerald-700">
                      Coupon applied — {formatPaise(discountPaise)} off
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs font-semibold text-emerald-800 underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(event) => {
                        setCouponInput(event.target.value);
                        if (couponError) setCouponError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      className="w-[100%] h-[42px] rounded-[14px] border border-[#E1E7EF] bg-[#FAFAFA] px-4 text-sm uppercase outline-none"
                      placeholder="Enter code"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponInput.trim()}
                      className="h-[42px] px-5 rounded-[14px] border-2 border-[#188B8B] text-[#188B8B] text-sm font-medium disabled:opacity-60"
                    >
                      {validatingCoupon ? "Applying..." : "Apply"}
                    </button>
                  </div>
                  {couponError ? (
                    <p className="mt-2 text-xs font-medium text-red-600">{couponError}</p>
                  ) : null}
                </>
              )}
            </div>

            <div className="border-t border-[#E1E7EF] my-6" />

            <div className="flex justify-between items-center mb-1 font-inter">
              <span className="font-semibold text-[#0F1729]">Total Amount</span>
              <span className="text-2xl font-bold text-[#188B8B]">{formatPaise(totalPaise)}</span>
            </div>
            <p className="text-[11px] text-[#65758B] mb-6 font-inter">
              Inclusive of all taxes (GST included)
            </p>

            <label className="grid auto-cols-auto grid-flow-col items-start gap-3 text-sm mb-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 h-4 w-4 appearance-none rounded-full border border-[#188B8B] checked:bg-[#188B8B] checked:border-[#188B8B] focus:outline-none relative"
              />
              <span className="text-[#0F1729]">
                I accept the{" "}
                <Link
                  to="/terms-of-service"
                  className="text-[#188B8B] hover:underline"
                >
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy-policy"
                  className="text-[#188B8B] hover:underline"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {checkoutNotice ? (
              <div
                role="status"
                className={`mb-4 rounded-[14px] border px-4 py-3 text-sm font-medium ${
                  checkoutNotice.tone === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-50 text-[#65758B]"
                }`}
              >
                {checkoutNotice.text}
              </div>
            ) : null}

            <button
              type="button"
              disabled={!agree || submitting || !billingValid}
              onClick={handleCompletePayment}
              className={`group w-full h-[48px] rounded-xl font-semibold flex items-center justify-center gap-1 transition-all duration-200 ${
                payEnabled
                  ? "bg-[#F59F0A] text-[#0F1729] shadow-[0_10px_24px_rgba(245,159,10,0.22)] hover:-translate-y-0.5 hover:bg-[#E89206] hover:shadow-[0_14px_30px_rgba(245,159,10,0.32)] active:translate-y-0 active:shadow-[0_8px_18px_rgba(245,159,10,0.24)] cursor-pointer"
                  : "bg-[#facf84] text-[#0f172994] cursor-not-allowed"
              }`}
            >
              <img
                src={lck}
                alt="secure"
                className={`w-4 h-4 transition-transform duration-200 ${
                  payEnabled ? "group-hover:scale-110" : "opacity-60"
                }`}
                style={{
                  filter: payEnabled ? "none" : "grayscale(100%)",
                }}
              />
              {submitting ? "Processing…" : "Complete Payment"}
            </button>

            <p className="!text-xs text-slate-400 text-center mt-4 flex items-center justify-center gap-1">
              <img src={secure} alt="secure" className="w-4 h-4" />
              <span>100% Secure Payment • SSL Encrypted</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payment
