import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AdminPanel from "./AdminPanel";
import AuctionDetails from "./AuctionDetails";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gavel,
  Heart,
  Loader2,
  LogIn,
  LogOut,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";

/* =========================================================
   CONFIG
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://auction-bd-api.onrender.com"
).replace(/\/+$/, "");

const KEYS = {
  token: "auctionbd_token",
  user: "auctionbd_user",
  favorites: "auctionbd_favorites",
  theme: "auctionbd_theme",
};

const FALLBACK_IMAGE =
  "https://placehold.co/800x800/f8fafc/f59e0b?text=Auction+BD";

const CATEGORIES = [
  "All",
  "Electronics",
  "Vehicles",
  "Fashion",
  "Gaming",
  "Furniture",
  "Collectibles",
];

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEOS = 2;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

/* =========================================================
   STORAGE
========================================================= */

function readStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getToken() {
  try {
    return localStorage.getItem(KEYS.token) || "";
  } catch {
    return "";
  }
}

function getUser() {
  return readStorage(KEYS.user, null);
}

function saveAuth(token, user) {
  try {
    if (token) localStorage.setItem(KEYS.token, token);

    if (user) {
      localStorage.setItem(KEYS.user, JSON.stringify(user));
    }
  } catch (error) {
    console.error("Auth storage error:", error);
  }
}

function clearAuth() {
  try {
    localStorage.removeItem(KEYS.token);
    localStorage.removeItem(KEYS.user);
  } catch {}
}

/* =========================================================
   API
========================================================= */

