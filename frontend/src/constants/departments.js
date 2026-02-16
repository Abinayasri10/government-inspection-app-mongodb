export const DEPARTMENTS = {
  education: {
    id: "education",
    name: "Education Department",
    icon: "🏫",
    description: "School inspections and education monitoring",
    color: "#071952",
    roles: [
      { id: "beo", name: "BEO (Block Education Officer)" },
      { id: "ceo", name: "CEO (Chief Education Officer)" },
      { id: "deo", name: "DEO (District Education Officer)" },
    ],
  },
  health: {
    id: "health",
    name: "Health Department",
    icon: "🏥",
    description: "Healthcare facility inspections",
    color: "#088395",
    roles: [
      { id: "officer", name: "Health Officer" },
      { id: "bmo", name: "BMO (Block Medical Officer)" },
      { id: "cmo", name: "CMO (Chief Medical Officer)" },
    ],
  },
  food: {
    id: "food",
    name: "Food Safety Department",
    icon: "🍽️",
    description: "Kitchen and food safety inspections",
    color: "#37B7C3",
    roles: [
      { id: "inspector", name: "Food Inspector" },
      { id: "dho", name: "DHO (District Health Officer)" },
    ],
  },
  construction: {
    id: "construction",
    name: "Construction Department",
    icon: "🏗️",
    description: "Infrastructure and construction audits",
    color: "#088395",
    roles: [
      { id: "auditor", name: "Construction Auditor" },
      { id: "ae", name: "AE (Assistant Engineer)" },
    ],
  },
  admin: {
    id: "admin",
    name: "Administrative",
    icon: "🏛️",
    description: "Collector and system administration",
    color: "#071952",
    roles: [
      { id: "collector", name: "Collector" },
      { id: "admin", name: "Admin" },
    ],
  },
}
