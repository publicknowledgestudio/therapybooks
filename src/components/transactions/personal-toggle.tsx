"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeSlash } from "@/components/ui/icons";

interface PersonalFilterContextValue {
  showPersonal: boolean;
  setShowPersonal: (v: boolean) => void;
}

const PersonalFilterContext = createContext<PersonalFilterContextValue>({
  showPersonal: false,
  setShowPersonal: () => {},
});

export function usePersonalFilter() {
  return useContext(PersonalFilterContext);
}

export function PersonalFilterProvider({ children }: { children: ReactNode }) {
  const [showPersonal, setShowPersonal] = useState(false);
  return (
    <PersonalFilterContext.Provider value={{ showPersonal, setShowPersonal }}>
      {children}
    </PersonalFilterContext.Provider>
  );
}

export function PersonalToggle() {
  const { showPersonal, setShowPersonal } = usePersonalFilter();
  return (
    <Button
      variant={showPersonal ? "default" : "outline"}
      size="sm"
      onClick={() => setShowPersonal(!showPersonal)}
      className="gap-1.5"
    >
      {showPersonal ? (
        <EyeSlash className="h-3.5 w-3.5" />
      ) : (
        <Eye className="h-3.5 w-3.5" />
      )}
      {showPersonal ? "Hide" : "Show"} Personal
    </Button>
  );
}
