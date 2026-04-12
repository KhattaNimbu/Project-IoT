import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AlertCircle, TrendingUp, Droplets, Thermometer, MapPin, ArrowUpRight, ArrowDownRight, Minus, GitCompareArrows } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/use-theme";

// ── Types ─────────────────────────────────────────────────────────────────────
type TimeRange = "1h" | "24h" | "7d" | "30d";

interface DailyMinMaxAvg {
  min: number;
  max: number;
  avg: number;
}

interface DailyStats {
  aqi: DailyMinMaxAvg;
  temp: DailyMinMaxAvg;
  humidity: DailyMinMaxAvg;
  count: number;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAQIColor(value: number) {
  if (value <= 50) return "text-aqi-good";
  if (value <= 100) return "text-aqi-fair";
  if (value <= 150) return "text-aqi-moderate";
  if (value <= 200) return "text-aqi-poor";
  return "text-aqi-very-poor";
}

function getAQILabel(value: number) {
  if (value <= 50) return "Good";
  if (value <= 100) return "Fair";
  if (value <= 150) return "Moderate";
  if (value <= 200) return "Poor";
  return "Very Poor";
}

function getAQIBgColor(value: number) {
  if (value <= 50) return "bg-aqi-good/10";
  if (value <= 100) return "bg-aqi-fair/10";
  if (value <= 150) return "bg-aqi-moderate/10";
  if (value <= 200) return "bg-aqi-poor/10";
  return "bg-aqi-very-poor/10";
}

function formatAxisTick(val: number, range: TimeRange) {
  const d = new Date(val);
  if (range === "1h" || range === "24h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function computeMinMaxAvg(data: { value: number }[]): DailyMinMaxAvg {
  if (data.length === 0) return { min: 0, max: 0, avg: 0 };
  const values = data.map((d) => d.value);
  return {
    min: Math.round(Math.min(...values) * 10) / 10,
    max: Math.round(Math.max(...values) * 10) / 10,
    avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Index() {
  const { theme } = useTheme();
  const axisColor = theme === "dark" ? "#ffffff" : "#0f172a";

  // ── Core State ────────────────────────────────────────────
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const [currentAQI, setCurrentAQI] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(0);
  const [currentHumidity, setCurrentHumidity] = useState(0);

  const [aqiTrendData, setAqiTrendData] = useState<any[]>([]);
  const [tempTrendData, setTempTrendData] = useState<any[]>([]);
  const [humidityTrendData, setHumidityTrendData] = useState<any[]>([]);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ── Feature 1: Time Range ────────────────────────────────
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  // ── Feature 2: Comparison Mode ───────────────────────────
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareNode, setCompareNode] = useState<string | null>(null);
  const [compareAqiData, setCompareAqiData] = useState<any[]>([]);
  const [compareTempData, setCompareTempData] = useState<any[]>([]);
  const [compareHumidityData, setCompareHumidityData] = useState<any[]>([]);

  // ── Feature 3: Daily Stats ───────────────────────────────
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    aqi: { min: 0, max: 0, avg: 0 },
    temp: { min: 0, max: 0, avg: 0 },
    humidity: { min: 0, max: 0, avg: 0 },
    count: 0,
  });

  // ── Data Fetching ─────────────────────────────────────────
  const fetchSummary = async () => {
    try {
      const res = await axios.get("/api/summary");
      setNodes(res.data);
      if (res.data.length > 0 && !selectedNode) {
        setSelectedNode(res.data[0].nodeId);
      }
    } catch (err) {
      console.error("Summary fetch error:", err);
    }
  };

  const generateRandomTrend = (min: number, max: number) => {
    const now = Date.now();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      data.push({
        time: now - i * 3600 * 1000,
        value: Math.floor(Math.random() * (max - min + 1)) + min,
      });
    }
    return data;
  };

