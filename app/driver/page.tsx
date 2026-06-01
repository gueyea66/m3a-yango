"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import { AttachmentUpload } from "@/components/AttachmentUpload";

interface DriverProfile {
  id: string;
  driver_id: string;
  full_name: string;
  role: string;
}

interface EventEntry {
  type: "fuel" | "toll" | "balance" | "control";
  date: string;
  amount: number;
  description: string;
  odometer?: number;
  liters?: number;
}

type TabMode = "saisie-ponctuelle" | "saisie-fin-journee";

export default function DriverDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<TabMode>("saisie-ponctuelle");
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [newEvent, setNewEvent] = useState<EventEntry>({
    type: "fuel",
    date: new Date().toISOString().split("T")[0],
    amount: 0,
    description: "",
    odometer: undefined,
    liters: undefined,
  });
  const [lastCreatedEventId, setLastCreatedEventId] = useState<string | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayDate, setTodayDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleAddEvent = async () => {
    if (newEvent.amount <= 0 || !profile) return;
    try {
      const supabase = createClient();

      // Insert event into database
      const { data: eventData, error: eventError } = await supabase
        .from("event_entries")
        .insert({
          driver_id: profile.id,
          type: newEvent.type,
          date: newEvent.date,
          amount: newEvent.amount,
          description: newEvent.description,
          odometer: newEvent.odometer,
          liters: newEvent.liters,
          status: "draft",
        })
        .select()
        .single();

      if (eventError) {
        console.error("Error saving event:", eventError);
        alert("Erreur lors de l'enregistrement");
        return;
      }

      // Add to local state
      setEvents([...events, newEvent]);
      setLastCreatedEventId(eventData.id);
      setNewEvent({
        type: "fuel",
        date: new Date().toISOString().split("T")[0],
        amount: 0,
        description: "",
        odometer: undefined,
        liters: undefined,
      });
    } catch (err) {
      console.error("Error adding event:", err);
      alert("Erreur système");
    }
  };

  const handleEndDay = async () => {
    if (!profile || todayEarnings === 0) return;
    try {
      const supabase = createClient();

      // Calculate totals from event_entries
      const { data: eventData, error: fetchError } = await supabase
        .from("event_entries")
        .select("*")
        .eq("driver_id", profile.id)
        .eq("date", todayDate);

      if (fetchError) {
        console.error("Error fetching events:", fetchError);
        alert("Erreur lors de la récupération des événements");
        return;
      }

      const events_list = eventData || [];
      const fuelEvents = events_list.filter((e) => e.type === "fuel");
      const tollEvents = events_list.filter((e) => e.type === "toll");
      const totalFuelCost = fuelEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalTollCost = tollEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalExpenses = events_list.reduce((sum, e) => {
        if (e.type !== "balance") sum += e.amount || 0;
        return sum;
      }, 0);
      const totalFuelLiters = fuelEvents.reduce((sum, e) => sum + (e.liters || 0), 0);
      const odometerStart = fuelEvents.length > 0 ? Math.min(...fuelEvents.map((e) => e.odometer || 0)) : undefined;
      const odometerEnd = fuelEvents.length > 0 ? Math.max(...fuelEvents.map((e) => e.odometer || 0)) : undefined;

      // Insert daily report with calculated totals
      const { error: reportError } = await supabase.from("daily_reports").insert({
        driver_id: profile.id,
        date: todayDate,
        net_after_expenses: todayEarnings,
        fuel_cost: totalFuelCost,
        toll_cost: totalTollCost,
        fuel_liters_total: totalFuelLiters > 0 ? totalFuelLiters : null,
        odometer_start: odometerStart,
        odometer_end: odometerEnd,
        expense_count: events_list.length,
        status: "submitted",
      });

      if (reportError) {
        console.error("Error saving daily report:", reportError);
        alert("Erreur lors de l'enregistrement du rapport");
        return;
      }

      // Mark all events as submitted
      await supabase
        .from("event_entries")
        .update({ status: "submitted" })
        .eq("driver_id", profile.id)
        .eq("date", todayDate);

      setEvents([]);
      setTodayEarnings(0);
      alert("Fin de journée enregistrée ✓");
    } catch (err) {
      console.error("Error saving daily report:", err);
      alert("Erreur système");
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <p className="text-lg text-gray-300">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const eventLabels = {
    fuel: "⛽ Carburant",
    toll: "🛣️ Péage",
    balance: "💳 Solde",
    control: "📋 Contrôle",
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 px-6 py-4 bg-gray-800 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center text-black font-bold text-sm">
              Y
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Yango Chauffeur</h1>
              <p className="text-xs text-gray-400">Saisie journalière</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">
              {profile?.full_name || "Chargement..."}
            </span>
            <button
              onClick={() => signOut()}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Bienvenue, {profile?.full_name}
          </h2>
          <p className="text-gray-400">ID Chauffeur: {profile?.driver_id}</p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab("saisie-ponctuelle")}
            className={`px-4 py-3 font-semibold transition border-b-2 ${
              activeTab === "saisie-ponctuelle"
                ? "border-yellow-500 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            📝 Saisie ponctuelle
          </button>
          <button
            onClick={() => setActiveTab("saisie-fin-journee")}
            className={`px-4 py-3 font-semibold transition border-b-2 ${
              activeTab === "saisie-fin-journee"
                ? "border-yellow-500 text-yellow-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            🏁 Fin de journée
          </button>
        </div>

        {/* TAB 1: SAISIE PONCTUELLE */}
        {activeTab === "saisie-ponctuelle" && (
          <div>
            {/* Quick summary */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Revenus ({todayDate})</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-1">
                    {todayEarnings.toLocaleString("fr-FR")} XOF
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Événements</p>
                  <p className="text-2xl font-bold text-white mt-1">{events.length}</p>
                </div>
              </div>
            </div>

            {/* Add event section */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">Ajouter un événement</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Date</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, date: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Type</label>
              <select
                value={newEvent.type}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    type: e.target.value as EventEntry["type"],
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
              >
                <option value="fuel">⛽ Carburant</option>
                <option value="toll">🛣️ Péage</option>
                <option value="balance">💳 Solde</option>
                <option value="control">📋 Contrôle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Montant (XOF)</label>
              <input
                type="number"
                value={newEvent.amount}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, amount: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                placeholder="0"
              />
            </div>

            {/* Conditional fields for fuel */}
            {newEvent.type === "fuel" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Compteur (km)</label>
                    <input
                      type="number"
                      value={newEvent.odometer || ""}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          odometer: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                      placeholder="ex: 25000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Litres</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newEvent.liters || ""}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          liters: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                      placeholder="ex: 39.5"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-gray-300 mb-2">Détails</label>
              <input
                type="text"
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                placeholder="Notes supplémentaires"
              />
            </div>

            <button
              onClick={handleAddEvent}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 rounded"
            >
              + Ajouter
            </button>
          </div>
        </div>

        {/* Attachment upload for last created event */}
        {lastCreatedEventId && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Ajouter des pièces jointes</h3>
            <AttachmentUpload
              eventId={lastCreatedEventId}
              onFileUploaded={() => {
                // Reset after upload completes
                setTimeout(() => setLastCreatedEventId(null), 1000);
              }}
            />
          </div>
        )}

            {/* Events list */}
            {events.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">Événements saisis</h3>
                <div className="space-y-3">
                  {events.map((event, idx) => (
                    <div key={idx} className="bg-gray-700 p-4 rounded text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-white">
                            {eventLabels[event.type]} - {event.date}
                          </p>
                          {event.description && (
                            <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                          )}
                        </div>
                        <p className="font-mono font-bold text-yellow-400">
                          {event.amount.toLocaleString("fr-FR")} XOF
                        </p>
                      </div>
                      {event.type === "fuel" && (
                        <p className="text-xs text-gray-400">
                          {event.odometer ? `${event.odometer} km` : ""} {event.liters ? `• ${event.liters}L` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAISIE FIN DE JOURNÉE */}
        {activeTab === "saisie-fin-journee" && (
          <div>
            {/* Summary for end of day */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Revenus actuels</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-1">
                    {todayEarnings.toLocaleString("fr-FR")} XOF
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Événements du jour</p>
                  <p className="text-2xl font-bold text-white mt-1">{events.length}</p>
                </div>
              </div>
            </div>

            {/* End of day declaration form */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-4">
                Déclaration de fin de journée
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Complétez les informations ci-dessous pour clôturer votre journée.
              </p>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={todayDate}
                  onChange={(e) => setTodayDate(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Montant net reçu (XOF)
                </label>
                <input
                  type="number"
                  value={todayEarnings}
                  onChange={(e) => setTodayEarnings(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-lg font-bold"
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Montant total reçu à la fin de votre journée
                </p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-white mb-3">
                  Résumé des événements du jour
                </h4>
                {events.length > 0 ? (
                  <div className="space-y-2 text-sm text-gray-300">
                    {events.map((event, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{eventLabels[event.type]}</span>
                        <span className="font-mono">
                          {event.amount.toLocaleString("fr-FR")} XOF
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-gray-600 pt-2 mt-2 font-semibold flex justify-between">
                      <span>Total</span>
                      <span className="text-yellow-400">
                        {events
                          .reduce((sum, e) => sum + e.amount, 0)
                          .toLocaleString("fr-FR")}{" "}
                        XOF
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">
                    Aucun événement saisi pour le moment
                  </p>
                )}
              </div>

              <button
                onClick={handleEndDay}
                disabled={todayEarnings === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 rounded text-lg transition"
              >
                🏁 Valider la fin de journée
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
