import { createContext, useContext, useState, useEffect } from "react";
import { getTenantSettings } from "../api/client";

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const [plan, setPlan]     = useState("Starter");
  const [tier, setTier]     = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const isSuperuser = localStorage.getItem("is_superuser") === "true";

    if (token && !isSuperuser) {
      getTenantSettings()
        .then(r => {
          setPlan(r.data.current_plan);
          setTier(r.data.tier);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function refreshPlan() {
    getTenantSettings().then(r => {
      setPlan(r.data.current_plan);
      setTier(r.data.tier);
    });
  }

  return (
    <PlanContext.Provider value={{ plan, tier, loading, refreshPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}