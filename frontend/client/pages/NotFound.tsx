import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import { AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-80px-180px)] bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="mb-8 inline-block">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-6 rounded-2xl">
              <AlertCircle className="w-16 h-16 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <h1 className="text-7xl font-bold text-foreground mb-4">404</h1>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            The page you're looking for doesn't exist. It might have been moved or removed.
          </p>
          <Link
            to="/"
            className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
