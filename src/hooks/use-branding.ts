"use client";

import { useState, useEffect } from "react";

interface BrandingSettings {
  appName: string;
  appSubtitle: string;
  logoUrl: string;
  loginSideImage: string;
  primaryColor: string;
  loading: boolean;
}

const DEFAULTS: Omit<BrandingSettings, "loading"> = {
  appName: "DRMS",
  appSubtitle: "Document Management",
  logoUrl: "",
  loginSideImage: "",
  primaryColor: "#2563EB",
};

// Module-level cache to avoid re-fetching across components
let cachedSettings: Omit<BrandingSettings, "loading"> | null = null;
let fetchPromise: Promise<Omit<BrandingSettings, "loading">> | null = null;

function fetchBranding(): Promise<Omit<BrandingSettings, "loading">> {
  if (cachedSettings) return Promise.resolve(cachedSettings);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/settings/branding")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        cachedSettings = {
          appName: data.data.app_name || DEFAULTS.appName,
          appSubtitle: data.data.app_subtitle || DEFAULTS.appSubtitle,
          logoUrl: data.data.logo_url || DEFAULTS.logoUrl,
          loginSideImage: data.data.login_side_image || DEFAULTS.loginSideImage,
          primaryColor: data.data.primary_color || DEFAULTS.primaryColor,
        };
      } else {
        cachedSettings = { ...DEFAULTS };
      }
      return cachedSettings;
    })
    .catch(() => {
      cachedSettings = { ...DEFAULTS };
      return cachedSettings;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

/** Invalidate the cache so the next useBranding() call re-fetches */
export function invalidateBrandingCache() {
  cachedSettings = null;
  fetchPromise = null;
}

export function useBranding(): BrandingSettings {
  const [settings, setSettings] = useState<Omit<BrandingSettings, "loading">>(
    cachedSettings || DEFAULTS
  );
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    fetchBranding().then((result) => {
      setSettings(result);
      setLoading(false);
    });
  }, []);

  return { ...settings, loading };
}
