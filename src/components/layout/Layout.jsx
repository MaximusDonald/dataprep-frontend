import { Outlet, NavLink } from "react-router-dom"
import { Database, LayoutDashboard, Wand2, Download, Archive } from "lucide-react"
import { cn } from "../../lib/utils"

const navItems = [
  { to: "/datasets",       label: "Datasets",      icon: Archive },
  { to: "/eda",            label: "EDA",           icon: LayoutDashboard },
  { to: "/preprocessing",  label: "Preprocessing",  icon: Wand2 },
  { to: "/export",         label: "Export",         icon: Download },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center px-4 justify-between">
          <NavLink to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Database className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary tracking-tight">DataPrep AI Copilot</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto py-8 px-4">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-5 bg-white">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} DataPrep AI Copilot. Tous droits réservés.
        </div>
      </footer>
    </div>
  )
}
