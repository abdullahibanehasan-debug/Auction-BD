import { useEffect, useState } from "react";
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
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://auction-bd.onrender.com";

const FALLBACK_IMAGE =
  "https://placehold.co/800x800/0f172a/fbbf24?text=Auction+BD";

const money = (value = 0) =>
  `৳${Number(value).toLocaleString("en-BD")}`;

function getStoredUser() {
  try {
    const token = localStorage.getItem("auctionbd_token");
    const savedUser = localStorage.getItem("auctionbd_user");

    return {
      token,
      user: savedUser ? JSON.parse(savedUser) : null,
    };
  } catch {
    return { token: null, user: null };
  }
}

function AuctionDetails({ auction, onBack, onLogin }) {
  const [auctionData, setAuctionData] = useState(auction || null);
  const [bidHistory, setBidHistory] = useState([]);
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [placingBid, setPlacingBid] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const stored = getStoredUser();
  const token = stored.token;
  const user = stored.user;

  const auctionId =
    auctionData?._id || auctionData?.id;

  const currentPrice =
    Number(auctionData?.price || 0);

  const closed = [
    "sold",
    "ended",
    "cancelled",
  ].includes(auctionData?.status);

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
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load auction."
        );
      }

      setAuctionData({
        ...data,
        id: data._id || data.id,
      });

      setBidHistory(
        data.bidHistory || []
      );
    } catch (err) {
      console.error(
        "Auction details error:",
        err
      );

      setError(
        err.message ||
          "Unable to load auction details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuction();
  }, [auction?._id, auction?.id]);

  async function handleBid(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    /*
     * LOGIN IS REQUIRED.
     */
    if (!token || !user) {
      if (onLogin) {
        onLogin();
      } else {
        setError(
          "Please sign in before placing a bid."
        );
      }

      return;
    }

    if (closed) {
      setError(
        "This auction is no longer accepting bids."
      );
      return;
    }

    const amount = Number(bidAmount);

    if (!Number.isFinite(amount) || amount <= currentPrice) {
      setError(
        `Your bid must be higher than ${money(
          currentPrice
        )}.`
      );
      return;
    }

    try {
      setPlacingBid(true);

      const response = await fetch(
        `${API_URL}/api/auctions/${auctionId}/bids`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount,
            bidder: user.name,
            bidderId: user.id,
            bidderEmail: user.email,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      /*
       * Session expired / invalid.
       */
      if (response.status === 401) {
        localStorage.removeItem(
          "auctionbd_token"
        );
        localStorage.removeItem(
          "auctionbd_user"
        );

        if (onLogin) {
          onLogin();
        }

        setError(
          "Your login session expired. Please sign in again."
        );

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to place bid."
        );
      }

      if (data.auction) {
        setAuctionData({
          ...data.auction,
          id:
            data.auction._id ||
            data.auction.id,
        });
      }

      if (data.bid) {
        setBidHistory((history) => [
          data.bid,
          ...history,
        ]);
      } else {
        await loadAuction();
      }

      setBidAmount("");
      setSuccess(
        "Your bid was placed successfully!"
      );
    } catch (err) {
      console.error("Bid error:", err);

      setError(
        err.message ||
          "Unable to place your bid."
      );
    } finally {
      setPlacingBid(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2
            size={22}
            className="animate-spin text-amber-400"
          />
          Loading auction...
        </div>
      </div>
    );
  }

  if (error && !auctionData?.title) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <AlertCircle
            size={36}
            className="mx-auto text-red-400"
          />

          <h2 className="mt-4 text-xl font-bold">
            Unable to load auction
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={onBack}
            className="mt-6 rounded-xl bg-amber-400 px-5 py-3 font-bold text-black"
          >
            Back to auctions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-sm font-black text-black">
              AB
            </div>

            <div className="text-left">
              <p className="font-black">
                AUCTION
                <span className="text-amber-400">
                  BD
                </span>
              </p>

              <p className="text-[9px] tracking-[.2em] text-slate-500">
                BID. WIN. OWN.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="text-sm text-slate-400 transition hover:text-white"
          >
            Back to auctions
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* BREADCRUMB */}
        <button
          type="button"
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-sm text-slate-500 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Live Auctions
        </button>

        {/* PRODUCT */}
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* IMAGE */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="relative aspect-square sm:aspect-[4/3]">
              <img
                src={
                  auctionData.image ||
                  FALLBACK_IMAGE
                }
                alt={
                  auctionData.title ||
                  "Auction item"
                }
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src =
                    FALLBACK_IMAGE;
                }}
              />

              <div
                className={`absolute left-5 top-5 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
                  closed
                    ? "bg-slate-700"
                    : "bg-red-500"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full bg-white ${
                    !closed &&
                    "animate-pulse"
                  }`}
                />

                {auctionData.status ===
                "sold"
                  ? "SOLD"
                  : auctionData.status ===
                    "ended"
                  ? "AUCTION ENDED"
                  : auctionData.status ===
                    "cancelled"
                  ? "CANCELLED"
                  : "LIVE AUCTION"}
              </div>
            </div>
          </div>

          {/* DETAILS */}
          <div>
            <p className="text-sm font-semibold text-amber-400">
              {auctionData.category ||
                "Auction"}
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              {auctionData.title}
            </h1>

            <p className="mt-4 leading-7 text-slate-500">
              {auctionData.description ||
                "Place your bid before the auction ends. The highest valid bid wins the auction."}
            </p>

            {/* PRICE */}
            <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
              <p className="text-sm text-slate-500">
                {closed
                  ? "Final price"
                  : "Current highest bid"}
              </p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-4xl font-black text-amber-400">
                  {money(
                    auctionData.soldPrice ||
                      auctionData.price
                  )}
                </p>

                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    Total bids
                  </p>

                  <p className="text-xl font-bold">
                    {auctionData.bids || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* INFO */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <InfoCard
                icon={Clock3}
                label="Time remaining"
                value={
                  auctionData.time ||
                  "Not specified"
                }
              />

              <InfoCard
                icon={Gavel}
                label="Category"
                value={
                  auctionData.category ||
                  "Auction"
                }
              />
            </div>

            {/* BID */}
            {closed ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <Gavel
                  size={28}
                  className="mx-auto text-slate-500"
                />

                <h2 className="mt-3 text-xl font-bold">
                  Bidding is closed
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  This auction is no longer accepting bids.
                </p>
              </div>
            ) : !token || !user ? (
              /* NOT LOGGED IN */
              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                    <LogIn size={21} />
                  </div>

                  <div>
                    <h2 className="font-bold">
                      Sign in to bid
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      You need an AuctionBD account to place bids.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogin}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-bold text-black transition hover:bg-amber-300"
                >
                  <LogIn size={18} />
                  Sign In to Bid
                </button>

                <p className="mt-3 text-center text-xs text-slate-600">
                  New here? You can create an account from the sign-in page.
                </p>
              </div>
            ) : (
              /* LOGGED IN */
              <form
                onSubmit={handleBid}
                className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      Place Your Bid
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Your bid must be higher than the current bid.
                    </p>
                  </div>

                  <div className="hidden rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-400 sm:block">
                    Signed in
                  </div>
                </div>

                {/* USER */}
                <div className="mt-5 rounded-xl border border-white/10 bg-slate-950 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                      <User size={17} />
                    </div>

                    <div>
                      <p className="text-xs text-slate-600">
                        Bidding as
                      </p>

                      <p className="font-semibold">
                        {user.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AMOUNT */}
                <div className="mt-4">
                  <label
                    htmlFor="bidAmount"
                    className="mb-2 block text-sm font-medium text-slate-400"
                  >
                    Bid amount
                  </label>

                  <div className="flex items-center rounded-xl border border-white/10 bg-slate-950 px-4 focus-within:border-amber-400/50">
                    <span className="text-slate-500">
                      ৳
                    </span>

                    <input
                      id="bidAmount"
                      type="number"
                      min={currentPrice + 1}
                      step="1"
                      value={bidAmount}
                      onChange={(e) =>
                        setBidAmount(
                          e.target.value
                        )
                      }
                      placeholder={`More than ${currentPrice.toLocaleString(
                        "en-BD"
                      )}`}
                      className="w-full bg-transparent px-3 py-3 outline-none placeholder:text-slate-600"
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
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
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
            )}

            {/* TRUST */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
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
          </div>
        </div>

        {/* BID HISTORY */}
        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Bid History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Recent bids placed on this auction.
            </p>
          </div>

          {!bidHistory.length ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <Gavel
                size={32}
                className="mx-auto text-slate-600"
              />

              <h3 className="mt-4 font-bold">
                No bids yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Be the first person to place a bid.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="divide-y divide-white/10">
                {bidHistory.map(
                  (bid, index) => (
                    <div
                      key={
                        bid._id ||
                        bid.id ||
                        `${bid.bidder}-${bid.createdAt}-${index}`
                      }
                      className="flex items-center justify-between gap-4 bg-white/[0.02] px-5 py-4 transition hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                          <User size={18} />
                        </div>

                        <div>
                          <p className="font-semibold">
                            {bid.bidder ||
                              "AuctionBD User"}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            {formatBidDate(
                              bid.createdAt
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-amber-400">
                          {money(
                            bid.amount
                          )}
                        </p>

                        {index === 0 && (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
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

/* ---------- SMALL UI ---------- */

function InfoCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={16} />
        <span className="text-xs">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate font-semibold">
        {value}
      </p>
    </div>
  );
}

function Trust({
  icon: Icon,
  text,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-500">
      <Icon
        size={18}
        className="mx-auto mb-1 text-amber-400"
      />
      {text}
    </div>
  );
}

function Notice({
  type,
  children,
}) {
  const success = type === "success";

  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm ${
        success
          ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
          : "border-red-400/20 bg-red-400/5 text-red-300"
      }`}
    >
      {success ? (
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

function formatBidDate(date) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default AuctionDetails;