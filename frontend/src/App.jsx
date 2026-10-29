import React, { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import "./index.css";
import MainLayout from "./layout/MainLayout";
import BlankLayout from "./layout/BlankLayout";

// AdminLayout is lazy for the same reason the admin *pages* are: it
// pulls in AdminHeader and AdminSidebar, and through them the axios API
// client. Imported statically it put all of that — plus axios itself —
// into the entry chunk downloaded by every anonymous visitor to the
// landing page, none of whom can reach an admin route.
const AdminLayout = lazy(() => import("./layout/AdminLayout"));
import ProtectedRoute from "./components/ProtectedRoute";
import RequireStudent from "./components/RequireStudent";
import PageLoader from "./components/PageLoader";
// Eager (tiny): the error screen must render even when a lazy chunk fails.
import NotFound, { RouteError } from "./pages/NotFound";

const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Test = lazy(() => import("./pages/Test"));
const Pretest = lazy(() => import("./pages/Pretest"));
const PretestSections = lazy(() => import("./pages/PretestSections"));
const SectionBreak = lazy(() => import("./pages/SectionBreak"));
const BookCounselling = lazy(() => import("./pages/BookCounselling"));
const Payment = lazy(() => import("./pages/Payment"));
const PaymentConfirmation = lazy(() => import("./pages/PaymentConfirmation"));
const Careerdetail = lazy(() => import("./pages/Careerdetail"));
const Result = lazy(() => import("./pages/Result"));
const StudentReport = lazy(() => import("./pages/StudentReport"));
const Livetest = lazy(() => import("./pages/Livetest"));
const TestCompleted = lazy(() => import("./pages/TestCompleted"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const StudentProfileForm = lazy(() => import("./pages/StudentProfileForm"));
const TestPaused = lazy(() => import("./pages/TestPaused"));
const Admindashboard = lazy(() => import("./pages/admin/Admindashboard"));
const TestSubmissions = lazy(() => import("./pages/admin/TestSubmissions"));
const PublishedResult = lazy(() => import("./pages/admin/PublishedResult"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const Payments = lazy(() => import("./pages/admin/Payments"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const ReviewSubmission = lazy(() => import("./pages/admin/ReviewSubmission"));
const SupportContentPage = lazy(() => import("./pages/SupportContentPage"));

function withSuspense(element) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

// Public pages that still belong to the student tree (Home, Tests).
// Guarded but not auth-gated, so logged-out visitors still see them.
const studentPage = (element) =>
  withSuspense(<RequireStudent>{element}</RequireStudent>);

// Every authenticated student page goes through here, so wrapping the guard
// once covers the whole student tree rather than editing each route.
// Deliberately NOT used by the /admin tree — see RequireStudent's note about
// the admin report route.
const protectedPage = (element) =>
  withSuspense(
    <ProtectedRoute>
      <RequireStudent>{element}</RequireStudent>
    </ProtectedRoute>
  );

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: studentPage(<Home />) },
      { path: "/login", element: withSuspense(<Auth />) },
      { path: "/signup", element: withSuspense(<Auth />) },
      { path: "/test", element: studentPage(<Test />) },
      { path: "/pretest", element: protectedPage(<Pretest />) },
      { path: "/Pretest", element: protectedPage(<Pretest />) },
      {
        path: "/pretest/sections",
        element: protectedPage(<PretestSections />),
      },
      {
        path: "/Pretest/sections",
        element: protectedPage(<PretestSections />),
      },
      { path: "/bookcounselling", element: withSuspense(<BookCounselling />) },
      { path: "/payment", element: protectedPage(<Payment />) },
      {
        path: "/payment-confirmation",
        element: protectedPage(<PaymentConfirmation />),
      },
      { path: "/careerdetail", element: protectedPage(<Careerdetail />) },
      { path: "/result", element: protectedPage(<Result />) },
      {
        path: "/result/:reportId",
        element: protectedPage(<StudentReport />),
      },
      {
        path: "/privacy-policy",
        element: withSuspense(<SupportContentPage pageKey="privacyPolicy" />),
      },
      {
        path: "/terms-of-service",
        element: withSuspense(<SupportContentPage pageKey="termsOfService" />),
      },
      {
        path: "/faqs",
        element: withSuspense(<SupportContentPage pageKey="faqs" />),
      },
      {
        path: "/test-completed",
        element: protectedPage(<TestCompleted />),
      },
      { path: "/dashboard", element: protectedPage(<Dashboard />) },
      { path: "/profile", element: protectedPage(<Profile />) },
      { path: "/profile/edit", element: protectedPage(<EditProfile />) },
      { path: "/profile/student", element: protectedPage(<StudentProfileForm />) },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/admin",
    errorElement: <RouteError />,
    element: withSuspense(
      <ProtectedRoute requiredRole="admin" unauthorizedTo="/dashboard">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: "dashboard",
        element: withSuspense(<Admindashboard />),
      },
      {
        path: "testsubmissions",
        element: withSuspense(<TestSubmissions />),
      },
      {
        path: "testsubmissions/:reportId",
        element: withSuspense(<ReviewSubmission />),
      },
      // Admin-scoped view of the student report. Renders the same
      // StudentReport component inside AdminLayout, so the sidebar/header
      // stay put and browser Back returns to the review page instead of
      // stranding the admin in the student shell. The ?adminView=1 query
      // the admin arrives with still routes the fetch through the
      // /v1/admin/results/:reportId/student-view endpoint.
      {
        path: "testsubmissions/:reportId/report",
        element: withSuspense(<StudentReport />),
      },
      {
        path: "publishedresults",
        element: withSuspense(<PublishedResult />),
      },
      {
        path: "usermanagement",
        element: withSuspense(<UserManagement />),
      },
      {
        path: "payments",
        element: withSuspense(<Payments />),
      },
      {
        path: "analytics",
        element: withSuspense(<Analytics />),
      },
      {
        path: "settings",
        element: withSuspense(<Settings />),
      },
    ],
  },
  {
    element: <BlankLayout />,
    errorElement: <RouteError />,
    children: [
      { path: "/sectionbreak", element: protectedPage(<SectionBreak />) },
      { path: "/SectionBreak", element: protectedPage(<SectionBreak />) },
      { path: "/test-paused", element: protectedPage(<TestPaused />) },
      {
        path: "/livetest/:sectionId",
        element: protectedPage(<Livetest />),
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
