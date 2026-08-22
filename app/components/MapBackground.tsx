import React, { useEffect, useMemo, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Platform, ViewStyle, Text, TouchableOpacity, Image } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, MapType, Marker, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { DeliveryStop, useDeliveryStore } from '@/contexts/deliveryStore';
import Colors from '@/constants/colors';
import { customFetch } from '@/utils/api/custom-fetch';

const DRIVER_MARKER_IMAGE = require('@/assets/images/driver-marker.png');
const VEHICLE_BIKE_3D = require('@/assets/images/services/scooter_blue_top_view_2.png');
const VEHICLE_AUTO_3D = require('@/assets/images/services/auto_top_view.png');
const VEHICLE_CAB_3D = require('@/assets/images/services/cab.png');

interface Props {
  children?: React.ReactNode;
  style?: ViewStyle | any;
  mapType?: MapType;
  stops?: DeliveryStop[];
  polyline?: string;
  driverLocation?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  onLocationUpdate?: (coords: { lat: number, lng: number }) => void;
  markers?: any[];
  driverMarkers?: any[];
  initialRegion?: Region;
  onMarkerPress?: (marker: any) => void;
  radiusCenter?: { lat: number; lng: number } | null;
  radiusMeters?: number;
  /** Suppresses the native "my location" blue dot even when no custom
   * userLocation marker is supplied. Screens like finding-driver.tsx already
   * show their own decorative "searching" indicator over the map and don't
   * want the OS blue dot competing with it. */
  hideMyLocationDot?: boolean;
}

export interface MapBackgroundRef {
  recenter: () => void;
  panTo: (lat: number, lng: number, delta?: number) => void;
  fitToRoute: () => void;
  fitToMarkers: (markers: any[]) => void;
}


