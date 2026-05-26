import { useEffect, useState } from "react";

let googleLoaded = false;
let leafletLoaded = false;
let isLoading = false;
const callbacks: (() => void)[] = [];

export function useGoogleMaps(apiKey: string) {
  const [loaded, setLoaded] = useState(googleLoaded && leafletLoaded);

  useEffect(() => {
    if (loaded) return;

    if (googleLoaded && leafletLoaded) {
      setLoaded(true);
      return;
    }

    const callback = () => {
      if (googleLoaded && leafletLoaded) {
        setLoaded(true);
      }
    };
    callbacks.push(callback);

    if (isLoading) return;
    isLoading = true;

    // Load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Load Leaflet JS
    const leafletScript = document.createElement("script");
    leafletScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    leafletScript.async = true;
    leafletScript.addEventListener("load", () => {
      leafletLoaded = true;
      callbacks.forEach((cb) => cb());
      if (googleLoaded && leafletLoaded) {
        callbacks.length = 0;
      }
    });
    document.head.appendChild(leafletScript);

    // Load Google Maps JS (only for Autocomplete)
    const googleScript = document.createElement("script");
    googleScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    googleScript.async = true;
    googleScript.defer = true;
    googleScript.addEventListener("load", () => {
      googleLoaded = true;
      callbacks.forEach((cb) => cb());
      if (googleLoaded && leafletLoaded) {
        callbacks.length = 0;
      }
    });
    document.head.appendChild(googleScript);
  }, [apiKey, loaded]);

  return loaded;
}
