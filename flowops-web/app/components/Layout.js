export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 p-6 border-r border-slate-800">
        <h1 className="text-2xl font-bold text-cyan-400">FlowOps</h1>

        <nav className="mt-10 space-y-4 text-slate-400">
          <p className="text-white">📊 Dashboard</p>
          <p>📁 Repositories</p>
          <p>👥 Team</p>
          <p>⚙️ Settings</p>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-10">{children}</main>
    </div>
  );
}
