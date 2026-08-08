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
  Search,
  Gavel,
  Heart,
  Clock3,
  ArrowRight,
  ShieldCheck,
  Truck,
  Zap,
  X,
  RefreshCw,
  User,
  LogOut,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  LogIn,
  Sun,
  Moon,
} from "lucide-react";

/* =========================================================
CONFIG
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://auction-bd-api.onrender.com"
).replace(/\/+$/, "");

const TOKEN_KEY = "auctionbd_token";
const USER_KEY = "auctionbd_user";
const FAVORITES_KEY = "auctionbd_favorites";
const THEME_KEY = "auctionbd_theme";

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

/* =========================================================
AUTH HELPERS
========================================================= */

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function getSavedUser() {
  try {
    return JSON.parse(
      localStorage.getItem(USER_KEY) || "null"
    );
  } catch {
    return null;
  }
}

function saveAuth(token, user) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }

    if (user) {
      localStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
      );
    }
  } catch (error) {
    console.error("Failed to save auth:", error);
  }
}

function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

/* =========================================================
API
========================================================= */

async function api(path, options = {}) {
  const token = getToken();

  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers,
        cache:
          options.cache ||
          "no-store",
      }
    );
  } catch (error) {
    console.error("API connection error:", error);

    throw new Error(
      `Unable to connect to the AuctionBD server. Please check your internet connection or try again.`
    );
  }

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message:
        text ||
        "Invalid server response.",
    };
  }

  if (!response.ok) {
    let message =
      data?.message ||
      data?.error ||
      `Server returned ${response.status}`;

    if (response.status === 404) {
      message =
        data?.message ||
        `API endpoint not found: ${path}. Check that the backend route exists.`;
    }

    if (response.status === 401) {
      message =
        data?.message ||
        "Your login session is invalid or expired.";
    }

    if (response.status === 403) {
      message =
        data?.message ||
        "You do not have permission to perform this action.";
    }

    if (response.status >= 500) {
      message =
        data?.message ||
        "The AuctionBD server encountered an error. Please try again.";
    }

    throw new Error(message);
  }

  return data;
}

/* =========================================================
HELPERS
========================================================= */

function money(value = 0) {
  return `৳${Number(value || 0).toLocaleString(
    "en-BD"
  )}`;
}

function normalizeAuction(auction) {
  return {
    ...auction,
    id: auction?._id || auction?.id,
    price: Number(auction?.price) || 0,
    bids: Number(auction?.bids) || 0,
    status: String(
      auction?.status || "active"
    ).toLowerCase(),
  };
}

function statusInfo(status) {
  if (status === "sold") {
    return {
      label: "SOLD",
      color:
        "bg-emerald-500 text-white",
    };
  }

  if (status === "ended") {
    return {
      label: "ENDED",
      color:
        "bg-slate-600 text-white",
    };
  }

  if (status === "cancelled") {
    return {
      label: "CANCELLED",
      color:
        "bg-red-600 text-white",
    };
  }

  return {
    label: "LIVE",
    color:
      "bg-red-500 text-white",
  };
}

/* =========================================================
GLOBAL STYLES
========================================================= */

