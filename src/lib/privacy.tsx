"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PrivacyContextValue {
  isPrivate: boolean;
  togglePrivacy: () => void;
  /** When private mode is on, returns `***` + last 2 chars. Otherwise passthrough. */
  mask: (value: string | number) => string;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

/**
 * Pure masking function: always 3 asterisks + last 2 characters.
 * Values ≤2 chars → just `***`.
 */
function applyMask(value: string | number): string {
  const str = String(value);
  if (str.length <= 2) return "***";
  return "***" + str.slice(-2);
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false);

  const togglePrivacy = useCallback(() => {
    setIsPrivate((prev) => !prev);
  }, []);

  const mask = useCallback(
    (value: string | number): string => {
      if (!isPrivate) return String(value);
      return applyMask(value);
    },
    [isPrivate],
  );

  return (
    <PrivacyContext.Provider value={{ isPrivate, togglePrivacy, mask }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    // Outside provider — return a no-op fallback so public pages don't break
    return {
      isPrivate: false,
      togglePrivacy: () => {},
      mask: (value: string | number) => String(value),
    };
  }
  return ctx;
}
