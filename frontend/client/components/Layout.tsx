import { Link, useLocation } from "react-router-dom";
import { Wind, AlertTriangle, Heart, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-orange-50/80 dark:bg-slate-800/80 backdrop-blur-md border-b-2 border-orange-100 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-primary rounded-xl p-2.5 shadow-md">
                <Wind className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground leading-tight">
                  AQI Monitor
                </h1>
                <p className="text-xs text-muted-foreground">
                  Real-time Air Quality
                </p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex gap-2 items-center">
              <Link
                to="/"
                className={`nav-link ${
                  isActive("/") ? "active" : ""
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/alerts"
                className={`nav-link ${
                  isActive("/alerts") ? "active" : ""
                }`}
              >
                <AlertTriangle className="w-4 h-4 mr-1 inline" />
                Alerts
              </Link>
              <Link
                to="/health-advisory"
                className={`nav-link ${
                  isActive("/health-advisory") ? "active" : ""
                }`}
              >
                <Heart className="w-4 h-4 mr-1 inline" />
                Health Advisory
              </Link>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="ml-2 p-2 rounded-lg hover:bg-muted transition-colors duration-200 text-foreground"
                aria-label="Toggle theme"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
            </nav>

            {/* Mobile Theme Toggle and Menu Button */}
            <div className="md:hidden flex gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-muted transition-colors duration-200 text-foreground"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
              <button className="p-2 hover:bg-muted rounded-lg">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-orange-50/80 dark:bg-slate-800/80 backdrop-blur-md border-t-2 border-orange-100 dark:border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-foreground mb-4">
                About AQI Monitor
              </h3>
              <p className="text-sm text-muted-foreground">
                Real-time air quality monitoring system providing accurate AQI
                readings and health recommendations.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Features</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Real-time AQI monitoring</li>
                <li>Temperature & Humidity tracking</li>
                <li>Severe weather alerts</li>
                <li>Health recommendations</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>AQI Scale Information</li>
                <li>Health Guidelines</li>
                <li>Data Sources</li>
                <li>Support</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground">
              © 2024 AQI Monitoring System. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground mt-4 md:mt-0">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