function GlobalStyles({ dark }) {
  return (
    <style>
      {`
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

        .field {
          width: 100%;
          border-radius: 12px;
          border: 1px solid ${
            dark ? "#334155" : "#e5e7eb"
          };
          background: ${
            dark ? "#0f172a" : "#ffffff"
          };
          padding: 13px 15px;
          outline: none;
          color: ${
            dark ? "#f8fafc" : "#111827"
          };
          transition: .2s ease;
        }

        .field:focus {
          border-color: #f59e0b;
          box-shadow:
            0 0 0 3px rgba(245,158,11,.12);
        }

        .field::placeholder {
          color: ${
            dark ? "#64748b" : "#9ca3af"
          };
        }

        select option {
          background: ${
            dark ? "#0f172a" : "#ffffff"
          };
          color: ${
            dark ? "#f8fafc" : "#111827"
          };
        }

        input,
        textarea,
        select,
        button {
          font-family: inherit;
        }
      `}
    </style>
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
  const status = statusInfo(
    auction.status
  );

  const active =
    auction.status === "active";

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
          src={
            auction.image ||
            FALLBACK_IMAGE
          }
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
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${status.color}`}
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
          className={`absolute right-3 top-3 rounded-full p-2 shadow transition ${
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

        <div className="mt-5 flex justify-between gap-4">
          <div>
            <p
              className={`text-xs ${
                dark
                  ? "text-slate-500"
                  : "text-gray-500"
              }`}
            >
              {auction.status ===
              "sold"
                ? "Sold for"
                : auction.status ===
                  "ended"
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
            <p
              className={`text-xs ${
                dark
                  ? "text-slate-500"
                  : "text-gray-500"
              }`}
            >
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
          <span
            className={`flex items-center gap-1 ${
              dark
                ? "text-slate-500"
                : "text-gray-500"
            }`}
          >
            <Clock3 size={14} />

            {auction.time ||
              status.label}
          </span>

          <span
            className={
              active
                ? "font-bold text-orange-500"
                : dark
                ? "font-bold text-slate-600"
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
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        dark
          ? "border-slate-800 bg-slate-900"
          : "border-gray-200 bg-white"
      }`}
    >
      <div
        className={`aspect-[4/3] animate-pulse ${
          dark
            ? "bg-slate-800"
            : "bg-gray-200"
        }`}
      />

      <div className="space-y-4 p-5">
        <div
          className={`h-3 w-20 animate-pulse rounded ${
            dark
              ? "bg-slate-800"
              : "bg-gray-200"
          }`}
        />

        <div
          className={`h-6 w-3/4 animate-pulse rounded ${
            dark
              ? "bg-slate-800"
              : "bg-gray-200"
          }`}
        />

        <div className="flex justify-between">
          <div
            className={`h-6 w-24 animate-pulse rounded ${
              dark
                ? "bg-slate-800"
                : "bg-gray-200"
            }`}
          />

          <div
            className={`h-6 w-10 animate-pulse rounded ${
              dark
                ? "bg-slate-800"
                : "bg-gray-200"
            }`}
          />
        </div>
      </div>
    </div>
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
  const [loginMode, setLoginMode] =
    useState(mode !== "register");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        originalOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanName = name.trim();
    const cleanEmail =
      email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!loginMode) {
      if (cleanName.length < 2) {
        setError(
          "Please enter your full name."
        );
        return;
      }

      if (password.length < 6) {
        setError(
          "Password must be at least 6 characters."
        );
        return;
      }

      if (
        password !== confirmPassword
      ) {
        setError(
          "Passwords do not match."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const path = loginMode
        ? "/api/auth/login"
        : "/api/auth/register";

      const body = loginMode
        ? {
            email: cleanEmail,
            password,
          }
        : {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password,
            confirmPassword,
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
          setSuccess(
            "Account created successfully. Please sign in."
          );

          setLoginMode(true);
          setPassword("");
          setConfirmPassword("");
          return;
        }

        throw new Error(
          "Login succeeded, but the server did not return a login token."
        );
      }

      saveAuth(
        token,
        loggedUser
      );

      const finalUser =
        loggedUser || getSavedUser();

      setSuccess(
        loginMode
          ? "Signed in successfully."
          : "Account created successfully."
      );

      onSuccess(finalUser);
    } catch (err) {
      console.error(
        "Authentication error:",
        err
      );

      setError(
        err?.message ||
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
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl ${
          dark
            ? "bg-slate-900"
            : "bg-white"
        }`}
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
                  <Gavel size={20} />
                </div>

                <div>
                  <p
                    className={`text-lg font-black ${
                      dark
                        ? "text-white"
                        : "text-gray-900"
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
              </div>

              <h2
                className={`mt-7 text-2xl font-black ${
                  dark
                    ? "text-white"
                    : "text-gray-900"
                }`}
              >
                {loginMode
                  ? "Welcome back"
                  : "Create your account"}
              </h2>

              <p
                className={`mt-2 text-sm leading-6 ${
                  dark
                    ? "text-slate-400"
                    : "text-gray-600"
                }`}
              >
                {loginMode
                  ? "Sign in to place bids, save auctions and sell your items."
                  : "Join AuctionBD and start buying or selling today."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`rounded-full p-2 transition ${
                dark
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div
              className={`mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
                dark
                  ? "border-red-400/20 bg-red-400/10 text-red-300"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              className={`mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
                dark
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{success}</span>
            </div>
          )}

          <form
            onSubmit={submit}
            className="mt-6 space-y-4"
          >
            {!loginMode && (
              <>
                <div>
                  <label
                    className={`mb-1.5 block text-sm font-semibold ${
                      dark
                        ? "text-slate-300"
                        : "text-gray-700"
                    }`}
                  >
                    Full name
                  </label>

                  <input
                    required
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Enter your full name"
                    className="field"
                  />
                </div>

                <div>
                  <label
                    className={`mb-1.5 block text-sm font-semibold ${
                      dark
                        ? "text-slate-300"
                        : "text-gray-700"
                    }`}
                  >
                    Phone number
                  </label>

                  <input
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                    placeholder="01XXXXXXXXX"
                    className="field"
                  />
                </div>
              </>
            )}

            <div>
              <label
                className={`mb-1.5 block text-sm font-semibold ${
                  dark
                    ? "text-slate-300"
                    : "text-gray-700"
                }`}
              >
                Email address
              </label>

              <input
                required
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="you@example.com"
                autoComplete="email"
                className="field"
              />
            </div>

            <div>
              <label
                className={`mb-1.5 block text-sm font-semibold ${
                  dark
                    ? "text-slate-300"
                    : "text-gray-700"
                }`}
              >
                Password
              </label>

              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="At least 6 characters"
                autoComplete={
                  loginMode
                    ? "current-password"
                    : "new-password"
                }
                className="field"
              />
            </div>

            {!loginMode && (
              <div>
                <label
                  className={`mb-1.5 block text-sm font-semibold ${
                    dark
                      ? "text-slate-300"
                      : "text-gray-700"
                  }`}
                >
                  Confirm password
                </label>

                <input
                  required
                  minLength={6}
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  className="field"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="my-5 flex items-center gap-3">
            <div
              className={`h-px flex-1 ${
                dark
                  ? "bg-slate-800"
                  : "bg-gray-200"
              }`}
            />

            <span className="text-xs text-gray-400">
              AUCTIONBD
            </span>

            <div
              className={`h-px flex-1 ${
                dark
                  ? "bg-slate-800"
                  : "bg-gray-200"
              }`}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setLoginMode(
                (current) => !current
              );
              setError("");
              setSuccess("");
            }}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              dark
                ? "border-slate-700 text-slate-300 hover:border-orange-400 hover:bg-orange-400/10 hover:text-orange-400"
                : "border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
            }`}
          >
            {loginMode
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </button>
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
}) {
  const [form, setForm] =
    useState({
      title: "",
      category: "",
      categoryGroup: "",
      condition: "",
      description: "",
      expectedPrice: "",
      location: "",
      notes: "",
    });

  const [images, setImages] =
    useState([]);

  const [videos, setVideos] =
    useState([]);

  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [loadingRequests, setLoadingRequests] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const imageInput =
    useRef(null);

  const videoInput =
    useRef(null);

  const loadRequests =
    useCallback(async () => {
      if (!getToken()) return;

      setLoadingRequests(true);

      try {
        const data = await api(
          "/api/seller-requests/mine"
        );

        setRequests(
          Array.isArray(data)
            ? data
            : data?.requests || []
        );
      } catch (err) {
        console.error(
          "Seller requests error:",
          err
        );
      } finally {
        setLoadingRequests(false);
      }
    }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const update = (
    key,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!getToken()) {
      onLogin();
      return;
    }

    if (!images.length) {
      setError(
        "Please upload at least one photo."
      );
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const body = new FormData();

      Object.entries(form).forEach(
        ([key, value]) => {
          body.append(key, value);
        }
      );

      images.forEach((file) => {
        body.append(
          "images",
          file
        );
      });

      videos.forEach((file) => {
        body.append(
          "videos",
          file
        );
      });

      await api(
        "/api/seller-requests",
        {
          method: "POST",
          body,
        }
      );

      setMessage(
        "Your auction request has been submitted successfully."
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

      if (imageInput.current) {
        imageInput.current.value =
          "";
      }

      if (videoInput.current) {
        videoInput.current.value =
          "";
      }

      await loadRequests();
    } catch (err) {
      console.error(
        "Seller request error:",
        err
      );

      const text =
        err?.message?.toLowerCase() ||
        "";

      if (
        text.includes("login") ||
        text.includes("session") ||
        text.includes("token") ||
        text.includes("unauthorized")
      ) {
        clearAuth();
        onLogin();
      } else {
        setError(
          err?.message ||
            "Unable to submit your request."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const panel = dark
    ? "border-slate-800 bg-slate-900"
    : "border-gray-200 bg-white";

  const heading = dark
    ? "text-white"
    : "text-gray-900";

  const muted = dark
    ? "text-slate-400"
    : "text-gray-500";

  if (!user && !getToken()) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-12">
        <button
          onClick={onBack}
          className={`mb-7 text-sm ${
            dark
              ? "text-slate-400"
              : "text-gray-500"
          }`}
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

          <h1
            className={`mt-5 text-3xl font-black ${heading}`}
          >
            Login required
          </h1>

          <p
            className={`mt-3 ${muted}`}
          >
            Create an account or sign in
            before listing your item.
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
    <main className="mx-auto max-w-7xl px-6 py-12">
      <button
        onClick={onBack}
        className={`mb-7 text-sm ${
          dark
            ? "text-slate-400 hover:text-white"
            : "text-gray-500 hover:text-gray-900"
        }`}
      >
        ← Back to auctions
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-8">
            <p className="text-sm font-bold text-orange-500">
              SELL ON AUCTIONBD
            </p>

            <h1
              className={`mt-2 text-4xl font-black ${heading}`}
            >
              List your item
            </h1>

            <p
              className={`mt-3 ${muted}`}
            >
              Upload photos, provide the
              details and submit your item
              for review.
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 flex gap-3 rounded-2xl border p-4 ${
                dark
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <CheckCircle2
                size={20}
                className="shrink-0"
              />

              <span>{message}</span>
            </div>
          )}

          {error && (
            <div
              className={`mb-6 flex gap-3 rounded-2xl border p-4 ${
                dark
                  ? "border-red-400/20 bg-red-400/10 text-red-300"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <AlertCircle
                size={20}
                className="shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={submit}
            className={`space-y-5 rounded-3xl border p-6 shadow-sm ${panel}`}
          >
            <input
              required
              value={form.title}
              onChange={(event) =>
                update(
                  "title",
                  event.target.value
                )
              }
              placeholder="Item title"
              className="field"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                value={form.category}
                onChange={(event) =>
                  update(
                    "category",
                    event.target.value
                  )
                }
                placeholder="Category"
                className="field"
              />

              <select
                required
                value={
                  form.categoryGroup
                }
                onChange={(event) =>
                  update(
                    "categoryGroup",
                    event.target.value
                  )
                }
                className="field"
              >
                <option value="">
                  Category group
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

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={form.condition}
                onChange={(event) =>
                  update(
                    "condition",
                    event.target.value
                  )
                }
                placeholder="Condition"
                className="field"
              />

              <input
                type="number"
                min="0"
                value={
                  form.expectedPrice
                }
                onChange={(event) =>
                  update(
                    "expectedPrice",
                    event.target.value
                  )
                }
                placeholder="Expected starting price (৳)"
                className="field"
              />
            </div>

            <input
              value={form.location}
              onChange={(event) =>
                update(
                  "location",
                  event.target.value
                )
              }
              placeholder="Location"
              className="field"
            />

            <textarea
              required
              value={
                form.description
              }
              onChange={(event) =>
                update(
                  "description",
                  event.target.value
                )
              }
              placeholder="Describe your item"
              rows={6}
              className="field resize-none"
            />

            <textarea
              value={form.notes}
              onChange={(event) =>
                update(
                  "notes",
                  event.target.value
                )
              }
              placeholder="Additional notes (optional)"
              rows={3}
              className="field resize-none"
            />

            <div>
              <p
                className={`mb-2 font-bold ${heading}`}
              >
                Photos *
              </p>

              <button
                type="button"
                onClick={() =>
                  imageInput.current?.click()
                }
                className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition ${
                  dark
                    ? "border-slate-700 bg-slate-950 text-slate-400 hover:border-orange-400 hover:bg-orange-400/10 hover:text-orange-400"
                    : "border-gray-300 bg-gray-50 text-gray-500 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-500"
                }`}
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
                onChange={(event) =>
                  setImages(
                    Array.from(
                      event.target.files ||
                        []
                    )
                  )
                }
              />

              {images.length > 0 && (
                <p className="mt-2 text-sm font-semibold text-orange-500">
                  {images.length} photo
                  {images.length === 1
                    ? ""
                    : "s"}{" "}
                  selected
                </p>
              )}
            </div>

            <div>
              <p
                className={`mb-2 font-bold ${heading}`}
              >
                Video{" "}
                <span className="font-normal text-gray-400">
                  (optional)
                </span>
              </p>

              <button
                type="button"
                onClick={() =>
                  videoInput.current?.click()
                }
                className={`flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 transition ${
                  dark
                    ? "border-slate-700 bg-slate-950 text-slate-400 hover:border-orange-400 hover:bg-orange-400/10 hover:text-orange-400"
                    : "border-gray-300 bg-gray-50 text-gray-500 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-500"
                }`}
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
                onChange={(event) =>
                  setVideos(
                    Array.from(
                      event.target.files ||
                        []
                    )
                  )
                }
              />

              {videos.length > 0 && (
                <p
                  className={`mt-2 text-sm ${muted}`}
                >
                  {videos.length} video
                  {videos.length === 1
                    ? ""
                    : "s"}{" "}
                  selected
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-4 font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
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

        <aside>
          <div
            className={`rounded-3xl border p-6 shadow-sm lg:sticky lg:top-24 ${panel}`}
          >
            <h2
              className={`text-xl font-bold ${heading}`}
            >
              Your requests
            </h2>

            {loadingRequests ? (
              <div className="mt-6 flex justify-center">
                <Loader2 className="animate-spin text-orange-500" />
              </div>
            ) : requests.length ===
              0 ? (
              <div
                className={`mt-8 text-center text-sm ${muted}`}
              >
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
                      <p
                        className={`font-bold ${heading}`}
                      >
                        {request.title}
                      </p>

                      <p className="mt-2 text-xs font-semibold capitalize text-orange-500">
                        {String(
                          request.status ||
                            ""
                        ).replace(
                          /_/g,
                          " "
                        )}
                      </p>

                      {request.rejectionReason && (
                        <p className="mt-2 text-xs text-red-500">
                          {
                            request.rejectionReason
                          }
                        </p>
                      )}

                      {request.adminNotes && (
                        <p
                          className={`mt-2 text-xs ${muted}`}
                        >
                          {
                            request.adminNotes
                          }
                        </p>
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
MAIN APP
========================================================= */

function AuctionHome() {
  const [auctions, setAuctions] =
    useState([]);

  const [selectedAuction, setSelectedAuction] =
    useState(null);

  const [page, setPage] =
    useState("home");

  const [authMode, setAuthMode] =
    useState(null);

  const [user, setUser] =
    useState(getSavedUser);

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [dark, setDark] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            THEME_KEY
          );

        if (saved === "dark")
          return true;

        if (saved === "light")
          return false;

        return (
          window.matchMedia?.(
            "(prefers-color-scheme: dark)"
          ).matches || false
        );
      } catch {
        return false;
      }
    });

  const [favorites, setFavorites] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            FAVORITES_KEY
          ) || "[]"
        );
      } catch {
        return [];
      }
    });

  /* =======================================================
  THEME
  ======================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        THEME_KEY,
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
  LOAD AUCTIONS
  ======================================================= */

  const loadAuctions =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data = await api(
          "/api/auctions?status=all",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const list =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data?.auctions
              )
            ? data.auctions
            : [];

        setAuctions(
          list.map(normalizeAuction)
        );
      } catch (err) {
        console.error(
          "Auction loading error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load auctions."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(favorites)
      );
    } catch {}
  }, [favorites]);

  /* =======================================================
  FILTER
  ======================================================= */

  const filteredAuctions =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      return auctions.filter(
        (auction) => {
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

          return (
            searchable.includes(term) &&
            (category === "All" ||
              String(
                auction.categoryGroup ||
                  ""
              ).toLowerCase() ===
                category.toLowerCase())
          );
        }
      );
    }, [
      auctions,
      search,
      category,
    ]);

  /* =======================================================
  FAVORITES
  ======================================================= */

  const toggleFavorite =
    useCallback((id) => {
      setFavorites((current) =>
        current.includes(id)
          ? current.filter(
              (item) => item !== id
            )
          : [...current, id]
      );
    }, []);

  /* =======================================================
  SCROLL
  ======================================================= */

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  /* =======================================================
  AUTH SUCCESS
  ======================================================= */

  const handleAuthSuccess = (
    newUser
  ) => {
    const saved =
      newUser || getSavedUser();

    setUser(saved);
    setAuthMode(null);
  };

  /* =======================================================
  LOGOUT
  ======================================================= */

  const logout = () => {
    clearAuth();
    setUser(null);
    setPage("home");
    setSelectedAuction(null);
  };

  /* =======================================================
  SELLER
  ======================================================= */

  const openSeller = () => {
    if (!getToken()) {
      setAuthMode("login");
      return;
    }

    setPage("seller");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
  AUCTION DETAILS
  ======================================================= */

  if (selectedAuction) {
    return (
      <div
        className={
          dark
            ? "min-h-screen bg-slate-950 text-white"
            : "min-h-screen bg-white text-gray-900"
        }
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

        {/* Theme button on details page */}
        <button
          type="button"
          onClick={() =>
            setDark((value) => !value)
          }
          title={
            dark
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          className={`fixed right-4 top-4 z-[100] flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur ${
            dark
              ? "border-slate-700 bg-slate-900 text-amber-400"
              : "border-gray-200 bg-white text-slate-700"
          }`}
        >
          {dark ? (
            <Sun size={19} />
          ) : (
            <Moon size={19} />
          )}
        </button>
      </div>
    );
  }

  /* =======================================================
  SELLER PAGE
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
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <button
              onClick={() =>
                setPage("home")
              }
              className={`text-xl font-black ${
                dark
                  ? "text-white"
                  : "text-gray-900"
              }`}
            >
              AUCTION
              <span className="text-orange-500">
                BD
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDark(
                    (value) => !value
                  )
                }
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                  dark
                    ? "border-slate-700 bg-slate-900 text-amber-400"
                    : "border-gray-200 bg-white text-slate-700"
                }`}
              >
                {dark ? (
                  <Sun size={18} />
                ) : (
                  <Moon size={18} />
                )}
              </button>

              <button
                onClick={logout}
                className={`flex items-center gap-2 text-sm ${
                  dark
                    ? "text-slate-400 hover:text-white"
                    : "text-gray-500 hover:text-gray-900"
                }`}
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
      className={`min-h-screen transition-colors duration-200 ${
        dark
          ? "bg-slate-950 text-white"
          : "bg-white text-gray-900"
      }`}
    >
      <GlobalStyles dark={dark} />

      {/* HEADER */}

      <header
        className={`sticky top-0 z-40 border-b backdrop-blur ${
          dark
            ? "border-slate-800 bg-slate-950/95"
            : "border-gray-200 bg-white/95"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4">
          {/* LOGO */}

          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="flex shrink-0 items-center gap-2 sm:gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white sm:h-10 sm:w-10">
              <Gavel size={20} />
            </div>

            <div className="text-left">
              <h1
                className={`text-lg font-black sm:text-xl ${
                  dark
                    ? "text-white"
                    : "text-gray-900"
                }`}
              >
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

          {/* DESKTOP NAV */}

          <nav className="hidden gap-7 md:flex">
            {[
              [
                "Auctions",
                "auctions",
              ],
              [
                "Categories",
                "categories",
              ],
              [
                "How It Works",
                "how",
              ],
            ].map(
              ([name, id]) => (
                <button
                  key={id}
                  onClick={() =>
                    scrollTo(id)
                  }
                  className={`text-sm font-medium transition ${
                    dark
                      ? "text-slate-400 hover:text-orange-400"
                      : "text-gray-500 hover:text-orange-500"
                  }`}
                >
                  {name}
                </button>
              )
            )}
          </nav>

          {/* RIGHT SIDE */}

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* THEME */}

            <button
              type="button"
              onClick={() =>
                setDark(
                  (value) => !value
                )
              }
              title={
                dark
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition sm:h-10 sm:w-10 ${
                dark
                  ? "border-slate-700 bg-slate-900 text-amber-400 hover:bg-slate-800"
                  : "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
              }`}
            >
              {dark ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>

            {user ? (
              <>
                <button
                  onClick={openSeller}
                  className="rounded-lg border border-orange-200 px-2.5 py-2 text-xs font-semibold text-orange-500 transition hover:bg-orange-50 sm:px-3 sm:text-sm"
                >
                  Sell Item
                </button>

                <button
                  onClick={logout}
                  className={`rounded-lg p-2 transition ${
                    dark
                      ? "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() =>
                    setAuthMode(
                      "login"
                    )
                  }
                  className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
                    dark
                      ? "text-slate-300 hover:bg-orange-400/10 hover:text-orange-400"
                      : "text-gray-700 hover:bg-orange-50 hover:text-orange-500"
                  }`}
                >
                  Sign In
                </button>

                <button
                  onClick={() =>
                    setAuthMode(
                      "register"
                    )
                  }
                  className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600 sm:px-4 sm:text-sm"
                >
                  Sign Up
                </button>

                <button
                  onClick={openSeller}
                  className="hidden rounded-lg border border-orange-500 px-3 py-2 text-xs font-bold text-orange-500 transition hover:bg-orange-50 sm:block sm:text-sm"
                >
                  Sell Item
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="max-w-3xl">
          <div
            className={`mb-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
              dark
                ? "bg-orange-400/10 text-orange-400"
                : "bg-orange-50 text-orange-500"
            }`}
          >
            🔥 Live auctions happening now
          </div>

          <h2
            className={`text-5xl font-black tracking-tight sm:text-6xl ${
              dark
                ? "text-white"
                : "text-gray-900"
            }`}
          >
            Find it.
            <br />

            <span className="text-orange-500">
              Bid for it.
            </span>

            <br />

            Make it yours.
          </h2>

          <p
            className={`mt-5 max-w-2xl text-lg leading-8 ${
              dark
                ? "text-slate-400"
                : "text-gray-500"
            }`}
          >
            Bangladesh&apos;s digital
            auction marketplace.
            Discover products and win
            amazing deals.
          </p>

          <button
            onClick={() =>
              scrollTo("auctions")
            }
            className="mt-8 flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-orange-600"
          >
            Explore Auctions
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* SEARCH */}

      <section className="mx-auto max-w-7xl px-6">
        <div
          className={`flex rounded-2xl border p-2 shadow-sm sm:p-3 ${
            dark
              ? "border-slate-800 bg-slate-900"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex flex-1 items-center gap-3 px-3">
            <Search
              size={20}
              className="shrink-0 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search auctions..."
              className={`w-full bg-transparent py-2 outline-none ${
                dark
                  ? "text-white placeholder:text-slate-600"
                  : "text-gray-900 placeholder:text-gray-400"
              }`}
            />

            {search && (
              <button
                onClick={() =>
                  setSearch("")
                }
                className="text-gray-400 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <button
            onClick={loadAuctions}
            disabled={loading}
            className={`rounded-xl p-3 transition ${
              dark
                ? "text-slate-500 hover:bg-slate-800 hover:text-white"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
            }`}
            title="Refresh"
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
          <h3
            className={`text-3xl font-bold ${
              dark
                ? "text-white"
                : "text-gray-900"
            }`}
          >
            Auctions
          </h3>

          {!loading && !error && (
            <p
              className={`mt-1 text-sm ${
                dark
                  ? "text-slate-500"
                  : "text-gray-500"
              }`}
            >
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
              (item) => (
                <Skeleton
                  key={item}
                  dark={dark}
                />
              )
            )}
          </div>
        )}

        {error && !loading && (
          <div
            className={`rounded-2xl border p-10 text-center ${
              dark
                ? "border-red-400/20 bg-red-400/10"
                : "border-red-200 bg-red-50"
            }`}
          >
            <p
              className={
                dark
                  ? "text-red-300"
                  : "text-red-600"
              }
            >
              {error}
            </p>

            <button
              onClick={loadAuctions}
              className="mt-5 rounded-lg bg-orange-500 px-5 py-2 font-bold text-white hover:bg-orange-600"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredAuctions.length ===
            0 && (
            <div
              className={`rounded-2xl border p-12 text-center ${
                dark
                  ? "border-slate-800 bg-slate-900"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Search
                size={36}
                className="mx-auto text-gray-300"
              />

              <h4
                className={`mt-4 text-xl font-bold ${
                  dark
                    ? "text-white"
                    : "text-gray-900"
                }`}
              >
                No auctions found
              </h4>

              <p
                className={`mt-2 ${
                  dark
                    ? "text-slate-500"
                    : "text-gray-500"
                }`}
              >
                Try another search or
                category.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
                className="mt-5 rounded-lg bg-orange-500 px-5 py-2 font-bold text-white hover:bg-orange-600"
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
                      setSelectedAuction
                    }
                    onFavorite={
                      toggleFavorite
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
        className={
          dark
            ? "border-y border-slate-800 bg-slate-900/50"
            : "border-y border-gray-200 bg-gray-50"
        }
      >
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h3
            className={`text-3xl font-bold ${
              dark
                ? "text-white"
                : "text-gray-900"
            }`}
          >
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
                  className={`rounded-xl border px-4 py-4 font-medium transition ${
                    category === item
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : dark
                      ? "border-slate-700 bg-slate-900 text-slate-300 hover:border-orange-400 hover:text-orange-400"
                      : "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-500"
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
        <h3
          className={`text-center text-3xl font-bold ${
            dark
              ? "text-white"
              : "text-gray-900"
          }`}
        >
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

                <h4
                  className={`mt-5 text-xl font-bold ${
                    dark
                      ? "text-white"
                      : "text-gray-900"
                  }`}
                >
                  {title}
                </h4>

                <p
                  className={`mt-2 leading-6 ${
                    dark
                      ? "text-slate-400"
                      : "text-gray-500"
                  }`}
                >
                  {description}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* SELL */}

      <section
        id="sell"
        className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-20"
      >
        <div className="rounded-3xl bg-orange-500 p-8 text-white sm:p-10">
          <h3 className="text-3xl font-black">
            Turn your item into an
            auction.
          </h3>

          <p className="mt-3 max-w-xl text-white/80">
            Upload photos from your
            phone, submit your item and
            let buyers compete for it.
          </p>

          <button
            onClick={openSeller}
            className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-orange-600 transition hover:bg-orange-50"
          >
            Sell Item
          </button>
        </div>
      </section>

      {/* FOOTER */}

      <footer
        className={`border-t px-6 py-8 ${
          dark
            ? "border-slate-800"
            : "border-gray-200"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row">
          <b
            className={
              dark
                ? "text-white"
                : "text-gray-900"
            }
          >
            AUCTION
            <span className="text-orange-500">
              BD
            </span>
          </b>

          <div
            className={`flex gap-5 text-xs ${
              dark
                ? "text-slate-500"
                : "text-gray-500"
            }`}
          >
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
          </div>
        </div>
      </footer>

      {/* AUTH */}

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

/* =========================================================
APP
========================================================= */

function App() {
  const isAdmin =
    new URLSearchParams(
      window.location.search
    ).get("admin") === "1";

  if (isAdmin) {
    return <AdminPanel />;
  }

  return <AuctionHome />;
}

export default App;