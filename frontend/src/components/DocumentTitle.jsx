import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Per-route <title> and canonical URL. index.html carries the site-wide
 * defaults (description, Open Graph tags); this only swaps the parts that
 * differ per page, so tabs, history and search results are distinguishable.
 *
 * Titles are matched on the first path segment; anything unknown keeps the
 * default title.
 */
const SITE = "Jumpstride";
const ORIGIN = "https://jumpstride.in";
const DEFAULT_TITLE = `${SITE} | Career Aptitude Test for Students`;

const TITLES = {
  "": DEFAULT_TITLE,
  test: "Career Aptitude Tests",
  login: "Sign In",
  signup: "Sign Up",
  dashboard: "Dashboard",
  result: "Results",
  bookcounselling: "Book Career Counselling",
  faqs: "FAQs",
  "privacy-policy": "Privacy Policy",
  "terms-of-service": "Terms of Service",
  profile: "Profile",
  pretest: "Before You Begin",
  livetest: "Assessment in Progress",
  sectionbreak: "Section Break",
  "test-paused": "Test Paused",
  "test-completed": "Test Completed",
  payment: "Payment",
  "payment-confirmation": "Payment Confirmation",
  careerdetail: "Career Details",
  admin: "Admin",
};

export default function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const segment = pathname.split("/")[1]?.toLowerCase() || "";
    const label = TITLES[segment];
    document.title = !label || label === DEFAULT_TITLE ? DEFAULT_TITLE : `${label} | ${SITE}`;

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `${ORIGIN}${pathname === "/" ? "/" : pathname.replace(/\/$/, "")}`;
  }, [pathname]);

  return null;
}
