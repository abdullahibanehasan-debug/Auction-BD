import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Gavel,
  Clock3,
  ShieldCheck,
  Truck,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  Sun,
  Moon,
  MapPin,
  Tag,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://auction-bd.onrender.com"
).replace(/\/+$/, "");

const TOKEN_KEY = "auctionbd_token";
const USER_KEY = "auctionbd_user";
const THEME_KEY = "auctionbd_theme";

const FALLBACK_IMAGE =
  "https://placehold.co/900x900/f8fafc/f97316?text=Auction+BD";

const money = (value = 0) =>
  `৳${Number(value || 0).toLocaleString("en-BD")}`;

/* =========================================================
AUTH
========================================================= */

function getAuth() {
  try {
    return {
      token: localStorage.getItem(TOKEN_KEY) || "",
      user: JSON.parse(
        localStorage.getItem(USER_KEY) || "null"
      ),
    };
  } catch {
    return {
      token: "",
      user: null,
    };
  }
}

function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

/* =========================================================
THEME
========================================================= */

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);

    if (saved === "dark" || saved === "light") {
      return saved;
    }

    return window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.documentElement.classList.toggle(
    "dark",
    isDark
  );

  document.documentElement.style.colorScheme = theme;

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

/* =========================================================
API RESPONSE
========================================================= */

async function parseResponse(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}

/* =========================================================
MAIN
========================================================= */

