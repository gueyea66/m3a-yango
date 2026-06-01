import { useCallback } from "react";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";

export const useUser = () => {
  const { user, loading } = useAuth();

  const getUserRole = useCallback(async () => {
    if (!user) return null;

    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<{ role: "admin" | "driver" }>();

    return data?.role || null;
  }, [user]);

  return {
    user,
    loading,
    getUserRole,
    isAuthenticated: !!user,
  };
};
