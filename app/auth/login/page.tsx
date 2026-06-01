"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getVirtualEmailForDriver } from "@/lib/auth/utils";

type UserRole = "admin" | "driver";

export default function LoginPage() {
  const [role, setRole] = useState<UserRole>("admin");
  const [email, setEmail] = useState("");
  const [driverId, setDriverId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let loginEmail = "";

      if (role === "admin") {
        if (!email) {
          setError("Veuillez entrer votre email");
          setLoading(false);
          return;
        }
        loginEmail = email;
      } else {
        if (!driverId) {
          setError("Veuillez entrer votre ID conducteur");
          setLoading(false);
          return;
        }
        loginEmail = getVirtualEmailForDriver(driverId);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        router.push(role === "admin" ? "/admin" : "/driver");
      }
    } catch (err) {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-black font-bold text-xl">
              Y
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-white mb-2">
            Yango Fleet
          </h1>
          <p className="text-center text-gray-400 text-sm mb-6">
            Connectez-vous à votre compte
          </p>

          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded px-4 py-3 mb-6 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Role selector */}
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition ${
                role === "admin"
                  ? "bg-yellow-500 text-black"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setRole("driver")}
              className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition ${
                role === "driver"
                  ? "bg-yellow-500 text-black"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Conducteur
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === "admin" ? (
              <div>
                <label className="text-xs uppercase font-semibold text-gray-400 block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition"
                  placeholder="admin@yango.sn"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="text-xs uppercase font-semibold text-gray-400 block mb-2">
                  ID Conducteur
                </label>
                <input
                  type="text"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value.toUpperCase())}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition"
                  placeholder="DRV001"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs uppercase font-semibold text-gray-400 block mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-semibold py-3 rounded transition mt-6"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            Pas encore de compte ?{" "}
            <Link href="/auth/register" className="text-yellow-500 hover:text-yellow-400">
              S'enregistrer
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-400">
              ← Retour à l'accueil
            </Link>
          </div>

          <div className="mt-8 p-4 bg-gray-700 bg-opacity-50 rounded text-sm text-gray-300">
            <p className="font-semibold mb-2">Identifiants de test :</p>
            <p>Admin email: <span className="font-mono">admin@yango.sn</span></p>
            <p>Driver ID: <span className="font-mono">DRV001</span></p>
            <p>Mot de passe: <span className="font-mono">password123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