function AuctionDetails({
  auction,
  onBack,
  onLogin,
}) {
  const [auctionData, setAuctionData] =
    useState(auction || null);

  const [bidHistory, setBidHistory] =
    useState([]);

  const [bidAmount, setBidAmount] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [placingBid, setPlacingBid] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [theme, setTheme] =
    useState(getInitialTheme);

  const [selectedImage, setSelectedImage] =
    useState(0);

  const auctionId =
    auctionData?._id ||
    auctionData?.id ||
    auction?._id ||
    auction?.id;

  const currentPrice = Number(
    auctionData?.price || 0
  );

  const status = String(
    auctionData?.status || "active"
  ).toLowerCase();

  const closed = [
    "sold",
    "ended",
    "cancelled",
  ].includes(status);

  /* =======================================================
  IMAGES
  ======================================================= */

  const images = useMemo(() => {
    const list = [];

    if (auctionData?.image) {
      list.push(auctionData.image);
    }

    if (
      Array.isArray(auctionData?.images)
    ) {
      list.push(...auctionData.images);
    }

    const validImages = list.filter(
      (image) =>
        typeof image === "string" &&
        image.trim()
    );

    return [
      ...new Set(validImages),
    ];
  }, [auctionData]);

  /* =======================================================
  THEME INIT + SYNC
  ======================================================= */

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (event) => {
      const nextTheme =
        event?.detail?.theme;

      if (
        nextTheme === "dark" ||
        nextTheme === "light"
      ) {
        setTheme(nextTheme);
      }
    };

    window.addEventListener(
      "auctionbd-theme-change",
      handleThemeChange
    );

    return () => {
      window.removeEventListener(
        "auctionbd-theme-change",
        handleThemeChange
      );
    };
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next =
        current === "dark"
          ? "light"
          : "dark";

      applyTheme(next);

      window.dispatchEvent(
        new CustomEvent(
          "auctionbd-theme-change",
          {
            detail: {
              theme: next,
            },
          }
        )
      );

      return next;
    });
  };

  /* =======================================================
  LOAD AUCTION
  ======================================================= */

  async function loadAuction() {
    if (!auctionId) {
      setError("Auction ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/auctions/${auctionId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const data =
        await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Failed to load auction (${response.status}).`
        );
      }

      const rawAuction =
        data?.auction ||
        data?.data ||
        data;

      if (
        !rawAuction ||
        typeof rawAuction !== "object"
      ) {
        throw new Error(
          "Invalid auction data received from server."
        );
      }

      const normalized = {
        ...rawAuction,
        id:
          rawAuction?._id ||
          rawAuction?.id,
      };

      setAuctionData(normalized);

      const history =
        Array.isArray(
          rawAuction?.bidHistory
        )
          ? rawAuction.bidHistory
          : Array.isArray(
              rawAuction?.bidsHistory
            )
          ? rawAuction.bidsHistory
          : [];

      setBidHistory(history);

      setSelectedImage(0);
    } catch (err) {
      console.error(
        "Auction details error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load auction details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuction();
  }, [
    auction?.id,
    auction?._id,
  ]);

  /* =======================================================
  PLACE BID
  ======================================================= */

  async function handleBid(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const { token, user } =
      getAuth();

    if (!token || !user) {
      onLogin?.();
      return;
    }

    if (!auctionId) {
      setError(
        "Auction ID is missing."
      );
      return;
    }

    if (closed) {
      setError(
        "This auction is no longer accepting bids."
      );
      return;
    }

    const amount = Number(
      bidAmount
    );

    if (
      !Number.isFinite(amount) ||
      amount <= currentPrice
    ) {
      setError(
        `Your bid must be higher than ${money(
          currentPrice
        )}.`
      );
      return;
    }

    try {
      setPlacingBid(true);

      const response =
        await fetch(
          `${API_URL}/api/auctions/${auctionId}/bids`,
          {
            method: "POST",
            headers: {
              Accept:
                "application/json",
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              amount,
            }),
          }
        );

      const data =
        await parseResponse(
          response
        );

      if (
        response.status === 401
      ) {
        clearAuth();

        setError(
          "Your login session expired. Please sign in again."
        );

        onLogin?.();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Failed to place bid (${response.status}).`
        );
      }

      setBidAmount("");

      setSuccess(
        "Your bid was placed successfully!"
      );

      /*
       * Always reload from the server.
       * This keeps price, bid count and
       * bid history synchronized with MongoDB.
       */
      await loadAuction();
    } catch (err) {
      console.error(
        "Bid error:",
        err
      );

      setError(
        err?.message ||
          "Unable to place your bid."
      );
    } finally {
      setPlacingBid(false);
    }
  }

  /* =======================================================
  PAGE CLASS
  ======================================================= */

  const pageClass =
    theme === "dark"
      ? "min-h-screen bg-slate-950 text-white transition-colors duration-200"
      : "min-h-screen bg-white text-gray-900 transition-colors duration-200";

  /* =======================================================
  LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className={pageClass}>
        <DetailsHeader
          theme={theme}
          toggleTheme={toggleTheme}
          onBack={onBack}
        />

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-3xl bg-gray-100 dark:bg-white/5" />

            <div className="space-y-5">
              <div className="h-5 w-24 animate-pulse rounded bg-gray-100 dark:bg-white/5" />

              <div className="h-12 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-white/5" />

              <div className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />

              <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />

              <div className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* =======================================================
  ERROR
  ======================================================= */

  if (
    error &&
    !auctionData?.title
  ) {
    return (
      <div className={pageClass}>
        <DetailsHeader
          theme={theme}
          toggleTheme={toggleTheme}
          onBack={onBack}
        />

        <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4">
          <div className="w-full rounded-3xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-500/20 dark:bg-red-500/5">
            <AlertCircle
              size={42}
              className="mx-auto text-red-500"
            />

            <h2 className="mt-5 text-2xl font-black">
              Unable to load auction
            </h2>

            <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
              {error}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadAuction}
                className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600"
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-gray-200 px-6 py-3 font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Back to auctions
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const mainImage =
    images[selectedImage] ||
    images[0] ||
    FALLBACK_IMAGE;

  /* =======================================================
  MAIN PAGE
  ======================================================= */

  return (
    <div className={pageClass}>
      <DetailsHeader
        theme={theme}
        toggleTheme={toggleTheme}
        onBack={onBack}
      />

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-7 flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-orange-500 dark:text-slate-400"
        >
          <ArrowLeft size={17} />
          Back to auctions
        </button>

        <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr]">
          {/* =================================================
              IMAGES
          ================================================= */}

          <section>
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
              <div className="relative aspect-square sm:aspect-[4/3]">
                <img
                  src={mainImage}
                  alt={
                    auctionData?.title ||
                    "Auction item"
                  }
                  className="h-full w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.src =
                      FALLBACK_IMAGE;
                  }}
                />

                <div
                  className={`absolute left-4 top-4 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black shadow-lg ${
                    closed
                      ? "bg-gray-800 text-white dark:bg-slate-700"
                      : "bg-orange-500 text-white"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full bg-white ${
                      !closed
                        ? "animate-pulse"
                        : ""
                    }`}
                  />

                  {status === "sold"
                    ? "SOLD"
                    : status === "ended"
                    ? "AUCTION ENDED"
                    : status ===
                      "cancelled"
                    ? "CANCELLED"
                    : "LIVE AUCTION"}
                </div>
              </div>
            </div>

            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-3">
                {images
                  .slice(0, 5)
                  .map(
                    (
                      image,
                      index
                    ) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() =>
                          setSelectedImage(
                            index
                          )
                        }
                        className={`aspect-square overflow-hidden rounded-xl border-2 transition ${
                          selectedImage ===
                          index
                            ? "border-orange-500"
                            : "border-gray-200 dark:border-white/10"
                        }`}
                      >
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(
                            event
                          ) => {
                            event.currentTarget.src =
                              FALLBACK_IMAGE;
                          }}
                        />
                      </button>
                    )
                  )}
              </div>
            )}
          </section>

          {/* =================================================
              DETAILS
          ================================================= */}

          <section>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                {auctionData?.category ||
                  "Auction"}
              </span>

              {auctionData?.condition && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-white/5 dark:text-slate-400">
                  {auctionData.condition}
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              {auctionData?.title ||
                "Untitled Auction"}
            </h1>

            <p className="mt-5 text-base leading-7 text-gray-500 dark:text-slate-400">
              {auctionData?.description ||
                "Place your bid before the auction ends. The highest valid bidder wins the auction."}
            </p>

            {/* PRICE */}

            <div className="mt-7 rounded-3xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-500/20 dark:bg-orange-500/5 sm:p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
                {closed
                  ? "Final price"
                  : "Current highest bid"}
              </p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-3xl font-black text-orange-500 sm:text-4xl">
                  {money(
                    auctionData?.soldPrice ||
                      auctionData?.price
                  )}
                </p>

                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-slate-500">
                    Total bids
                  </p>

                  <p className="text-xl font-black">
                    {auctionData?.bids ||
                      0}
                  </p>
                </div>
              </div>
            </div>

            {/* INFO */}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <InfoCard
                icon={Clock3}
                label="Time remaining"
                value={
                  auctionData?.time ||
                  "Not specified"
                }
              />

              <InfoCard
                icon={Tag}
                label="Category"
                value={
                  auctionData?.category ||
                  "Auction"
                }
              />

              {auctionData?.location && (
                <InfoCard
                  icon={MapPin}
                  label="Location"
                  value={
                    auctionData.location
                  }
                />
              )}

              {auctionData?.condition && (
                <InfoCard
                  icon={CheckCircle2}
                  label="Condition"
                  value={
                    auctionData.condition
                  }
                />
              )}
            </div>

            {/* BID */}

            {closed ? (
              <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-7 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <Gavel
                  size={30}
                  className="mx-auto text-gray-400 dark:text-slate-500"
                />

                <h2 className="mt-4 text-xl font-black">
                  Bidding is closed
                </h2>

                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  This auction is no longer
                  accepting bids.
                </p>
              </div>
            ) : (
              <BidBox
                bidAmount={bidAmount}
                setBidAmount={
                  setBidAmount
                }
                currentPrice={
                  currentPrice
                }
                placingBid={
                  placingBid
                }
                error={error}
                success={success}
                onSubmit={handleBid}
                onLogin={onLogin}
              />
            )}

            {/* TRUST */}

            <div className="mt-5 grid grid-cols-3 gap-2">
              <Trust
                icon={ShieldCheck}
                text="Verified"
              />

              <Trust
                icon={Truck}
                text="Delivery"
              />

              <Trust
                icon={Gavel}
                text="Live Bidding"
              />
            </div>
          </section>
        </div>

        {/* =================================================
            BID HISTORY
        ================================================= */}

        <section className="mt-14">
          <div className="mb-6">
            <h2 className="text-2xl font-black">
              Bid History
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Recent bids placed on this auction.
            </p>
          </div>

          {!bidHistory.length ? (
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <Gavel
                size={34}
                className="mx-auto text-gray-300 dark:text-slate-600"
              />

              <h3 className="mt-4 font-bold">
                No bids yet
              </h3>

              <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                Be the first person to place a bid.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10">
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                {bidHistory.map(
                  (
                    bid,
                    index
                  ) => (
                    <div
                      key={
                        bid._id ||
                        bid.id ||
                        `${bid.bidder}-${bid.createdAt}-${index}`
                      }
                      className="flex items-center justify-between gap-4 bg-white px-4 py-4 dark:bg-white/[0.02] sm:px-6"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-500/10">
                          <User
                            size={18}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {bid.bidder ||
                              bid.user
                                ?.name ||
                              "AuctionBD User"}
                          </p>

                          <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">
                            {formatBidDate(
                              bid.createdAt
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-black text-orange-500">
                          {money(
                            bid.amount
                          )}
                        </p>

                        {index ===
                          0 && (
                          <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-emerald-500">
                            Highest bid
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* =========================================================
HEADER
========================================================= */

function DetailsHeader({
  theme,
  toggleTheme,
  onBack,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/20">
            A
          </div>

          <div className="text-left">
            <p className="font-black">
              AUCTION
              <span className="text-orange-500">
                BD
              </span>
            </p>

            <p className="hidden text-[9px] tracking-[.2em] text-gray-400 dark:text-slate-500 sm:block">
              BID. WIN. OWN.
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            title={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            aria-label={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            {theme === "dark" ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white sm:block"
          >
            Back to auctions
          </button>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
BID BOX
========================================================= */

function BidBox({
  bidAmount,
  setBidAmount,
  currentPrice,
  placingBid,
  error,
  success,
  onSubmit,
  onLogin,
}) {
  const { token, user } =
    getAuth();

  if (!token || !user) {
    return (
      <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
            <LogIn size={18} />
          </div>

          <div>
            <h2 className="font-black">
              Sign in to bid
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              You need an AuctionBD account to place bids.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogin}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-bold text-white transition hover:bg-orange-600"
        >
          <LogIn size={18} />
          Sign In to Bid
        </button>

        <p className="mt-3 text-center text-xs text-gray-400">
          New here? Create your free account.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-black">
            Place Your Bid
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Your bid must be higher than the current bid.
          </p>
        </div>

        <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 sm:block">
          Signed in
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-500/10">
            <User size={17} />
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Bidding as
            </p>

            <p className="truncate font-semibold">
              {user.name ||
                user.email ||
                "AuctionBD User"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor="bidAmount"
          className="mb-2 block text-sm font-semibold text-gray-600 dark:text-slate-400"
        >
          Bid amount
        </label>

        <div className="flex items-center rounded-xl border border-gray-200 bg-white px-4 transition focus-within:border-orange-500 dark:border-white/10 dark:bg-slate-950">
          <span className="text-gray-400 dark:text-slate-500">
            ৳
          </span>

          <input
            id="bidAmount"
            type="number"
            inputMode="numeric"
            min={currentPrice + 1}
            step="1"
            required
            value={bidAmount}
            onChange={(event) =>
              setBidAmount(
                event.target.value
              )
            }
            placeholder={`More than ${currentPrice.toLocaleString(
              "en-BD"
            )}`}
            className="w-full bg-transparent px-3 py-3 text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      {error && (
        <Notice type="error">
          {error}
        </Notice>
      )}

      {success && (
        <Notice type="success">
          {success}
        </Notice>
      )}

      <button
        type="submit"
        disabled={placingBid}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {placingBid ? (
          <>
            <Loader2
              size={18}
              className="animate-spin"
            />
            Placing Bid...
          </>
        ) : (
          <>
            <Gavel size={18} />
            Place Bid
          </>
        )}
      </button>
    </form>
  );
}

/* =========================================================
INFO CARD
========================================================= */

function InfoCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2 text-orange-500">
        <Icon size={17} />

        <span className="text-xs font-semibold">
          {label}
        </span>
      </div>

      <p className="mt-3 truncate font-bold">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
TRUST
========================================================= */

function Trust({
  icon: Icon,
  text,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <Icon
        size={18}
        className="mx-auto text-emerald-500"
      />

      <p className="mt-1 text-[11px] font-semibold text-gray-500 dark:text-slate-500">
        {text}
      </p>
    </div>
  );
}

/* =========================================================
NOTICE
========================================================= */

function Notice({
  type,
  children,
}) {
  const isSuccess =
    type === "success";

  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/5 dark:text-emerald-300"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/5 dark:text-red-300"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2
          size={18}
          className="mt-0.5 shrink-0"
        />
      ) : (
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0"
        />
      )}

      <span>{children}</span>
    </div>
  );
}

/* =========================================================
DATE
========================================================= */

function formatBidDate(date) {
  if (!date) return "";

  const parsed = new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "";
  }

  return parsed.toLocaleString(
    "en-BD",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

export default AuctionDetails;