  const fetchHistory = async () => {
    try {
      if (!selectedNode) {
        throw new Error("No node selected");
      }
      const res = await axios.get(
        `/api/nodes/${selectedNode}/data?range=${timeRange}`
      );
      let history = res.data;

      if (history.length === 0) throw new Error("No data");

      setIsOffline(false);
      history = history.sort(
        (a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const aqiData = history.map((r: any) => ({
        time: new Date(r.timestamp).getTime(),
        value: r.aqi,
      }));
      const tempData = history.map((r: any) => ({
        time: new Date(r.timestamp).getTime(),
        value: r.temperature,
      }));
      const humData = history.map((r: any) => ({
        time: new Date(r.timestamp).getTime(),
        value: r.humidity,
      }));

      setAqiTrendData(aqiData);
      setTempTrendData(tempData);
      setHumidityTrendData(humData);

      if (history.length > 0) {
        const latest = history[history.length - 1];
        setCurrentAQI(latest.aqi);
        setCurrentTemp(latest.temperature);
        setCurrentHumidity(latest.humidity);
        setLastUpdated(new Date(latest.timestamp));
      }
    } catch (err) {
      console.error("History fetch error:", err);
      setIsOffline(true);
      setAqiTrendData((prev) =>
        prev.length > 0 ? prev : generateRandomTrend(50, 150)
      );
      setTempTrendData((prev) =>
        prev.length > 0 ? prev : generateRandomTrend(20, 35)
      );
      setHumidityTrendData((prev) =>
        prev.length > 0 ? prev : generateRandomTrend(40, 70)
      );
    }
  };

  const fetchComparisonData = async () => {
    if (!compareEnabled || !compareNode) {
      setCompareAqiData([]);
      setCompareTempData([]);
      setCompareHumidityData([]);
      return;
    }
    try {
      const res = await axios.get(
        `/api/nodes/${compareNode}/data?range=${timeRange}`
      );
      let history = res.data;
      if (history.length === 0) throw new Error("No compare data");

      history = history.sort(
        (a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setCompareAqiData(
        history.map((r: any) => ({
          time: new Date(r.timestamp).getTime(),
          value: r.aqi,
        }))
      );
      setCompareTempData(
        history.map((r: any) => ({
          time: new Date(r.timestamp).getTime(),
          value: r.temperature,
        }))
      );
      setCompareHumidityData(
        history.map((r: any) => ({
          time: new Date(r.timestamp).getTime(),
          value: r.humidity,
        }))
      );
    } catch (err) {
      console.error("Compare fetch error:", err);
      if (isOffline) {
        setCompareAqiData(generateRandomTrend(40, 130));
        setCompareTempData(generateRandomTrend(18, 32));
        setCompareHumidityData(generateRandomTrend(35, 65));
      }
    }
  };

  const fetchDailyStats = async () => {
    if (!selectedNode) return;
    try {
      const res = await axios.get(
        `/api/nodes/${selectedNode}/daily-stats`
      );
      setDailyStats(res.data);
    } catch (err) {
      console.error("Daily stats fetch error:", err);
      // fallback: compute from trend data
      setDailyStats({
        aqi: computeMinMaxAvg(aqiTrendData),
        temp: computeMinMaxAvg(tempTrendData),
        humidity: computeMinMaxAvg(humidityTrendData),
        count: aqiTrendData.length,
      });
    }
  };

  // ── Effects ───────────────────────────────────────────────
  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, [selectedNode, timeRange]);

  useEffect(() => {
    fetchComparisonData();
    const interval = setInterval(fetchComparisonData, 10000);
    return () => clearInterval(interval);
  }, [compareEnabled, compareNode, timeRange]);

  useEffect(() => {
    fetchDailyStats();
    const interval = setInterval(fetchDailyStats, 30000);
    return () => clearInterval(interval);
  }, [selectedNode]);

  // Compute fallback daily stats from trend data in offline mode
  useEffect(() => {
    if (isOffline && aqiTrendData.length > 0) {
      setDailyStats({
        aqi: computeMinMaxAvg(aqiTrendData),
        temp: computeMinMaxAvg(tempTrendData),
        humidity: computeMinMaxAvg(humidityTrendData),
        count: aqiTrendData.length,
      });
    }
  }, [isOffline, aqiTrendData, tempTrendData, humidityTrendData]);

  // ── Merged chart data for comparison ──────────────────────
  const mergedAqi = useMemo(() => {
    if (!compareEnabled || compareAqiData.length === 0) return null;
    const allTimes = new Set([
      ...aqiTrendData.map((d: any) => d.time),
      ...compareAqiData.map((d: any) => d.time),
    ]);
    const primaryMap = new Map(aqiTrendData.map((d: any) => [d.time, d.value]));
    const compareMap = new Map(compareAqiData.map((d: any) => [d.time, d.value]));
    return Array.from(allTimes)
      .sort((a, b) => a - b)
      .map((t) => ({
        time: t,
        primary: primaryMap.get(t) ?? null,
        compare: compareMap.get(t) ?? null,
      }));
  }, [aqiTrendData, compareAqiData, compareEnabled]);

  const mergedTemp = useMemo(() => {
    if (!compareEnabled || compareTempData.length === 0) return null;
    const allTimes = new Set([
      ...tempTrendData.map((d: any) => d.time),
      ...compareTempData.map((d: any) => d.time),
    ]);
    const primaryMap = new Map(tempTrendData.map((d: any) => [d.time, d.value]));
    const compareMap = new Map(compareTempData.map((d: any) => [d.time, d.value]));
    return Array.from(allTimes)
      .sort((a, b) => a - b)
      .map((t) => ({
        time: t,
        primary: primaryMap.get(t) ?? null,
        compare: compareMap.get(t) ?? null,
      }));
  }, [tempTrendData, compareTempData, compareEnabled]);

  const mergedHumidity = useMemo(() => {
    if (!compareEnabled || compareHumidityData.length === 0) return null;
    const allTimes = new Set([
      ...humidityTrendData.map((d: any) => d.time),
      ...compareHumidityData.map((d: any) => d.time),
    ]);
    const primaryMap = new Map(humidityTrendData.map((d: any) => [d.time, d.value]));
    const compareMap = new Map(compareHumidityData.map((d: any) => [d.time, d.value]));
    return Array.from(allTimes)
      .sort((a, b) => a - b)
      .map((t) => ({
        time: t,
        primary: primaryMap.get(t) ?? null,
        compare: compareMap.get(t) ?? null,
      }));
  }, [humidityTrendData, compareHumidityData, compareEnabled]);

  const primaryNodeName = nodes.find((n) => n.nodeId === selectedNode)?.name || selectedNode || "Primary";
  const compareNodeName = nodes.find((n) => n.nodeId === compareNode)?.name || compareNode || "Compare";

  const aqiLabel = getAQILabel(currentAQI);

  // ── Stat Pill Component ───────────────────────────────────
  const StatPills = ({ stats }: { stats: DailyMinMaxAvg }) => (
    <div className="daily-stats-row">
      <span className="stat-pill stat-pill-high">
        <ArrowUpRight className="w-3 h-3" />
        High: {stats.max}
      </span>
      <span className="stat-pill stat-pill-low">
        <ArrowDownRight className="w-3 h-3" />
        Low: {stats.min}
      </span>
      <span className="stat-pill stat-pill-avg">
        <Minus className="w-3 h-3" />
        Avg: {stats.avg}
      </span>
    </div>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <Layout>
      <div className="relative min-h-[calc(100vh-80px-180px)] overflow-hidden">
        <AnimatedBackground
          aqi={currentAQI}
          temperature={currentTemp}
          humidity={currentHumidity}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-2">
                AQI Monitoring System
              </h2>
              <p className="text-muted-foreground text-lg">
                Real-time air quality index, temperature, and humidity monitoring
              </p>
            </div>

            {nodes.length > 0 && (
              <div className="mt-4 sm:mt-0 flex items-center gap-3 flex-wrap">
                {/* Primary Node Selector */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <MapPin className="w-5 h-5 text-slate-500" />
                  <select
                    className="bg-transparent border-none text-foreground outline-none font-medium p-1 cursor-pointer"
                    value={selectedNode || ""}
                    onChange={(e) => setSelectedNode(e.target.value)}
                  >
                    {nodes.map((n) => (
                      <option key={n.nodeId} value={n.nodeId}>
                        {n.nodeId} - {n.name || "Sensor"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compare Toggle */}
                {nodes.length > 1 && (
                  <button
                    className={`compare-toggle-btn ${compareEnabled ? "active" : "inactive"}`}
                    onClick={() => {
                      setCompareEnabled(!compareEnabled);
                      if (!compareEnabled && nodes.length > 1) {
                        const other = nodes.find((n) => n.nodeId !== selectedNode);
                        if (other) setCompareNode(other.nodeId);
                      }
                    }}
                  >
                    <GitCompareArrows className="w-4 h-4" />
                    Compare
                  </button>
                )}

                {/* Compare Node Selector */}
                {compareEnabled && nodes.length > 1 && (
                  <select
                    className="compare-select"
                    value={compareNode || ""}
                    onChange={(e) => setCompareNode(e.target.value)}
                  >
                    {nodes
                      .filter((n) => n.nodeId !== selectedNode)
                      .map((n) => (
                        <option key={n.nodeId} value={n.nodeId}>
                          {n.nodeId} - {n.name || "Sensor"}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Alert Banner */}
          {currentAQI > 150 && (
            <div className="mb-8 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-300">
                  Air Quality Alert
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-400 mt-1">
                  Air quality is currently in the {aqiLabel} range. Please take
                  necessary precautions.
                </p>
              </div>
            </div>
          )}

          {/* Main Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* AQI Card */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="stat-label">Air Quality Index</h3>
                  <p className="stat-value mt-2">{currentAQI}</p>
                </div>
                <div className="text-3xl">🌍</div>
              </div>
              <div className="inline-block">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    currentAQI <= 50
                      ? "bg-aqi-good/20 text-aqi-good"
                      : currentAQI <= 100
                        ? "bg-aqi-fair/20 text-aqi-fair"
                        : currentAQI <= 150
                          ? "bg-aqi-moderate/20 text-aqi-moderate"
                          : currentAQI <= 200
                            ? "bg-aqi-poor/20 text-aqi-poor"
                            : "bg-aqi-very-poor/20 text-aqi-very-poor"
                  }`}
                >
                  {aqiLabel}
                </span>
              </div>
              <StatPills stats={dailyStats.aqi} />
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>

            {/* Temperature Card */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="stat-label">Temperature</h3>
                  <p className="stat-value mt-2 text-orange-600">
                    {currentTemp}°C
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
                  <Thermometer className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Feels like</span>
                  <span className="font-semibold text-foreground">
                    {(currentTemp - 2).toFixed(1)}°C
                  </span>
                </div>
              </div>
              <StatPills stats={dailyStats.temp} />
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>

            {/* Humidity Card */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="stat-label">Humidity</h3>
                  <p className="stat-value mt-2 text-blue-600">
                    {currentHumidity}%
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                  <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dew point</span>
                  <span className="font-semibold text-foreground">
                    {Math.round(currentTemp * 0.8)}°C
                  </span>
                </div>
              </div>
              <StatPills stats={dailyStats.humidity} />
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* ── Time Range Selector ─────────────────────────── */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h3 className="text-xl font-bold text-foreground">Trend Charts</h3>
            <div className="time-range-selector">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`time-range-btn ${timeRange === opt.value ? "active" : ""}`}
                  onClick={() => setTimeRange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* AQI Chart */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  AQI Trend
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  key={theme}
                  data={mergedAqi || aqiTrendData}
                >
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeWidth={1.5}
                    horizontal={true}
                    vertical={true}
                  />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(val) => formatAxisTick(val, timeRange)}
                    stroke={axisColor}
                    style={{ fontSize: "12px" }}
                    minTickGap={60}
                  />
                  <YAxis
                    domain={["dataMin - 10", "dataMax + 10"]}
                    allowDecimals={false}
                    stroke={axisColor}
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    labelFormatter={(val) => new Date(val).toLocaleString()}
                    formatter={(value: any, name: string) => {
                      const label =
                        name === "compare"
                          ? compareNodeName
                          : name === "primary"
                            ? primaryNodeName
                            : "AQI";
                      return [`${value} AQI`, label];
                    }}
                  />
                  {mergedAqi ? (
                    <>
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="primary"
                        name={primaryNodeName}
                        stroke="#dc2626"
                        dot={false}
                        activeDot={{ r: 5, stroke: "none", fill: "#dc2626" }}
                        strokeWidth={3}
                        isAnimationActive={true}
                        connectNulls={true}
                      />
                      <Line
                        type="monotone"
                        dataKey="compare"
                        name={compareNodeName}
                        stroke="#8b5cf6"
                        strokeDasharray="6 3"
                        dot={false}
                        activeDot={{ r: 5, stroke: "none", fill: "#8b5cf6" }}
                        strokeWidth={2.5}
                        isAnimationActive={true}
                        connectNulls={true}
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#dc2626"
                      dot={false}
                      activeDot={{ r: 6, stroke: "none", fill: "#dc2626" }}
                      label={
                        isOffline || aqiTrendData.length <= 20
                          ? { position: "top", fill: axisColor, fontSize: 11, fontWeight: 500, dy: -5 }
                          : false
                      }
                      strokeWidth={3}
                      isAnimationActive={true}
                      connectNulls={true}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              {isOffline && (
                <p className="text-center text-sm text-red-500 mt-4 opacity-80 italic">
                  The live server is not detected yet, this is a random data only.
                </p>
              )}
            </div>

            {/* Temperature Chart */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-6">
                <Thermometer className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-foreground">
                  Temperature Trend
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  key={theme}
                  data={mergedTemp || tempTrendData}
                >
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeWidth={1.5}
                    horizontal={true}
                    vertical={true}
                  />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(val) => formatAxisTick(val, timeRange)}
                    stroke={axisColor}
                    style={{ fontSize: "12px" }}
                    minTickGap={60}
                  />
                  <YAxis
                    domain={["dataMin - 4", "dataMax + 4"]}
                    tickCount={5}
                    allowDecimals={false}
                    stroke={axisColor}
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    labelFormatter={(val) => new Date(val).toLocaleString()}
                    formatter={(value: any, name: string) => {
                      const label =
                        name === "compare"
                          ? compareNodeName
                          : name === "primary"
                            ? primaryNodeName
                            : "Temperature";
                      return [`${value}°C`, label];
                    }}
                  />
                  {mergedTemp ? (
                    <>
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="primary"
                        name={primaryNodeName}
                        stroke="#ea580c"
                        dot={false}
                        activeDot={{ r: 5, stroke: "none", fill: "#ea580c" }}
                        strokeWidth={3}
                        isAnimationActive={true}
                      />
                      <Line
                        type="monotone"
                        dataKey="compare"
                        name={compareNodeName}
                        stroke="#06b6d4"
                        strokeDasharray="6 3"
                        dot={false}
                        activeDot={{ r: 5, stroke: "none", fill: "#06b6d4" }}
                        strokeWidth={2.5}
                        isAnimationActive={true}
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#ea580c"
                      dot={false}
                      activeDot={{ r: 6, stroke: "none", fill: "#ea580c" }}
                      label={
                        isOffline || tempTrendData.length <= 20
                          ? { position: "top", fill: axisColor, fontSize: 11, fontWeight: 500, dy: -5 }
                          : false
                      }
                      strokeWidth={3}
                      isAnimationActive={true}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              {isOffline && (
                <p className="text-center text-sm text-red-500 mt-4 opacity-80 italic">
                  The live server is not detected yet, this is a random data only.
                </p>
              )}
            </div>
          </div>

          {/* Humidity Chart */}
          <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700 mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Droplets className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-foreground">
                Humidity Trend
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                key={theme}
                data={mergedHumidity || humidityTrendData}
              >
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeWidth={1.5}
                  horizontal={true}
                  vertical={true}
                />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(val) => formatAxisTick(val, timeRange)}
                  stroke={axisColor}
                  style={{ fontSize: "12px" }}
                  minTickGap={60}
                />
                <YAxis
                  domain={["dataMin - 8", "dataMax + 8"]}
                  tickCount={5}
                  allowDecimals={false}
                  stroke={axisColor}
                  style={{ fontSize: "12px" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(val) => new Date(val).toLocaleString()}
                  formatter={(value: any, name: string) => {
                    const label =
                      name === "compare"
                        ? compareNodeName
                        : name === "primary"
                          ? primaryNodeName
                          : "Humidity";
                    return [`${value}%`, label];
                  }}
                />
                {mergedHumidity ? (
                  <>
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="primary"
                      name={primaryNodeName}
                      stroke="#3b82f6"
                      dot={false}
                      activeDot={{ r: 5, stroke: "none", fill: "#3b82f6" }}
                      strokeWidth={3}
                      isAnimationActive={true}
                    />
                    <Line
                      type="monotone"
                      dataKey="compare"
                      name={compareNodeName}
                      stroke="#14b8a6"
                      strokeDasharray="6 3"
                      dot={false}
                      activeDot={{ r: 5, stroke: "none", fill: "#14b8a6" }}
                      strokeWidth={2.5}
                      isAnimationActive={true}
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    dot={false}
                    activeDot={{ r: 6, stroke: "none", fill: "#3b82f6" }}
                    label={
                      isOffline || humidityTrendData.length <= 20
                        ? { position: "top", fill: axisColor, fontSize: 11, fontWeight: 500, dy: -5 }
                        : false
                    }
                    strokeWidth={3}
                    isAnimationActive={true}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            {isOffline && (
              <p className="text-center text-sm text-red-500 mt-4 opacity-80 italic">
                The live server is not detected yet, this is a random data only.
              </p>
            )}
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                AQI Scale
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-aqi-good/10 rounded-lg border border-aqi-good/20">
                  <span className="text-sm font-medium">Good</span>
                  <span className="text-xs text-muted-foreground">0 - 50</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-aqi-fair/10 rounded-lg border border-aqi-fair/20">
                  <span className="text-sm font-medium">Fair</span>
                  <span className="text-xs text-muted-foreground">
                    51 - 100
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-aqi-moderate/10 rounded-lg border border-aqi-moderate/20">
                  <span className="text-sm font-medium">Moderate</span>
                  <span className="text-xs text-muted-foreground">
                    101 - 150
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-aqi-poor/10 rounded-lg border border-aqi-poor/20">
                  <span className="text-sm font-medium">Poor</span>
                  <span className="text-xs text-muted-foreground">
                    151 - 200
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-aqi-very-poor/10 rounded-lg border border-aqi-very-poor/20">
                  <span className="text-sm font-medium">Very Poor</span>
                  <span className="text-xs text-muted-foreground">
                    200+
                  </span>
                </div>
              </div>
            </div>

            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Quick Facts
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">
                    What is AQI?
                  </p>
                  <p className="text-foreground">
                    The Air Quality Index is a measure of how clean or polluted
                    the air is in your area.
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">
                    Why does it matter?
                  </p>
                  <p className="text-foreground">
                    Poor air quality can cause respiratory issues, especially
                    for vulnerable populations.
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">
                    Update frequency
                  </p>
                  <p className="text-foreground">
                    Data refreshes every 10 seconds for real-time monitoring.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Developers Section */}
          <div className="mt-8 bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700 rounded-3xl p-10 mb-4 shadow-sm backdrop-blur-md">
            <div className="relative mb-12">
              <h3 className="text-2xl font-black text-foreground text-center uppercase tracking-[0.2em]">
                Our Developers
              </h3>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-1 bg-orange-500 rounded-full"></div>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-10 md:gap-20">
              {[
                { name: "Ayush Kumar Samal", bg: "ea580c" },
                { name: "Armaan Singh", bg: "dc2626" },
                { name: "Aditya Singh", bg: "8b5cf6" },
                { name: "Joy Bag", bg: "3b82f6" },
              ].map((dev) => (
                <div
                  key={dev.name}
                  className="flex flex-col items-center group cursor-pointer max-w-[150px]"
                >
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-[4px] border-white dark:border-slate-700 shadow-xl group-hover:scale-110 group-hover:-translate-y-2 group-hover:shadow-primary/30 group-hover:border-primary transition-all duration-300">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(dev.name)}&background=${dev.bg}&color=fff&size=200&bold=true`}
                      alt={dev.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="mt-5 font-bold text-sm text-foreground text-center uppercase tracking-wider group-hover:text-primary transition-colors leading-relaxed">
                    {dev.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
