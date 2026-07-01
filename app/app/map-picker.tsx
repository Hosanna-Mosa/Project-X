import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";

const { width, height } = Dimensions.get("window");

export default function MapPickerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ 
    serviceId: string;
    type?: 'pickup' | 'drop';
    pickupName?: string;
    pickupLat?: string;
    pickupLng?: string;
    dropName?: string;
    dropLat?: string;
    dropLng?: string;
  }>();
  const { serviceId, type } = params;
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const styles = React.useMemo(() => createStyles(colors, insets), [theme, insets]);

  const [step, setStep] = useState<'pickup' | 'drop'>(type || 'pickup');
  const [region, setRegion] = useState({
    latitude: 17.0052,
    longitude: 81.7778,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [address, setAddress] = useState("Fetching address...");
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setRegion({
          ...region,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  const handleRegionChangeComplete = async (newRegion: any) => {
    setRegion(newRegion);
    setLoading(true);
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });
      if (geocode.length > 0) {
        const addr = geocode[0];
        const displayAddr = `${addr.name || ''} ${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        setAddress(displayAddr || "Unknown Location");
      }
    } catch (error) {
      setAddress("Error fetching address");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const currentData = {
      name: address,
      lat: region.latitude,
      lng: region.longitude
    };

    if (step === 'pickup') {
      router.push({
        pathname: "/drop-location",
        params: {
          serviceId,
          pickupName: currentData.name,
          pickupLat: currentData.lat.toString(),
          pickupLng: currentData.lng.toString(),
          dropName: params.dropName,
          dropLat: params.dropLat,
          dropLng: params.dropLng,
        }
      });
    } else {
      router.push({
        pathname: "/drop-location",
        params: {
          serviceId,
          pickupName: params.pickupName,
          pickupLat: params.pickupLat,
          pickupLng: params.pickupLng,
          dropName: currentData.name,
          dropLat: currentData.lat.toString(),
          dropLng: currentData.lng.toString(),
        }
      });
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
        />
        
        {/* Fixed Center Marker */}
        <View style={styles.centerMarkerContainer} pointerEvents="none">
           <View style={styles.pinWrapper}>
              <View style={step === 'pickup' ? styles.redPinHead : styles.greenPinHead}>
                 <View style={styles.innerWhiteDot} />
              </View>
              <View style={styles.pinStem} />
           </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity 
          style={[styles.backBtn, { top: insets.top + 10 }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Select your {step} location</Text>
          <TouchableOpacity style={styles.changeBtn}>
             <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.addressCard}>
          <View style={step === 'pickup' ? styles.redDot : styles.greenDot} />
          <View style={styles.addressInfo}>
             <Text style={styles.addressMain} numberOfLines={1}>
                {loading ? "Locating..." : address.split(',')[0]}
             </Text>
             <Text style={styles.addressSub} numberOfLines={2}>
                {loading ? "Fetching address details..." : address}
             </Text>
          </View>
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        <TouchableOpacity 
          style={styles.confirmBtn} 
          onPress={handleConfirm}
          disabled={loading}
        >
          <Text style={styles.confirmBtnText}>
            {step === 'pickup' ? "Select Pickup" : "Select Drop"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any, insets: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mapContainer: {
      flex: 1,
    },
    backBtn: {
       position: 'absolute',
       left: 20,
       width: 44,
       height: 44,
       borderRadius: 22,
       backgroundColor: '#fff',
       alignItems: 'center',
       justifyContent: 'center',
       shadowColor: "#000",
       shadowOffset: { width: 0, height: 4 },
       shadowOpacity: 0.1,
       shadowRadius: 10,
       elevation: 5,
       zIndex: 10,
    },
    centerMarkerContainer: {
       position: 'absolute',
       top: '50%',
       left: '50%',
       marginLeft: -15,
       marginTop: -40,
       alignItems: 'center',
       justifyContent: 'center',
    },
    pinWrapper: {
       alignItems: 'center',
    },
    redPinHead: {
       width: 30,
       height: 30,
       borderRadius: 15,
       backgroundColor: '#ef4444',
       borderWidth: 3,
       borderColor: '#fff',
       alignItems: 'center',
       justifyContent: 'center',
       shadowColor: "#000",
       shadowOffset: { width: 0, height: 4 },
       shadowOpacity: 0.3,
       shadowRadius: 4,
       elevation: 8,
    },
    greenPinHead: {
       width: 30,
       height: 30,
       borderRadius: 15,
       backgroundColor: '#22c55e',
       borderWidth: 3,
       borderColor: '#fff',
       alignItems: 'center',
       justifyContent: 'center',
       shadowColor: "#000",
       shadowOffset: { width: 0, height: 4 },
       shadowOpacity: 0.3,
       shadowRadius: 4,
       elevation: 8,
    },
    innerWhiteDot: {
       width: 8,
       height: 8,
       borderRadius: 4,
       backgroundColor: '#fff',
    },
    pinStem: {
       width: 3,
       height: 15,
       backgroundColor: '#000',
    },
    bottomPanel: {
       backgroundColor: colors.surface,
       borderTopLeftRadius: 24,
       borderTopRightRadius: 24,
       padding: 24,
       paddingBottom: insets.bottom + 20,
       shadowColor: "#000",
       shadowOffset: { width: 0, height: -10 },
       shadowOpacity: 0.05,
       shadowRadius: 15,
       elevation: 20,
    },
    panelHeader: {
       flexDirection: 'row',
       justifyContent: 'space-between',
       alignItems: 'center',
       marginBottom: 20,
    },
    panelTitle: {
       fontSize: 18,
       fontWeight: '900',
       color: colors.text,
    },
    changeBtn: {
       paddingHorizontal: 16,
       paddingVertical: 8,
       borderRadius: 20,
       borderWidth: 1,
       borderColor: colors.border,
    },
    changeBtnText: {
       fontSize: 14,
       fontWeight: '700',
       color: colors.text,
    },
    addressCard: {
       backgroundColor: colors.surfaceSecondary,
       borderRadius: 16,
       padding: 16,
       flexDirection: 'row',
       alignItems: 'center',
       marginBottom: 24,
       gap: 12,
    },
    redDot: {
       width: 10,
       height: 10,
       borderRadius: 5,
       backgroundColor: '#ef4444',
    },
    greenDot: {
       width: 10,
       height: 10,
       borderRadius: 5,
       backgroundColor: '#22c55e',
    },
    addressInfo: {
       flex: 1,
    },
    addressMain: {
       fontSize: 16,
       fontWeight: '800',
       color: colors.text,
       marginBottom: 4,
    },
    addressSub: {
       fontSize: 13,
       color: colors.textSecondary,
       lineHeight: 18,
    },
    confirmBtn: {
       backgroundColor: "#F59E0B",
       paddingVertical: 16,
       borderRadius: 30,
       alignItems: 'center',
       shadowColor: "#F59E0B",
       shadowOffset: { width: 0, height: 4 },
       shadowOpacity: 0.2,
       shadowRadius: 8,
       elevation: 5,
    },
    confirmBtnText: {
       fontSize: 16,
       fontWeight: '900',
       color: '#000',
    },
  });
