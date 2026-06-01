import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DashboardKPIs {
  // Today metrics
  todayRevenue: number;
  todayExpenses: number;
  todayNetMargin: number;
  activeDriversToday: number;

  // Week metrics
  weekRevenue: number;
  weekExpenses: number;
  weekNetMargin: number;
  weekAvgDailyRevenue: number;

  // Month metrics
  monthRevenue: number;
  monthExpenses: number;
  monthNetMargin: number;
  monthMarginPercent: number;

  // Vehicle metrics
  avgFuelConsumption: number; // L/100km
  totalFuelCost: number;

  // Driver metrics
  totalDrivers: number;
  avgRevenuePerDriver: number;

  // Charts data
  dailyTrendData: Array<{
    date: string;
    revenue: number;
    expenses: number;
    margin: number;
  }>;

  topDrivers: Array<{
    driver_id: string;
    earnings: number;
    expenses: number;
    margin: number;
  }>;

  expenseBreakdown: Array<{
    type: string;
    amount: number;
    percent: number;
  }>;

  loading: boolean;
  error: string | null;
}

export function useDashboardKPIs() {
  const [kpis, setKPIs] = useState<DashboardKPIs>({
    todayRevenue: 0,
    todayExpenses: 0,
    todayNetMargin: 0,
    activeDriversToday: 0,
    weekRevenue: 0,
    weekExpenses: 0,
    weekNetMargin: 0,
    weekAvgDailyRevenue: 0,
    monthRevenue: 0,
    monthExpenses: 0,
    monthNetMargin: 0,
    monthMarginPercent: 0,
    avgFuelConsumption: 0,
    totalFuelCost: 0,
    totalDrivers: 0,
    avgRevenuePerDriver: 0,
    dailyTrendData: [],
    topDrivers: [],
    expenseBreakdown: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Get daily reports
      const { data: allReports } = await supabase
        .from("daily_reports")
        .select("*");

      const { data: todayReports } = await (supabase
        .from("daily_reports") as any)
        .select("*")
        .eq("date", today);

      const { data: weekReports } = await (supabase
        .from("daily_reports") as any)
        .select("*")
        .gte("date", weekAgo)
        .lte("date", today);

      const { data: monthReports } = await (supabase
        .from("daily_reports") as any)
        .select("*")
        .gte("date", monthAgo)
        .lte("date", today);

      // Get expense entries for breakdown
      const { data: eventEntries } = await (supabase
        .from("expenses") as any)
        .select("*");

      const reports_list = allReports || [];
      const today_reports = todayReports || [];
      const week_reports = weekReports || [];
      const month_reports = monthReports || [];
      const events_list = eventEntries || [];

      // Calculate Today KPIs
      const todayRevenue = today_reports.reduce(
        (sum, r) => sum + (r.net_after_expenses || 0),
        0
      );
      const todayExpenses = today_reports.reduce(
        (sum, r) => sum + ((r.fuel_cost || 0) + (r.toll_cost || 0)),
        0
      );
      const todayNetMargin = todayRevenue - todayExpenses;
      const activeDriversToday = new Set(
        today_reports.map((r) => r.driver_id)
      ).size;

      // Calculate Week KPIs
      const weekRevenue = week_reports.reduce(
        (sum, r) => sum + (r.net_after_expenses || 0),
        0
      );
      const weekExpenses = week_reports.reduce(
        (sum, r) => sum + ((r.fuel_cost || 0) + (r.toll_cost || 0)),
        0
      );
      const weekNetMargin = weekRevenue - weekExpenses;
      const weekAvgDailyRevenue = week_reports.length > 0
        ? weekRevenue / week_reports.length
        : 0;

      // Calculate Month KPIs
      const monthRevenue = month_reports.reduce(
        (sum, r) => sum + (r.net_after_expenses || 0),
        0
      );
      const monthExpenses = month_reports.reduce(
        (sum, r) => sum + ((r.fuel_cost || 0) + (r.toll_cost || 0)),
        0
      );
      const monthNetMargin = monthRevenue - monthExpenses;
      const monthMarginPercent = monthRevenue > 0
        ? (monthNetMargin / monthRevenue) * 100
        : 0;

      // Calculate vehicle metrics
      const totalFuelCost = month_reports.reduce(
        (sum, r) => sum + (r.fuel_cost || 0),
        0
      );
      const totalFuelLiters = month_reports.reduce(
        (sum, r) => sum + (r.fuel_liters_total || 0),
        0
      );
      const totalDistance = month_reports
        .filter((r) => r.odometer_end && r.odometer_start)
        .reduce((sum, r) => sum + ((r.odometer_end || 0) - (r.odometer_start || 0)), 0);
      const avgFuelConsumption = totalDistance > 0
        ? (totalFuelLiters / totalDistance) * 100
        : 0;

      // Get driver count
      const { data: drivers } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "driver");
      const totalDrivers = drivers?.length || 0;
      const avgRevenuePerDriver = totalDrivers > 0
        ? monthRevenue / totalDrivers
        : 0;

      // Daily trend for last 30 days
      const dailyTrendData: typeof kpis.dailyTrendData = [];
      const dates = new Set<string>();
      month_reports.forEach((r) => dates.add(r.date));
      Array.from(dates)
        .sort()
        .forEach((date) => {
          const dayReports = month_reports.filter((r) => r.date === date);
          const dayRevenue = dayReports.reduce(
            (sum, r) => sum + (r.net_after_expenses || 0),
            0
          );
          const dayExpenses = dayReports.reduce(
            (sum, r) => sum + ((r.fuel_cost || 0) + (r.toll_cost || 0)),
            0
          );
          dailyTrendData.push({
            date,
            revenue: dayRevenue,
            expenses: dayExpenses,
            margin: dayRevenue - dayExpenses,
          });
        });

      // Top drivers (month)
      const driverMap = new Map<
        string,
        { earnings: number; expenses: number }
      >();
      month_reports.forEach((r) => {
        if (!driverMap.has(r.driver_id)) {
          driverMap.set(r.driver_id, { earnings: 0, expenses: 0 });
        }
        const current = driverMap.get(r.driver_id)!;
        current.earnings += r.net_after_expenses || 0;
        current.expenses += (r.fuel_cost || 0) + (r.toll_cost || 0);
      });

      const topDrivers = Array.from(driverMap.entries())
        .map(([driver_id, data]) => ({
          driver_id,
          earnings: data.earnings,
          expenses: data.expenses,
          margin: data.earnings - data.expenses,
        }))
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5);

      // Expense breakdown
      const fuelEvents = events_list.filter((e) => e.category === "fuel" &&
        new Date(e.date) >= new Date(monthAgo) &&
        new Date(e.date) <= new Date(today)
      );
      const tollEvents = events_list.filter((e) => e.type === "toll" &&
        new Date(e.date) >= new Date(monthAgo) &&
        new Date(e.date) <= new Date(today)
      );
      const controlEvents = events_list.filter((e) => e.type === "control" &&
        new Date(e.date) >= new Date(monthAgo) &&
        new Date(e.date) <= new Date(today)
      );

      const fuelAmount = fuelEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
      const tollAmount = tollEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
      const controlAmount = controlEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalExpensesBreakdown = fuelAmount + tollAmount + controlAmount;

      const expenseBreakdown = [
        {
          type: "Carburant",
          amount: fuelAmount,
          percent: totalExpensesBreakdown > 0 ? (fuelAmount / totalExpensesBreakdown) * 100 : 0,
        },
        {
          type: "Péages",
          amount: tollAmount,
          percent: totalExpensesBreakdown > 0 ? (tollAmount / totalExpensesBreakdown) * 100 : 0,
        },
        {
          type: "Contrôles",
          amount: controlAmount,
          percent: totalExpensesBreakdown > 0 ? (controlAmount / totalExpensesBreakdown) * 100 : 0,
        },
      ].filter((x) => x.amount > 0);

      setKPIs({
        todayRevenue,
        todayExpenses,
        todayNetMargin,
        activeDriversToday,
        weekRevenue,
        weekExpenses,
        weekNetMargin,
        weekAvgDailyRevenue,
        monthRevenue,
        monthExpenses,
        monthNetMargin,
        monthMarginPercent,
        avgFuelConsumption: Math.round(avgFuelConsumption * 100) / 100,
        totalFuelCost,
        totalDrivers,
        avgRevenuePerDriver: Math.round(avgRevenuePerDriver),
        dailyTrendData,
        topDrivers,
        expenseBreakdown,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error loading KPIs:", err);
      setKPIs((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Erreur de chargement",
      }));
    }
  };

  return kpis;
}