async function api(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
      cache: options.cache || "no-store",
    });
  } catch {
    throw new Error(
      "Unable to connect to AuctionBD. Please check your internet connection."
    );
  }

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message: text || "Invalid server response.",
    };
  }

  if (!response.ok) {
    let message =
      data?.message ||
      data?.error ||
      `Server returned ${response.status}.`;

    if (response.status === 401) {
      message =
        data?.message ||
        "Your login session has expired.";
    }

    if (response.status === 403) {
      message =
        data?.message ||
        "You do not have permission to perform this action.";
    }

    if (response.status === 404) {
      message =
        data?.message ||
        `API endpoint not found: ${path}`;
    }

    if (response.status >= 500) {
      message =
        data?.message ||
        "AuctionBD server error. Please try again.";
    }

    const error = new Error(message);
    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

/* =========================================================
   HELPERS
========================================================= */

const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD")}`;

function normalizeAuction(item) {
  return {
    ...item,
    id: item?._id || item?.id,
    price: Number(item?.price) || 0,
    bids: Number(item?.bids) || 0,
    status: String(item?.status || "active").toLowerCase(),
    image:
      item?.image ||
      item?.images?.[0] ||
      FALLBACK_IMAGE,
  };
}

function statusInfo(status) {
  const statuses = {
    sold: {
      label: "SOLD",
      className: "bg-emerald-500 text-white",
    },
    ended: {
      label: "ENDED",
      className: "bg-slate-600 text-white",
    },
    cancelled: {
      label: "CANCELLED",
      className: "bg-red-600 text-white",
    },
    pending: {
      label: "PENDING",
      className: "bg-yellow-500 text-white",
    },
    active: {
      label: "LIVE",
      className: "bg-red-500 text-white",
    },
  };

  return statuses[status] || statuses.active;
}

function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString("en-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/* =========================================================
   GLOBAL STYLES
========================================================= */

function GlobalStyles({ dark }) {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        transition:
          background-color .2s ease,
          color .2s ease;
      }

      button,
      input,
      textarea,
      select {
        font-family: inherit;
      }

      button {
        cursor: pointer;
      }

      button:disabled {
        cursor: not-allowed;
      }

      .field {
        width: 100%;
        border: 1px solid ${dark ? "#334155" : "#e5e7eb"};
        border-radius: 12px;
        background: ${dark ? "#0f172a" : "#fff"};
        color: ${dark ? "#f8fafc" : "#111827"};
        padding: 13px 15px;
        outline: none;
        transition: .2s ease;
      }

      .field:focus {
        border-color: #f59e0b;
        box-shadow: 0 0 0 3px rgba(245,158,11,.12);
      }

      .field::placeholder {
        color: ${dark ? "#64748b" : "#9ca3af"};
      }

      select option {
        background: ${dark ? "#0f172a" : "#fff"};
        color: ${dark ? "#f8fafc" : "#111827"};
      }

      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(5px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .fade-in {
        animation: fadeIn .2s ease;
      }
    `}</style>
  );
}

/* =========================================================
   TOAST
========================================================= */

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(onClose, 3500);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const success = toast.type === "success";

  return (
    <div className="fixed bottom-5 left-1/2 z-[2000] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 fade-in">
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl ${
          success
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        {success ? (
          <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
        ) : (
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
        )}

        <p className="flex-1 text-sm font-medium">
          {toast.message}
        </p>

        <button
          onClick={onClose}
          className="opacity-60 hover:opacity-100"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   THEME BUTTON
========================================================= */

function ThemeButton({ dark, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        dark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
        dark
          ? "border-slate-700 bg-slate-900 text-amber-400"
          : "border-gray-200 bg-white text-slate-700"
      }`}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

/* =========================================================
   AUTH MODAL
========================================================= */

function AuthModal({
  mode = "login",
  onClose,
  onSuccess,
  dark,
}) {
  const [loginMode, setLoginMode] = useState(
    mode !== "register"
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const close = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", close);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [onClose]);

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!loginMode) {
      if (name.length < 2) {
        setError("Please enter your full name.");
        return;
      }

      if (form.password.length < 6) {
        setError(
          "Password must be at least 6 characters."
        );
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);

    try {
      const path = loginMode
        ? "/api/auth/login"
        : "/api/auth/register";

      const body = loginMode
        ? {
            email,
            password: form.password,
          }
        : {
            name,
            email,
            phone,
            password: form.password,
            confirmPassword:
              form.confirmPassword,
          };

      const data = await api(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const token =
        data?.token ||
        data?.accessToken ||
        data?.user?.token;

      const loggedUser =
        data?.user ||
        data?.account ||
        null;

      if (!token) {
        if (!loginMode) {
          setLoginMode(true);

          setForm((current) => ({
            ...current,
            password: "",
            confirmPassword: "",
          }));

          setError(
            "Account created. Please sign in."
          );

          return;
        }

        throw new Error(
          "Login succeeded but no token was returned."
        );
      }

      saveAuth(token, loggedUser);

      onSuccess(loggedUser || getUser());
    } catch (error) {
      console.error("Authentication error:", error);

      setError(
        error?.message ||
          "Unable to complete authentication."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`relative w-full max-w-md rounded-3xl p-7 shadow-2xl ${
          dark ? "bg-slate-900" : "bg-white"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p
              className={`text-lg font-black ${
                dark ? "text-white" : "text-gray-900"
              }`}
            >
              AUCTION
              <span className="text-orange-500">
                BD
              </span>
            </p>

            <p className="text-[9px] font-semibold tracking-[.2em] text-gray-400">
              BID. WIN. OWN.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <h2
          className={`mt-7 text-2xl font-black ${
            dark ? "text-white" : "text-gray-900"
          }`}
        >
          {loginMode
            ? "Welcome back"
            : "Create your account"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          {loginMode
            ? "Sign in to bid, save auctions and sell your items."
            : "Join AuctionBD and start buying or selling."}
        </p>

        {error && (
          <div
            className={`mt-5 flex gap-3 rounded-xl border p-4 text-sm ${
              dark
                ? "border-red-400/20 bg-red-400/10 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <AlertCircle
              size={18}
              className="shrink-0"
            />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={submit}
          className="mt-6 space-y-4"
        >
          {!loginMode && (
            <>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  update("name", e.target.value)
                }
                placeholder="Full name"
                autoComplete="name"
                className="field"
              />

              <input
                value={form.phone}
                onChange={(e) =>
                  update("phone", e.target.value)
                }
                placeholder="Phone number"
                autoComplete="tel"
                className="field"
              />
            </>
          )}

          <input
            required
            type="email"
            value={form.email}
            onChange={(e) =>
              update("email", e.target.value)
            }
            placeholder="Email address"
            autoComplete="email"
            className="field"
          />

          <input
            required
            minLength={6}
            type="password"
            value={form.password}
            onChange={(e) =>
              update(
                "password",
                e.target.value
              )
            }
            placeholder="Password"
            autoComplete={
              loginMode
                ? "current-password"
                : "new-password"
            }
            className="field"
          />

          {!loginMode && (
            <input
              required
              minLength={6}
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                update(
                  "confirmPassword",
                  e.target.value
                )
              }
              placeholder="Confirm password"
              autoComplete="new-password"
              className="field"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 font-bold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                {loginMode
                  ? "Signing in..."
                  : "Creating account..."}
              </>
            ) : (
              <>
                <LogIn size={18} />
                {loginMode
                  ? "Sign In"
                  : "Create Account"}
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setLoginMode((value) => !value);
            setError("");
          }}
          className={`mt-5 w-full rounded-xl border px-4 py-3 text-sm font-semibold ${
            dark
              ? "border-slate-700 text-slate-300 hover:border-orange-400"
              : "border-gray-200 text-gray-700 hover:border-orange-300"
          }`}
        >
          {loginMode
            ? "Don't have an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   AUCTION CARD
========================================================= */

function AuctionCard({
  auction,
  favorite,
  onOpen,
  onFavorite,
  dark,
}) {
  const status = statusInfo(auction.status);
  const active = auction.status === "active";

  return (
    <article
      onClick={() => onOpen(auction)}
      className={`group cursor-pointer overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-1 hover:border-orange-400 hover:shadow-lg ${
        dark
          ? "border-slate-800 bg-slate-900"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={auction.image}
          alt={
            auction.title ||
            "Auction item"
          }
          loading="lazy"
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
            !active ? "opacity-75" : ""
          }`}
          onError={(event) => {
            event.currentTarget.src =
              FALLBACK_IMAGE;
          }}
        />

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
        >
          {active && (
            <i className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
          )}
          {status.label}
        </span>

        <button
          type="button"
          aria-label={
            favorite
              ? "Remove favorite"
              : "Add favorite"
          }
          onClick={(event) => {
            event.stopPropagation();
            onFavorite(auction.id);
          }}
          className={`absolute right-3 top-3 rounded-full p-2 shadow ${
            favorite
              ? "bg-orange-500 text-white"
              : dark
              ? "bg-slate-900/95 text-white"
              : "bg-white/95 text-gray-700"
          }`}
        >
          <Heart
            size={17}
            fill={
              favorite
                ? "currentColor"
                : "none"
            }
          />
        </button>
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold text-orange-500">
          {auction.category ||
            auction.categoryGroup ||
            "Auction"}
        </p>

        <h3
          className={`mt-2 line-clamp-2 text-lg font-bold ${
            dark
              ? "text-white"
              : "text-gray-900"
          }`}
        >
          {auction.title ||
            "Untitled Auction"}
        </h3>

        <div className="mt-5 flex justify-between">
          <div>
            <p className="text-xs text-gray-500">
              {auction.status === "sold"
                ? "Sold for"
                : auction.status === "ended"
                ? "Final bid"
                : "Current bid"}
            </p>

            <p
              className={`text-xl font-black ${
                dark
                  ? "text-white"
                  : "text-gray-900"
              }`}
            >
              {money(auction.price)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">
              Bids
            </p>

            <p
              className={`font-semibold ${
                dark
                  ? "text-white"
                  : "text-gray-900"
              }`}
            >
              {auction.bids}
            </p>
          </div>
        </div>

        <div
          className={`mt-4 flex justify-between border-t pt-4 text-xs ${
            dark
              ? "border-slate-800"
              : "border-gray-100"
          }`}
        >
          <span className="flex items-center gap-1 text-gray-500">
            <Clock3 size={14} />
            {auction.time ||
              (auction.endTime
                ? formatDate(
                    auction.endTime
                  )
                : status.label)}
          </span>

          <span
            className={
              active
                ? "font-bold text-orange-500"
                : "font-bold text-gray-400"
            }
          >
            {active
              ? "Bid now →"
              : status.label}
          </span>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   SKELETON
========================================================= */

function Skeleton({ dark }) {
  const bg = dark
    ? "bg-slate-800"
    : "bg-gray-200";

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        dark
          ? "border-slate-800 bg-slate-900"
          : "border-gray-200 bg-white"
      }`}
    >
      <div
        className={`aspect-[4/3] animate-pulse ${bg}`}
      />

      <div className="space-y-4 p-5">
        <div
          className={`h-3 w-20 animate-pulse rounded ${bg}`}
        />

        <div
          className={`h-6 w-3/4 animate-pulse rounded ${bg}`}
        />

        <div className="flex justify-between">
          <div
            className={`h-6 w-24 animate-pulse rounded ${bg}`}
          />

          <div
            className={`h-6 w-10 animate-pulse rounded ${bg}`}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SELLER PAGE
========================================================= */

function SellerPage({
  user,
  onBack,
  onLogin,
  dark,
  notify,
}) {
  const [form, setForm] = useState({
    title: "",
    category: "",
    categoryGroup: "",
    condition: "",
    description: "",
    expectedPrice: "",
    location: "",
    notes: "",
  });

  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [loadingRequests, setLoadingRequests] =
    useState(false);

  const imageInput = useRef(null);
  const videoInput = useRef(null);

  const panel = dark
    ? "border-slate-800 bg-slate-900"
    : "border-gray-200 bg-white";

  const loadRequests =
    useCallback(async () => {
      if (!getToken()) return;

      setLoadingRequests(true);

      try {
        const data = await api(
          "/api/seller-requests/mine"
        );

        const list = Array.isArray(data)
          ? data
          : data?.requests || [];

        setRequests(list);
      } catch (error) {
        console.error(
          "Seller requests:",
          error
        );

        if (error.status === 401) {
          clearAuth();
          onLogin();
        }
      } finally {
        setLoadingRequests(false);
      }
    }, [onLogin]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const selectImages = (event) => {
    const selected = Array.from(
      event.target.files || []
    );

    const valid = [];
    const rejected = [];

    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        rejected.push(file.name);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        rejected.push(
          `${file.name} (too large)`
        );
        continue;
      }

      valid.push(file);
    }

    setImages((current) => {
      const combined = [
        ...current,
        ...valid,
      ];

      const unique = combined.filter(
        (file, index, array) =>
          array.findIndex(
            (item) =>
              item.name === file.name &&
              item.size === file.size &&
              item.lastModified ===
                file.lastModified
          ) === index
      );

      return unique.slice(0, MAX_IMAGES);
    });

    if (rejected.length) {
      notify(
        `Some photos were skipped. Maximum ${MAX_IMAGES} photos and 10MB per photo.`,
        "error"
      );
    }

    event.target.value = "";
  };

  const selectVideos = (event) => {
    const selected = Array.from(
      event.target.files || []
    );

    const valid = [];

    for (const file of selected) {
      if (!file.type.startsWith("video/")) {
        continue;
      }

      if (file.size <= MAX_VIDEO_SIZE) {
        valid.push(file);
      }
    }

    setVideos((current) =>
      [...current, ...valid].slice(
        0,
        MAX_VIDEOS
      )
    );

    event.target.value = "";
  };

  const removeImage = (index) => {
    setImages((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const removeVideo = (index) => {
    setVideos((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!getToken()) {
      onLogin();
      return;
    }

    if (!images.length) {
      notify(
        "Please upload at least one photo.",
        "error"
      );
      return;
    }

    if (!form.title.trim()) {
      notify(
        "Please enter an item title.",
        "error"
      );
      return;
    }

    if (!form.categoryGroup) {
      notify(
        "Please select a category.",
        "error"
      );
      return;
    }

    if (!form.description.trim()) {
      notify(
        "Please describe your item.",
        "error"
      );
      return;
    }

    setLoading(true);

    try {
      const body = new FormData();

      Object.entries(form).forEach(
        ([key, value]) => {
          body.append(key, value);
        }
      );

      images.forEach((file) => {
        body.append("images", file);
      });

      videos.forEach((file) => {
        body.append("videos", file);
      });

      await api(
        "/api/seller-requests",
        {
          method: "POST",
          body,
        }
      );

      setForm({
        title: "",
        category: "",
        categoryGroup: "",
        condition: "",
        description: "",
        expectedPrice: "",
        location: "",
        notes: "",
      });

      setImages([]);
      setVideos([]);

      await loadRequests();

      notify(
        "Your auction request was submitted successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Seller submission:",
        error
      );

      if (error.status === 401) {
        clearAuth();
        onLogin();
        return;
      }

      notify(
        error?.message ||
          "Unable to submit your request.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user && !getToken()) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <button
          onClick={onBack}
          className="mb-8 text-sm font-semibold text-orange-500"
        >
          ← Back to auctions
        </button>

        <div
          className={`rounded-3xl border p-10 text-center shadow-sm ${panel}`}
        >
          <User
            size={45}
            className="mx-auto text-orange-500"
          />

          <h1 className="mt-5 text-3xl font-black">
            Login required
          </h1>

          <p className="mt-3 text-gray-500">
            Sign in before listing your item.
          </p>

          <button
            onClick={onLogin}
            className="mt-7 rounded-xl bg-orange-500 px-7 py-3 font-bold text-white hover:bg-orange-600"
          >
            Login / Sign Up
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <button
        onClick={onBack}
        className="mb-8 text-sm font-semibold text-orange-500"
      >
        ← Back to auctions
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <p className="text-sm font-bold text-orange-500">
            SELL ON AUCTIONBD
          </p>

          <h1 className="mt-2 text-4xl font-black">
            List your item
          </h1>

          <p className="mt-3 text-gray-500">
            Upload photos directly from your
            phone, provide the details and
            submit your item for review.
          </p>

          <form
            onSubmit={submit}
            className={`mt-7 space-y-6 rounded-3xl border p-6 shadow-sm ${panel}`}
          >
            <div>
              <label className="mb-2 block text-sm font-bold">
                Item title *
              </label>

              <input
                required
                maxLength={150}
                value={form.title}
                onChange={(e) =>
                  update(
                    "title",
                    e.target.value
                  )
                }
                placeholder="e.g. iPhone 15 Pro Max"
                className="field"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Item category *
                </label>

                <input
                  required
                  value={form.category}
                  onChange={(e) =>
                    update(
                      "category",
                      e.target.value
                    )
                  }
                  placeholder="e.g. Smartphones"
                  className="field"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Category group *
                </label>

                <select
                  required
                  value={form.categoryGroup}
                  onChange={(e) =>
                    update(
                      "categoryGroup",
                      e.target.value
                    )
                  }
                  className="field"
                >
                  <option value="">
                    Select category
                  </option>

                  {CATEGORIES.filter(
                    (item) =>
                      item !== "All"
                  ).map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Condition
                </label>

                <input
                  value={form.condition}
                  onChange={(e) =>
                    update(
                      "condition",
                      e.target.value
                    )
                  }
                  placeholder="New / Used / Like new"
                  className="field"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Starting price
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.expectedPrice
                  }
                  onChange={(e) =>
                    update(
                      "expectedPrice",
                      e.target.value
                    )
                  }
                  placeholder="৳ Starting price"
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Location
              </label>

              <input
                value={form.location}
                onChange={(e) =>
                  update(
                    "location",
                    e.target.value
                  )
                }
                placeholder="e.g. Chattogram"
                className="field"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Description *
              </label>

              <textarea
                required
                rows={6}
                maxLength={5000}
                value={
                  form.description
                }
                onChange={(e) =>
                  update(
                    "description",
                    e.target.value
                  )
                }
                placeholder="Describe the item, condition, accessories, defects, warranty, etc."
                className="field resize-none"
              />

              <p className="mt-1 text-right text-xs text-gray-400">
                {form.description.length}
                /5000
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Additional notes
              </label>

              <textarea
                rows={3}
                maxLength={2000}
                value={form.notes}
                onChange={(e) =>
                  update(
                    "notes",
                    e.target.value
                  )
                }
                placeholder="Anything else the admin or buyer should know?"
                className="field resize-none"
              />
            </div>

            {/* PHOTOS */}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">
                  Photos *
                </p>

                <span className="text-xs text-gray-400">
                  {images.length}/
                  {MAX_IMAGES}
                </span>
              </div>

              <button
                type="button"
                disabled={
                  images.length >=
                  MAX_IMAGES
                }
                onClick={() =>
                  imageInput.current?.click()
                }
                className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 ${
                  dark
                    ? "border-slate-700 bg-slate-950 text-slate-400"
                    : "border-gray-300 bg-gray-50 text-gray-500"
                } disabled:opacity-50`}
              >
                <Upload size={22} />
                Choose photos from your phone
              </button>

              <input
                ref={imageInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={selectImages}
              />

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map(
                    (file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${index}`}
                        className="relative overflow-hidden rounded-xl border"
                      >
                        <img
                          src={URL.createObjectURL(
                            file
                          )}
                          alt={`Upload ${
                            index + 1
                          }`}
                          className="aspect-square w-full object-cover"
                          onLoad={(event) =>
                            URL.revokeObjectURL(
                              event
                                .currentTarget
                                .src
                            )
                          }
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeImage(
                              index
                            )
                          }
                          className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white"
                        >
                          <X size={15} />
                        </button>

                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                            MAIN
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* VIDEO */}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">
                  Video{" "}
                  <span className="font-normal text-gray-400">
                    optional
                  </span>
                </p>

                <span className="text-xs text-gray-400">
                  {videos.length}/
                  {MAX_VIDEOS}
                </span>
              </div>

              <button
                type="button"
                disabled={
                  videos.length >=
                  MAX_VIDEOS
                }
                onClick={() =>
                  videoInput.current?.click()
                }
                className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 ${
                  dark
                    ? "border-slate-700 bg-slate-950 text-slate-400"
                    : "border-gray-300 bg-gray-50 text-gray-500"
                } disabled:opacity-50`}
              >
                <Upload size={20} />
                Choose video
              </button>

              <input
                ref={videoInput}
                type="file"
                accept="video/*"
                multiple
                hidden
                onChange={selectVideos}
              />

              {videos.length > 0 && (
                <div className="mt-3 space-y-2">
                  {videos.map(
                    (file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${index}`}
                        className={`flex items-center justify-between rounded-xl border p-3 ${
                          dark
                            ? "border-slate-800"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {file.name}
                          </p>

                          <p className="text-xs text-gray-400">
                            {(
                              file.size /
                              1024 /
                              1024
                            ).toFixed(1)}{" "}
                            MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeVideo(
                              index
                            )
                          }
                          className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <X size={17} />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-4 font-black text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {loading && (
                <Loader2
                  size={19}
                  className="animate-spin"
                />
              )}

              {loading
                ? "Submitting..."
                : "Submit Auction Request"}
            </button>
          </form>
        </section>

        {/* REQUESTS */}

        <aside>
          <div
            className={`rounded-3xl border p-6 shadow-sm lg:sticky lg:top-24 ${panel}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Your requests
              </h2>

              <button
                onClick={loadRequests}
                disabled={
                  loadingRequests
                }
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  size={17}
                  className={
                    loadingRequests
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>
            </div>

            {loadingRequests ? (
              <div className="mt-8 flex justify-center">
                <Loader2 className="animate-spin text-orange-500" />
              </div>
            ) : requests.length === 0 ? (
              <div className="mt-8 text-center text-sm text-gray-500">
                <Package
                  size={35}
                  className="mx-auto mb-3 text-gray-300"
                />

                No requests yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {requests.map(
                  (request) => (
                    <div
                      key={
                        request._id ||
                        request.id
                      }
                      className={`rounded-xl border p-4 ${
                        dark
                          ? "border-slate-800"
                          : "border-gray-200"
                      }`}
                    >
                      <p className="font-bold">
                        {request.title}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold capitalize text-orange-500">
                          {String(
                            request.status ||
                              "pending"
                          ).replace(
                            /_/g,
                            " "
                          )}
                        </span>

                        {request.createdAt && (
                          <span className="text-[10px] text-gray-400">
                            {formatDate(
                              request.createdAt
                            )}
                          </span>
                        )}
                      </div>

                      {request.rejectionReason && (
                        <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">
                          <b>
                            Rejected:
                          </b>{" "}
                          {
                            request.rejectionReason
                          }
                        </div>
                      )}

                      {request.adminNotes && (
                        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-slate-950">
                          {
                            request.adminNotes
                          }
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

/* =========================================================
   NAVBAR
========================================================= */

function Navbar({
  user,
  dark,
  setDark,
  onLogin,
  onRegister,
  onLogout,
  onSeller,
  scrollTo,
}) {
  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur ${
        dark
          ? "border-slate-800 bg-slate-950/95"
          : "border-gray-200 bg-white/95"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4">
        <button
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          className="flex shrink-0 items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white">
            <Gavel size={20} />
          </div>

          <div className="text-left">
            <h1 className="text-lg font-black sm:text-xl">
              AUCTION
              <span className="text-orange-500">
                BD
              </span>
            </h1>

            <p className="hidden text-[10px] tracking-[.25em] text-gray-400 sm:block">
              BID. WIN. OWN.
            </p>
          </div>
        </button>

        <nav className="hidden gap-7 md:flex">
          {[
            ["Auctions", "auctions"],
            ["Categories", "categories"],
            ["How It Works", "how"],
          ].map(([name, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-sm font-medium text-gray-500 hover:text-orange-500"
            >
              {name}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeButton
            dark={dark}
            onClick={() =>
              setDark((value) => !value)
            }
          />

          {user ? (
            <>
              <button
                onClick={onSeller}
                className="rounded-lg border border-orange-200 px-2.5 py-2 text-xs font-semibold text-orange-500 hover:bg-orange-50 sm:text-sm"
              >
                Sell Item
              </button>

              <button
                onClick={onLogout}
                title="Logout"
                className="rounded-lg bg-gray-100 p-2 text-gray-600 dark:bg-slate-800 dark:text-gray-300"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onLogin}
                className="rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-700 hover:text-orange-500 sm:text-sm dark:text-gray-300"
              >
                Sign In
              </button>

              <button
                onClick={onRegister}
                className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 sm:text-sm"
              >
                Sign Up
              </button>

              <button
                onClick={onSeller}
                className="hidden rounded-lg border border-orange-500 px-3 py-2 text-sm font-bold text-orange-500 sm:block"
              >
                Sell Item
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   HOME
========================================================= */

function HomePage({
  auctions,
  loading,
  error,
  search,
  setSearch,
  category,
  setCategory,
  favorites,
  onFavorite,
  onOpenAuction,
  onRefresh,
  onSeller,
  dark,
}) {
  const filteredAuctions = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    return auctions.filter((auction) => {
      const searchable = [
        auction.title,
        auction.category,
        auction.categoryGroup,
        auction.description,
        auction.seller,
        auction.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !term ||
        searchable.includes(term);

      const matchesCategory =
        category === "All" ||
        String(
          auction.categoryGroup || ""
        ).toLowerCase() ===
          category.toLowerCase();

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [auctions, search, category]);

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  return (
    <>
      {/* HERO */}

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-500">
            🔥 Live auctions happening now
          </div>

          <h2 className="text-5xl font-black tracking-tight sm:text-6xl">
            Find it.
            <br />
            <span className="text-orange-500">
              Bid for it.
            </span>
            <br />
            Make it yours.
          </h2>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-500">
            Bangladesh&apos;s digital
            auction marketplace.
            Discover products, place
            competitive bids and win.
          </p>

          <button
            onClick={() =>
              scrollTo("auctions")
            }
            className="mt-8 flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white hover:bg-orange-600"
          >
            Explore Auctions
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* SEARCH */}

      <section className="mx-auto max-w-7xl px-6">
        <div
          className={`flex rounded-2xl border p-2 shadow-sm ${
            dark
              ? "border-slate-800 bg-slate-900"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex flex-1 items-center gap-3 px-3">
            <Search
              size={20}
              className="text-gray-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search auctions..."
              className="w-full bg-transparent py-2 outline-none"
            />

            {search && (
              <button
                onClick={() =>
                  setSearch("")
                }
                className="text-gray-400"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh auctions"
            className="rounded-xl p-3 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
          </button>
        </div>
      </section>

      {/* AUCTIONS */}

      <section
        id="auctions"
        className="mx-auto max-w-7xl scroll-mt-24 px-6 py-16"
      >
        <div className="mb-8">
          <h3 className="text-3xl font-bold">
            Auctions
          </h3>

          {!loading && !error && (
            <p className="mt-1 text-sm text-gray-500">
              {filteredAuctions.length}{" "}
              auction
              {filteredAuctions.length ===
              1
                ? ""
                : "s"}{" "}
              available
            </p>
          )}
        </div>

        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(
              (id) => (
                <Skeleton
                  key={id}
                  dark={dark}
                />
              )
            )}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
            <AlertCircle
              size={35}
              className="mx-auto text-red-400"
            />

            <p className="mt-3 text-red-600">
              {error}
            </p>

            <button
              onClick={onRefresh}
              className="mt-5 rounded-lg bg-orange-500 px-5 py-2 font-bold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredAuctions.length ===
            0 && (
            <div className="rounded-2xl border border-gray-200 p-12 text-center">
              <Search
                size={36}
                className="mx-auto text-gray-300"
              />

              <h4 className="mt-4 text-xl font-bold">
                No auctions found
              </h4>

              <p className="mt-2 text-gray-500">
                Try another search or
                category.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
                className="mt-5 rounded-lg bg-orange-500 px-5 py-2 font-bold text-white"
              >
                Clear Filters
              </button>
            </div>
          )}

        {!loading &&
          !error &&
          filteredAuctions.length >
            0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filteredAuctions.map(
                (auction) => (
                  <AuctionCard
                    key={auction.id}
                    auction={auction}
                    favorite={favorites.includes(
                      auction.id
                    )}
                    onOpen={
                      onOpenAuction
                    }
                    onFavorite={
                      onFavorite
                    }
                    dark={dark}
                  />
                )
              )}
            </div>
          )}
      </section>

      {/* CATEGORIES */}

      <section
        id="categories"
        className={`border-y ${
          dark
            ? "border-slate-800 bg-slate-900/50"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h3 className="text-3xl font-bold">
            Categories
          </h3>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {CATEGORIES.map(
              (item) => (
                <button
                  key={item}
                  onClick={() => {
                    setCategory(item);
                    scrollTo(
                      "auctions"
                    );
                  }}
                  className={`rounded-xl border px-4 py-4 font-medium ${
                    category === item
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : dark
                      ? "border-slate-700 bg-slate-900 text-slate-300"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}

      <section
        id="how"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <h3 className="text-center text-3xl font-bold">
          How Auction BD Works
        </h3>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            [
              Search,
              "Find Auction",
              "Browse products and discover something you want.",
            ],
            [
              Gavel,
              "Place Bid",
              "Enter a valid bid higher than the current price.",
            ],
            [
              ShieldCheck,
              "Win Securely",
              "Highest valid bidder wins when the auction ends.",
            ],
          ].map(
            ([
              Icon,
              title,
              description,
            ]) => (
              <div
                key={title}
                className={`rounded-2xl border p-8 shadow-sm ${
                  dark
                    ? "border-slate-800 bg-slate-900"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                  <Icon size={23} />
                </div>

                <h4 className="mt-5 text-xl font-bold">
                  {title}
                </h4>

                <p className="mt-2 leading-6 text-gray-500">
                  {description}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* SELL */}

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl bg-orange-500 p-8 text-white sm:p-10">
          <h3 className="text-3xl font-black">
            Turn your item into an auction.
          </h3>

          <p className="mt-3 max-w-xl text-white/80">
            Upload photos directly from
            your phone, submit your item
            and let buyers compete for it.
          </p>

          <button
            onClick={onSeller}
            className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-orange-600 hover:bg-orange-50"
          >
            Sell Item
          </button>
        </div>
      </section>
    </>
  );
}

/* =========================================================
   FOOTER
========================================================= */

function Footer({ dark }) {
  return (
    <footer
      className={`border-t px-6 py-8 ${
        dark
          ? "border-slate-800"
          : "border-gray-200"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row">
        <div>
          <b>
            AUCTION
            <span className="text-orange-500">
              BD
            </span>
          </b>

          <p className="mt-1 text-xs text-gray-500">
            BID. WIN. OWN.
          </p>
        </div>

        <div className="flex flex-wrap gap-5 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} />
            Verified
          </span>

          <span className="flex items-center gap-1">
            <Truck size={14} />
            Delivery
          </span>

          <span className="flex items-center gap-1">
            <Zap size={14} />
            Live
          </span>

          <span className="flex items-center gap-1">
            <Gavel size={14} />
            Auctions
          </span>
        </div>
      </div>
    </footer>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  const [auctions, setAuctions] =
    useState([]);

  const [
    selectedAuction,
    setSelectedAuction,
  ] = useState(null);

  const [page, setPage] =
    useState("home");

  const [authMode, setAuthMode] =
    useState(null);

  const [user, setUser] =
    useState(getUser);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [favorites, setFavorites] =
    useState(() =>
      readStorage(
        KEYS.favorites,
        []
      )
    );

  const [toast, setToast] =
    useState(null);

  const [dark, setDark] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            KEYS.theme
          );

        if (saved === "dark") {
          return true;
        }

        if (saved === "light") {
          return false;
        }

        return (
          window.matchMedia?.(
            "(prefers-color-scheme: dark)"
          ).matches || false
        );
      } catch {
        return false;
      }
    });

  /* =======================================================
     TOAST
  ======================================================= */

  const notify = useCallback(
    (message, type = "success") => {
      setToast({
        message,
        type,
        id: Date.now(),
      });
    },
    []
  );

  /* =======================================================
     THEME
  ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        KEYS.theme,
        dark ? "dark" : "light"
      );
    } catch {}

    document.documentElement.style.colorScheme =
      dark ? "dark" : "light";

    document.body.style.backgroundColor =
      dark ? "#020617" : "#ffffff";

    document.body.style.color =
      dark ? "#f8fafc" : "#111827";
  }, [dark]);

  /* =======================================================
     FAVORITES
  ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        KEYS.favorites,
        JSON.stringify(favorites)
      );
    } catch {}
  }, [favorites]);

  const toggleFavorite = useCallback(
    (id) => {
      setFavorites((current) => {
        const exists =
          current.includes(id);

        notify(
          exists
            ? "Removed from favorites."
            : "Added to favorites.",
          "success"
        );

        return exists
          ? current.filter(
              (item) => item !== id
            )
          : [...current, id];
      });
    },
    [notify]
  );

  /* =======================================================
     LOAD AUCTIONS
  ======================================================= */

  const loadAuctions =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data = await api(
          "/api/auctions?status=all"
        );

        const list = Array.isArray(data)
          ? data
          : Array.isArray(
              data?.auctions
            )
          ? data.auctions
          : [];

        setAuctions(
          list.map(normalizeAuction)
        );
      } catch (error) {
        console.error(
          "Auction loading:",
          error
        );

        setError(
          error?.message ||
            "Unable to load auctions."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  /* =======================================================
     AUTH
  ======================================================= */

  const handleAuthSuccess = useCallback(
    (newUser) => {
      setUser(
        newUser || getUser()
      );

      setAuthMode(null);

      notify(
        "You're signed in successfully.",
        "success"
      );
    },
    [notify]
  );

  const logout = useCallback(() => {
    clearAuth();

    setUser(null);
    setPage("home");
    setSelectedAuction(null);

    notify(
      "You have been signed out.",
      "success"
    );
  }, [notify]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const openSeller = () => {
    if (!getToken()) {
      setAuthMode("login");
      return;
    }

    setSelectedAuction(null);
    setPage("seller");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  /* =======================================================
     ADMIN
  ======================================================= */

  const adminMode =
    new URLSearchParams(
      window.location.search
    ).get("admin") === "1";

  if (adminMode) {
    return (
      <>
        <GlobalStyles dark={dark} />

        <AdminPanel />
      </>
    );
  }

  /* =======================================================
     DETAILS
  ======================================================= */

  if (selectedAuction) {
    return (
      <div
        className={`min-h-screen ${
          dark
            ? "bg-slate-950 text-white"
            : "bg-white text-gray-900"
        }`}
      >
        <GlobalStyles dark={dark} />

        <AuctionDetails
          auction={selectedAuction}
          onBack={() => {
            setSelectedAuction(null);
            loadAuctions();
          }}
          onLogin={() =>
            setAuthMode("login")
          }
          dark={dark}
        />

        <div className="fixed right-4 top-4 z-[100]">
          <ThemeButton
            dark={dark}
            onClick={() =>
              setDark(
                (value) => !value
              )
            }
          />
        </div>

        {authMode && (
          <AuthModal
            mode={authMode}
            onClose={() =>
              setAuthMode(null)
            }
            onSuccess={
              handleAuthSuccess
            }
            dark={dark}
          />
        )}

        <Toast
          toast={toast}
          onClose={() =>
            setToast(null)
          }
        />
      </div>
    );
  }

  /* =======================================================
     SELLER
  ======================================================= */

  if (page === "seller") {
    return (
      <div
        className={`min-h-screen ${
          dark
            ? "bg-slate-950 text-white"
            : "bg-white text-gray-900"
        }`}
      >
        <GlobalStyles dark={dark} />

        <header
          className={`sticky top-0 z-40 border-b backdrop-blur ${
            dark
              ? "border-slate-800 bg-slate-950/95"
              : "border-gray-200 bg-white/95"
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <button
              onClick={() =>
                setPage("home")
              }
              className="text-xl font-black"
            >
              AUCTION
              <span className="text-orange-500">
                BD
              </span>
            </button>

            <div className="flex items-center gap-2">
              <ThemeButton
                dark={dark}
                onClick={() =>
                  setDark(
                    (value) =>
                      !value
                  )
                }
              />

              <button
                onClick={logout}
                className="flex items-center gap-2 text-sm text-gray-500"
              >
                <LogOut size={17} />

                <span className="hidden sm:inline">
                  Logout
                </span>
              </button>
            </div>
          </div>
        </header>

        <SellerPage
          user={user}
          onBack={() =>
            setPage("home")
          }
          onLogin={() =>
            setAuthMode("login")
          }
          dark={dark}
          notify={notify}
        />

        <Toast
          toast={toast}
          onClose={() =>
            setToast(null)
          }
        />

        {authMode && (
          <AuthModal
            mode={authMode}
            onClose={() =>
              setAuthMode(null)
            }
            onSuccess={
              handleAuthSuccess
            }
            dark={dark}
          />
        )}
      </div>
    );
  }

  /* =======================================================
     HOME
  ======================================================= */

  return (
    <div
      className={`min-h-screen ${
        dark
          ? "bg-slate-950 text-white"
          : "bg-white text-gray-900"
      }`}
    >
      <GlobalStyles dark={dark} />

      <Navbar
        user={user}
        dark={dark}
        setDark={setDark}
        onLogin={() =>
          setAuthMode("login")
        }
        onRegister={() =>
          setAuthMode("register")
        }
        onLogout={logout}
        onSeller={openSeller}
        scrollTo={scrollTo}
      />

      <HomePage
        auctions={auctions}
        loading={loading}
        error={error}
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        favorites={favorites}
        onFavorite={toggleFavorite}
        onOpenAuction={
          setSelectedAuction
        }
        onRefresh={loadAuctions}
        onSeller={openSeller}
        dark={dark}
      />

      <Footer dark={dark} />

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() =>
            setAuthMode(null)
          }
          onSuccess={
            handleAuthSuccess
          }
          dark={dark}
        />
      )}

      <Toast
        toast={toast}
        onClose={() =>
          setToast(null)
        }
      />
    </div>
  );
}

export default App;