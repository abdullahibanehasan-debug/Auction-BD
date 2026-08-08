import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://auction-bd.onrender.com";

const categories = [
  "All",
  "Electronics",
  "Vehicles",
  "Fashion",
  "Gaming",
  "Furniture",
  "Collectibles",
];

function AuctionCard({ auction, onOpen, favorite, onFavorite }) {
  return (
    <div
      onClick={() => onOpen(auction)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-amber-400/40"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={auction.image}
          alt={auction.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={(e) =>
            (e.currentTarget.src =
              "https://placehold.co/800x800/0f172a/fbbf24?text=Auction+BD")
          }
        />

        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold">
          <i className="h-2 w-2 animate-pulse rounded-full bg-white" />
          LIVE
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(auction.id);
          }}
          className={`absolute right-3 top-3 rounded-full p-2 ${
            favorite
              ? "bg-amber-400 text-black"
              : "bg-black/50 text-white"
          }`}
        >
          <Heart size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-5">
        <p className="text-xs text-amber-400">
          {auction.category}
        </p>

        <h3 className="mt-2 text-lg font-bold">
          {auction.title}
        </h3>

        <div className="mt-5 flex justify-between">
          <div>
            <p className="text-xs text-slate-500">
              Current bid
            </p>
            <p className="text-xl font-black">
              ৳{Number(auction.price).toLocaleString("en-BD")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-500">
              Bids
            </p>
            <p className="font-semibold">
              {auction.bids}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-xs">
          <span className="flex items-center gap-1 text-slate-400">
            <Clock3 size={14} />
            {auction.time}
          </span>

          <span className="font-bold text-amber-400">
            Bid now →
          </span>
        </div>
      </div>
    </div>
  );
}


function Skeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
      <div className="mt-5 h-5 w-40 animate-pulse rounded bg-white/10" />
      <div className="mt-6 h-6 w-28 animate-pulse rounded bg-white/10" />
    </div>
  );
}


