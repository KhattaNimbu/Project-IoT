import Layout from "@/components/Layout";
import {
  Heart,
  AlertCircle,
  Leaf,
  Users,
  Activity,
  Wind,
  Shield,
  Droplets,
} from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

interface AdvisoryCard {
  icon: React.ReactNode;
  title: string;
  aqiRange: string;
  description: string;
  recommendations: string[];
  affectedGroups?: string[];
}

export default function HealthAdvisory() {
  const advisories: AdvisoryCard[] = [
    {
      icon: <Leaf className="w-8 h-8" />,
      title: "Good Air Quality",
      aqiRange: "0 - 50",
      description:
        "Air quality is satisfactory, and air pollution poses little or no risk. This is an ideal time for outdoor activities.",
      recommendations: [
        "Enjoy outdoor activities without restrictions",
        "Open windows for natural ventilation",
        "Engage in strenuous outdoor exercise",
        "No health precautions needed",
      ],
      affectedGroups: ["General Population"],
    },
    {
      icon: <Activity className="w-8 h-8" />,
      title: "Fair Air Quality",
      aqiRange: "51 - 100",
      description:
        "Air quality is acceptable; however, there may be risk for some people. Members of sensitive groups may experience health effects.",
      recommendations: [
        "Most people can engage in outdoor activities normally",
        "Sensitive groups may want to reduce prolonged outdoor exposure",
        "Consider wearing masks during peak pollution hours",
        "Stay hydrated and monitor your health",
      ],
      affectedGroups: [
        "Children",
        "Elderly",
        "People with respiratory conditions",
      ],
    },
    {
      icon: <Wind className="w-8 h-8" />,
      title: "Moderate Air Quality",
      aqiRange: "101 - 150",
      description:
        "Members of sensitive groups (children, elderly, people with lung/heart conditions) may experience health effects.",
      recommendations: [
        "Sensitive groups should reduce outdoor activities",
        "Wear N95 masks if you must go outside",
        "Close windows to prevent outdoor air from entering",
        "Use air purifiers indoors",
        "Limit strenuous outdoor exercise",
      ],
      affectedGroups: [
        "Children",
        "Elderly",
        "People with asthma",
        "People with heart disease",
      ],
    },
    {
      icon: <AlertCircle className="w-8 h-8" />,
      title: "Poor Air Quality",
      aqiRange: "151 - 200",
      description:
        "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.",
      recommendations: [
        "Avoid all outdoor activities",
        "Keep windows and doors closed",
        "Run air purifiers and AC filters",
        "Wear N95 or higher rated masks if exposure is unavoidable",
        "Limit outdoor time to essentials only",
        "Consult healthcare provider if experiencing symptoms",
      ],
      affectedGroups: [
        "General population",
        "Children",
        "Elderly",
        "People with respiratory/heart conditions",
      ],
    },
    {
      icon: <AlertCircle className="w-8 h-8" />,
      title: "Very Poor Air Quality",
      aqiRange: "200+",
      description:
        "Health warning of emergency conditions: the entire population is more likely to be affected.",
      recommendations: [
        "Stay indoors and keep activity levels low",
        "Keep all windows and doors closed",
        "Use HEPA filters and air purifiers continuously",
        "Wear N95+ respirators if any outdoor exposure is necessary",
        "Avoid all strenuous activities",
        "Seek immediate medical attention for any symptoms",
        "Consider relocating temporarily if possible",
      ],
      affectedGroups: ["Everyone", "Particularly vulnerable groups at risk"],
    },
  ];

  const vulnerableGroups = [
    {
      title: "Children",
      icon: <Users className="w-6 h-6" />,
      description:
        "Children's lungs are still developing and are more sensitive to air pollution. They also spend more time outdoors during school.",
      precautions: [
        "Limit outdoor play when AQI is high",
        "Ensure proper fit of respiratory masks",
        "Monitor for respiratory symptoms",
        "Keep medications accessible during bad air days",
      ],
    },
    {
      title: "Elderly",
      icon: <Shield className="w-6 h-6" />,
      description:
        "Older adults often have existing lung or heart conditions, making them more vulnerable to air pollution effects.",
      precautions: [
        "Check AQI before planning outdoor activities",
        "Use air purifiers at home",
        "Keep medications readily available",
        "Consult doctors about outdoor activity limits",
      ],
    },
    {
      title: "People with Respiratory Conditions",
      icon: <Wind className="w-6 h-6" />,
      description:
        "Asthma, COPD, and other respiratory diseases are exacerbated by poor air quality, increasing risk of attacks.",
      precautions: [
        "Always carry rescue inhalers",
        "Avoid outdoor activities during high AQI periods",
        "Use prescribed preventive medications regularly",
        "Maintain emergency action plans",
      ],
    },
    {
      title: "People with Heart Conditions",
      icon: <Heart className="w-6 h-6" />,
      description:
        "Air pollution can trigger heart attacks and strokes in people with existing cardiovascular diseases.",
      precautions: [
        "Monitor heart health closely during high pollution",
        "Stay indoors on poor air quality days",
        "Keep medications accessible",
        "Stay in contact with your healthcare provider",
      ],
    },
  ];

  const getAQIBgColor = (aqiRange: string) => {
    if (aqiRange === "0 - 50") return "bg-aqi-good/10 border-aqi-good/30";
    if (aqiRange === "51 - 100") return "bg-aqi-fair/10 border-aqi-fair/30";
    if (aqiRange === "101 - 150") return "bg-aqi-moderate/10 border-aqi-moderate/30";
    if (aqiRange === "151 - 200") return "bg-aqi-poor/10 border-aqi-poor/30";
    return "bg-aqi-very-poor/10 border-aqi-very-poor/30";
  };

  const getIconColor = (aqiRange: string) => {
    if (aqiRange === "0 - 50") return "text-aqi-good";
    if (aqiRange === "51 - 100") return "text-aqi-fair";
    if (aqiRange === "101 - 150") return "text-aqi-moderate";
    if (aqiRange === "151 - 200") return "text-aqi-poor";
    return "text-aqi-very-poor";
  };

  return (
    <Layout>
      <div className="relative min-h-[calc(100vh-80px-180px)] overflow-hidden">
        <AnimatedBackground aqi={50} temperature={15} humidity={40} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
                <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-4xl font-bold text-foreground">
                  Health Advisory
                </h2>
                <p className="text-muted-foreground mt-1">
                  Guidelines and recommendations for different air quality levels
                </p>
              </div>
            </div>
          </div>

          {/* AQI Level Advisory Cards */}
          <div className="space-y-6 mb-12">
            {advisories.map((advisory, idx) => (
              <div
                key={idx}
                className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className={`${getIconColor(advisory.aqiRange)} flex-shrink-0 p-4 bg-white dark:bg-slate-800 rounded-xl`}
                  >
                    {advisory.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-foreground">
                        {advisory.title}
                      </h3>
                      <span className="text-sm font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        AQI {advisory.aqiRange}
                      </span>
                    </div>
                    <p className="text-foreground mb-4">
                      {advisory.description}
                    </p>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Health Recommendations
                    </h4>
                    <ul className="space-y-3">
                      {advisory.recommendations.map((rec, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="text-primary font-bold flex-shrink-0 mt-0.5">
                            •
                          </span>
                          <span className="text-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {advisory.affectedGroups && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Affected Groups
                      </h4>
                      <div className="space-y-2">
                        {advisory.affectedGroups.map((group, i) => (
                          <div
                            key={i}
                            className="p-3 bg-primary/5 rounded-lg border border-primary/20"
                          >
                            <p className="text-sm font-medium text-foreground">
                              {group}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vulnerable Groups */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-8">
              Vulnerable Populations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vulnerableGroups.map((group, idx) => (
                <div key={idx} className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-primary">{group.icon}</div>
                    <h3 className="text-xl font-bold text-foreground">
                      {group.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    {group.description}
                  </p>
                  <div>
                    <h4 className="font-semibold text-foreground mb-4">
                      Recommended Precautions:
                    </h4>
                    <ul className="space-y-3">
                      {group.precautions.map((precaution, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="text-primary font-bold flex-shrink-0 mt-0.5">
                            ✓
                          </span>
                          <span className="text-foreground">{precaution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Tips */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Wind className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Indoor Air Quality
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                When outdoor air quality is poor, focus on maintaining good indoor air quality.
              </p>
              <ul className="text-sm space-y-2 text-foreground">
                <li>• Use HEPA air purifiers</li>
                <li>• Keep windows closed</li>
                <li>• Change AC filters regularly</li>
                <li>• Use air-tight doors and windows</li>
              </ul>
            </div>

            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Activity Guidelines
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Adjust your outdoor activity based on current air quality levels.
              </p>
              <ul className="text-sm space-y-2 text-foreground">
                <li>• Check AQI before going out</li>
                <li>• Avoid peak pollution hours (typically 4-10 PM)</li>
                <li>• Choose less strenuous activities</li>
                <li>• Wear appropriate masks when needed</li>
              </ul>
            </div>

            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Droplets className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Health Protection
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Take proactive steps to protect your health during high pollution episodes.
              </p>
              <ul className="text-sm space-y-2 text-foreground">
                <li>• Keep medications accessible</li>
                <li>• Stay hydrated</li>
                <li>• Get adequate sleep</li>
                <li>• Consult healthcare providers</li>
              </ul>
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700 mt-12">
            <div className="flex items-center gap-3 mb-6">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-2xl font-bold text-foreground">
                When to Seek Medical Help
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-3">
                  Seek immediate medical attention if you experience:
                </h4>
                <ul className="space-y-2 text-sm text-foreground">
                  <li>• Chest pain or pressure</li>
                  <li>• Severe shortness of breath</li>
                  <li>• Persistent coughing with blood</li>
                  <li>• Difficulty breathing that doesn't improve with rest</li>
                  <li>• Signs of heart attack or stroke</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-3">
                  Consult your doctor if:
                </h4>
                <ul className="space-y-2 text-sm text-foreground">
                  <li>• Symptoms persist for more than a few hours</li>
                  <li>• You experience recurring respiratory issues</li>
                  <li>• Air pollution worsens existing conditions</li>
                  <li>• You need advice on protecting sensitive family members</li>
                  <li>• You want to adjust medications</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
