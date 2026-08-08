import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Gavel,
  DollarSign,
  TrendingUp,
  Plus,
  Trash2,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  X,
  ShoppingBag,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://auction-bd.onrender.com";

const EMPTY_FORM = {
  title: "",
  category: "",
  categoryGroup: "Electronics",
  price: "",
  startingPrice: "",
  time: "24h",
  image: "",
  description: "",
  seller: "",
  sellerEmail: "",
  sellerPhone: "",
};

const FIELDS = [
  ["title", "Title", "text", true],
  ["category", "Category", "text", true],
  ["categoryGroup", "Category Group", "text", true],
  ["price", "Current Price", "number", true],
  ["startingPrice", "Starting Price", "number", false],
  ["time", "Time", "text", true],
  ["image", "Image URL", "url", true],
  ["seller", "Seller Name", "text", false],
  ["sellerEmail", "Seller Email", "email", false],
  ["sellerPhone", "Seller Phone", "tel", false],
];

const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD")}`;

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
        <Icon size={24} />
      </div>
    </div>
  );
}

function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [messageSeller, setMessageSeller] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setStats(await api("/api/admin/stats"));
    } catch (error) {
      console.error("Dashboard error:", error);
      alert(error.message || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const createAuction = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);

      await api("/api/admin/auctions", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          startingPrice: Number(form.startingPrice || form.price),
        }),
      });

      setForm({ ...EMPTY_FORM });
      setShowCreate(false);
      await loadDashboard(true);
      alert("Auction created successfully!");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAuction = async (id) => {
    if (!window.confirm("Delete this auction?")) return;

    try {
      await api(`/api/admin/auctions/${id}`, {
        method: "DELETE",
      });

      await loadDashboard(true);
    } catch (error) {
      alert(error.message);
    }
  };

  const markSold = async (id, price) => {
    const value = window.prompt("Enter final sale price:", price);

    if (!value) return;

    const soldPrice = Number(value);

    if (!Number.isFinite(soldPrice) || soldPrice <= 0) {
      alert("Enter a valid sale price.");
      return;
    }

    try {
      await api(`/api/admin/auctions/${id}/sold`, {
        method: "PATCH",
        body: JSON.stringify({ soldPrice }),
      });

      await loadDashboard(true);
    } catch (error) {
      alert(error.message);
    }
  };

  const updateForm = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (loading && !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={20} className="animate-spin" />
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  const auctions = stats?.recentAuctions || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black">
              <LayoutDashboard size={22} />
            </div>

            <div>
              <h1 className="text-xl font-black">
                AUCTION<span className="text-amber-400">BD</span>
              </h1>

              <p className="text-[10px] tracking-[.2em] text-slate-500">
                ADMIN PANEL
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* TITLE */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-black">Dashboard</h2>
            <p className="mt-1 text-slate-500">
              Manage your AuctionBD marketplace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-black hover:bg-amber-300"
          >
            <Plus size={18} />
            Create Auction
          </button>
        </div>

        {/* STATS */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Sales This Month"
            value={money(stats?.totalSales)}
            icon={DollarSign}
          />

          <StatCard
            title="AuctionBD Revenue"
            value={money(stats?.commission)}
            icon={TrendingUp}
          />

          <StatCard
            title="Active Auctions"
            value={stats?.activeAuctions || 0}
            icon={Gavel}
          />

          <StatCard
            title="Total Bids"
            value={stats?.totalBids || 0}
            icon={ShoppingBag}
          />
        </div>

        {/* COMMISSION */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
          <div>
            <p className="text-sm text-slate-500">
              AuctionBD Commission
            </p>

            <p className="mt-1 text-2xl font-black text-amber-400">
              {stats?.commissionRate || 5}%
            </p>
          </div>

          <DollarSign className="text-amber-400" size={28} />
        </div>

        {/* AUCTIONS */}
        <section className="mt-10">
          <div className="mb-5">
            <h3 className="text-2xl font-bold">Recent Auctions</h3>
            <p className="mt-1 text-sm text-slate-500">
              Manage your latest listings.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="border-b border-white/10 bg-white/[0.03]">
                  <tr>
                    {["Auction", "Seller", "Price", "Status", "Actions"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-5 py-4 text-xs text-slate-500"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {auctions.length ? (
                    auctions.map((auction) => (
                      <tr
                        key={auction._id}
                        className="border-b border-white/5 hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={auction.image}
                              alt=""
                              loading="lazy"
                              className="h-12 w-12 rounded-lg object-cover"
                            />

                            <div>
                              <p className="font-semibold">
                                {auction.title}
                              </p>

                              <p className="text-xs text-slate-600">
                                {auction.category}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p>{auction.seller || "AuctionBD User"}</p>

                          {auction.sellerEmail && (
                            <p className="text-xs text-slate-600">
                              {auction.sellerEmail}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold text-amber-400">
                          {money(auction.price)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              auction.status === "sold"
                                ? "bg-emerald-400/10 text-emerald-400"
                                : "bg-amber-400/10 text-amber-400"
                            }`}
                          >
                            {auction.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {auction.status !== "sold" && (
                              <button
                                type="button"
                                onClick={() =>
                                  markSold(auction._id, auction.price)
                                }
                                title="Mark sold"
                                className="rounded-lg bg-emerald-400/10 p-2 text-emerald-400 hover:bg-emerald-400/20"
                              >
                                <CheckCircle size={17} />
                              </button>
                            )}

                            {auction.sellerEmail && (
                              <button
                                type="button"
                                onClick={() => setMessageSeller(auction)}
                                title="Contact seller"
                                className="rounded-lg bg-blue-400/10 p-2 text-blue-400 hover:bg-blue-400/20"
                              >
                                <MessageSquare size={17} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => deleteAuction(auction._id)}
                              title="Delete"
                              className="rounded-lg bg-red-400/10 p-2 text-red-400 hover:bg-red-400/20"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No auctions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Create Auction</h2>

              <button
                type="button"
                onClick={() => !saving && setShowCreate(false)}
                disabled={saving}
                className="rounded-lg p-2 hover:bg-white/5 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createAuction} className="mt-6 grid gap-4">
              {FIELDS.map(([key, label, type, required]) => (
                <div key={key}>
                  <label className="mb-2 block text-sm text-slate-400">
                    {label}
                  </label>

                  <input
                    value={form[key]}
                    onChange={(event) =>
                      updateForm(key, event.target.value)
                    }
                    required={required}
                    type={type}
                    min={type === "number" ? "0" : undefined}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-amber-400/50"
                  />
                </div>
              ))}

              <div>
                <label className="mb-2 block text-sm text-slate-400">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-amber-400/50"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <RefreshCw size={17} className="animate-spin" />}
                {saving ? "Creating..." : "Create Auction"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SELLER CONTACT */}
      {messageSeller && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-bold">Contact Seller</h2>

                <p className="mt-1 text-sm text-slate-500">
                  {messageSeller.seller || "AuctionBD User"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMessageSeller(null)}
                className="rounded-lg p-2 hover:bg-white/5"
              >
                <X />
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">Seller email</p>

              <p className="mt-1 font-semibold">
                {messageSeller.sellerEmail}
              </p>
            </div>

            <a
              href={`mailto:${messageSeller.sellerEmail}`}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-black"
            >
              <MessageSquare size={18} />
              Open Email
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;