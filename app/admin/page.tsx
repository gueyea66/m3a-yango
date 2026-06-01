"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDashboardKPIs } from "@/lib/hooks/useDashboardKPIs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DailyReport {
  id: string;
  driver_id: string;
  date: string;
  net_after_expenses: number;
  expense_count: number;
  status: string;
}

export default function AdminPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DailyReport>>({});
  const [loadingReports, setLoadingReports] = useState(false);
  const kpis = useDashboardKPIs();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && (tab === "history" || tab === "pending")) {
      loadReports();
    }
  }, [user, tab]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_reports")
        .select("*")
        .order("date", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error loading reports:", error);
      } else {
        setReports(data || []);
      }
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleSaveEdit = async (reportId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("daily_reports")
        .update({ status: "approved" })
        .eq("id", reportId);

      if (error) {
        console.error("Error updating report:", error);
        alert("Erreur lors de la mise à jour");
      } else {
        setEditingId(null);
        setEditForm({});
        loadReports();
        alert("Rapport approuvé ✓");
      }
    } catch (err) {
      console.error("Error saving edit:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    ["dashboard", "📊 Dashboard"],
    ["pending", "⏳ Soumissions"],
    ["history", "📜 Historique"],
    ["vehicles", "🔧 Véhicules"],
    ["drivers", "🚗 Conducteurs"],
    ["settings", "⚙️ Paramètres"],
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Top bar */}
      <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-800 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-yellow-500 rounded flex items-center justify-center text-black font-bold text-sm">
            Y
          </div>
          <span className="font-bold text-white text-sm">Yango Fleet</span>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-300">Abdoulaye</span>
          <button
            onClick={() => signOut()}
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="border-b border-gray-700 px-6 flex gap-1 bg-gray-800">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
              tab === id
                ? "border-yellow-500 text-yellow-500"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {tab === "dashboard" && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Dashboard Flotte</h2>

            {kpis.loading ? (
              <div className="text-center text-gray-400 py-12">Chargement des données...</div>
            ) : (
              <>
                {/* Today KPIs */}
                <div>
                  <h3 className="text-sm uppercase text-gray-400 tracking-widest font-semibold mb-4">
                    Aujourd'hui
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 border-l-4 border-yellow-500 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Revenus
                      </div>
                      <div className="text-2xl font-bold text-white font-mono mt-2">
                        {kpis.todayRevenue.toLocaleString("fr-FR")}
                        <span className="text-sm text-gray-400"> XOF</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {kpis.activeDriversToday} chauffeurs actifs
                      </div>
                    </div>

                    <div className="bg-gray-800 border-l-4 border-red-500 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Dépenses
                      </div>
                      <div className="text-2xl font-bold text-white font-mono mt-2">
                        {kpis.todayExpenses.toLocaleString("fr-FR")}
                        <span className="text-sm text-gray-400"> XOF</span>
                      </div>
                    </div>

                    <div
                      className={`bg-gray-800 border-l-4 rounded-lg p-4 ${
                        kpis.todayNetMargin > 0
                          ? "border-green-500"
                          : "border-red-500"
                      }`}
                    >
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Marge nette
                      </div>
                      <div
                        className={`text-2xl font-bold font-mono mt-2 ${
                          kpis.todayNetMargin > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {kpis.todayNetMargin.toLocaleString("fr-FR")}
                        <span className="text-sm text-gray-400"> XOF</span>
                      </div>
                    </div>

                    <div className="bg-gray-800 border-l-4 border-blue-500 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Conso moyenne
                      </div>
                      <div className="text-2xl font-bold text-white font-mono mt-2">
                        {kpis.avgFuelConsumption.toFixed(2)}
                        <span className="text-sm text-gray-400"> L/100km</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Week KPIs */}
                <div>
                  <h3 className="text-sm uppercase text-gray-400 tracking-widest font-semibold mb-4">
                    Cette semaine
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Revenus
                      </div>
                      <div className="text-2xl font-bold text-yellow-400 font-mono mt-2">
                        {kpis.weekRevenue.toLocaleString("fr-FR")} XOF
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Moy/jour: {kpis.weekAvgDailyRevenue.toLocaleString("fr-FR")} XOF
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Dépenses
                      </div>
                      <div className="text-2xl font-bold text-red-400 font-mono mt-2">
                        {kpis.weekExpenses.toLocaleString("fr-FR")} XOF
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Marge nette
                      </div>
                      <div
                        className={`text-2xl font-bold font-mono mt-2 ${
                          kpis.weekNetMargin > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {kpis.weekNetMargin.toLocaleString("fr-FR")} XOF
                      </div>
                    </div>
                  </div>
                </div>

                {/* Month KPIs */}
                <div>
                  <h3 className="text-sm uppercase text-gray-400 tracking-widest font-semibold mb-4">
                    Ce mois
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Revenus totaux
                      </div>
                      <div className="text-2xl font-bold text-yellow-400 font-mono mt-2">
                        {kpis.monthRevenue.toLocaleString("fr-FR")} XOF
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Dépenses totales
                      </div>
                      <div className="text-2xl font-bold text-red-400 font-mono mt-2">
                        {kpis.monthExpenses.toLocaleString("fr-FR")} XOF
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Marge %
                      </div>
                      <div
                        className={`text-2xl font-bold font-mono mt-2 ${
                          kpis.monthMarginPercent > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {kpis.monthMarginPercent.toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs uppercase text-gray-400 tracking-widest font-semibold">
                        Moy/chauffeur
                      </div>
                      <div className="text-2xl font-bold text-white font-mono mt-2">
                        {kpis.avgRevenuePerDriver.toLocaleString("fr-FR")} XOF
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Trend */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-white mb-4">
                      Tendance revenus (30 jours)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={kpis.dailyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis
                          dataKey="date"
                          stroke="#999"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis stroke="#999" style={{ fontSize: "12px" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #444",
                          }}
                          formatter={(value) =>
                            typeof value === "number"
                              ? value.toLocaleString("fr-FR")
                              : value
                          }
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#fbbf24"
                          name="Revenus"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="expenses"
                          stroke="#ef4444"
                          name="Dépenses"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="margin"
                          stroke="#10b981"
                          name="Marge"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Expense Breakdown */}
                  {kpis.expenseBreakdown.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-white mb-4">
                        Breakdown dépenses (mois)
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={kpis.expenseBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) =>
                              `${entry.name || entry.type} ${((entry.percent || 0) * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="amount"
                          >
                            <Cell fill="#ef4444" />
                            <Cell fill="#f97316" />
                            <Cell fill="#eab308" />
                          </Pie>
                          <Tooltip
                            formatter={(value) =>
                              typeof value === "number"
                                ? value.toLocaleString("fr-FR")
                                : value
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Top Drivers */}
                {kpis.topDrivers.length > 0 && (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-white mb-4">
                      Top chauffeurs (mois)
                    </h3>
                    <div className="space-y-3">
                      {kpis.topDrivers.map((driver, idx) => (
                        <div
                          key={driver.driver_id}
                          className="flex items-center justify-between bg-gray-700 rounded p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-white font-semibold">
                                {driver.driver_id}
                              </div>
                              <div className="text-xs text-gray-400">
                                Marge: {driver.margin.toLocaleString("fr-FR")} XOF
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-yellow-400 font-mono font-semibold">
                              {driver.earnings.toLocaleString("fr-FR")} XOF
                            </div>
                            <div className="text-xs text-gray-400">
                              Dépenses: {driver.expenses.toLocaleString("fr-FR")} XOF
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "pending" && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Soumissions en attente</h2>
            {loadingReports ? (
              <div className="text-center text-gray-400 py-12">Chargement...</div>
            ) : reports.length === 0 ? (
              <div className="text-center text-gray-400 py-12">Aucune soumission</div>
            ) : (
              <div className="space-y-4">
                {reports.filter((r) => r.status === "submitted").map((report) => (
                  <div
                    key={report.id}
                    className="bg-gray-800 rounded-lg border border-gray-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                      <div>
                        <div className="font-semibold text-white">{report.date}</div>
                        <div className="text-sm text-gray-400">
                          Chauffeur: {report.driver_id} · {report.expense_count} événements
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-yellow-500 font-mono">
                          {report.net_after_expenses.toLocaleString("fr-FR")} XOF
                        </div>
                        <span className="inline-block bg-yellow-900 bg-opacity-30 text-yellow-300 text-xs font-semibold px-2 py-1 rounded mt-1">
                          Soumis
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Tous les rapports</h2>
            {loadingReports ? (
              <div className="text-center text-gray-400 py-12">Chargement...</div>
            ) : reports.length === 0 ? (
              <div className="text-center text-gray-400 py-12">Aucun rapport</div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-gray-800 rounded-lg border border-gray-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                      <div>
                        <div className="font-semibold text-white">{report.date}</div>
                        <div className="text-sm text-gray-400">
                          Chauffeur: {report.driver_id} · {report.expense_count} événements
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-yellow-500 font-mono">
                          {report.net_after_expenses.toLocaleString("fr-FR")} XOF
                        </div>
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-1 rounded mt-1 ${
                            report.status === "submitted"
                              ? "bg-yellow-900 bg-opacity-30 text-yellow-300"
                              : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {report.status === "submitted" ? "Soumis" : "Validé"}
                        </span>
                      </div>
                    </div>

                    {editingId === report.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Montant net (XOF)
                          </label>
                          <input
                            type="number"
                            value={editForm.net_after_expenses || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                net_after_expenses: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(report.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded text-sm"
                          >
                            ✓ Enregistrer
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditForm({});
                            }}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded text-sm"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(report.id);
                          setEditForm({ net_after_expenses: report.net_after_expenses });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm"
                      >
                        ✏️ Modifier
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "vehicles" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Analytics Véhicules</h2>
              <button
                onClick={() => router.push("/admin/vehicles")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded"
              >
                Voir les stats détaillées →
              </button>
            </div>
            <p className="text-gray-400">
              Consommation, dépenses, marge nette et autres métriques pour chaque véhicule.
            </p>
          </div>
        )}

        {tab === "drivers" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Gestion des conducteurs</h2>
              <button
                onClick={() => router.push("/admin/drivers")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded"
              >
                Gérer les conducteurs →
              </button>
            </div>
            <p className="text-gray-400">
              Cliquez sur le bouton ci-dessus pour gérer les comptes conducteurs (créer, modifier, supprimer).
            </p>
          </div>
        )}

        {tab === "settings" && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Paramètres</h2>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md">
              <div className="mb-6">
                <label className="text-xs uppercase text-gray-400 tracking-widest font-semibold block mb-2">
                  Commission Yango (%)
                </label>
                <input
                  type="number"
                  defaultValue="15"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                />
              </div>
              <div className="mb-6">
                <label className="text-xs uppercase text-gray-400 tracking-widest font-semibold block mb-2">
                  Commission Partenaire (%)
                </label>
                <input
                  type="number"
                  defaultValue="0.75"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                />
              </div>
              <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 rounded">
                Enregistrer les paramètres
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
