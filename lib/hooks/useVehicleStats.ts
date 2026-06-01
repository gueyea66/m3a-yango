import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface VehicleStats {
  vehicle_id: string;
  vehicle_name: string;
  total_reports: number;
  total_earnings: number;
  total_fuel_cost: number;
  total_toll_cost: number;
  total_expenses: number;
  total_fuel_liters: number;
  avg_fuel_consumption: number; // L/100km
  distance_km: number;
  net_margin: number; // earnings - expenses
  margin_percent: number;
  last_report_date: string;
}

export function useVehicleStats() {
  const [stats, setStats] = useState<VehicleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVehicleStats();
  }, []);

  const loadVehicleStats = async () => {
    try {
      const supabase = createClient();

      // Get all vehicles with their related data
      const { data: vehicles, error: vehiclesError } = await ((supabase
        .from("vehicles") as any)
        .select("*") as any);

      if (vehiclesError) throw vehiclesError;

      if (!vehicles || vehicles.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      // For each vehicle, get stats from daily_reports
      const statsPromises = vehicles.map(async (vehicle) => {
        const { data: reports } = await ((supabase
          .from("daily_reports") as any)
          .select("*") as any)
          .eq("vehicle_id", vehicle.id);

        // Note: expenses table uses driver_id/report_id, not vehicle_id
        const { data: events } = await ((supabase
          .from("expenses") as any)
          .select("*") as any);

        const reports_list = reports || [];
        const events_list = events || [];

        const totalEarnings = reports_list.reduce(
          (sum, r) => sum + (r.net_after_expenses || 0),
          0
        );
        const totalFuelCost = reports_list.reduce(
          (sum, r) => sum + (r.fuel_cost || 0),
          0
        );
        const totalTollCost = reports_list.reduce(
          (sum, r) => sum + (r.toll_cost || 0),
          0
        );
        const totalExpenses = totalFuelCost + totalTollCost;
        const totalFuelLiters = reports_list.reduce(
          (sum, r) => sum + (r.fuel_liters_total || 0),
          0
        );

        // Calculate distance from odometer readings
        const odometerReadings = reports_list
          .filter((r) => r.odometer_end)
          .map((r) => r.odometer_end || 0)
          .sort((a, b) => a - b);

        const distanceKm =
          odometerReadings.length > 1
            ? odometerReadings[odometerReadings.length - 1] -
              odometerReadings[0]
            : 0;

        // Calculate fuel consumption L/100km
        const avgFuelConsumption =
          distanceKm > 0 ? (totalFuelLiters / distanceKm) * 100 : 0;

        const netMargin = totalEarnings - totalExpenses;
        const marginPercent =
          totalEarnings > 0 ? (netMargin / totalEarnings) * 100 : 0;

        const lastReportDate =
          reports_list.length > 0
            ? reports_list.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
              )[0].date
            : "N/A";

        return {
          vehicle_id: vehicle.id,
          vehicle_name: vehicle.name || `${vehicle.make} ${vehicle.model}`,
          total_reports: reports_list.length,
          total_earnings: totalEarnings,
          total_fuel_cost: totalFuelCost,
          total_toll_cost: totalTollCost,
          total_expenses: totalExpenses,
          total_fuel_liters: totalFuelLiters,
          avg_fuel_consumption: Math.round(avgFuelConsumption * 100) / 100,
          distance_km: distanceKm,
          net_margin: netMargin,
          margin_percent: Math.round(marginPercent * 100) / 100,
          last_report_date: lastReportDate,
        };
      });

      const allStats = await Promise.all(statsPromises);
      setStats(allStats.sort((a, b) => b.total_earnings - a.total_earnings));
      setError(null);
    } catch (err) {
      console.error("Error loading vehicle stats:", err);
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch: loadVehicleStats };
}
