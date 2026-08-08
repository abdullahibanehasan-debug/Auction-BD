import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Gavel,
  Loader2,
  LogOut,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
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

/* =========================================================
   HELPERS
========================================================= */

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

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
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Unable to connect to the AuctionBD server."
    );
  }

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Admin session expired. Please sign in again."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "You do not have permission to perform this action."
      );
    }

    throw new Error(
      data?.message ||
        data?.error ||
        `Server error: ${response.status}`
    );
  }

  return data;
}

function money(value = 0) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function date(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString(
      "en-BD",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "—";
  }
}

function statusClass(status, dark) {
  const value = String(status || "")
    .toLowerCase();

  if (
    ["approved", "active", "sold"].includes(value)
  ) {
    return dark
      ? "bg-emerald-400/10 text-emerald-400"
      : "bg-emerald-50 text-emerald-700";
  }

  if (
    ["rejected", "cancelled"].includes(value)
  ) {
    return dark
      ? "bg-red-400/10 text-red-400"
      : "bg-red-50 text-red-700";
  }

  if (
    ["pending", "pending_review"].includes(value)
  ) {
    return dark
      ? "bg-amber-400/10 text-amber-400"
      : "bg-amber-50 text-amber-700";
  }

  return dark
    ? "bg-slate-800 text-slate-300"
    : "bg-gray-100 text-gray-600";
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  dark,
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        dark
          ? "border-slate-800 bg-slate-900"
          : "border-gray-200 bg-white"
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
      >
        <Icon size={21} />
      </div>

      <p
        className={`mt-4 text-sm ${
          dark
            ? "text-slate-500"
            : "text-gray-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-black ${
          dark
            ? "text-white"
            : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Empty({ text, dark }) {
  return (
    <div
      className={`rounded-2xl border p-10 text-center ${
        dark
          ? "border-slate-800 bg-slate-900"
          : "border-gray-200 bg-white"
      }`}
    >
      <Package
        size={36}
        className="mx-auto text-gray-300"
      />

      <p
        className={`mt-3 text-sm ${
          dark
            ? "text-slate-500"
            : "text-gray-500"
        }`}
      >
        {text}
      </p>
    </div>
  );
}

function ErrorBox({
  message,
  onRetry,
  dark,
}) {
  if (!message) return null;

  return (
    <div
      className={`mb-5 flex items-center gap-3 rounded-xl border p-4 ${
        dark
          ? "border-red-400/20 bg-red-400/10 text-red-300"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <AlertCircle
        size={19}
        className="shrink-0"
      />

      <span className="flex-1 text-sm">
        {message}
      </span>

      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/* =========================================================
   REJECT MODAL
========================================================= */

function RejectModal({
  request,
  onClose,
  onConfirm,
  loading,
  dark,
}) {
  const [reason, setReason] =
    useState("");

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
          dark
            ? "bg-slate-900"
            : "bg-white"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              className={`text-xl font-black ${
                dark
                  ? "text-white"
                  : "text-gray-900"
              }`}
            >
              Reject request
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {request?.title}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <textarea
          value={reason}
          onChange={(e) =>
            setReason(e.target.value)
          }
          rows={4}
          placeholder="Reason for rejection..."
          className="field mt-5 resize-none"
        />

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className={`flex-1 rounded-xl border py-3 font-bold ${
              dark
                ? "border-slate-700 text-slate-300"
                : "border-gray-200 text-gray-700"
            }`}
          >
            Cancel
          </button>

          <button
            onClick={() =>
              onConfirm(reason.trim())
            }
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 font-bold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {loading && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ADMIN PANEL
========================================================= */

export default function AdminPanel({
  dark = false,
  onLogout,
}) {
  const [tab, setTab] =
    useState("dashboard");

  const [requests, setRequests] =
    useState([]);

  const [auctions, setAuctions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [rejecting, setRejecting] =
    useState(null);

  const [actionLoading, setActionLoading] =
    useState(false);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const [
          requestData,
          auctionData,
        ] = await Promise.all([
          api(
            "/api/seller-requests"
          ),
          api(
            "/api/auctions?status=all"
          ),
        ]);

        setRequests(
          Array.isArray(requestData)
            ? requestData
            : requestData?.requests ||
                []
        );

        setAuctions(
          Array.isArray(auctionData)
            ? auctionData
            : auctionData?.auctions ||
                []
        );
      } catch (err) {
        console.error(
          "Admin loading error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load admin data."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  /* =======================================================
     ACTIONS
  ======================================================= */

  const approveRequest =
    async (request) => {
      setActionLoading(true);
      setError("");

      try {
        await api(
          `/api/seller-requests/${
            request._id || request.id
          }/approve`,
          {
            method: "PATCH",
          }
        );

        await load();
      } catch (err) {
        setError(
          err?.message ||
            "Unable to approve request."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const rejectRequest =
    async (reason) => {
      if (!rejecting) return;

      setActionLoading(true);
      setError("");

      try {
        await api(
          `/api/seller-requests/${
            rejecting._id ||
            rejecting.id
          }/reject`,
          {
            method: "PATCH",
            body: JSON.stringify({
              rejectionReason:
                reason ||
                "Request rejected by admin.",
            }),
          }
        );

        setRejecting(null);
        await load();
      } catch (err) {
        setError(
          err?.message ||
            "Unable to reject request."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const deleteAuction =
    async (auction) => {
      const id =
        auction._id || auction.id;

      if (!id) return;

      const confirmed =
        window.confirm(
          `Delete "${auction.title || "this auction"}"? This cannot be undone.`
        );

      if (!confirmed) return;

      setActionLoading(true);
      setError("");

      try {
        await api(
          `/api/auctions/${id}`,
          {
            method: "DELETE",
          }
        );

        await load();
      } catch (err) {
        setError(
          err?.message ||
            "Unable to delete auction."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const logout = () => {
    clearAuth();

    if (onLogout) {
      onLogout();
    } else {
      window.location.href = "/";
    }
  };

  /* =======================================================
     FILTERS
  ======================================================= */

  const filteredRequests =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) return requests;

      return requests.filter(
        (item) =>
          [
            item.title,
            item.status,
            item.name,
            item.email,
            item.phone,
            item.category,
            item.location,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term)
      );
    }, [requests, search]);

  const filteredAuctions =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) return auctions;

      return auctions.filter(
        (item) =>
          [
            item.title,
            item.category,
            item.categoryGroup,
            item.status,
            item.seller,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term)
      );
    }, [auctions, search]);

  /* =======================================================
     STATS
  ======================================================= */

  const pending = requests.filter(
    (item) =>
      String(item.status)
        .toLowerCase() ===
      "pending"
  ).length;

  const active = auctions.filter(
    (item) =>
      String(item.status)
        .toLowerCase() ===
      "active"
  ).length;

  const sold = auctions.filter(
    (item) =>
      String(item.status)
        .toLowerCase() === "sold"
  ).length;

  /* =======================================================
     UI
  ======================================================= */

  const panel = dark
    ? "border-slate-800 bg-slate-900"
    : "border-gray-200 bg-white";

  const heading = dark
    ? "text-white"
    : "text-gray-900";

  const muted = dark
    ? "text-slate-400"
    : "text-gray-500";

  return (
    <div
      className={`min-h-screen ${
        dark
          ? "bg-slate-950 text-white"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* HEADER */}

      <header
        className={`sticky top-0 z-50 border-b backdrop-blur ${
          dark
            ? "border-slate-800 bg-slate-950/95"
            : "border-gray-200 bg-white/95"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white">
                <Gavel size={19} />
              </div>

              <div>
                <p
                  className={`font-black ${
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

                <p className="text-[9px] font-bold tracking-[.2em] text-gray-400">
                  ADMIN PANEL
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
              dark
                ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                : "border-gray-200 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">
              Logout
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        {/* TITLE */}

        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold text-orange-500">
              MANAGEMENT
            </p>

            <h1
              className={`mt-1 text-3xl font-black sm:text-4xl ${heading}`}
            >
              Admin Dashboard
            </h1>

            <p className={`mt-2 ${muted}`}>
              Manage seller requests and
              auctions.
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${
              dark
                ? "border-slate-700 bg-slate-900 text-slate-300"
                : "border-gray-200 bg-white text-gray-700"
            }`}
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>

        <ErrorBox
          message={error}
          onRetry={load}
          dark={dark}
        />

        {/* STATS */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Seller Requests"
            value={requests.length}
            color="bg-blue-500/10 text-blue-500"
            dark={dark}
          />

          <StatCard
            icon={Clock3}
            label="Pending"
            value={pending}
            color="bg-amber-500/10 text-amber-500"
            dark={dark}
          />

          <StatCard
            icon={Gavel}
            label="Active Auctions"
            value={active}
            color="bg-orange-500/10 text-orange-500"
            dark={dark}
          />

          <StatCard
            icon={CheckCircle2}
            label="Sold Auctions"
            value={sold}
            color="bg-emerald-500/10 text-emerald-500"
            dark={dark}
          />
        </div>

        {/* NAV */}

        <div
          className={`mt-8 flex gap-2 overflow-x-auto rounded-2xl border p-2 ${panel}`}
        >
          {[
            [
              "dashboard",
              BarChart3,
              "Dashboard",
            ],
            [
              "requests",
              Package,
              "Seller Requests",
            ],
            [
              "auctions",
              Gavel,
              "Auctions",
            ],
          ].map(
            ([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setSearch("");
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  tab === id
                    ? "bg-orange-500 text-white"
                    : dark
                    ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            )
          )}
        </div>

        {/* SEARCH */}

        {tab !== "dashboard" && (
          <div
            className={`mt-5 flex items-center gap-3 rounded-2xl border px-4 py-2 ${panel}`}
          >
            <Search
              size={19}
              className="text-gray-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder={
                tab === "requests"
                  ? "Search seller requests..."
                  : "Search auctions..."
              }
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
                className="text-gray-400"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* DASHBOARD */}

        {tab === "dashboard" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div
              className={`rounded-2xl border p-6 ${panel}`}
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`text-xl font-black ${heading}`}
                >
                  Recent Requests
                </h2>

                <button
                  onClick={() =>
                    setTab("requests")
                  }
                  className="text-sm font-bold text-orange-500"
                >
                  View all →
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {requests
                  .slice(0, 5)
                  .map((request) => (
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
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={`font-bold ${heading}`}
                          >
                            {request.title ||
                              "Untitled"}
                          </p>

                          <p
                            className={`mt-1 text-xs ${muted}`}
                          >
                            {request.email ||
                              request.name ||
                              "Seller"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                            request.status,
                            dark
                          )}`}
                        >
                          {String(
                            request.status ||
                              "pending"
                          ).replace(
                            /_/g,
                            " "
                          )}
                        </span>
                      </div>
                    </div>
                  ))}

                {!requests.length && (
                  <p
                    className={`py-6 text-center text-sm ${muted}`}
                  >
                    No seller requests.
                  </p>
                )}
              </div>
            </div>

            <div
              className={`rounded-2xl border p-6 ${panel}`}
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`text-xl font-black ${heading}`}
                >
                  Recent Auctions
                </h2>

                <button
                  onClick={() =>
                    setTab("auctions")
                  }
                  className="text-sm font-bold text-orange-500"
                >
                  View all →
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {auctions
                  .slice(0, 5)
                  .map((auction) => (
                    <div
                      key={
                        auction._id ||
                        auction.id
                      }
                      className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${
                        dark
                          ? "border-slate-800"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`truncate font-bold ${heading}`}
                        >
                          {auction.title ||
                            "Untitled"}
                        </p>

                        <p
                          className={`mt-1 text-xs ${muted}`}
                        >
                          {money(
                            auction.price
                          )}{" "}
                          ·{" "}
                          {auction.bids ||
                            0}{" "}
                          bids
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                          auction.status,
                          dark
                        )}`}
                      >
                        {auction.status ||
                          "active"}
                      </span>
                    </div>
                  ))}

                {!auctions.length && (
                  <p
                    className={`py-6 text-center text-sm ${muted}`}
                  >
                    No auctions.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SELLER REQUESTS */}

        {tab === "requests" && (
          <section className="mt-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-orange-500" />
              </div>
            ) : !filteredRequests.length ? (
              <Empty
                text="No seller requests found."
                dark={dark}
              />
            ) : (
              <div className="space-y-4">
                {filteredRequests.map(
                  (request) => {
                    const id =
                      request._id ||
                      request.id;

                    const status =
                      String(
                        request.status ||
                          "pending"
                      ).toLowerCase();

                    const pending =
                      status ===
                        "pending" ||
                      status ===
                        "pending_review";

                    return (
                      <div
                        key={id}
                        className={`rounded-2xl border p-5 ${panel}`}
                      >
                        <div className="flex flex-col justify-between gap-4 lg:flex-row">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                className={`text-lg font-black ${heading}`}
                              >
                                {request.title ||
                                  "Untitled"}
                              </h2>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                                  status,
                                  dark
                                )}`}
                              >
                                {status.replace(
                                  /_/g,
                                  " "
                                )}
                              </span>
                            </div>

                            <div
                              className={`mt-3 grid gap-2 text-sm sm:grid-cols-2 ${muted}`}
                            >
                              <p>
                                <b>Seller:</b>{" "}
                                {request.name ||
                                  request.seller?.name ||
                                  "—"}
                              </p>

                              <p>
                                <b>Email:</b>{" "}
                                {request.email ||
                                  request.seller?.email ||
                                  "—"}
                              </p>

                              <p>
                                <b>Phone:</b>{" "}
                                {request.phone ||
                                  request.seller?.phone ||
                                  "—"}
                              </p>

                              <p>
                                <b>Category:</b>{" "}
                                {request.category ||
                                  request.categoryGroup ||
                                  "—"}
                              </p>

                              <p>
                                <b>Price:</b>{" "}
                                {money(
                                  request.expectedPrice
                                )}
                              </p>

                              <p>
                                <b>Location:</b>{" "}
                                {request.location ||
                                  "—"}
                              </p>
                            </div>

                            {request.description && (
                              <p
                                className={`mt-4 text-sm leading-6 ${muted}`}
                              >
                                {
                                  request.description
                                }
                              </p>
                            )}

                            {request.rejectionReason && (
                              <p className="mt-3 text-sm text-red-500">
                                <b>
                                  Rejection:
                                </b>{" "}
                                {
                                  request.rejectionReason
                                }
                              </p>
                            )}

                            {request.adminNotes && (
                              <p
                                className={`mt-2 text-sm ${muted}`}
                              >
                                <b>
                                  Admin notes:
                                </b>{" "}
                                {
                                  request.adminNotes
                                }
                              </p>
                            )}

                            <p className="mt-4 text-xs text-gray-400">
                              Submitted{" "}
                              {date(
                                request.createdAt
                              )}
                            </p>
                          </div>

                          {pending && (
                            <div className="flex shrink-0 gap-2 lg:self-start">
                              <button
                                disabled={
                                  actionLoading
                                }
                                onClick={() =>
                                  approveRequest(
                                    request
                                  )
                                }
                                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                              >
                                <CheckCircle2
                                  size={17}
                                />
                                Approve
                              </button>

                              <button
                                disabled={
                                  actionLoading
                                }
                                onClick={() =>
                                  setRejecting(
                                    request
                                  )
                                }
                                className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
                              >
                                <XCircle
                                  size={17}
                                />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}

        {/* AUCTIONS */}

        {tab === "auctions" && (
          <section className="mt-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-orange-500" />
              </div>
            ) : !filteredAuctions.length ? (
              <Empty
                text="No auctions found."
                dark={dark}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAuctions.map(
                  (auction) => {
                    const id =
                      auction._id ||
                      auction.id;

                    return (
                      <article
                        key={id}
                        className={`overflow-hidden rounded-2xl border ${panel}`}
                      >
                        <div className="aspect-[4/3] bg-gray-100">
                          <img
                            src={
                              auction.image ||
                              auction.images?.[0] ||
                              "https://placehold.co/800x600/f8fafc/f59e0b?text=Auction+BD"
                            }
                            alt={
                              auction.title ||
                              "Auction"
                            }
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://placehold.co/800x600/f8fafc/f59e0b?text=Auction+BD";
                            }}
                          />
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h2
                              className={`line-clamp-2 font-black ${heading}`}
                            >
                              {auction.title ||
                                "Untitled auction"}
                            </h2>

                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(
                                auction.status,
                                dark
                              )}`}
                            >
                              {auction.status ||
                                "active"}
                            </span>
                          </div>

                          <div
                            className={`mt-4 grid grid-cols-2 gap-3 text-sm ${muted}`}
                          >
                            <div>
                              <p className="text-xs">
                                Current price
                              </p>

                              <p
                                className={`mt-1 font-black ${heading}`}
                              >
                                {money(
                                  auction.price
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs">
                                Bids
                              </p>

                              <p
                                className={`mt-1 font-black ${heading}`}
                              >
                                {auction.bids ||
                                  0}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex items-center justify-between border-t border-gray-200/10 pt-4">
                            <p className="text-xs text-gray-400">
                              {date(
                                auction.createdAt
                              )}
                            </p>

                            <button
                              disabled={
                                actionLoading
                              }
                              onClick={() =>
                                deleteAuction(
                                  auction
                                )
                              }
                              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              <Trash2
                                size={15}
                              />
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* REJECT MODAL */}

      {rejecting && (
        <RejectModal
          request={rejecting}
          onClose={() =>
            !actionLoading &&
            setRejecting(null)
          }
          onConfirm={
            rejectRequest
          }
          loading={
            actionLoading
          }
          dark={dark}
        />
      )}
    </div>
  );
}