function App() {
  const [auctions, setAuctions] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [favorites, setFavorites] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  async function loadAuctions() {
  try {
    setLoading(true);
    setError("");

    const res = await fetch(
      `${API_URL}/api/auctions`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch auctions");
    }

    const data = await res.json();

    // Convert MongoDB _id to the id format
    // your existing React UI already uses.
    const formattedAuctions = data.map((auction) => ({
      ...auction,
      id: auction._id,
    }));

    setAuctions(formattedAuctions);

  } catch (error) {
    console.error("Auction loading error:", error);

    setError(
      "Unable to load auctions. Make sure your server is running."
    );
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    loadAuctions();
  }, []);


  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return auctions.filter((a) => {
      const text =
        `${a.title} ${a.category} ${a.categoryGroup}`
          .toLowerCase();

      return (
        text.includes(term) &&
        (category === "All" ||
          a.categoryGroup === category)
      );
    });

  }, [auctions, search, category]);


  function toggleFavorite(id) {
    setFavorites((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : [...old, id]
    );
  }


  function scroll(id) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  }


  if (selectedAuction) {
    return (
      <AuctionDetails
        auction={selectedAuction}
        onBack={() => setSelectedAuction(null)}
      />
    );
  }
    return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black">
              <Gavel size={22} />
            </div>

            <div>
              <h1 className="text-xl font-black">
                AUCTION
                <span className="text-amber-400">
                  BD
                </span>
              </h1>

              <p className="text-[10px] tracking-[.25em] text-slate-500">
                BID. WIN. OWN.
              </p>
            </div>
          </button>


          <nav className="hidden gap-8 md:flex">
            {[
              ["Auctions", "auctions"],
              ["Categories", "categories"],
              ["How It Works", "how"],
            ].map(([name, id]) => (
              <button
                key={id}
                onClick={() => scroll(id)}
                className="text-sm text-slate-400 hover:text-white"
              >
                {name}
              </button>
            ))}
          </nav>


          <button
            onClick={() => scroll("sell")}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-black"
          >
            Sell Item
          </button>

        </div>
      </header>


      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 py-20">

        <div className="max-w-3xl">

          <div className="mb-5 inline-flex rounded-full bg-amber-400/10 px-4 py-2 text-sm text-amber-400">
            Live auctions happening now
          </div>


          <h2 className="text-5xl font-black sm:text-6xl">
            Find it.
            <br />
            <span className="text-amber-400">
              Bid for it.
            </span>
            <br />
            Make it yours.
          </h2>


          <p className="mt-5 text-lg text-slate-400">
            Bangladesh's digital auction marketplace.
            Discover verified products and win amazing deals.
          </p>


          <button
            onClick={() => scroll("auctions")}
            className="mt-8 flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-black"
          >
            Explore Auctions
            <ArrowRight size={18}/>
          </button>

        </div>

      </section>



      {/* SEARCH */}
      <section className="mx-auto max-w-7xl px-6">

        <div className="flex rounded-2xl border border-white/10 bg-white/5 p-3">

          <div className="flex flex-1 items-center gap-3 px-3">

            <Search
              size={20}
              className="text-slate-500"
            />

            <input
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              placeholder="Search auctions..."
              className="w-full bg-transparent outline-none"
            />

            {search && (
              <button onClick={()=>setSearch("")}>
                <X size={18}/>
              </button>
            )}

          </div>

        </div>

      </section>



      {/* AUCTIONS */}
      <section
        id="auctions"
        className="mx-auto max-w-7xl scroll-mt-24 px-6 py-16"
      >

        <h3 className="mb-8 text-3xl font-bold">
          Live Auctions
        </h3>


        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(x=>(
              <Skeleton key={x}/>
            ))}
          </div>
        )}


        {error && (
          <div className="rounded-xl border border-red-500/30 p-8 text-center">
            <p>{error}</p>

            <button
              onClick={loadAuctions}
              className="mt-5 rounded-lg bg-amber-400 px-5 py-2 text-black"
            >
              Retry
            </button>
          </div>
        )}


        {!loading && !error && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

            {filtered.map((auction)=>(
              <AuctionCard
                key={auction.id}
                auction={auction}
                onOpen={setSelectedAuction}
                favorite={favorites.includes(auction.id)}
                onFavorite={toggleFavorite}
              />
            ))}

          </div>
        )}

      </section>




      {/* CATEGORIES */}
      <section
        id="categories"
        className="border-y border-white/10 bg-white/[0.02]"
      >

        <div className="mx-auto max-w-7xl px-6 py-16">

          <h3 className="text-3xl font-bold">
            Categories
          </h3>


          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">

            {categories.map((c)=>(
              <button
                key={c}
                onClick={()=>{
                  setCategory(c);
                  scroll("auctions");
                }}
                className={`rounded-xl border px-4 py-4 ${
                  category===c
                  ?"border-amber-400 text-amber-400"
                  :"border-white/10"
                }`}
              >
                {c}
              </button>
            ))}

          </div>

        </div>

      </section>




      {/* HOW */}
      <section
        id="how"
        className="mx-auto max-w-7xl px-6 py-20"
      >

        <h3 className="text-center text-3xl font-bold">
          How Auction BD Works
        </h3>


        <div className="mt-10 grid gap-6 md:grid-cols-3">

          {[
            [Search,"Find Auction"],
            [Gavel,"Place Bid"],
            [ShieldCheck,"Win Securely"]
          ].map(([Icon,title])=>(
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-8"
            >

              <Icon className="text-amber-400"/>

              <h4 className="mt-5 text-xl font-bold">
                {title}
              </h4>

            </div>
          ))}

        </div>

      </section>



      {/* SELL */}
      <section
        id="sell"
        className="mx-auto max-w-7xl px-6 pb-20"
      >

        <div className="rounded-3xl bg-amber-400 p-10 text-black">

          <h3 className="text-3xl font-black">
            Turn your item into an auction.
          </h3>


          <button className="mt-6 rounded-xl bg-black px-6 py-3 font-bold text-white">
            Sell Item
          </button>

        </div>

      </section>




      {/* FOOTER */}
      <footer className="border-t border-white/10 px-6 py-8">

        <div className="mx-auto flex max-w-7xl justify-between">

          <b>
            AUCTION
            <span className="text-amber-400">
              BD
            </span>
          </b>


          <div className="flex gap-5 text-xs text-slate-500">

            <span className="flex gap-1">
              <ShieldCheck size={14}/>
              Verified
            </span>

            <span className="flex gap-1">
              <Truck size={14}/>
              Delivery
            </span>

            <span className="flex gap-1">
              <Zap size={14}/>
              Live
            </span>

          </div>

        </div>

      </footer>


    </div>
  );
}


export default App;