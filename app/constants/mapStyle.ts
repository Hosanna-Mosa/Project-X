import { MapStyleElement } from "react-native-maps";

export const LIGHT_GREEN_MAP_STYLE: MapStyleElement[] = [
  { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#3f5f50" }] },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }, { weight: 2 }],
  },
  { featureType: "all", elementType: "labels.icon", stylers: [{ saturation: -20 }, { lightness: 15 }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#eef7ee" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#f8fbf7" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#dff0df" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#cfe8cf" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#c9dec9" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#b8d4b8" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#d8ead8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d8f0e4" }] },
];
