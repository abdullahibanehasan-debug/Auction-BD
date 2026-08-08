import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Plus,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const CATEGORIES = [
  "All",
  "Electronics",
  "Vehicles",
  "Fashion",
  "Gaming",
  "Furniture",
  "Collectibles",
];

const FALLBACK_IMAGE =
  "https://placehold.co/800x800/0f172a/fbbf24?text=Auction+BD";

const FAVORITES_KEY = "auctionbd_favorites";
const TOKEN_KEY = "auctionbd_token";
const USER_KEY = "auctionbd_user";

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

const getSavedUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const api = async (path, options = {}) => {
  const token = getToken();

  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Server returned ${response.status}`
    );
  }

  return data;
};

const normalizeAuction = (auction) => ({
  ...auction,
  id: auction._id || auction.id,
  price: Number(auction.price) || 0,
  bids: Number(auction.bids) || 0,
  status: String(auction.status || "active").toLowerCase(),
});

function statusInfo(status) {
  if (status === "sold")
    return { label: "SOLD", color: "bg-emerald-500" };

  if (status === "ended")
    return { label: "ENDED", color: "bg-slate-600" };

  if (status === "cancelled")
    return { label: "CANCELLED", color: "bg-red-700" };

  return { label: "LIVE", color: "bg-red-500" };
}

function AuctionCard({
  auction,
  favorite,
  onOpen,
  onFavorite,
}) {
  const status = statusInfo(auction.status);
  const active = auction.status === "active";

  return (
    <article
      onClick={() => onOpen(auction)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-amber-400/40"
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={auction.image || FALLBACK_IMAGE}
          alt={auction.title || "Auction item"}
          loading="lazy"
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
            !active ? "opacity-75" : ""
          }`}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
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
            favorite ? "Remove favorite" : "Add favorite"
          }
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(auction.id);
          }}
          className={`absolute right-3 top-3 rounded-full p-2 ${
            favorite
              ? "bg-amber-400 text-black"
              : "bg-black/60 text-white"
          }`}
        >
          <Heart
            size={17}
            fill={favorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="p-5">
        <p className="text-xs text-amber-400">
          {auction.category || "Auction"}
        </p>

        <h3 className="mt-2 line-clamp-2 text-lg font-bold">
          {auction.title || "Untitled Auction"}
        </h3>

        <div className="mt-5 flex justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">
              {auction.status === "sold"
                ? "Sold for"
                : auction.status === "ended"
                ? "Final bid"
                : "Current bid"}
            </p>

            <p className="text-xl font-black">
              ৳{auction.price.toLocaleString("en-BD")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500">Bids</p>
            <p className="font-semibold">{auction.bids}</p>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-xs">
          <span className="flex items-center gap-1 text-slate-400">
            <Clock3 size={14} />
            {auction.time || status.label}
          </span>

          <span
            className={
              active
                ? "font-bold text-amber-400"
                : "font-bold text-slate-500"
            }
          >
            {active ? "Bid now →" : status.label}
          </span>
        </div>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="h-64 animate-pulse bg-white/10" />
      <div className="space-y-4 p-5">
        <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

function AuthModal({ mode, onClose, onSuccess }) {
  const [loginMode, setLoginMode] = useState(mode === "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const path = loginMode
        ? "/api/auth/login"
        : "/api/auth/register";

      const body = loginMode
        ? { email, password }
        : { name, email, phone, password };

      const data = await api(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const token =
        data.token ||
        data.accessToken ||
        data.user?.token;

      if (!token) {
        throw new Error(
          "Login succeeded but no authentication token was returned."
        );
      }

      const user = data.user || data.account || null;

      saveAuth(token, user);
      onSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-7 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">
              {loginMode ? "Welcome back" : "Create account"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {loginMode
                ? "Login to bid and sell."
                : "Join AuctionBD today."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-5 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {!loginMode && (
            <>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-amber-400"
              />

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-amber-400"
              />
            </>
          )}

          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-amber-400"
          />

          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-amber-400"
          />

          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 font-bold text-black disabled:opacity-50"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loginMode ? "Login" : "Create Account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setLoginMode(!loginMode);
            setError("");
          }}
          className="mt-5 w-full text-sm text-slate-400 hover:text-white"
        >
          {loginMode
            ? "Don't have an account? Sign up"
            : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

function SellerPage({ user, onBack, onLogin }) {
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
  const [loading, setLoading] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const imageInput = useRef(null);
  const videoInput = useRef(null);

  const loadRequests = useCallback(async () => {
    if (!getToken()) return;

    setLoadingRequests(true);

    try {
      const data = await api("/api/seller-requests/mine");
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const update = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

  const submit = async (e) => {
    e.preventDefault();

    if (!getToken()) {
      onLogin();
      return;
    }

    if (!images.length) {
      setError("Please upload at least one photo.");
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const body = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value);
      });

      images.forEach((file) => body.append("images", file));
      videos.forEach((file) => body.append("videos", file));

      await api("/api/seller-requests", {
        method: "POST",
        body,
      });

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

      if (imageInput.current) imageInput.current.value = "";
      if (videoInput.current) videoInput.current.value = "";

      loadRequests();
    } catch (err) {
      if (
        err.message.toLowerCase().includes("login") ||
        err.message.toLowerCase().includes("session")
      ) {
        clearAuth();
        onLogin();
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user && !getToken()) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-20">
        <button
          onClick={onBack}
          className="mb-8 text-sm text-slate-400 hover:text-white"
        >
          ← Back to auctions
        </button>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <User size={45} className="mx-auto text-amber-400" />
          <h1 className="mt-5 text-3xl font-black">
            Login required
          </h1>
          <p className="mt-3 text-slate-400">
            Create an account or login before listing your item.
          </p>

          <button
            onClick={onLogin}
            className="mt-7 rounded-xl bg-amber-400 px-7 py-3 font-bold text-black"
          >
            Login / Sign Up
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <button
        onClick={onBack}
        className="mb-8 text-sm text-slate-400 hover:text-white"
      >
        ← Back to auctions
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="mb-8">
            <p className="text-sm font-bold text-amber-400">
              SELL ON AUCTIONBD
            </p>
            <h1 className="mt-2 text-4xl font-black">
              List your item
            </h1>
            <p className="mt-3 text-slate-400">
              Upload photos, provide the details and submit your
              item for review.
            </p>
          </div>

          {message && (
            <div className="mb-6 flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
              <CheckCircle2 size={20} />
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <form
            onSubmit={submit}
            className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6"
          >
            <input
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Item title"
              className="field"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                value={form.category}
                onChange={(e) =>
                  update("category", e.target.value)
                }
                placeholder="Category"
                className="field"
              />

              <select
                required
                value={form.categoryGroup}
                onChange={(e) =>
                  update("categoryGroup", e.target.value)
                }
                className="field"
              >
                <option value="">Category group</option>
                {CATEGORIES.filter((x) => x !== "All").map(
                  (x) => (
                    <option key={x}>{x}</option>
                  )
                )}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={form.condition}
                onChange={(e) =>
                  update("condition", e.target.value)
                }
                placeholder="Condition"
                className="field"
              />

              <input
                type="number"
                min="0"
                value={form.expectedPrice}
                onChange={(e) =>
                  update("expectedPrice", e.target.value)
                }
                placeholder="Expected starting price (৳)"
                className="field"
              />
            </div>

            <input
              value={form.location}
              onChange={(e) =>
                update("location", e.target.value)
              }
              placeholder="Location"
              className="field"
            />

            <textarea
              required
              value={form.description}
              onChange={(e) =>
                update("description", e.target.value)
              }
              placeholder="Describe your item"
              rows={6}
              className="field resize-none"
            />

            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="field resize-none"
            />

            <div>
              <p className="mb-2 font-bold">Photos *</p>

              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-8 text-slate-400 hover:border-amber-400 hover:text-amber-400"
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
                onChange={(e) =>
                  setImages(Array.from(e.target.files || []))
                }
              />

              {images.length > 0 && (
                <p className="mt-2 text-sm text-amber-400">
                  {images.length} photo
                  {images.length === 1 ? "" : "s"} selected
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 font-bold">
                Video <span className="text-slate-500">(optional)</span>
              </p>

              <button
                type="button"
                onClick={() => videoInput.current?.click()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-6 text-slate-400 hover:border-amber-400 hover:text-amber-400"
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
                onChange={(e) =>
                  setVideos(Array.from(e.target.files || []))
                }
              />
            </div>

            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-4 font-black text-black disabled:opacity-50"
            >
              {loading && (
                <Loader2 size={19} className="animate-spin" />
              )}
              Submit Auction Request
            </button>
          </form>
        </section>

        <aside>
          <div className="sticky top-24 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold">
              Your requests
            </h2>

            {loadingRequests ? (
              <div className="mt-6 flex justify-center">
                <Loader2 className="animate-spin text-amber-400" />
              </div>
            ) : requests.length === 0 ? (
              <div className="mt-8 text-center text-sm text-slate-500">
                <Package
                  size={35}
                  className="mx-auto mb-3 text-slate-600"
                />
                No requests yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {requests.map((request) => (
                  <div
                    key={request._id}
                    className="rounded-xl border border-white/10 p-4"
                  >
                    <p className="font-bold">
                      {request.title}
                    </p>

                    <p className="mt-2 text-xs capitalize text-amber-400">
                      {String(request.status).replace("_", " ")}
                    </p>

                    {request.rejectionReason && (
                      <p className="mt-2 text-xs text-red-300">
                        {request.rejectionReason}
                      </p>
                    )}

                    {request.adminNotes && (
                      <p className="mt-2 text-xs text-slate-400">
                        {request.adminNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function App() {
  const isAdmin =
    new URLSearchParams(window.location.search).get("admin") ===
    "1";

  if (isAdmin) return <AdminPanel />;

  return <AuctionHome />;
}

function AuctionHome() {
  const [auctions, setAuctions] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [page, setPage] = useState("home");
  const [authMode, setAuthMode] = useState(null);
  const [user, setUser] = useState(getSavedUser);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(FAVORITES_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  const loadAuctions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await api("/api/auctions?status=all");

      if (!Array.isArray(data)) {
        throw new Error("Invalid auction data received.");
      }

      setAuctions(data.map(normalizeAuction));
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load auctions right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  useEffect(() => {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(favorites)
    );
  }, [favorites]);

  const filteredAuctions = useMemo(() => {
    const term = search.trim().toLowerCase();

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

      return (
        searchable.includes(term) &&
        (category === "All" ||
          auction.categoryGroup === category)
      );
    });
  }, [auctions, search, category]);

  const toggleFavorite = useCallback((id) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    setPage("home");
  };

  const openSeller = () => {
    if (!getToken()) {
      setAuthMode("login");
      return;
    }

    setPage("seller");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (selectedAuction) {
    return (
      <AuctionDetails
        auction={selectedAuction}
        onBack={() => {
          setSelectedAuction(null);
          loadAuctions();
        }}
      />
    );
  }

  if (page === "seller") {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <style>{`
          .field {
            width: 100%;
            border-radius: .75rem;
            border: 1px solid rgba(255,255,255,.1);
            background: rgba(255,255,255,.05);
            padding: .75rem 1rem;
            outline: none;
          }
          .field:focus { border-color: #fbbf24; }
          select option { background: #0f172a; }
        `}</style>

        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <button
              onClick={() => setPage("home")}
              className="text-xl font-black"
            >
              AUCTION<span className="text-amber-400">BD</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </header>

        <SellerPage
          user={user}
          onBack={() => setPage("home")}
          onLogin={() => setAuthMode("login")}
        />

        {authMode && (
          <AuthModal
            mode={authMode}
            onClose={() => setAuthMode(null)}
            onSuccess={(newUser) => {
              setUser(newUser || getSavedUser());
              setAuthMode(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <style>{`
        .field {
          width: 100%;
          border-radius: .75rem;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(255,255,255,.05);
          padding: .75rem 1rem;
          outline: none;
        }
        .field:focus { border-color: #fbbf24; }
        select option { background: #0f172a; }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            onClick={() => window.scrollTo({ top: 0 })}
            className="flex items-center gap-3"
          >
            <Gavel className="text-amber-400" size={25} />

            <div className="text-left">
              <h1 className="text-xl font-black">
                AUCTION<span className="text-amber-400">BD</span>
              </h1>
              <p className="text-[10px] tracking-[.25em] text-slate-500">
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
                className="text-sm text-slate-400 hover:text-white"
              >
                {name}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  onClick={openSeller}
                  className="hidden rounded-lg border border-amber-400/30 px-3 py-2 text-sm text-amber-400 sm:block"
                >
                  Sell Item
                </button>

                <button
                  onClick={logout}
                  className="rounded-lg bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAuthMode("login")}
                  className="hidden px-3 py-2 text-sm text-slate-300 hover:text-white sm:block"
                >
                  Login
                </button>

                <button
                  onClick={openSeller}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-black hover:bg-amber-300"
                >
                  Sell Item
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex rounded-full bg-amber-400/10 px-4 py-2 text-sm text-amber-400">
            Live auctions happening now
          </div>

          <h2 className="text-5xl font-black sm:text-6xl">
            Find it.
            <br />
            <span className="text-amber-400">Bid for it.</span>
            <br />
            Make it yours.
          </h2>

          <p className="mt-5 text-lg text-slate-400">
            Bangladesh&apos;s digital auction marketplace.
            Discover products and win amazing deals.
          </p>

          <button
            onClick={() => scrollTo("auctions")}
            className="mt-8 flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-black hover:bg-amber-300"
          >
            Explore Auctions
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6">
        <div className="flex rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex flex-1 items-center gap-3 px-3">
            <Search size={20} className="text-slate-500" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search auctions..."
              className="w-full bg-transparent outline-none"
            />

            {search && (
              <button onClick={() => setSearch("")}>
                <X size={18} />
              </button>
            )}
          </div>

          <button
            onClick={loadAuctions}
            disabled={loading}
            className="rounded-xl p-3 text-slate-400 hover:text-white"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </section>

      <section
        id="auctions"
        className="mx-auto max-w-7xl scroll-mt-24 px-6 py-16"
      >
        <div className="mb-8">
          <h3 className="text-3xl font-bold">Auctions</h3>

          {!loading && !error && (
            <p className="mt-1 text-sm text-slate-500">
              {filteredAuctions.length} auction
              {filteredAuctions.length === 1 ? "" : "s"} available
            </p>
          )}
        </div>

        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((x) => (
              <Skeleton key={x} />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-10 text-center">
            <p className="text-red-300">{error}</p>

            <button
              onClick={loadAuctions}
              className="mt-5 rounded-lg bg-amber-400 px-5 py-2 font-bold text-black"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredAuctions.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center">
              <Search
                size={36}
                className="mx-auto text-slate-600"
              />

              <h4 className="mt-4 text-xl font-bold">
                No auctions found
              </h4>

              <p className="mt-2 text-slate-500">
                Try another search or category.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
                className="mt-5 rounded-lg bg-amber-400 px-5 py-2 font-bold text-black"
              >
                Clear Filters
              </button>
            </div>
          )}

        {!loading &&
          !error &&
          filteredAuctions.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filteredAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  favorite={favorites.includes(auction.id)}
                  onOpen={setSelectedAuction}
                  onFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
      </section>

      <section
        id="categories"
        className="border-y border-white/10 bg-white/[0.02]"
      >
        <div className="mx-auto max-w-7xl px-6 py-16">
          <h3 className="text-3xl font-bold">Categories</h3>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setCategory(item);
                  scrollTo("auctions");
                }}
                className={`rounded-xl border px-4 py-4 ${
                  category === item
                    ? "border-amber-400 bg-amber-400/5 text-amber-400"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <h3 className="text-center text-3xl font-bold">
          How Auction BD Works
        </h3>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            [Search, "Find Auction"],
            [Gavel, "Place Bid"],
            [ShieldCheck, "Win Securely"],
          ].map(([Icon, title]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-8"
            >
              <Icon className="text-amber-400" />

              <h4 className="mt-5 text-xl font-bold">
                {title}
              </h4>
            </div>
          ))}
        </div>
      </section>

      <section
        id="sell"
        className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-20"
      >
        <div className="rounded-3xl bg-amber-400 p-10 text-black">
          <h3 className="text-3xl font-black">
            Turn your item into an auction.
          </h3>

          <p className="mt-3 max-w-xl text-black/70">
            Upload photos from your phone, submit your item and
            let buyers compete for it.
          </p>

          <button
            onClick={openSeller}
            className="mt-6 rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-slate-900"
          >
            Sell Item
          </button>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row">
          <b>
            AUCTION<span className="text-amber-400">BD</span>
          </b>

          <div className="flex gap-5 text-xs text-slate-500">
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

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSuccess={(newUser) => {
            setUser(newUser || getSavedUser());
            setAuthMode(null);
          }}
        />
      )}
    </div>
  );
}

export default App;