const FALLBACK_REGION: Region = {
  latitude: 16.9891,
  longitude: 82.2475,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const MapBackground = forwardRef<MapBackgroundRef, Props>(({
  children,
  style,
  mapType = 'standard',
  stops = [],
  markers = [],
  driverMarkers = [],
  initialRegion,
  polyline,
  driverLocation,
  userLocation,
  onLocationUpdate,
  onMarkerPress,
  radiusCenter,
  radiusMeters,
  hideMyLocationDot = false,
}, ref) => {
  const [region, setRegion] = useState<Region>(initialRegion || FALLBACK_REGION);
  const [autoRoutePolyline, setAutoRoutePolyline] = useState<string | null>(null);
  const selectedService = useDeliveryStore((state) => state.serviceType);

  const handleZoom = (factor: number) => {
    if (!internalMapRef.current || !region) return;
    const newRegion: Region = {
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: Math.max(0.0005, Math.min(20, region.latitudeDelta * factor)),
      longitudeDelta: Math.max(0.0005, Math.min(20, region.longitudeDelta * factor)),
    };
    setRegion(newRegion);
    internalMapRef.current.animateToRegion(newRegion, 300);
  };
  const internalMapRef = useRef<MapView>(null);
  const locationRef = useRef<{ lat: number, lng: number } | null>(null);
  const validRouteStops = useMemo(
    () =>
      stops
        .map((stop) => ({
          ...stop,
          lat: Number(stop.lat),
          lng: Number(stop.lng),
        }))
        .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng)),
    [stops],
  );

  const getRegionForLocation = (lat: number, lng: number, latDelta = 0.015, lngDelta = 0.015): Region => ({
    latitude: lat - (latDelta / 3), // offset slightly so pins are visible above bottom sheet
    longitude: lng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  });

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (locationRef.current && internalMapRef.current) {
        internalMapRef.current.animateToRegion(getRegionForLocation(locationRef.current.lat, locationRef.current.lng), 1000);
      }
    },
    panTo: (lat: number, lng: number, delta = 0.005) => {
      if (internalMapRef.current && lat && lng) {
        internalMapRef.current.animateToRegion(getRegionForLocation(lat, lng, delta, delta), 1000);
      }
    },
    fitToRoute: () => {
      if (!internalMapRef.current) return;

      const coords: { latitude: number, longitude: number }[] = [];

      stops.forEach(s => {
        if (s.lat && s.lng) {
          coords.push({ latitude: s.lat, longitude: s.lng });
        }
      });

      if (locationRef.current) {
        coords.push({ latitude: locationRef.current.lat, longitude: locationRef.current.lng });
      }

      if (driverLocation) {
        coords.push({ latitude: driverLocation.lat, longitude: driverLocation.lng });
      }

      if (coords.length > 0) {
        internalMapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    },
    fitToMarkers: (markerList: any[]) => {
      if (!internalMapRef.current || markerList.length === 0) return;
      const coords = markerList.map(m => ({ latitude: m.lat, longitude: m.lng }));
      if (locationRef.current) {
        coords.push({ latitude: locationRef.current.lat, longitude: locationRef.current.lng });
      }
      internalMapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 150, right: 80, bottom: 400, left: 80 },
        animated: true,
      });
    }
  }));

  const hasFocusedRoute = useRef(false);

  // Auto-center map on userLocation and driverLocation dynamically just once
  useEffect(() => {
    if (internalMapRef.current && userLocation && driverLocation && !hasFocusedRoute.current) {
      hasFocusedRoute.current = true;
      internalMapRef.current.fitToCoordinates([
        { latitude: Number(userLocation.lat), longitude: Number(userLocation.lng) },
        { latitude: Number(driverLocation.lat), longitude: Number(driverLocation.lng) }
      ], {
        edgePadding: { top: 120, right: 80, bottom: 430, left: 80 }, // keep bottom high to clear the success BottomSheet
        animated: true,
      });
    } else if (internalMapRef.current && userLocation && !hasFocusedRoute.current && !driverLocation) {
      const regionForUser = getRegionForLocation(userLocation.lat, userLocation.lng, 0.015, 0.015);
      internalMapRef.current.animateToRegion(regionForUser, 1000);
    }
  }, [userLocation, driverLocation]);

  useEffect(() => {
    if (initialRegion) {
      setRegion(initialRegion);
      return;
    }

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          locationRef.current = { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
          setRegion(getRegionForLocation(lastKnown.coords.latitude, lastKnown.coords.longitude));
          onLocationUpdate?.({ lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude });
        }

        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        locationRef.current = { lat: location.coords.latitude, lng: location.coords.longitude };
        setRegion(getRegionForLocation(location.coords.latitude, location.coords.longitude));
        if (onLocationUpdate) {
          onLocationUpdate({ lat: location.coords.latitude, lng: location.coords.longitude });
        }
      } catch (error) {
        // Graceful fallback if device GPS is fully disabled
        console.warn("Location services unavailable:", error);

      }
    })();
  }, [initialRegion]);
  useEffect(() => {
    if (!internalMapRef.current || userLocation || driverLocation) return;

    const coords: { latitude: number, longitude: number }[] = [];

    stops.forEach((stop) => {
      if (stop.lat && stop.lng) {
        coords.push({ latitude: stop.lat, longitude: stop.lng });
      }
    });

    if (coords.length > 1) {
      internalMapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 110, right: 60, bottom: 340, left: 60 },
        animated: true,
      });
    } else if (coords.length === 1) {
      internalMapRef.current.animateToRegion(
        getRegionForLocation(coords[0].latitude, coords[0].longitude, 0.018, 0.018),
        600,
      );
    }
  }, [stops]);

  useEffect(() => {
    if (polyline || validRouteStops.length < 2) {
      setAutoRoutePolyline(null);
      return;
    }

    let cancelled = false;

    const loadRoadRoute = async () => {
      try {
        const [origin, ...destinationStops] = validRouteStops;
        const route = await customFetch<{ polyline?: string; routeSource?: string }>("/api/v1/routing/optimize", {
          method: "POST",
          body: JSON.stringify({
            origin: {
              latitude: origin.lat,
              longitude: origin.lng,
            },
            stops: destinationStops.map((stop, index) => ({
              id: stop.id || `stop-${index}`,
              address: stop.address || stop.storeName || `Stop ${index + 1}`,
              latitude: stop.lat,
              longitude: stop.lng,
              type: stop.type || "stop",
            })),
          }),
          responseType: "json",
        });

        if (!cancelled) {
          setAutoRoutePolyline(route?.polyline || null);
        }
      } catch (error) {
        console.warn("MapBackground route fetch failed:", error);
        if (!cancelled) setAutoRoutePolyline(null);
      }
    };

    loadRoadRoute();

    return () => {
      cancelled = true;
    };
  }, [polyline, validRouteStops]);

  // Auto-zoom to fit the radius circle when it changes
  useEffect(() => {
    if (radiusCenter && radiusMeters && internalMapRef.current) {
      // 1 degree is approximately 111.32 km. We multiply by a padding factor (~2.5) to ensure the circle fits nicely.
      const latDelta = (radiusMeters / 111320) * 2.5;
      const lngDelta = (radiusMeters / (111320 * Math.cos(radiusCenter.lat * (Math.PI / 180)))) * 2.5;

      const regionForCircle = {
        latitude: radiusCenter.lat,
        longitude: radiusCenter.lng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };

      internalMapRef.current.animateToRegion(regionForCircle, 800);
    }
  }, [radiusCenter, radiusMeters]);

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      <MapView
        ref={internalMapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onRegionChangeComplete={(r) => setRegion(r)}
        mapType={mapType}
        showsUserLocation={!userLocation && !hideMyLocationDot}
        showsPointsOfInterest={false}
        showsCompass={false}
        showsMyLocationButton={false}
        pointerEvents="auto"
        onMapReady={() => {
          if (userLocation && internalMapRef.current) {
            const regionForUser = getRegionForLocation(userLocation.lat, userLocation.lng, 0.015, 0.015);
            internalMapRef.current.animateToRegion(regionForUser, 500);
          }
        }}
      >
        {(radiusCenter != null && radiusMeters != null && radiusMeters > 0) ? (
          <>
            <Circle
              center={{ latitude: Number(radiusCenter.lat), longitude: Number(radiusCenter.lng) }}
              radius={Number(radiusMeters)}
              fillColor="rgba(79, 70, 229, 0.15)"
              strokeColor="rgba(79, 70, 229, 0.6)"
              strokeWidth={2}
            />
            <Marker
              key="radius-badge"
              coordinate={{
                latitude: Number(radiusCenter.lat) - (Number(radiusMeters) / 111320),
                longitude: Number(radiusCenter.lng)
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={{
                backgroundColor: '#4F46E5',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#ffffff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}>
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                  {radiusMeters >= 1000 ? `${radiusMeters / 1000} KM` : `${radiusMeters} M`}
                </Text>
              </View>
            </Marker>
          </>
        ) : null}

        {markers.map((item) => (
          (item.lat != null && item.lng != null) ? (
            <Marker
              key={item.id}
              coordinate={{ latitude: Number(item.lat), longitude: Number(item.lng) }}
              onPress={() => onMarkerPress?.(item)}
              pinColor="#EF4444"
              tracksViewChanges={true}
            />
          ) : null
        ))}

        {driverMarkers.map((driver) => {
          const vehicleType = (driver.vehicleType || driver.vehicle || "bike").toLowerCase();

          // Disable car/cab markers for now
          if (vehicleType.includes("car") || vehicleType.includes("cab") || vehicleType.includes("prime")) {
            return null;
          }

          const isAutoVehicle = vehicleType.includes("auto") || vehicleType.includes("rickshaw");
          const isAutoService = selectedService === "auto";

          // If selected service is auto, only show auto drivers.
          // For all other cases (bike/default), show only scooty drivers.
          if (isAutoService) {
            if (!isAutoVehicle) return null;
          } else {
            if (isAutoVehicle) return null;
          }

          let markerImage = isAutoVehicle ? VEHICLE_AUTO_3D : VEHICLE_BIKE_3D;

          return (
            <Marker
              key={driver.id || driver._id}
              coordinate={{ latitude: Number(driver.lat), longitude: Number(driver.lng) }}
              anchor={{ x: 0.5, y: 0.5 }}
              title={driver.name || "Driver"}
            >
              <Image
                source={markerImage}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            </Marker>
          );
        })}

        {stops.map((stop, index) => (
          (stop.lat != null && stop.lng != null) ? (
            <Marker
              key={stop.id}
              coordinate={{ latitude: Number(stop.lat), longitude: Number(stop.lng) }}
              title={stop.storeName || `Pickup ${index + 1}`}
              description={stop.address}
              anchor={{ x: 0.5, y: 1 }}
            >
              {/* Was a bare <Marker> with no child — rendered the platform's
                  own default pin (a plain red teardrop), inconsistent with
                  every custom-styled marker elsewhere in the app. */}
              <View collapsable={false} style={styles.stopPinWrap}>
                <View style={styles.stopPinHead}>
                  <View style={styles.stopPinDot} />
                </View>
                <View style={styles.stopPinTail} />
              </View>
            </Marker>
          ) : null
        ))}

        {userLocation && (
          <Marker
            key="user-location-pin"
            coordinate={{ latitude: Number(userLocation.lat), longitude: Number(userLocation.lng) }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarkerWrap}>
              <View style={styles.userMarkerBadge} />
            </View>
          </Marker>
        )}

        {driverLocation && (
          <Marker
            key="driver-location-pin"
            coordinate={{ latitude: Number(driverLocation.lat), longitude: Number(driverLocation.lng) }}
            title="Driver"
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={(driverLocation as any).heading || 0}
          >
            <Image
              source={VEHICLE_BIKE_3D}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </Marker>
        )}

        {(polyline || autoRoutePolyline) ? (
          <Polyline
            coordinates={decodePolyline(polyline || autoRoutePolyline || "")}
            strokeWidth={4}
            strokeColor="#16A34A"
          />
        ) : null}
      </MapView>

      {/* Clean Zoom Controls */}
      <View style={styles.zoomControlsContainer}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => handleZoom(0.5)}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={18} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => handleZoom(2.0)}
          activeOpacity={0.7}
        >
          <Feather name="minus" size={18} color="#111827" />
        </TouchableOpacity>
      </View>

      {children}
    </View>
  );
});

// Utility to decode Google Polyline
function decodePolyline(encoded: string) {
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    const p = {
      latitude: (lat / 1e5),
      longitude: (lng / 1e5),
    };
    poly.push(p);
  }
  return poly;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  markerBadge: {
    backgroundColor: Colors.light.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  markerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markerPin: {
    width: 1,
    height: 4,
    backgroundColor: Colors.light.primary,
  },
  redMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  redMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  redMarkerPin: {
    width: 2,
    height: 8,
    backgroundColor: '#EF4444',
    marginTop: -2,
  },
  stopPinWrap: { width: 40, height: 44, alignItems: 'center', justifyContent: 'flex-end' },
  stopPinHead: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.light.primary,
    borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
  },
  stopPinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  stopPinTail: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: Colors.light.primary,
  },
  userMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  userMarkerBadge: {
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  vehicleMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  vehicleMarker3DContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  scooterMarkerContainer: {
    width: 75,
    height: 75,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  scooterMarkerImage: {
    width: 75,
    height: 75,
    backgroundColor: 'transparent',
  },
  zoomControlsContainer: {
    position: 'absolute',
    right: 16,
    top: '30%',
    backgroundColor: 'transparent',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  }
});
