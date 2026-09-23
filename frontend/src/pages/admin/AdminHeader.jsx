import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  Bell,
  Users,
  CheckCircle,
  FileText,
  AlertCircle,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import api from "../../api/api";
import ConfirmDialog from "../../components/ConfirmDialog";
import jumpstartIcon from "../../assets/jumpstart-icon.png";
import { company } from "../../config/company";
import {
  ADMIN_NOTIFICATIONS_REFRESH_EVENT,
  loadAdminNotificationState,
  saveAdminNotificationState,
  mergeAdminNotificationIds,
  playAdminNotificationSound,
  primeAdminNotificationAudio,
} from "../../utils/adminNotifications";

const NOTIFICATION_TYPE_META = {
  registration: {
    icon: Users,
    iconClass: "bg-blue-50 text-blue-500",
  },
  payment: {
    icon: CheckCircle,
    iconClass: "bg-emerald-50 text-emerald-500",
  },
  review: {
    icon: FileText,
    iconClass: "bg-orange-50 text-orange-500",
  },
  published: {
    icon: AlertCircle,
    iconClass: "bg-violet-50 text-violet-500",
  },
  default: {
    icon: AlertCircle,
    iconClass: "bg-slate-100 text-slate-500",
  },
};

const AdminHeader = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [notificationStateReady, setNotificationStateReady] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const readNotificationIdsRef = useRef([]);
  const previousNotificationIdsRef = useRef([]);
  const hasFetchedNotificationsRef = useRef(false);
  const hasStoredNotificationStateRef = useRef(false);

  const adminName = user?.name || "Admin User";
  const adminEmail = user?.email || "admin@jumpstart.local";
  const adminNotificationIdentity = user?.id || user?.email || "";
  const adminInitials = useMemo(() => {
    const words = String(adminName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!words.length) return "AD";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  }, [adminName]);

  const notificationItems = useMemo(() => {
    const readSet = new Set(readNotificationIds);
    return notifications.map((notification) => ({
      ...notification,
      read: readSet.has(notification.id),
    }));
  }, [notifications, readNotificationIds]);

  const unreadCount = useMemo(
    () => notificationItems.filter((notification) => !notification.read).length,
    [notificationItems]
  );

  const closeAllDropdowns = () => {
    setShowNotifications(false);
    setShowProfileDropdown(false);
  };

  const handleNavigate = (path) => {
    closeAllDropdowns();
    navigate(path);
  };

  const handleLogout = () => {
    closeAllDropdowns();
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutDialog(false);
    navigate("/login", { replace: true });
  };

  const markNotificationsAsRead = (notificationIds) => {
    if (!notificationIds.length) return;
    setReadNotificationIds((prev) =>
      mergeAdminNotificationIds(prev, notificationIds)
    );
  };

  const handleMarkAllAsRead = () => {
    markNotificationsAsRead(notificationItems.map((notification) => notification.id));
  };

  const handleNotificationSelect = (notification) => {
    markNotificationsAsRead([notification.id]);
    closeAllDropdowns();
    if (notification?.link) {
      navigate(notification.link);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const detachAudioPriming = primeAdminNotificationAudio();
    return detachAudioPriming;
  }, []);

  useEffect(() => {
    const { hasStoredState, ids } = loadAdminNotificationState(
      adminNotificationIdentity
    );

    hasStoredNotificationStateRef.current = hasStoredState;
    readNotificationIdsRef.current = ids;
    previousNotificationIdsRef.current = [];
    hasFetchedNotificationsRef.current = false;

    setReadNotificationIds(ids);
    setNotifications([]);
    setNotificationsError("");
    setNotificationsLoading(true);
    setNotificationStateReady(true);
  }, [adminNotificationIdentity]);

  useEffect(() => {
    if (!notificationStateReady) return;
    if (
      !hasStoredNotificationStateRef.current &&
      !hasFetchedNotificationsRef.current &&
      readNotificationIds.length === 0
    ) {
      return;
    }

    readNotificationIdsRef.current = readNotificationIds;
    saveAdminNotificationState(adminNotificationIdentity, readNotificationIds);
  }, [adminNotificationIdentity, notificationStateReady, readNotificationIds]);

  useEffect(() => {
    if (!notificationStateReady || !adminNotificationIdentity) return;

    let isActive = true;
    let isFetching = false;

    const fetchNotifications = async ({ silent = false } = {}) => {
      if (isFetching) return;
      isFetching = true;

      if (!silent) {
        setNotificationsLoading(true);
      }

      try {
        const res = await api.get("/v1/admin/notifications");
        if (!isActive) return;

        const items = Array.isArray(res?.data?.data?.items)
          ? res.data.data.items
          : [];

        setNotifications(items);
        setNotificationsError("");

        const latestIds = items.map((item) => item.id).filter(Boolean);
        const isFirstFetch = !hasFetchedNotificationsRef.current;

        if (!hasStoredNotificationStateRef.current && isFirstFetch) {
          hasStoredNotificationStateRef.current = true;
          setReadNotificationIds(latestIds);
        } else if (!isFirstFetch) {
          const previousIds = new Set(previousNotificationIdsRef.current);
          const readSet = new Set(readNotificationIdsRef.current);
          const nextUnreadNotifications = items.filter(
            (item) => !previousIds.has(item.id) && !readSet.has(item.id)
          );

          if (nextUnreadNotifications.length > 0) {
            void playAdminNotificationSound();
          }
        }

        previousNotificationIdsRef.current = latestIds;
        hasFetchedNotificationsRef.current = true;
      } catch (error) {
        if (!isActive) return;
        setNotificationsError(
          error?.response?.data?.msg || "Failed to load notifications."
        );
      } finally {
        isFetching = false;
        if (isActive && !silent) {
          setNotificationsLoading(false);
        }
      }
    };

    const handleRefresh = () => {
      void fetchNotifications({ silent: hasFetchedNotificationsRef.current });
    };

    void fetchNotifications();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchNotifications({ silent: true });
    }, 30000);

    window.addEventListener(ADMIN_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.removeEventListener(
        ADMIN_NOTIFICATIONS_REFRESH_EVENT,
        handleRefresh
      );
    };
  }, [adminNotificationIdentity, notificationStateReady]);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors"
        >
          <Menu size={20} />
        </button>
        {/* Brand mark — icon-only on small screens, icon + wordmark on sm+.
            Mirrors the collapsed-sidebar icon for a consistent admin look. */}
        <div className="flex items-center gap-2">
          <img src={jumpstartIcon} alt={company.brandName} width="187" height="187" className="h-8 w-8" />
          <span className="hidden text-lg font-bold tracking-tight text-[#0F1729] sm:block">
            {company.brandName}
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="relative cursor-pointer text-gray-500 hover:text-gray-700 p-1 transition-colors">
          <Search size={20} />
        </div>

        {/* Notification Bell with Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            className="relative cursor-pointer text-gray-500 hover:text-gray-700 p-1 transition-colors"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileDropdown(false);
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 ? (
              <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Live admin activity feed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-[10px] font-bold text-[#14b8a6] hover:underline disabled:text-gray-300 disabled:no-underline"
                >
                  Mark all as read
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notificationsLoading ? (
                  <div className="p-5 text-sm text-gray-500">
                    Loading notifications...
                  </div>
                ) : notificationsError ? (
                  <div className="p-5 text-sm text-rose-500">
                    {notificationsError}
                  </div>
                ) : notificationItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      No notifications yet
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      New registrations, report reviews, and published results will show here.
                    </p>
                  </div>
                ) : (
                  notificationItems.map((notification) => {
                    const meta =
                      NOTIFICATION_TYPE_META[notification.type] ||
                      NOTIFICATION_TYPE_META.default;
                    const Icon = meta.icon;

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationSelect(notification)}
                        className={`w-full p-4 flex gap-4 text-left hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50/50 ${
                          !notification.read ? "bg-teal-50/30" : ""
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${meta.iconClass}`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1">
                          <div className="flex justify-between items-start gap-3">
                            <span className="text-sm font-bold text-gray-900">
                              {notification.title}
                            </span>
                            <div className="flex items-center gap-1 text-gray-400">
                              <span className="text-[10px] font-medium whitespace-nowrap">
                                {notification.timeLabel || notification.dateLabel}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="p-3 bg-gray-50 text-center">
                <button
                  type="button"
                  onClick={() => handleNavigate("/admin/testsubmissions")}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-all uppercase tracking-widest"
                >
                  View all alerts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifications(false);
            }}
          >
            <div className="w-9 h-9 bg-[#14b8a6] text-white rounded-full flex items-center justify-center font-medium text-sm border-2 border-[#14b8a61a] group-hover:border-[#14b8a644] transition-all">
              {adminInitials}
            </div>
            <div className="hidden md:flex flex-col items-start leading-none gap-1">
              <span className="text-xs font-bold text-gray-900">{adminName}</span>
              <span className="text-[10px] text-gray-400 font-medium">Administrator</span>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
          </div>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 pb-0 border-b border-gray-50">
                <p className="!text-[12px] !font-bold text-gray-400 uppercase tracking-widest">Account</p>
                <p className="!text-[12px] !font-bold text-gray-900 truncate">{adminEmail}</p>
              </div>
              
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => handleNavigate("/admin/settings")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <User size={18} className="text-gray-400" />
                  Edit Profile Details
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate("/admin/settings")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={18} className="text-gray-400" />
                  Account Settings
                </button>
              </div>

              <div className="pt-0 p-2 border-t border-gray-50">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutDialog}
        title="Confirm Logout"
        description={`Are you sure you want to log out of the ${company.brandName} admin panel?`}
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onCancel={() => setShowLogoutDialog(false)}
        onConfirm={handleLogoutConfirm}
      />
    </header>
  );
};

export default AdminHeader;
