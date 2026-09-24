import { useContext, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, Sparkles, Star } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import AssetImage from "../components/AssetImage";

// Tailwind's `lg`. Below it the hero image would sit behind the text, so it
// is not rendered at all — not just hidden with CSS, which would still
// download it on phones.
const HERO_IMAGE_QUERY = "(min-width: 1024px)";

const subscribeHeroQuery = (onChange) => {
  const mql = window.matchMedia(HERO_IMAGE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
const getHeroQuery = () => window.matchMedia(HERO_IMAGE_QUERY).matches;

export default function Home() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const showHeroImage = useSyncExternalStore(subscribeHeroQuery, getHeroQuery);
  const primaryDestination = user ? "/test" : "/signup";
  const secondaryDestination = user ? "/dashboard" : "/test";

  const journeyCards = [
    {
      title: t("home.takeTheTest"),
      description: t("home.takeTheTestBody"),
      image: "journey-test",
      link: "/test",
    },
    {
      title: t("home.getResults"),
      description: t("home.getResultsBody"),
      image: "journey-results",
      link: "/result",
    },
    {
      title: t("home.expertCounselling"),
      description: t("home.expertCounsellingBody"),
      image: "journey-counselling",
      link: "/bookcounselling",
    },
  ];

  const stats = [
    { label: t("home.statStudents"), value: "50K+" },
    { label: t("home.statSatisfaction"), value: "98%" },
    { label: t("home.statCareerPaths"), value: "200+" },
    { label: t("home.statExpertSupport"), value: "15+" },
  ];

  return (
    <div className="bg-white">
      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(52,211,203,0.24),_transparent_36%),linear-gradient(180deg,#F4FEFE_0%,#FFFFFF_54%)]">
        {showHeroImage && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[68%] lg:block">
            <AssetImage
              name="home-hero"
              alt=""
              width={1160}
              height={952}
              sizes="68vw"
              priority
              className="h-full w-full object-contain object-right opacity-90"
              style={{
                maskImage: "linear-gradient(to right, transparent 0%, black 42%, black 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 42%, black 100%)",
              }}
            />
          </div>
        )}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#BAECEA] bg-white/80 px-4 py-2 text-sm font-semibold text-[#188B8B] shadow-sm">
              <Sparkles className="h-4 w-4" />
              {t("home.heroPillow")}
            </div>

            <h1 className="mt-6 max-w-xl text-4xl font-bold leading-tight text-[#0F1729] sm:text-5xl lg:text-6xl">
              {t("home.heroBigHeading")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#65758B]">
              {t("home.heroBigBody")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={primaryDestination} className="primary-btn gap-2">
                {t("home.startYourTest")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to={secondaryDestination} className="secondary-btn gap-2">
                {t("home.viewDashboard")}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-sm font-semibold text-[#4B5565]">
              <div className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#188B8B]" />
                {t("home.scientificallyValidated")}
              </div>
              <div className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#188B8B]" />
                {t("home.expertGuidance")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F8FCFC]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="surface-card mx-auto max-w-5xl rounded-[32px] border border-[#DDECEF] bg-white p-5 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] bg-[linear-gradient(180deg,#E8FBFA_0%,#F8FEFE_100%)] p-6">
                    <p className="text-sm font-semibold text-[#188B8B]">
                      {t("home.personalizedInsights")}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[#0F1729]">92%</p>
                    <p className="mt-3 text-sm leading-6 text-[#65758B]">
                      {t("home.matchStrengths")}
                    </p>
                  </div>
                  <div className="rounded-[28px] bg-[#0F1729] p-6 text-white">
                    <p className="text-sm font-semibold text-white/70">
                      {t("home.whatYouUnlock")}
                    </p>
                    <ul className="mt-4 space-y-3 text-sm text-white/90">
                      <li>{t("home.unlockCareerReport")}</li>
                      <li>{t("home.unlockSectionProgress")}</li>
                      <li>{t("home.unlockActionSteps")}</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-[#E6EFF5] bg-[#F8FAFC] p-5">
                    <Star className="h-5 w-5 text-[#F59F0A]" />
                    <p className="mt-4 text-sm font-semibold text-[#0F1729]">{t("home.aptitude")}</p>
                    <p className="mt-1 text-sm leading-6 text-[#65758B]">{t("home.aptitudeBody")}</p>
                  </div>
                  <div className="rounded-3xl border border-[#E6EFF5] bg-[#F8FAFC] p-5">
                    <Star className="h-5 w-5 text-[#188B8B]" />
                    <p className="mt-4 text-sm font-semibold text-[#0F1729]">{t("home.interests")}</p>
                    <p className="mt-1 text-sm leading-6 text-[#65758B]">{t("home.interestsBody")}</p>
                  </div>
                  <div className="rounded-3xl border border-[#E6EFF5] bg-[#F8FAFC] p-5">
                    <Star className="h-5 w-5 text-[#0F1729]" />
                    <p className="mt-4 text-sm font-semibold text-[#0F1729]">{t("home.guidance")}</p>
                    <p className="mt-1 text-sm leading-6 text-[#65758B]">{t("home.guidanceBody")}</p>
                  </div>
                </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[#0F1729] sm:text-4xl">
            {t("home.howWorks")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-[#65758B]">
            {t("home.howWorksBody")}
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {journeyCards.map((card) => (
            <Link
              key={card.title}
              to={card.link}
              className="surface-card group flex h-full flex-col rounded-[28px] p-5 transition-transform hover:-translate-y-1 motion-reduce:transform-none sm:p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F9F8] text-sm font-bold text-[#188B8B]">
                {card.title.charAt(0)}
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-[#0F1729]">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#65758B]">
                {card.description}
              </p>
              <div className="mt-6 aspect-[941/615] overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#E5FBFB_0%,#CDEEEE_100%)]">
                {/* Matching the image's source ratio lets it fill this area
                    without cropping or leaving a coloured border. */}
                <AssetImage
                  name={card.image}
                  alt={card.title}
                  width={941}
                  height={615}
                  sizes="(min-width: 1280px) 390px, (min-width: 640px) 50vw, 100vw"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[#188B8B]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-white sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-3xl font-bold">{item.value}</p>
              <p className="mt-2 text-sm text-white/75">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="surface-card rounded-[32px] bg-[radial-gradient(circle_at_top_right,_rgba(52,211,203,0.2),_transparent_36%),linear-gradient(180deg,#F4FEFE_0%,#FFFFFF_100%)] px-6 py-10 text-center sm:px-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F9F8] text-[#188B8B]">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-3xl font-bold text-[#0F1729] sm:text-4xl">
            {t("home.ctaHeadingReady")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#65758B]">
            {t("home.ctaBodyReady")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={primaryDestination} className="primary-btn gap-2">
              {t("home.explorePackages")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/bookcounselling" className="secondary-btn">
              {t("home.scheduleCall")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
