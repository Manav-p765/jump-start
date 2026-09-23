import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, MapPin, Phone } from "lucide-react";
import jumpstartIcon from "../assets/jumpstart-icon.png";
import {
  fallbackSupportPages,
  supportPageDefinitions,
} from "../data/supportPages";
import {
  company,
  formattedAddress,
  mailtoHref,
  telHref,
} from "../config/company";

const quickLinks = [
  { labelKey: "nav.home", to: "/" },
  { labelKey: "nav.tests", to: "/test" },
  { labelKey: "nav.dashboard", to: "/dashboard" },
  { labelKey: "nav.results", to: "/result" },
];

const defaultSupportLinks = [
  { label: "Help Center", to: "/bookcounselling" },
  ...Object.values(fallbackSupportPages)
    .filter((page) => page.enabled !== false)
    .map((page) => ({
      label: page.title,
      to: page.path || supportPageDefinitions[page.key]?.path || "/",
    })),
];

export default function Footer() {
  const { t } = useTranslation();
  const [supportPages, setSupportPages] = useState(fallbackSupportPages);

  // The footer renders immediately from `fallbackSupportPages`; this
  // request only refreshes those labels if an admin has customised them.
  // Two deliberate deferrals:
  //
  //   1. `api` (and with it axios, ~15 KB gzip) is imported dynamically
  //      rather than at module scope. Footer is mounted by MainLayout, so
  //      a static import put axios in the initial bundle of every page
  //      for a request that changes nothing 99% of the time.
  //   2. The call is scheduled at idle, so it does not compete with the
  //      LCP paint for bandwidth or main thread.
  useEffect(() => {
    let cancelled = false;

    const load = () => {
      import("../api/api")
        .then(({ default: api }) => api.get("/v1/public/support-pages"))
        .then((res) => {
          if (cancelled) return;
          setSupportPages(res?.data?.data?.pages || fallbackSupportPages);
        })
        .catch(() => {
          if (cancelled) return;
          setSupportPages(fallbackSupportPages);
        });
    };

    // requestIdleCallback is unsupported in Safari <17; the timeout keeps
    // the refresh happening there too, just off the critical path.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(load, { timeout: 3000 })
      : window.setTimeout(load, 1500);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  const supportLinks = useMemo(() => {
    const dynamicLinks = Object.values(supportPages || {})
      .filter((page) => page?.enabled !== false)
      .map((page) => ({
        label:
          page?.title ||
          supportPageDefinitions[page?.key || ""]?.title ||
          "Support Page",
        to:
          page?.path ||
          supportPageDefinitions[page?.key || ""]?.path ||
          "/",
      }));

    if (!dynamicLinks.length) {
      return defaultSupportLinks;
    }

    return [{ label: "Help Center", to: "/bookcounselling" }, ...dynamicLinks];
  }, [supportPages]);

  return (
    <footer className="bg-[#060708] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr_0.85fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            {/* Icon mark + white wordmark: the full logo's wordmark is dark
                charcoal and would vanish on this near-black footer. */}
            <img
              src={jumpstartIcon}
              alt={company.brandName}
              width="187"
              height="187"
              loading="lazy"
              decoding="async"
              className="h-10 w-10 shrink-0"
            />
            <h3 className="text-2xl font-bold">{company.brandName}</h3>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
            {t("footer.tagline")}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
            {t("footer.company")}
          </h4>
          <ul className="mt-5 space-y-3 text-sm text-white/80">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-white">
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
            {t("footer.support")}
          </h4>
          <ul className="mt-5 space-y-3 text-sm text-white/80">
            {supportLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
            {t("footer.contact")}
          </h4>
          <ul className="mt-5 space-y-4 text-sm text-white/80">
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[#34D3CB]" />
              <a href={mailtoHref} className="hover:text-white">
                {company.email}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-[#34D3CB]" />
              <a href={telHref} className="hover:text-white">
                {company.phoneDisplay}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#34D3CB]" />
              <address className="not-italic">{formattedAddress}</address>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-t border-white/10 px-4 py-6 text-center text-sm text-white/55 sm:px-6 lg:px-8">
        {/* The registered entity, not the brand — this line is what ties
            the site to the merchant record the payment gateway holds. */}
        &copy; {new Date().getFullYear()} {company.legalName}.{" "}
        {t("footer.rights")}
      </div>
    </footer>
  );
}
