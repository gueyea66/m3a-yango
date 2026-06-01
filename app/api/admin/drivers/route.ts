import { createClient } from "@supabase/supabase-js";
import { getVirtualEmailForDriver } from "@/lib/auth/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { action, driverId, fullName, password } = await request.json();

    if (action === "create") {
      if (!driverId || !fullName || !password) {
        return Response.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const virtualEmail = getVirtualEmailForDriver(driverId);

      // Create Supabase auth user
      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email: virtualEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: "driver",
          },
        });

      if (authError) {
        return Response.json(
          { error: `Failed to create auth user: ${authError.message}` },
          { status: 500 }
        );
      }

      if (!authUser.user) {
        return Response.json(
          { error: "Auth user creation returned no user data" },
          { status: 500 }
        );
      }

      // Insert profiles record
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authUser.user.id,
          email: virtualEmail,
          driver_id: driverId,
          full_name: fullName,
          role: "driver",
        })
        .select()
        .single();

      if (profileError) {
        // Try to delete the auth user we just created
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return Response.json(
          { error: `Failed to create profile: ${profileError.message}` },
          { status: 500 }
        );
      }

      return Response.json({ success: true, profile });
    }

    if (action === "delete") {
      if (!driverId) {
        return Response.json(
          { error: "Missing driver_id" },
          { status: 400 }
        );
      }

      // Get the driver's auth user ID
      const { data: profile, error: profileError } = await supabase
        .from("yango.profiles")
        .select("id")
        .eq("driver_id", driverId)
        .single();

      if (profileError || !profile) {
        return Response.json(
          { error: `Driver not found: ${driverId}` },
          { status: 404 }
        );
      }

      // Delete profiles record (cascades to daily_reports, expenses, etc.)
      const { error: deleteError } = await supabase
        .from("yango.profiles")
        .delete()
        .eq("id", profile.id);

      if (deleteError) {
        return Response.json(
          { error: `Failed to delete profile: ${deleteError.message}` },
          { status: 500 }
        );
      }

      // Delete auth user
      const { error: authDeleteError } =
        await supabase.auth.admin.deleteUser(profile.id);

      if (authDeleteError) {
        console.error(
          `Failed to delete auth user: ${authDeleteError.message}`
        );
        // Continue anyway as profile is already deleted
      }

      return Response.json({ success: true });
    }

    return Response.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
