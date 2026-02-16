"use client";
export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = "http://localhost:4000/auth/github";
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="bg-slate-950 border border-slate-800 p-10 rounded-2xl text-center">
        <h1 className="text-3xl font-bold text-cyan-400">FlowOps</h1>
        <p className="text-slate-400 mt-2">Engineering Intelligence Platform</p>

        <button
          onClick={handleLogin}
          className="mt-8 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-3 rounded-xl"
        >
          Login with GitHub
        </button>
      </div>
    </main>
  );
}
