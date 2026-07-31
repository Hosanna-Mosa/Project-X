import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Alert, Image, Animated, Easing, Linking, Keyboard, Dimensions } from "react-native";
import LottieView from 'lottie-react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { customFetch } from "@/utils/api/custom-fetch";
import { socketService } from "@/utils/socketService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useThemeStore } from "@/contexts/themeStore";
import { useDeliveryStore } from "@/contexts/deliveryStore";
import { DeliverySlider } from "@/components/DeliverySlider";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const scale = SCREEN_HEIGHT < 850 ? 0.85 : 1.0;

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export default function HelperTaskScreen() {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top || StatusBar.currentHeight || 24;
  const { theme } = useThemeStore();
  const { radius } = useLocalSearchParams<{ radius?: string }>();
  const colors = Colors[theme];
  const { driver, currentCoords, currentLocation, setOrderId, setDriver, setServiceType } = useDeliveryStore();

  const handleUseCurrentLocation = async () => {
    try {
      const storeLocation = useDeliveryStore.getState().currentLocation;
      const storeCoords = useDeliveryStore.getState().currentCoords;
      if (storeLocation && storeCoords && storeCoords.lat && storeCoords.lng) {
        setPickupLocation(storeLocation);
        setPickupCoords(storeCoords);
        setIsPickupValid(true);
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Please enable location services to find your current location.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: location.coords.latitude, lng: location.coords.longitude };
      setPickupCoords(coords);

      const [address] = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng
      });

      if (address) {
        const formatted = [
          address.name,
          address.street,
          address.district || address.subregion,
          address.city,
          address.region,
          address.postalCode
        ].filter(Boolean).join(", ");
        setPickupLocation(formatted);
        setIsPickupValid(true);
      }
    } catch (error) {
      console.warn("Helper Task: GPS fetch failed:", error);
      Alert.alert("Error", "Could not fetch your current location. Please type it manually.");
    }
  };

  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number, lng: number} | null>(null);
  const [activeField, setActiveField] = useState<"pickup" | "dropoff" | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isPickupValid, setIsPickupValid] = useState(false);
  const [isDropoffValid, setIsDropoffValid] = useState(false);
  
  const [durationMode, setDurationMode] = useState<"1hr" | "2hr" | "custom">("1hr");
  const [customHours, setCustomHours] = useState(2);
  const [customMinutes, setCustomMinutes] = useState(30);
  
  const [description, setDescription] = useState("");
  const [taskState, setTaskState] = useState<"idle" | "searching" | "assigned">("idle");
  const [localOrderId, setLocalOrderId] = useState<string | null>(null);
  const [isIncreasingPrice, setIsIncreasingPrice] = useState<number | null>(null);
  const [currentTaskPrice, setCurrentTaskPrice] = useState<number | null>(null);
  const [delayedReason, setDelayedReason] = useState<string | null>(null);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [totalContacted, setTotalContacted] = useState(0);
  const searchTrafficAnim = React.useRef(new Animated.Value(0)).current;
  const assignedPopAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const scanLineAnim = React.useRef(new Animated.Value(0)).current;
  
  // The AI Matching Deck Animations
  const formHeightAnim = React.useRef(new Animated.Value(1)).current;
  const scrollViewRef = React.useRef<ScrollView>(null);
  const deckOpacityAnim = React.useRef(new Animated.Value(0)).current;
  const cardSwipeXAnim = React.useRef(new Animated.Value(400)).current;
  const cardSwipeYAnim = React.useRef(new Animated.Value(0)).current;
  const cardRotateAnim = React.useRef(new Animated.Value(15)).current;
  const lockOnAnim = React.useRef(new Animated.Value(0)).current; // 0 = searching, 1 = matched
  
  // New Cinematic Transition Animations
  const rippleScaleAnim = React.useRef(new Animated.Value(0)).current;
  const rippleOpacityAnim = React.useRef(new Animated.Value(0)).current;
  const blackoutOpacityAnim = React.useRef(new Animated.Value(0)).current;
  const stampScaleAnim = React.useRef(new Animated.Value(3)).current;
  const stampOpacityAnim = React.useRef(new Animated.Value(0)).current;
  const stampGlowAnim = React.useRef(new Animated.Value(0)).current;
  
  const [isTransitioningToSearch, setIsTransitioningToSearch] = useState(false);
  const [isTransitioningToAssigned, setIsTransitioningToAssigned] = useState(false);
  
  // Dummy data for the rapid sorting effect
  const [dummyIndex, setDummyIndex] = useState(0);
  const [characterIndex, setCharacterIndex] = React.useState(0);
  const [assignedDriver, setAssignedDriver] = useState<any>(null);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const isScrolled = scrollY > (SCREEN_HEIGHT < 850 ? 100 : 120);

  React.useEffect(() => {
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsDescriptionFocused(false);
      }
    );

    return () => {
      hideSubscription.remove();
    };
  }, []);

  // Cinematic Delivery Animation
  const riderX = React.useRef(new Animated.Value(-300)).current;
  const riderOpacity = React.useRef(new Animated.Value(0)).current;
  const personOpacity = React.useRef(new Animated.Value(0)).current;
  const packageX = React.useRef(new Animated.Value(0)).current;
  const packageY = React.useRef(new Animated.Value(0)).current;
  const packageOpacity = React.useRef(new Animated.Value(0)).current;
  const packageScale = React.useRef(new Animated.Value(0.5)).current;
  
  // Home Innovation Animations
  const pinBounceAnim = React.useRef(new Animated.Value(0)).current;
  const auraPulseAnim = React.useRef(new Animated.Value(0)).current;

  // Scooter Innovation Animations
  const bobAnim = React.useRef(new Animated.Value(0)).current;
  const exhaustAnim = React.useRef(new Animated.Value(0)).current;

  // Parallax Background Animations
  const cloudScroll = React.useRef(new Animated.Value(0)).current;
  const skylineScroll = React.useRef(new Animated.Value(0)).current;
  const roadScroll = React.useRef(new Animated.Value(0)).current;
  const trafficRight = React.useRef(new Animated.Value(-200)).current;
  const trafficLeft = React.useRef(new Animated.Value(500)).current;

  React.useEffect(() => {
    let interval: any;
    if (taskState === "searching" && localOrderId) {
      const fetchStatus = async () => {
        try {
          const orderData = await customFetch<any>(`/api/v1/orders/${localOrderId}`);
          if (orderData) {
            setRejectedCount(orderData.declineReasons ? orderData.declineReasons.length : 0);
            setTotalContacted(orderData.totalCandidatesCount || 0);
            if (orderData.customerPrice) {
              setCurrentTaskPrice(orderData.customerPrice);
            } else if (orderData.totalPrice) {
              setCurrentTaskPrice(orderData.totalPrice);
            }
            if ((orderData.status === "DRIVER_ASSIGNED" || orderData.status === "accepted" || orderData.driver) && orderData.driver) {
              setDriver(orderData.driver);
              setServiceType("helper");
              setOrderId(orderData._id);
              
              setIsTransitioningToAssigned(true);
              blackoutOpacityAnim.setValue(0);
              stampScaleAnim.setValue(3);
              stampOpacityAnim.setValue(0);
              stampGlowAnim.setValue(0);
              
              Animated.sequence([
                Animated.timing(blackoutOpacityAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
                Animated.parallel([
                  Animated.timing(stampOpacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
                  Animated.spring(stampScaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true })
                ]),
                Animated.timing(stampGlowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.parallel([
                  Animated.timing(blackoutOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                  Animated.timing(stampOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                  Animated.timing(stampScaleAnim, { toValue: 5, duration: 400, useNativeDriver: true })
                ])
              ]).start(() => {
                setIsTransitioningToAssigned(false);
                setTaskState("assigned");
              });
            }
          }
        } catch (err) {
          console.warn("Error polling order status:", err);
        }
      };
      
      fetchStatus();
      interval = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [taskState, localOrderId]);

  React.useEffect(() => {
    // Start continuous loops for the Home innovation elements
    const pinLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pinBounceAnim, { toValue: -15, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pinBounceAnim, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true })
      ])
    );
    pinLoop.start();

    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(auraPulseAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    auraLoop.start();

    // Scooter Innovation Loops
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -4, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );
    bobLoop.start();

    const exhaustLoop = Animated.loop(
      Animated.timing(exhaustAnim, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })
    );
    exhaustLoop.start();
    
    // Parallax City Background Loops
    const cloudLoop = Animated.loop(Animated.timing(cloudScroll, { toValue: -400, duration: 30000, easing: Easing.linear, useNativeDriver: true }));
    cloudLoop.start();
    const skylineLoop = Animated.loop(Animated.timing(skylineScroll, { toValue: -300, duration: 15000, easing: Easing.linear, useNativeDriver: true }));
    skylineLoop.start();
    
    if (taskState === "idle") {
      const loop = () => {
         riderX.setValue(-300);
         riderOpacity.setValue(0);
         personOpacity.setValue(0);
         packageX.setValue(0);
         packageY.setValue(0);
         packageOpacity.setValue(0);
         packageScale.setValue(0.5);
         
         Animated.sequence([
            // 1. Delivery boy goes to the right (passing by quickly)
            Animated.parallel([
               Animated.timing(riderOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
               Animated.timing(riderX, { toValue: 400, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
               Animated.timing(trafficRight, { toValue: 500, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
               Animated.timing(trafficLeft, { toValue: -300, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
               Animated.timing(roadScroll, { toValue: -160, duration: 1800, easing: Easing.linear, useNativeDriver: true })
            ]),
            
            // Reset rider and traffic instantly
            Animated.parallel([
               Animated.timing(riderOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
               Animated.timing(riderX, { toValue: -300, duration: 0, useNativeDriver: true }),
               Animated.timing(trafficRight, { toValue: -300, duration: 0, useNativeDriver: true }),
               Animated.timing(trafficLeft, { toValue: 600, duration: 0, useNativeDriver: true }),
               Animated.timing(roadScroll, { toValue: 0, duration: 0, useNativeDriver: true })
            ]),
            Animated.delay(400),

            // 2. Person fades in
            Animated.timing(personOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.delay(400),
            
            // 3. Delivery boy arrives and traffic pulls up synchronously
            Animated.parallel([
               Animated.timing(riderX, { toValue: -30, duration: 900, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
               Animated.timing(riderOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
               Animated.timing(trafficRight, { toValue: 100, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
               Animated.timing(trafficLeft, { toValue: 200, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
               Animated.timing(roadScroll, { toValue: -80, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true })
            ]),
            Animated.delay(600),
            
            // 4. Give the order (Package hops) - Traffic is stopped here!
            Animated.parallel([
               Animated.timing(packageOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
               Animated.timing(packageScale, { toValue: 1, duration: 300, useNativeDriver: true }),
               Animated.timing(packageX, { toValue: 150, duration: 500, easing: Easing.linear, useNativeDriver: true }),
               Animated.sequence([
                 Animated.timing(packageY, { toValue: -60, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                 Animated.timing(packageY, { toValue: 10, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
               ])
            ]),
            Animated.delay(300),
            
            // Package fades, Person glows
            Animated.parallel([
               Animated.timing(packageOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
               Animated.sequence([
                 Animated.timing(personOpacity, { toValue: 0.5, duration: 150, useNativeDriver: true }),
                 Animated.timing(personOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
               ])
            ]),
            Animated.delay(600),

            // 5. Scooter rides away, traffic accelerates away, person fades out
            Animated.parallel([
               Animated.timing(riderX, { toValue: 400, duration: 900, easing: Easing.in(Easing.back(1.2)), useNativeDriver: true }),
               Animated.timing(riderOpacity, { toValue: 0, duration: 600, delay: 300, useNativeDriver: true }),
               Animated.timing(personOpacity, { toValue: 0, duration: 500, delay: 500, useNativeDriver: true }),
               Animated.timing(trafficRight, { toValue: 500, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
               Animated.timing(trafficLeft, { toValue: -300, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
               Animated.timing(roadScroll, { toValue: -160, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true })
            ]),
            
            // Final reset before next loop
            Animated.parallel([
               Animated.timing(trafficRight, { toValue: -300, duration: 0, useNativeDriver: true }),
               Animated.timing(trafficLeft, { toValue: 600, duration: 0, useNativeDriver: true }),
               Animated.timing(roadScroll, { toValue: 0, duration: 0, useNativeDriver: true })
            ]),
            Animated.delay(800)
         ]).start(({ finished }) => {
            if (finished) {
               setCharacterIndex(prev => prev === 0 ? 1 : 0);
               loop();
            }
         });
      };
      loop();
    } else {
      riderX.stopAnimation();
      riderOpacity.stopAnimation();
      personOpacity.stopAnimation();
      packageX.stopAnimation();
      packageY.stopAnimation();
      packageOpacity.stopAnimation();
      packageScale.stopAnimation();
      trafficRight.stopAnimation();
      trafficLeft.stopAnimation();
      roadScroll.stopAnimation();
    }

    return () => {
      riderX.stopAnimation();
      riderOpacity.stopAnimation();
      personOpacity.stopAnimation();
      packageX.stopAnimation();
      packageY.stopAnimation();
      packageOpacity.stopAnimation();
      packageScale.stopAnimation();
      trafficRight.stopAnimation();
      trafficLeft.stopAnimation();
      roadScroll.stopAnimation();
      pinLoop.stop();
      auraLoop.stop();
      bobLoop.stop();
      exhaustLoop.stop();
      cloudLoop.stop();
      skylineLoop.stop();
    };
  }, [taskState]);

  React.useEffect(() => {
    let intervalId: any;
    let searchTrafficLoop: any;
    let cardSortingLoop: any;

    if (taskState === "searching") {
       // 1. Collapse the form down to reveal the city
       Animated.spring(formHeightAnim, { toValue: 0, useNativeDriver: false }).start();
       
       // 2. Show the deck
       Animated.timing(deckOpacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

       // 3. Traffic Loop
       searchTrafficLoop = Animated.loop(
         Animated.timing(searchTrafficAnim, { toValue: 1, duration: 3800, easing: Easing.linear, useNativeDriver: true })
       );
       searchTrafficLoop.start();

       // 4. The Rapid Sorting Loop
       cardSortingLoop = Animated.loop(
         Animated.sequence([
           // Fly in from right
           Animated.parallel([
             Animated.timing(cardSwipeXAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
             Animated.timing(cardSwipeYAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
             Animated.timing(cardRotateAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
           ]),
           // Analyze pause
           Animated.delay(100),
           // Reject to the left & down
           Animated.parallel([
             Animated.timing(cardSwipeXAnim, { toValue: -400, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
             Animated.timing(cardSwipeYAnim, { toValue: 100, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
             Animated.timing(cardRotateAnim, { toValue: -20, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
           ]),
           // Reset instantly to right
           Animated.parallel([
             Animated.timing(cardSwipeXAnim, { toValue: 400, duration: 0, useNativeDriver: true }),
             Animated.timing(cardSwipeYAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
             Animated.timing(cardRotateAnim, { toValue: 15, duration: 0, useNativeDriver: true }),
           ])
         ])
       );
       cardSortingLoop.start();

       // Change dummy data rapidly
       intervalId = setInterval(() => {
          setDummyIndex(prev => (prev + 1) % 10);
       }, 600);

    } else if (taskState === "assigned") {
       clearInterval(intervalId);
       
       // Stop the sorting loop and grab the card!
       if (cardSortingLoop) cardSortingLoop.stop();
       cardSwipeXAnim.stopAnimation();
       cardSwipeYAnim.stopAnimation();
       cardRotateAnim.stopAnimation();
       
       Animated.sequence([
          // Slam the card into the center of the screen
          Animated.parallel([
            Animated.spring(cardSwipeXAnim, { toValue: 0, useNativeDriver: true, bounciness: 12 }),
            Animated.spring(cardSwipeYAnim, { toValue: 0, useNativeDriver: true, bounciness: 12 }),
            Animated.spring(cardRotateAnim, { toValue: 0, useNativeDriver: true, bounciness: 12 }),
          ]),
          
          // Lock on animation (Turns green)
          Animated.timing(lockOnAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
          
          // Hold the dramatic cinematic scene briefly
          Animated.delay(200), 
          
          // Hide deck and bring form back up, POP the photo!
          Animated.parallel([
             Animated.timing(deckOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
             Animated.spring(formHeightAnim, { toValue: 1, useNativeDriver: false, bounciness: 8 }),
             Animated.spring(assignedPopAnim, { toValue: 1, useNativeDriver: true, bounciness: 12, delay: 200 })
          ])
       ]).start();
       
    } else {
       // Idle state - reset all thematic properties
       Animated.spring(formHeightAnim, { toValue: 1, useNativeDriver: false }).start();
       lockOnAnim.setValue(0);
       deckOpacityAnim.setValue(0);
       cardSwipeXAnim.setValue(400);
       cardSwipeYAnim.setValue(0);
       cardRotateAnim.setValue(15);
       if (searchTrafficLoop) searchTrafficLoop.stop();
       searchTrafficAnim.stopAnimation();
       searchTrafficAnim.setValue(0);
       assignedPopAnim.setValue(0);
       if (intervalId) clearInterval(intervalId);
    }
    
    return () => { 
      if (intervalId) clearInterval(intervalId);
      if (searchTrafficLoop) searchTrafficLoop.stop();
      if (cardSortingLoop) cardSortingLoop.stop();
      formHeightAnim.stopAnimation();
      deckOpacityAnim.stopAnimation();
      searchTrafficAnim.stopAnimation();
      cardSwipeXAnim.stopAnimation();
      cardSwipeYAnim.stopAnimation();
      cardRotateAnim.stopAnimation();
      lockOnAnim.stopAnimation();
      assignedPopAnim.stopAnimation();
    }
  }, [taskState]);

  const handleSearch = async (text: string, type: "pickup" | "dropoff") => {
    if (type === "pickup") {
      setPickupLocation(text);
      setIsPickupValid(false);
    } else {
      setDropoffLocation(text);
      setIsDropoffValid(false);
    }
    
    setActiveField(type);
    
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const data = await customFetch<any[]>(`/api/v1/places/autocomplete?input=${encodeURIComponent(text)}`, { responseType: "json" });
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setSearchResults([]);
    }
  };

  const selectResult = async (result: any) => {
    let lat: number | null = null;
    let lng: number | null = null;
    
    try {
      if (Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lng))) {
        lat = Number(result.lat);
        lng = Number(result.lng);
      } else if (result.id) {
        const details = await customFetch<{ lat: number, lng: number }>(`/api/v1/places/details/${result.id}`);
        if (details && details.lat) {
          lat = details.lat;
          lng = details.lng;
        }
      }

      if (currentCoords && radius && lat !== null && lng !== null) {
        const distance = getDistanceFromLatLonInKm(currentCoords.lat, currentCoords.lng, lat, lng);
        
        if (distance > parseFloat(radius)) {
          Alert.alert("Out of Range", `This location is outside your selected ${radius}km radius.`);
          setSearchResults([]);
          setActiveField(null);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to fetch/validate place details:", e);
    }

    const address = result.description || result.name || result.address || "";
    if (activeField === "pickup") {
      setPickupLocation(address);
      if (lat !== null && lng !== null) setPickupCoords({lat, lng});
      setIsPickupValid(true);
    } else if (activeField === "dropoff") {
      setDropoffLocation(address);
      if (lat !== null && lng !== null) setDropoffCoords({lat, lng});
      setIsDropoffValid(true);
    }
    setSearchResults([]);
    setActiveField(null);
  };

  const handleIncreasePrice = async (amount: number) => {
    if (!localOrderId) return;
    setIsIncreasingPrice(amount);
    try {
      const updatedOrder = await customFetch<any>(`/api/v1/orders/${localOrderId}/increase-price`, {
        method: 'PATCH',
        body: JSON.stringify({ amount })
      });
      if (updatedOrder && updatedOrder.customerPrice) {
        setCurrentTaskPrice(updatedOrder.customerPrice);
      } else if (updatedOrder && updatedOrder.totalPrice) {
        setCurrentTaskPrice(updatedOrder.totalPrice);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to increase task price.");
    } finally {
      setIsIncreasingPrice(null);
    }
  };

  const handleCancelSearch = async () => {
    if (localOrderId) {
      try {
        await customFetch(`/api/v1/orders/${localOrderId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELLED" })
        });
      } catch (error) {
        console.warn("Failed to cancel order on backend", error);
      }
    }
    socketService.off("order_accepted", () => {});
    socketService.off("order_status_update", () => {});
    socketService.off("order_delayed_reason", () => {});
    setDelayedReason(null);
    setTaskState("idle");
    setAssignedDriver(null);
    setOrderId(null);
    setLocalOrderId(null);
  };

  const handleProceed = async () => {
    if (!isPickupValid || !pickupCoords?.lat) {
      Alert.alert("Missing Details", "Please select a valid pickup location.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing Details", "Please provide a brief description of the work.");
      return;
    }
    
    // START RIPPLE TRANSITION
    setIsTransitioningToSearch(true);
    rippleScaleAnim.setValue(0);
    rippleOpacityAnim.setValue(1);
    
    // Set searching states immediately to show the correct UI elements (deck and offer box) instantly
    setTaskState("searching");
    setCurrentTaskPrice(calculatedFare);
    
    Animated.parallel([
      Animated.timing(rippleScaleAnim, { toValue: 50, duration: 600, easing: Easing.out(Easing.poly(4)), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(rippleOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true })
      ])
    ]).start(() => {
       setIsTransitioningToSearch(false);
    });
    
    setTimeout(async () => {
      try {
        const stops: any[] = [
          {
            sequence: 1,
            type: "pickup",
            address: pickupLocation,
            lat: pickupCoords?.lat,
            lng: pickupCoords?.lng,
            instructions: description,
          }
        ];

      if (isDropoffValid && dropoffCoords?.lat) {
         stops.push({
           sequence: 2,
           type: "drop",
           address: dropoffLocation,
           lat: dropoffCoords?.lat,
           lng: dropoffCoords?.lng,
         });
      }

      // Create the order via backend
      const order = await customFetch<{ _id: string, message?: string, customerPrice?: number, totalPrice?: number }>("/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          serviceType: "helper",
          stops,
          duration: durationMode === "1hr" ? 1 : durationMode === "2hr" ? 2 : (customHours + customMinutes / 60) || 1,
          totals: {
            total: calculatedFare,
          },
        })
      });

      if (!order?._id) {
         throw new Error("Invalid response from server. No order ID returned.");
      }
      setOrderId(order._id);
      setLocalOrderId(order._id);
      setCurrentTaskPrice(order.customerPrice || order.totalPrice || calculatedFare);

      // Track the order via sockets
      console.log("Tracking order via socket:", order._id);
      socketService.trackOrder(order._id);

      // Listen for driver assignment
      const handleOrderAccepted = (data: any) => {
         console.log("Helper App: Received assignment event!", data);
         if (data.driver) {
           setDriver(data.driver);
         } else {
           // Fallback if payload doesn't contain driver details
           setDriver({ name: "Assigned Helper", vehicle: "On the way" });
         }
         setServiceType("helper");
         if (data.orderId || order?._id) {
           setOrderId(data.orderId || order._id);
           setLocalOrderId(data.orderId || order._id);
         }
         socketService.off("order_accepted", handleOrderAccepted);
         socketService.off("order_status_update", handleOrderStatus);
         
         // START HELPER ACCEPTED CINEMATIC TRANSITION
         setIsTransitioningToAssigned(true);
         
         blackoutOpacityAnim.setValue(0);
         stampScaleAnim.setValue(3);
         stampOpacityAnim.setValue(0);
         stampGlowAnim.setValue(0);
         
         Animated.sequence([
           // 1. Blackout
           Animated.timing(blackoutOpacityAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
           // 2. Slam Stamp
           Animated.parallel([
             Animated.timing(stampOpacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
             Animated.spring(stampScaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true })
           ]),
           // 3. Pulse Glow
           Animated.timing(stampGlowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
           // 4. Fade out transition & trigger assigned state
           Animated.parallel([
             Animated.timing(blackoutOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
             Animated.timing(stampOpacityAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
             Animated.timing(stampScaleAnim, { toValue: 5, duration: 400, useNativeDriver: true })
           ])
         ]).start(() => {
           setIsTransitioningToAssigned(false);
           setTaskState("assigned");
         });
      };
      
      const handleOrderStatus = (data: any) => {
         console.log("Helper App: Received status update:", data);
         if (data.status === "DRIVER_ASSIGNED" || data.status === "driver_assigned" || data.status === "accepted") {
            handleOrderAccepted(data);
         }
      };

      const handleOrderDelayedReason = (data: any) => {
         console.log("Helper App: Received delayed reason:", data);
         if (data.reason) {
            setDelayedReason(data.reason);
         }
      };
      
      socketService.on("order_accepted", handleOrderAccepted);
      socketService.on("order_status_update", handleOrderStatus);
      socketService.on("order_delayed_reason", handleOrderDelayedReason);

    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create task");
      setTaskState("idle");
    }
    }, 400);
  };

  // Dropoff is optional for General Work. We require Pickup and Description.
  const isProceedDisabled = !isPickupValid || description.trim().length === 0;

  // Calculate Fare based on distance and duration (Swiggy Genie / Rapido style)
  let calculatedFare = 0;
  if (pickupCoords) {
    const baseFare = 40; // Base fare covering pickup effort and first 2km
    const platformFee = 5; // Standard platform fee
    
    // Distance charge (₹15 per km after the first 2km)
    let distanceKm = 0;
    let distanceCharge = 0;
    if (dropoffCoords) {
      distanceKm = getDistanceFromLatLonInKm(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
      const extraDistance = Math.max(0, distanceKm - 2);
      distanceCharge = Math.round(extraDistance * 15);
    }
    
    // Duration/Time charge (₹80 per hour of dedicated helper time)
    let hours = 1;
    if (durationMode === "2hr") hours = 2;
    else if (durationMode === "custom") {
      if (customHours > 0 || customMinutes > 0) {
        hours = customHours + customMinutes / 60;
      }
    }
    const durationCharge = Math.round(hours * 80);
    
    const subtotal = baseFare + distanceCharge + durationCharge + platformFee;
    const taxes = Math.round(subtotal * 0.05); // 5% GST
    
    calculatedFare = subtotal + taxes;
  }

  const animatedHeaderHeight = formHeightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT < 850 ? 320 : 480 * scale, 360 * scale] // 0 = Searching, 1 = Idle/Assigned
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isScrolled ? (theme === "dark" ? "light-content" : "dark-content") : "light-content"} />

      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Fixed Top Header Bar */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            paddingTop: safeTop + (Platform.OS === "ios" ? 4 : 8),
            paddingBottom: 12,
            paddingHorizontal: 20 * scale,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: isScrolled ? (colors.surfaceContainerLowest || "#ffffff") : "#5c52eb",
            borderBottomWidth: isScrolled ? 1 : 0,
            borderBottomColor: colors.borderLight || "#E2E8F0",
            elevation: isScrolled ? 4 : 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isScrolled ? 0.08 : 0,
            shadowRadius: 4,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24 * scale} color={isScrolled ? (colors.onSurface || "#191C1E") : "#FFFFFF"} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isScrolled ? (colors.onSurface || "#191C1E") : "#FFFFFF", fontSize: 18 * scale, fontWeight: "700" }]}>
            Helper Task
          </Text>
          <View style={{ width: 40 * scale }} />
        </View>

        <ScrollView 
          ref={scrollViewRef} 
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          onScroll={(e) => {
            setScrollY(e.nativeEvent.contentOffset.y);
          }}
          scrollEventThrottle={16}
        >
          
          {/* Dynamic Purple Header */}
          <Animated.View style={{ backgroundColor: '#5c52eb', paddingTop: safeTop + 48 * scale, paddingBottom: 120 * scale, height: animatedHeaderHeight, overflow: 'hidden' }}>
        
        {/* Animated Crowded Road Parallax Background */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
           
           {/* Sky Background */}
           <View style={{ flex: 1, backgroundColor: '#5c52eb' }} />
           
           {/* Drifting Clouds */}
           <Animated.View style={{ flexDirection: 'row', position: 'absolute', top: 50 * scale, transform: [{ translateX: cloudScroll }], width: 1000 }}>
              {[...Array(6)].map((_, i) => (
                <View key={`c${i}`} style={{ width: 60 + Math.random()*60, height: 20 + Math.random()*15, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, marginLeft: 30 + Math.random()*50, marginTop: Math.random()*30 }} />
              ))}
           </Animated.View>

           {/* Scrolling City Skyline */}
           <Animated.View style={{ flexDirection: 'row', position: 'absolute', bottom: 110 * scale, alignItems: 'flex-end', transform: [{ translateX: skylineScroll }], width: 1000 }}>
              {[...Array(15)].map((_, i) => (
                 <View key={`b${i}`} style={{ width: 30 + Math.random()*40, height: 30 + Math.random()*90, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 2, borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
                    {/* Tiny Windows */}
                    <View style={{ position: 'absolute', top: 10, left: 10, width: 4, height: 4, backgroundColor: Math.random() > 0.5 ? 'rgba(255,220,0,0.4)' : 'transparent' }} />
                    <View style={{ position: 'absolute', top: 30, right: 10, width: 4, height: 4, backgroundColor: Math.random() > 0.5 ? 'rgba(255,220,0,0.4)' : 'transparent' }} />
                 </View>
              ))}
           </Animated.View>

           {/* The Road Surface */}
           <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 110 * scale, backgroundColor: 'rgba(0,0,0,0.15)', borderTopWidth: 2, borderColor: 'rgba(255,255,255,0.05)' }} />

           {/* Scrolling Dashed Road Lines */}
           <Animated.View style={{ flexDirection: 'row', position: 'absolute', bottom: 70 * scale, width: 1000, transform: [{ translateX: roadScroll }] }}>
              {[...Array(15)].map((_, i) => (
                 <View key={`d${i}`} style={{ width: 40 * scale, height: 3 * scale, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 * scale, marginRight: 40 * scale }} />
              ))}
           </Animated.View>

           {/* Moving Vehicles (Searching State) */}
           {taskState === "searching" && (
             <>
               <Animated.View style={{ position: 'absolute', bottom: 73 * scale, transform: [{ translateX: searchTrafficAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 1200] }) }] }}>
                 <Image source={require('@/assets/images/services/scooter_red_transparent.png')} style={{ width: 120 * scale, height: 95 * scale, opacity: 0.95 }} resizeMode="contain" />
               </Animated.View>
               <Animated.View style={{ position: 'absolute', bottom: 70 * scale, transform: [{ translateX: searchTrafficAnim.interpolate({ inputRange: [0, 1], outputRange: [1200, -200] }) }] }}>
                 <Image source={require('@/assets/images/services/scooter_blue_transparent.png')} style={{ width: 120 * scale, height: 95 * scale, opacity: 0.95, transform: [{ scaleX: -1 }] }} resizeMode="contain" />
               </Animated.View>
               <Animated.View style={{ position: 'absolute', bottom: 75 * scale, transform: [{ translateX: searchTrafficAnim.interpolate({ inputRange: [0, 1], outputRange: [-400, 1500] }) }] }}>
                 <Image source={require('@/assets/images/services/scooter_green_transparent.png')} style={{ width: 120 * scale, height: 95 * scale, opacity: 0.95 }} resizeMode="contain" />
               </Animated.View>
               <Animated.View style={{ position: 'absolute', bottom: 74 * scale, transform: [{ translateX: searchTrafficAnim.interpolate({ inputRange: [0, 1], outputRange: [-600, 1600] }) }] }}>
                 <Image source={require('@/assets/images/services/scooter_yellow_transparent.png')} style={{ width: 120 * scale, height: 95 * scale, opacity: 0.95 }} resizeMode="contain" />
               </Animated.View>
               <Animated.View style={{ position: 'absolute', bottom: 71 * scale, transform: [{ translateX: searchTrafficAnim.interpolate({ inputRange: [0, 1], outputRange: [1500, -400] }) }] }}>
                 <Image source={require('@/assets/images/services/scooter_orange_transparent.png')} style={{ width: 120 * scale, height: 95 * scale, opacity: 0.95, transform: [{ scaleX: -1 }] }} resizeMode="contain" />
               </Animated.View>
               <Animated.View style={{ position: 'absolute', bottom: 76 * scale, transform: [{ translateX: searchTrafficAnim.interpolate({ inputRange: [0, 1], outputRange: [-800, 1800] }) }] }}>
                 <Image source={require('@/assets/images/services/scooter_black_transparent.png')} style={{ width: 120 * scale, height: 95 * scale, opacity: 0.95 }} resizeMode="contain" />
               </Animated.View>
             </>
           )}

        </View>

        {/* Main Header Graphic Container */}
        <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 30 * scale, zIndex: 10 }}>
            {taskState === "assigned" ? (
              <LottieView
                 source={require('@/assets/images/services/success.json')} // Success Confetti
                 style={{ width: 220 * scale, height: 180 * scale }}
                 autoPlay
                 loop={false}
              />
            ) : taskState === "searching" ? (
              <View style={{ height: 20 * scale }} />
            ) : (
              <View style={{ width: 220 * scale, height: 180 * scale, alignItems: 'center', justifyContent: 'center' }}>
                 {/* The Destination Scene (House + Waving Customer) */}
                 <Animated.View style={{ 
                    position: 'absolute',
                    right: -35 * scale, bottom: -30 * scale,
                    opacity: personOpacity,
                    alignItems: 'flex-end', justifyContent: 'flex-end',
                    zIndex: 1
                 }}>

                    {/* Customer Waiting (Receiving Delivery) */}
                    <View style={{ zIndex: 10 }}>
                       <Image 
                         source={characterIndex === 0 
                           ? require('@/assets/images/services/male_customer_transparent.png') 
                           : require('@/assets/images/services/female_customer_transparent.png')} 
                         style={[
                           { width: 125 * scale, height: 210 * scale },
                           characterIndex === 1 && { transform: [{ scaleX: -1 }] }
                         ]} 
                         resizeMode="contain" 
                       />
                    </View>
                 </Animated.View>

                 {/* The Jumping Package */}
                 <Animated.View style={{
                    position: 'absolute',
                    left: 20 * scale, top: 80 * scale,
                    opacity: packageOpacity,
                    transform: [
                      { translateX: packageX },
                      { translateY: packageY },
                      { scale: packageScale },
                      { rotate: packageX.interpolate({ inputRange: [0, 100], outputRange: ['0deg', '360deg'] }) }
                    ],
                    zIndex: 20
                 }}>
                    <View style={{ width: 36 * scale, height: 36 * scale, backgroundColor: '#FFD700', borderRadius: 8 * scale, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width:0, height:4 * scale}, shadowOpacity: 0.3, shadowRadius: 5 * scale }}>
                       <Feather name="package" size={20 * scale} color="#8B4513" />
                    </View>
                 </Animated.View>

                 {/* The Scooter that drives away */}
                 <Animated.View style={{
                    position: 'absolute',
                    opacity: riderOpacity,
                    transform: [
                      { translateX: riderX }
                    ]
                 }}>
                   <View>
                     {/* Dynamic Engine Shadow */}
                     <Animated.View style={{ position: 'absolute', bottom: 15 * scale, left: 40 * scale, width: 140 * scale, height: 10 * scale, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 50 * scale, transform: [{ scale: bobAnim.interpolate({ inputRange: [-4, 0], outputRange: [0.8, 1] }) }] }} />

                     <Animated.View style={{ transform: [{ translateY: bobAnim }] }}>
                       <LottieView
                          source={require('@/assets/images/services/scooter.json')} // Transparent scooter
                          style={{ width: 220, height: 180, zIndex: 2 }}
                          autoPlay
                          loop
                       />
                       
                       {/* Animated Exhaust Smoke */}
                       <Animated.View style={{ position: 'absolute', bottom: 40, left: 30, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(150,150,150,0.4)', opacity: exhaustAnim.interpolate({ inputRange:[0, 1], outputRange:[0.6, 0] }), transform: [{ translateX: exhaustAnim.interpolate({ inputRange:[0, 1], outputRange:[0, -25] }) }, { scale: exhaustAnim.interpolate({ inputRange:[0, 1], outputRange:[0.5, 2] }) }] }} />
                       <Animated.View style={{ position: 'absolute', bottom: 35, left: 35, width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(150,150,150,0.3)', opacity: exhaustAnim.interpolate({ inputRange:[0, 1], outputRange:[0, 0.5] }), transform: [{ translateX: exhaustAnim.interpolate({ inputRange:[0, 1], outputRange:[20, -15] }) }, { scale: exhaustAnim.interpolate({ inputRange:[0, 1], outputRange:[0.2, 1.5] }) }] }} />
                     </Animated.View>


                   </View>
                 </Animated.View>
                 
              </View>
            )}
           </View>
           
           {/* The AI Matching Deck (Visible during search/assigned) */}
           <Animated.View style={[{ position: 'absolute', top: taskState === "searching" ? (SCREEN_HEIGHT < 850 ? 140 : 160 * scale) : 200 * scale, height: SCREEN_HEIGHT < 850 ? 240 : 320 * scale, left: 0, right: 0 }, { zIndex: 100, opacity: deckOpacityAnim, justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
                
                {/* Telemetry HUD */}
                <View style={{ position: 'absolute', top: SCREEN_HEIGHT < 850 ? -25 : -30 * scale, width: '100%', alignItems: 'center' }}>
                   {taskState === "searching" && (
                     <>
                       <Text style={{ color: '#fff', fontSize: 16 * scale, fontWeight: '800', letterSpacing: 2, opacity: 0.8 }}>
                         FILTERING NEARBY HELPERS...
                       </Text>
                       <Text style={{ color: '#00FFCC', fontSize: 12 * scale, fontWeight: '700', marginTop: 8 * scale, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                         {totalContacted} ONLINE IN {radius || 5}KM RADIUS
                       </Text>

                       {delayedReason && (
                         <View style={{ marginTop: 12 * scale, backgroundColor: 'rgba(239, 68, 68, 0.9)', paddingHorizontal: 16 * scale, paddingVertical: 10 * scale, borderRadius: 12 * scale, borderWidth: 1, borderColor: '#FCA5A5', flexDirection: 'row', alignItems: 'center', width: '90%' }}>
                           <Ionicons name="warning" size={20 * scale} color="#fff" style={{ marginRight: 8 * scale }} />
                           <Text style={{ color: '#fff', fontSize: 13 * scale, fontWeight: '700', flex: 1 }}>
                             Drivers are passing on this task because: <Text style={{ color: '#FCD34D', fontWeight: '900' }}>"{delayedReason}"</Text>. Consider increasing the price!
                           </Text>
                         </View>
                       )}
                     </>
                   )}
                </View>

                {/* Background Static Deck Cards (To give the illusion of a stack) */}
                {taskState === "searching" && (
                  <>
                    <View style={{ position: 'absolute', width: 220 * scale, height: (SCREEN_HEIGHT < 850 ? 200 : 280 * scale), backgroundColor: 'transparent', borderRadius: 20 * scale, transform: [{ scale: 0.8 }, { translateY: SCREEN_HEIGHT < 850 ? 25 : 40 * scale }] }} />
                    <View style={{ position: 'absolute', width: 220 * scale, height: (SCREEN_HEIGHT < 850 ? 200 : 280 * scale), backgroundColor: 'transparent', borderRadius: 20 * scale, transform: [{ scale: 0.9 }, { translateY: SCREEN_HEIGHT < 850 ? 12 : 20 * scale }] }} />
                  </>
                )}

                {/* The Swiping Top Card */}
                <Animated.View style={{
                   width: 220 * scale, height: (SCREEN_HEIGHT < 850 ? 200 : 280 * scale),
                   shadowColor: '#000', shadowOffset: { width: 0, height: 10 * scale }, shadowOpacity: 0.2, shadowRadius: 20 * scale,
                   transform: [
                     { translateX: cardSwipeXAnim },
                     { translateY: cardSwipeYAnim },
                     { rotate: cardRotateAnim.interpolate({ inputRange: [-30, 30], outputRange: ['-30deg', '30deg'] }) }
                   ]
                }}>
                   {/* Background Color that animates (JS Driver) */}
                   <Animated.View style={[StyleSheet.absoluteFill, {
                      backgroundColor: lockOnAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0.9)', '#10B981'] }),
                      borderRadius: 24 * scale,
                   }]} />

                   {/* Card Content inside */}
                   <View style={{ padding: SCREEN_HEIGHT < 850 ? 12 : 20 * scale, alignItems: 'center', width: '100%', height: '100%' }}>
                     {/* Card Profile Image Placeholder */}
                     <View style={{ width: SCREEN_HEIGHT < 850 ? 60 : 80 * scale, height: SCREEN_HEIGHT < 850 ? 60 : 80 * scale, borderRadius: SCREEN_HEIGHT < 850 ? 30 : 40 * scale, backgroundColor: 'rgba(0,0,0,0.1)', marginBottom: SCREEN_HEIGHT < 850 ? 10 : 16 * scale, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
                       <Feather name="user" size={SCREEN_HEIGHT < 850 ? 24 : 32 * scale} color={taskState === "assigned" ? "#fff" : "#5c52eb"} />
                     </View>
                   
                   {/* Card Details */}
                   {taskState === "assigned" && driver ? (
                     <>
                       <Text style={{ color: '#fff', fontSize: SCREEN_HEIGHT < 850 ? 16 : 20 * scale, fontWeight: '800', marginBottom: 4 * scale }}>{driver.name || "Driver"}</Text>
                       <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: SCREEN_HEIGHT < 850 ? 12 : 14 * scale, fontWeight: '600', marginBottom: SCREEN_HEIGHT < 850 ? 8 : 16 * scale }}>{driver.vehicle || "Helper"}</Text>
                     </>
                   ) : (
                     <>
                       <View style={{ width: '80%', height: SCREEN_HEIGHT < 850 ? 8 : 12 * scale, borderRadius: SCREEN_HEIGHT < 850 ? 4 : 6 * scale, backgroundColor: taskState === "assigned" ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', marginBottom: SCREEN_HEIGHT < 850 ? 8 : 12 * scale }} />
                       <View style={{ width: '60%', height: SCREEN_HEIGHT < 850 ? 8 : 12 * scale, borderRadius: SCREEN_HEIGHT < 850 ? 4 : 6 * scale, backgroundColor: taskState === "assigned" ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', marginBottom: SCREEN_HEIGHT < 850 ? 16 : 24 * scale }} />
                     </>
                   )}
                   
                   {/* Lock-On Checkmark or Searching Spinner */}
                   {taskState === "assigned" ? (
                     <View style={{ width: SCREEN_HEIGHT < 850 ? 40 : 50 * scale, height: SCREEN_HEIGHT < 850 ? 40 : 50 * scale, borderRadius: SCREEN_HEIGHT < 850 ? 20 : 25 * scale, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 * scale }}>
                        <Feather name="check" size={SCREEN_HEIGHT < 850 ? 20 : 24 * scale} color="#10B981" />
                     </View>
                   ) : (
                     <View style={{ flexDirection: 'row', gap: 6 * scale }}>
                        <View style={{ width: 8 * scale, height: 8 * scale, borderRadius: 4 * scale, backgroundColor: '#5c52eb' }} />
                        <View style={{ width: 8 * scale, height: 8 * scale, borderRadius: 4 * scale, backgroundColor: '#5c52eb', opacity: 0.6 }} />
                        <View style={{ width: 8 * scale, height: 8 * scale, borderRadius: 4 * scale, backgroundColor: '#5c52eb', opacity: 0.3 }} />
                     </View>
                   )}
                   </View>
                </Animated.View>

             </Animated.View>
          </Animated.View>

        {/* Form Container */}
          <Animated.View style={{ 
            backgroundColor: colors.background, 
            borderTopLeftRadius: 30 * scale, borderTopRightRadius: 30 * scale, 
            marginTop: -10 * scale, padding: 24 * scale, paddingBottom: 0, flex: 1,
            elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10
          }}>
            <View style={{ alignSelf: 'center', width: 40 * scale, height: 5 * scale, borderRadius: 3 * scale, backgroundColor: colors.border, marginBottom: 20 * scale }} />
            
            {taskState === "searching" ? (
               <View style={{ width: '100%' }}>
                 <View style={{ gap: 16 * scale, paddingBottom: 12 }}>
                  
                  {/* CURRENT OFFER */}
                  {currentTaskPrice !== null && (
                    <View style={{ paddingVertical: 8 * scale, paddingHorizontal: 0, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <View>
                         <Text style={{ color: '#475569', fontSize: 10 * scale, fontWeight: '800', letterSpacing: 1, marginBottom: 2 * scale }}>CURRENT OFFER</Text>
                         <Text style={{ color: '#5c52eb', fontSize: 28 * scale, fontWeight: '800', letterSpacing: -0.5 }}>₹{currentTaskPrice}</Text>
                      </View>
                      <View style={{ width: 38 * scale, height: 38 * scale, borderRadius: 19 * scale, backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center' }}>
                         <Ionicons name="pricetag" size={18 * scale} color="#5c52eb" style={{ transform: [{ rotate: '-45deg' }] }} />
                      </View>
                    </View>
                  )}

                  {/* MARKET RESPONSE */}
                  {totalContacted > 0 && (
                    <View style={{ width: '100%', backgroundColor: 'transparent', paddingVertical: 8 * scale, paddingHorizontal: 0 }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 * scale }}>
                          <View style={{ width: 36 * scale, height: 36 * scale, borderRadius: 18 * scale, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 10 * scale }}>
                            <Ionicons name="people-outline" size={18 * scale} color="#DC2626" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10 * scale, fontWeight: '800', color: '#B91C1C', marginBottom: 2 * scale, letterSpacing: 1 }}>MARKET RESPONSE</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                              <Text style={{ fontSize: 20 * scale, fontWeight: '800', color: '#DC2626' }}>{rejectedCount}</Text>
                              <Text style={{ fontSize: 12 * scale, fontWeight: '700', color: '#DC2626', marginLeft: 4 * scale }}>declined out of {totalContacted}</Text>
                            </View>
                          </View>
                          <Ionicons name="bar-chart-outline" size={18 * scale} color="#FCA5A5" />
                       </View>
                       <Text style={{ fontSize: 11 * scale, color: '#475569', fontWeight: '500' }}>We're finding the best match for you.</Text>
                    </View>
                  )}
                  
                  {/* ATTRACT HELPERS */}
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 * scale }}>
                      <Ionicons name="flash" size={16 * scale} color="#5c52eb" style={{ marginRight: 8 * scale }} />
                      <Text style={{ color: '#5c52eb', fontSize: 13 * scale, fontWeight: '800', letterSpacing: 1 }}>ATTRACT HELPERS FASTER</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }} contentContainerStyle={{ gap: 10 * scale, paddingHorizontal: 4 * scale }}>
                      {[10, 20, 30, 40, 50].map(amount => (
                        <TouchableOpacity
                          key={amount}
                          onPress={() => handleIncreasePrice(amount)}
                          disabled={isIncreasingPrice === amount}
                          style={{
                            width: 65 * scale,
                            height: 75 * scale,
                            borderRadius: 16 * scale,
                            backgroundColor: isIncreasingPrice === amount ? '#E5E7EB' : '#fff',
                            borderWidth: 1,
                            borderColor: isIncreasingPrice === amount ? '#D1D5DB' : '#F1F5F9',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000', shadowOffset: { width: 0, height: 2 * scale }, shadowOpacity: 0.05, shadowRadius: 4 * scale, elevation: 1
                          }}
                        >
                          <Ionicons name="trending-up" size={20 * scale} color="#5c52eb" style={{ marginBottom: 6 * scale }} />
                          <Text style={{ color: '#5c52eb', fontWeight: '900', fontSize: 16 * scale }}>+₹{amount}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                
                {/* CANCEL BUTTON */}
                <View style={{ width: '100%', alignItems: 'center', marginTop: 4 * scale }}>
                  <TouchableOpacity 
                    style={{ width: '100%', paddingVertical: 16 * scale, borderRadius: 24 * scale, backgroundColor: '#5c52eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 * scale }}
                    onPress={handleCancelSearch}
                  >
                    <View style={{ width: 28 * scale, height: 28 * scale, borderRadius: 14 * scale, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: 16 * scale }}>
                      <Ionicons name="close" size={18 * scale} color="#fff" />
                    </View>
                    <Text style={{ color: '#fff', fontSize: 15 * scale, fontWeight: '800', letterSpacing: 0.5 }}>CANCEL SCAN</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#94A3B8', fontSize: 12 * scale, fontWeight: '500' }}>You can cancel anytime</Text>
                </View>
              </View>
            ) : taskState === "assigned" && driver ? (
               <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 0, paddingBottom: 24, minHeight: 400 }}>
                  <Animated.View style={{ 
                     transform: [{ scale: assignedPopAnim }, { translateY: assignedPopAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }], 
                     opacity: assignedPopAnim,
                     alignItems: 'center',
                     marginTop: -70, // Pop OUT of the white form container overlapping the purple header
                     marginBottom: 20
                  }}>
                     <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: '#fff', elevation: 15, shadowColor: '#5c52eb', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#5c52eb' }}>
                        <MaterialCommunityIcons name="moped" size={80} color="#5c52eb" />
                     </View>
                     <View style={{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, position: 'absolute', bottom: -10, borderWidth: 2, borderColor: '#fff' }}>
                        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>ON THE WAY</Text>
                     </View>
                  </Animated.View>

                  <Animated.View style={{ opacity: assignedPopAnim, width: '100%', alignItems: 'center' }}>
                     <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 4, letterSpacing: -0.5 }}>{driver.name || "Driver"}</Text>
                     <Text style={{ fontSize: 16, color: 'gray', fontWeight: '700', marginBottom: 24 }}>{driver.vehicle || "Helper"} • <Ionicons name="star" size={14} color="#D97706" /> 4.9</Text>
                  
                     {/* Action Grid */}
                     <View style={{ flexDirection: 'row', gap: 16, width: '100%', marginBottom: 24 }}>
                        <TouchableOpacity 
                           onPress={() => router.push('/chat')}
                           style={{ flex: 1, backgroundColor: '#5c52eb', paddingVertical: 20, borderRadius: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: '#5c52eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }}
                        >
                           <Ionicons name="chatbubble-ellipses" size={24} color="#fff" style={{ marginRight: 10 }} />
                           <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Message</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                           onPress={() => Linking.openURL(`tel:${driver.phone || "0000000000"}`)}
                           style={{ flex: 1, backgroundColor: 'rgba(92, 82, 235, 0.1)', paddingVertical: 20, borderRadius: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                        >
                           <Feather name="phone" size={24} color="#5c52eb" style={{ marginRight: 10 }} />
                           <Text style={{ color: '#5c52eb', fontSize: 18, fontWeight: '800' }}>Call</Text>
                        </TouchableOpacity>
                     </View>
                     
                     {/* Cancel Button */}
                     <TouchableOpacity 
                        onPress={handleCancelSearch}
                        style={{ paddingVertical: 16, paddingHorizontal: 32 }}
                     >
                        <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '700' }}>Cancel Task</Text>
                     </TouchableOpacity>
                  </Animated.View>
               </View>
            ) : (
                <>
                <Text style={[styles.introTitle, { color: colors.text }]}>What do you need?</Text>
                <Text style={[styles.introSubtitle, { color: colors.textSecondary }]}>
                  Fill in the details below and slide to assign the task.
                </Text>

          {/* Location Section */}
          <View style={[styles.sectionContainer, { zIndex: 10 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Locations</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              
              {/* Pickup Input */}
              <View style={{ zIndex: 2000 }}>
                <View style={[styles.inputRow, activeField === "pickup" && { borderColor: colors.primary, borderWidth: 1, borderRadius: 12 }]}>
                  <View style={[styles.locationDot, { backgroundColor: '#10B981' }]} />
                  <TextInput 
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Pickup Location"
                    placeholderTextColor={colors.textSecondary}
                    value={pickupLocation}
                    onChangeText={(t) => handleSearch(t, "pickup")}
                    onFocus={() => {
                      setActiveField("pickup");
                      if (pickupLocation.length >= 2) handleSearch(pickupLocation, "pickup");
                    }}
                  />
                  {pickupLocation.length > 0 && (
                    <TouchableOpacity onPress={() => { setPickupLocation(""); setIsPickupValid(false); }} style={{ marginRight: 8 }}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleUseCurrentLocation} style={{ padding: 4 }}>
                    <Ionicons name="locate" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {activeField === "pickup" && searchResults.length > 0 && (
                  <View style={[styles.customDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {searchResults.map((result, idx) => (
                      <TouchableOpacity 
                        key={`${result.place_id || result.id || 'res'}-${idx}`} 
                        style={[styles.customDropdownRow, idx < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
                        onPress={() => selectResult(result)}
                      >
                        <Ionicons name="location" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                        <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{result.description || result.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Timeline Dotted Line */}
              <View style={styles.timelineDottedContainer}>
                <View style={[styles.dotLine, { backgroundColor: colors.border }]} />
                <View style={[styles.dotLine, { backgroundColor: colors.border }]} />
                <View style={[styles.dotLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Dropoff Input */}
              <View style={{ zIndex: 1000 }}>
                <View style={[styles.inputRow, activeField === "dropoff" && { borderColor: colors.primary, borderWidth: 1, borderRadius: 12 }]}>
                  <View style={[styles.locationSquare, { backgroundColor: '#EF4444' }]} />
                  <TextInput 
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Drop-off (Optional for General Work)"
                    placeholderTextColor={colors.textSecondary}
                    value={dropoffLocation}
                    onChangeText={(t) => handleSearch(t, "dropoff")}
                    onFocus={() => {
                      setActiveField("dropoff");
                      if (dropoffLocation.length >= 2) handleSearch(dropoffLocation, "dropoff");
                    }}
                  />
                  {dropoffLocation.length > 0 && (
                    <TouchableOpacity onPress={() => { setDropoffLocation(""); setIsDropoffValid(false); }}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                
                {activeField === "dropoff" && searchResults.length > 0 && (
                  <View style={[styles.customDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {searchResults.map((result, idx) => (
                      <TouchableOpacity 
                        key={`${result.place_id || result.id || 'res'}-${idx}`} 
                        style={[styles.customDropdownRow, idx < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
                        onPress={() => selectResult(result)}
                      >
                        <Ionicons name="location" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                        <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{result.description || result.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

            </View>
          </View>

          {/* Time / Duration Section */}
          <View style={[styles.sectionContainer, { zIndex: 5 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Time Required</Text>
            <View style={styles.timeChipsContainer}>
              <TouchableOpacity 
                style={[styles.timeChip, durationMode === "1hr" ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setDurationMode("1hr")}
              >
                <Feather name="clock" size={16} color={durationMode === "1hr" ? "#fff" : colors.text} />
                <Text style={[styles.timeChipText, { color: durationMode === "1hr" ? "#fff" : colors.text }]}>1 Hour</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.timeChip, durationMode === "2hr" ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setDurationMode("2hr")}
              >
                <Feather name="clock" size={16} color={durationMode === "2hr" ? "#fff" : colors.text} />
                <Text style={[styles.timeChipText, { color: durationMode === "2hr" ? "#fff" : colors.text }]}>2 Hours</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.timeChip, durationMode === "custom" ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setDurationMode("custom")}
              >
                <Feather name="edit-2" size={16} color={durationMode === "custom" ? "#fff" : colors.text} />
                <Text style={[styles.timeChipText, { color: durationMode === "custom" ? "#fff" : colors.text }]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {durationMode === "custom" && (
              <View style={styles.customTimeSelectors}>
                {/* Hours Selector */}
                <View style={[styles.timeSelectorBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.timeSelectorLabel, { color: colors.textSecondary }]}>Hours</Text>
                  <View style={styles.timeSelectorControls}>
                    <TouchableOpacity onPress={() => setCustomHours(Math.max(0, customHours - 1))} style={[styles.stepperBtn, { backgroundColor: colors.background }]}>
                      <Feather name="minus" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.stepperValue, { color: colors.text }]}>{customHours}</Text>
                    <TouchableOpacity onPress={() => setCustomHours(customHours + 1)} style={[styles.stepperBtn, { backgroundColor: colors.background }]}>
                      <Feather name="plus" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Minutes Selector */}
                <View style={[styles.timeSelectorBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.timeSelectorLabel, { color: colors.textSecondary }]}>Minutes</Text>
                  <View style={styles.timeSelectorControls}>
                    <TouchableOpacity onPress={() => setCustomMinutes(Math.max(0, customMinutes - 15))} style={[styles.stepperBtn, { backgroundColor: colors.background }]}>
                      <Feather name="minus" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.stepperValue, { color: colors.text }]}>{customMinutes}</Text>
                    <TouchableOpacity onPress={() => setCustomMinutes(customMinutes === 45 ? 0 : customMinutes + 15)} style={[styles.stepperBtn, { backgroundColor: colors.background }]}>
                      <Feather name="plus" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

            {/* Task Description Section */}
            <View style={[styles.sectionContainer, { zIndex: 1, marginBottom: 24 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Task Description</Text>
              <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.textArea, { color: colors.text }]}
                  placeholder="E.g. Need help moving a few boxes to the 2nd floor, buying groceries from the list, etc."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                  value={description}
                  onChangeText={setDescription}
                  onFocus={() => {
                    setIsDescriptionFocused(true);
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                  onBlur={() => setIsDescriptionFocused(false)}
                />
              </View>
            </View>

            {/* Slide to Confirm Footer */}
            <View style={[styles.footer, { paddingBottom: 12, backgroundColor: colors.background }]}>
              {calculatedFare > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Feather name="credit-card" size={16} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary, flex: 1 }}>
                    Estimated Helper Fare:
                  </Text>
                  <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '900' }}>
                    ₹{calculatedFare}
                  </Text>
                </View>
              )}
              <View style={{ opacity: isProceedDisabled ? 0.5 : 1, width: '100%' }} pointerEvents={isProceedDisabled ? "none" : "auto"}>
                <DeliverySlider 
                  title="SLIDE TO DISPATCH"
                  onConfirm={handleProceed}
                  colors={colors}
                />
              </View>
              {isProceedDisabled && (
                <Text style={[styles.disabledHint, { color: colors.textSecondary }]}>
                  {!isPickupValid ? "Please provide a valid pickup location" : "Please provide a task description"}
                </Text>
              )}
            </View>
            </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* RIPPLE TRANSITION OVERLAY */}
      {isTransitioningToSearch && (
         <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, pointerEvents: 'none', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 150 }}>
            <Animated.View style={{
               width: 100, height: 100, borderRadius: 50, backgroundColor: '#5c52eb',
               opacity: rippleOpacityAnim,
               transform: [{ scale: rippleScaleAnim }]
            }} />
            <Animated.Text style={{
               position: 'absolute', top: '45%', color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 2,
               opacity: rippleOpacityAnim.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1] }),
               textShadowColor: 'rgba(255,255,255,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10
            }}>INITIALIZING...</Animated.Text>
         </View>
      )}

      {/* HELPER FOUND CINEMATIC OVERLAY */}
      {isTransitioningToAssigned && (
         <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#000', opacity: blackoutOpacityAnim }} />
            <Animated.View style={{
               transform: [{ scale: stampScaleAnim }, { rotate: '-10deg' }],
               opacity: stampOpacityAnim,
               alignItems: 'center', justifyContent: 'center'
            }}>
               <Animated.Text style={{
                  color: '#4ADE80', fontSize: 48, fontWeight: '900', letterSpacing: 4, textShadowColor: '#22C55E', textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: stampGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 40] }),
                  borderWidth: 6, borderColor: '#4ADE80', padding: 20, borderRadius: 16
               }}>MATCH FOUND</Animated.Text>
            </Animated.View>
         </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16 * scale,
    paddingBottom: 16 * scale,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backBtn: {
    padding: 8 * scale,
    marginLeft: -8 * scale,
  },
  headerTitle: {
    fontSize: 18 * scale,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 0,
    flexGrow: 1,
  },
  introSection: {
    marginBottom: 32 * scale,
  },
  driverBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12 * scale,
    paddingVertical: 6 * scale,
    borderRadius: 20 * scale,
    marginBottom: 12 * scale,
  },
  driverBadgeText: {
    fontSize: 13 * scale,
    fontWeight: '700',
    marginLeft: 6 * scale,
  },
  introTitle: {
    fontSize: 28 * scale,
    fontWeight: "900",
    marginBottom: 8 * scale,
    letterSpacing: -0.5,
  },
  introSubtitle: {
    fontSize: 15 * scale,
    lineHeight: 22 * scale,
  },
  sectionContainer: {
    marginBottom: 28 * scale,
  },
  sectionTitle: {
    fontSize: 16 * scale,
    fontWeight: "700",
    marginBottom: 12 * scale,
  },
  card: {
    borderRadius: 16 * scale,
    borderWidth: 1,
    padding: 16 * scale,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8 * scale,
    elevation: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 48 * scale,
    paddingHorizontal: 8 * scale,
  },
  locationDot: {
    width: 12 * scale,
    height: 12 * scale,
    borderRadius: 6 * scale,
    marginRight: 12 * scale,
  },
  locationSquare: {
    width: 12 * scale,
    height: 12 * scale,
    borderRadius: 2 * scale,
    marginRight: 12 * scale,
  },
  timelineDottedContainer: {
    width: 12 * scale,
    height: 24 * scale,
    alignItems: "center",
    justifyContent: "space-evenly",
    marginVertical: 4 * scale,
  },
  dotLine: {
    width: 2 * scale,
    height: 4 * scale,
    borderRadius: 1 * scale,
  },
  input: {
    flex: 1,
    fontSize: 15 * scale,
  },
  customDropdown: {
    marginTop: 4 * scale,
    borderRadius: 8 * scale,
    borderWidth: 1,
    overflow: "hidden",
    position: "absolute",
    top: 52 * scale,
    left: 0,
    right: 0,
    zIndex: 3000,
  },
  customDropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14 * scale,
  },
  timeChipsContainer: {
    flexDirection: "row",
    gap: 12 * scale,
  },
  timeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44 * scale,
    borderRadius: 22 * scale,
    borderWidth: 1,
  },
  timeChipText: {
    fontSize: 14 * scale,
    fontWeight: "600",
    marginLeft: 6 * scale,
  },
  customTimeSelectors: {
    flexDirection: 'row',
    gap: 12 * scale,
    marginTop: 16 * scale,
  },
  timeSelectorBox: {
    flex: 1,
    borderRadius: 16 * scale,
    borderWidth: 1,
    padding: 12 * scale,
    alignItems: 'center',
  },
  timeSelectorLabel: {
    fontSize: 13 * scale,
    fontWeight: '600',
    marginBottom: 12 * scale,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeSelectorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4 * scale,
  },
  stepperBtn: {
    width: 36 * scale,
    height: 36 * scale,
    borderRadius: 18 * scale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 20 * scale,
    fontWeight: '800',
  },
  descriptionCard: {
    borderRadius: 16 * scale,
    borderWidth: 1,
    padding: 16 * scale,
    minHeight: 120 * scale,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8 * scale,
    elevation: 2,
  },
  textArea: {
    flex: 1,
    fontSize: 15 * scale,
    lineHeight: 22 * scale,
  },
  footer: {
    marginTop: 20 * scale,
    width: '100%',
    alignItems: 'center',
  },
  disabledHint: {
    marginTop: 12 * scale,
    fontSize: 13 * scale,
    fontWeight: '500',
    textAlign: 'center',
  },
});
