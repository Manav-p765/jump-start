import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";

// Shared by the catch-all "*" route (404) and the routers' errorElement, so
// a visitor never sees React Router's developer error screen.
function StatusCard({ title, body, showReload = false }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[70vh] bg-[#FAFAFA] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-xl rounded-[30px] border border-[#E1E7EF] bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F9F8] text-[#157A7A]">
          <Compass className="h-10 w-10" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-[#0F1729]">{title}</h1>
        <p className="mt-3 text-base leading-7 text-[#65758B]">{body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="primary-btn"
          >
            {t("notFound.home", "Go to Home")}
          </Link>
          {showReload ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="secondary-btn"
            >
              {t("notFound.reload", "Reload page")}
            </button>
          ) : (
            <Link
              to="/test"
              className="secondary-btn"
            >
              {t("notFound.tests", "View tests")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <StatusCard
      title={t("notFound.title", "Page not found")}
      body={t("notFound.body", "The page you are looking for doesn't exist or has moved.")}
    />
  );
}

export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  if (import.meta.env.DEV) console.error(error);
  return (
    <StatusCard
      title={t("notFound.errorTitle", "Something went wrong")}
      body={t("notFound.errorBody", "Please reload the page. If it keeps happening, contact connect@jumpstride.in.")}
      showReload
    />
  );
}
