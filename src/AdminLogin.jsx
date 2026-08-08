import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminPanel({ user, onLogout }) {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("auctionbd_token");

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("auctionbd_token");
      localStorage.removeItem("auctionbd_user");
      onLogout();
      throw new Error("Your admin session has expired.");
    }

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  async function loadAuctions() {
    try {
      setLoading(true);
      setError("");

      const data = await api("/api/auctions");

      setAuctions(data.auctions || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuctions();
  }, []);

  function logout() {
    localStorage.removeItem("auctionbd_token");
    localStorage.removeItem("auctionbd_user");
    onLogout();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              AuctionBD Admin
            </h1>

            <p className="text-sm text-slate-500">
              Welcome, {user?.name || "Admin"}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Auctions
            </h2>

            <p className="text-sm text-slate-500">
              Manage AuctionBD listings.
            </p>
          </div>

          <button
            onClick={loadAuctions}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center">
            Loading auctions...
          </div>
        ) : auctions.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-slate-500">
            No auctions found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold">
                      Auction
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold">
                      Category
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold">
                      Price
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {auctions.map((auction) => (
                    <tr
                      key={auction._id || auction.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {auction.title}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {auction.category || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        ৳{Number(auction.price || 0).toLocaleString()}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}