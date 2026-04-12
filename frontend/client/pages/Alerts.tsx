import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import { AlertTriangle, AlertCircle, Bell, Clock, MapPin } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  location: string;
  time: string;
  aqiLevel: number;
  pollutants: string[];
  recommendation: string;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get("/api/alerts");
        // Maps backend alerts into frontend Alert[] format
        const mappedAlerts: Alert[] = res.data.map((a: any, index: number) => {
          let type: "critical" | "warning" | "info" = "info";
          let title = "Moderate Air Quality Update";
          let description = "Air quality is moderate. Most people can engage in outdoor activities.";
          let recommendation = "No specific precautions needed.";

          if (a.aqi > 200) {
            type = "critical";
            title = "Very Poor Air Quality Alert";
            description = "Air quality has reached critical levels in your area. Immediate action recommended.";
            recommendation = "Avoid outdoor activities. Stay indoors with air purifiers running.";
          } else if (a.aqi > 150) {
            type = "warning";
            title = "Poor Air Quality Warning";
            description = "Air quality is poor. Sensitive groups should reduce outdoor activities.";
            recommendation = "Vulnerable groups should limit outdoor exposure.";
          } else if (a.aqi > 100) {
             type = "warning";
             title = "Unhealthy for Sensitive Groups";
             description = "Air quality is unheathy for sensitive groups.";
             recommendation = "Consider using masks if you are sensitive in outdoor activities.";
          }

          return {
            id: a._id || `${a.nodeId}-${index}`,
            type,
            title,
            description,
            location: `Sensor: ${a.nodeId}`,
            time: new Date(a.timestamp).toLocaleString(),
            aqiLevel: a.aqi,
            pollutants: a.pm2_5 ? ["PM2.5"] : [],
            recommendation,
          };
        });

        setAlerts(mappedAlerts);
      } catch (err) {
        console.error("Alerts fetch error:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const getCardBorder = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "border-red-200 dark:border-red-800";
      case "warning":
        return "border-orange-200 dark:border-orange-800";
      case "info":
        return "border-blue-200 dark:border-blue-800";
      default:
        return "border-gray-200 dark:border-gray-800";
    }
  };

  const getIconColor = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-orange-600 dark:text-orange-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getAQIColor = (level: number) => {
    if (level <= 50) return "text-aqi-good bg-aqi-good/10";
    if (level <= 100) return "text-aqi-fair bg-aqi-fair/10";
    if (level <= 150) return "text-aqi-moderate bg-aqi-moderate/10";
    if (level <= 200) return "text-aqi-poor bg-aqi-poor/10";
    return "text-aqi-very-poor bg-aqi-very-poor/10";
  };

  const maxAQI = alerts.length > 0 ? Math.max(...alerts.map((a) => a.aqiLevel)) : 50;

  return (
    <Layout>
      <div className="relative min-h-[calc(100vh-80px-180px)] overflow-hidden">
        <AnimatedBackground aqi={maxAQI} temperature={15} humidity={40} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-4xl font-bold text-foreground">
                  Air Quality Alerts
                </h2>
                <p className="text-muted-foreground mt-1">
                  Real-time alerts for severe air quality cases
                </p>
              </div>
            </div>
          </div>

          {/* Alert Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Critical Alerts</p>
                  <p className="stat-value text-red-600 mt-2">
                    {alerts.filter((a) => a.type === "critical").length}
                  </p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-xl">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Warning Alerts</p>
                  <p className="stat-value text-orange-600 mt-2">
                    {alerts.filter((a) => a.type === "warning").length}
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Total Alerts</p>
                  <p className="stat-value text-primary mt-2">{alerts.length}</p>
                </div>
                <div className="bg-primary/10 p-4 rounded-xl">
                  <Bell className="w-8 h-8 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-6 mb-12">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                 No recent alerts found. Air quality is looking good!
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`metric-card bg-orange-50/50 dark:bg-slate-800/50 border-l-4 ${getCardBorder(alert.type)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`${getIconColor(alert.type)} mt-1`}>
                        {alert.type === "critical" && (
                          <AlertTriangle className="w-6 h-6" />
                        )}
                        {alert.type === "warning" && (
                          <AlertCircle className="w-6 h-6" />
                        )}
                        {alert.type === "info" && (
                          <Bell className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {alert.title}
                          </h3>
                          <span
                            className={`alert-badge ${alert.type === "critical" ? "critical" : alert.type === "warning" ? "warning" : "info"}`}
                          >
                            {alert.type === "critical"
                              ? "Critical"
                              : alert.type === "warning"
                                ? "Warning"
                                : "Info"}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-4">
                          {alert.description}
                        </p>

                        {/* Alert Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {/* Location and Time */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-foreground font-medium">
                                {alert.location}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {alert.time}
                              </span>
                            </div>
                          </div>

                          {/* AQI Level */}
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                                Current AQI
                              </p>
                              <p
                                className={`text-3xl font-bold ${getAQIColor(alert.aqiLevel).split(" ")[0]}`}
                              >
                                {alert.aqiLevel}
                              </p>
                            </div>
                            <div className={`p-4 rounded-lg ${getAQIColor(alert.aqiLevel)}`}>
                              <div className="w-12 h-12 flex items-center justify-center font-bold">
                                {alert.aqiLevel}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pollutants */}
                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                            Primary Pollutants
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {alert.pollutants.map((pollutant) => (
                              <span
                                key={pollutant}
                                className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                              >
                                {pollutant}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className="bg-muted/50 p-4 rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold">
                            Health Recommendation
                          </p>
                          <p className="text-foreground text-sm">
                            {alert.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Info Section */}
          <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              About Air Quality Alerts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground mb-2">
                  When do we send alerts?
                </p>
                <p className="text-foreground">
                  We notify you when AQI levels exceed moderate ranges or when
                  specific pollutants reach harmful levels.
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-2">
                  How often are they updated?
                </p>
                <p className="text-foreground">
                  Alerts are updated dynamically with the latest air quality
                  data to provide real-time information.
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-2">
                  What should I do?
                </p>
                <p className="text-foreground">
                  Check the health recommendations for each alert and adhere
                  to local safety guidelines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
