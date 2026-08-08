
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
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://auction-bd.onrender.com";

function AuctionDetails({ auction, onBack }) {
  const [auctionData, setAuctionData] = useState(auction);
  const [bidHistory, setBidHistory] = useState([]);

  const [bidAmount, setBidAmount] = useState("");
  const [bidder, setBidder] = useState("");

  const [loading, setLoading] = useState(true);
  const [placingBid, setPlacingBid] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadAuction() {
      try {
        setLoading(true);
        setError("");

        const auctionId = auction?._id || auction?.id;

        if (!auctionId) {
          throw new Error("Auction ID is missing");
        }

        const response = await fetch(
          `${API_URL}/api/auctions/${auctionId}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          throw new Error(
            errorData.message || "Failed to load auction"
          );
        }

        const data = await response.json();

        setAuctionData({
          ...data,
          id: data._id || data.id,
        });

        setBidHistory(data.bidHistory || []);
      } catch (error) {
        console.error("Auction details error:", error);

        setError(
          error.message || "Unable to load auction details."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAuction();
  }, [auction?._id, auction?.id]);

  async function handleBid(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const amount = Number(bidAmount);

    if (!bidder.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid bid amount.");
      return;
    }

    if (amount <= Number(auctionData.price)) {
      setError(
        `Your bid must be higher than ৳${Number(
          auctionData.price
        ).toLocaleString("en-BD")}.`
      );
      return;
    }

    try {
      setPlacingBid(true);

      const auctionId =
        auctionData?._id || auctionData?.id;

      const response = await fetch(
        `${API_URL}/api/auctions/${auctionId}/bids`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            bidder: bidder.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to place bid."
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
        setBidHistory((current) => [
          data.bid,
          ...current,
        ]);
      }

      setBidAmount("");
      setSuccess(
        "Your bid was placed successfully!"
      );
    } catch (error) {
      console.error("Bid error:", error);

      setError(
        error.message ||
          "Unable to place your bid."
      );
    } finally {
      setPlacingBid(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to auctions
            </button>
          </div>
        </header>

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <Loader2
              size={40}
              className="mx-auto animate-spin text-amber-400"
            />

            <p className="mt-4 text-slate-400">
              Loading auction...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !auctionData?.title) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to auctions
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-8 text-center">
            <AlertCircle
              size={36}
              className="mx-auto text-red-400"
            />

            <h2 className="mt-4 text-xl font-bold">
              Unable to load auction
            </h2>

            <p className="mt-2 text-slate-500">
              {error}
            </p>

            <button
              onClick={onBack}
              className="mt-6 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950"
            >
              Back to auctions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to auctions
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-slate-950">
              <Gavel size={19} />
            </div>

            <p className="font-black tracking-tight">
              AUCTION
              <span className="text-amber-400">
                BD
              </span>
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* BREADCRUMB */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Live Auctions
          </button>
        </div>

        {/* MAIN PRODUCT AREA */}
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* IMAGE */}
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="relative aspect-square sm:aspect-[4/3]">
              <img
                src={auctionData.image}
                alt={auctionData.title}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src =
                    "https://placehold.co/800x800/0f172a/fbbf24?text=Auction+BD";
                }}
              />

              {/* LIVE BADGE */}
              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-xs font-bold">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                LIVE AUCTION
              </div>
            </div>
          </div>

          {/* DETAILS */}
          <div>
            <p className="text-sm font-semibold text-amber-400">
              {auctionData.category}
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              {auctionData.title}
            </h1>

            <p className="mt-4 leading-7 text-slate-500">
              {auctionData.description ||
                "Place your bid before the auction ends. The highest valid bid wins the auction."}
            </p>

            {/* CURRENT BID */}
            <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
              <p className="text-sm text-slate-500">
                Current highest bid
              </p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-4xl font-black text-amber-400">
                  ৳
                  {Number(
                    auctionData.price || 0
                  ).toLocaleString("en-BD")}
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

            {/* AUCTION INFO */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock3 size={16} />

                  <span className="text-xs">
                    Time remaining
                  </span>
                </div>

                <p className="mt-2 font-bold">
                  {auctionData.time}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Gavel size={16} />

                  <span className="text-xs">
                    Category
                  </span>
                </div>

                <p className="mt-2 font-bold">
                  {auctionData.category}
                </p>
              </div>
            </div>

            {/* BID FORM */}
            <form
              onSubmit={handleBid}
              className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h2 className="text-xl font-bold">
                Place Your Bid
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your bid must be higher than the current bid.
              </p>

              {/* BIDDER */}
              <div className="mt-5">
                <label
                  htmlFor="bidder"
                  className="mb-2 block text-sm font-medium text-slate-400"
                >
                  Your name
                </label>

                <div className="flex items-center rounded-xl border border-white/10 bg-slate-950 px-4">
                  <User
                    size={18}
                    className="text-slate-600"
                  />

                  <input
                    id="bidder"
                    type="text"
                    value={bidder}
                    onChange={(event) =>
                      setBidder(event.target.value)
                    }
                    placeholder="Enter your name"
                    className="w-full bg-transparent px-3 py-3 outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* BID AMOUNT */}
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
                    min={Number(auctionData.price || 0) + 1}
                    value={bidAmount}
                    onChange={(event) =>
                      setBidAmount(event.target.value)
                    }
                    placeholder={`More than ${Number(
                      auctionData.price || 0
                    ).toLocaleString("en-BD")}`}
                    className="w-full bg-transparent px-3 py-3 outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{error}</span>
                </div>
              )}

              {/* SUCCESS */}
              {success && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{success}</span>
                </div>
              )}

              {/* SUBMIT */}
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

            {/* TRUST */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <ShieldCheck
                  size={18}
                  className="mx-auto text-amber-400"
                />

                <p className="mt-2 text-[11px] text-slate-500">
                  Verified
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <Truck
                  size={18}
                  className="mx-auto text-amber-400"
                />

                <p className="mt-2 text-[11px] text-slate-500">
                  Delivery
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <Gavel
                  size={18}
                  className="mx-auto text-amber-400"
                />

                <p className="mt-2 text-[11px] text-slate-500">
                  Live Bidding
                </p>
              </div>
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

          {bidHistory.length === 0 ? (
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
                {bidHistory.map((bid, index) => (
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
                          {bid.bidder}
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
                        ৳
                        {Number(
                          bid.amount || 0
                        ).toLocaleString("en-BD")}
                      </p>

                      {index === 0 && (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Highest bid
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function formatBidDate(date) {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default AuctionDetails;