import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";

const TOP_CITIES = [
  { name: "New Delhi", icon: "monument" },
  { name: "Mumbai", icon: "building" },
  { name: "Bengaluru", icon: "landmark" },
  { name: "Kolkata", icon: "synagogue" },
  { name: "Hyderabad", icon: "mosque" },
  { name: "Ahmedabad", icon: "university" },
];

const OTHER_CITIES = [
  "Abohar", "Adilabad", "Agartala", "Agra", "Ahmedabad", "Ahmednagar", "Aizawl", "Ajmer", "Akola", "Aligarh", "Allahabad", "Alwar", "Ambala", "Ambarnath", "Ambattur", "Amravati", "Amritsar", "Amroha", "Anand", "Anantapur", "Anantnag", "Arrah", "Asansol", "Aurangabad", "Avadi", "Baharampur", "Bahraich", "Bally", "Bangalore", "Baranagar", "Barasat", "Bardhaman", "Bareilly", "Bathinda", "Begusarai", "Belgaum", "Bellary", "Bhadravati", "Bhagalpur", "Bharatpur", "Bhatpara", "Bhavnagar", "Bhilai", "Bhilwara", "Bhiwandi", "Bhiwani", "Bhopal", "Bhubaneswar", "Bhusawal", "Bidar", "Bidhannagar", "Bihar Sharif", "Bikaner", "Bilaspur", "Bokaro", "Bongaigaon", "Bulandshahr", "Burhanpur", "Buxar", "Chandigarh", "Chandrapur", "Chennai", "Chhapra", "Chinsurah", "Chittoor", "Coimbatore", "Cuttack", "Danapur", "Darbhanga", "Davangere", "Dehradun", "Delhi", "Deoghar", "Dewas", "Dhanbad", "Dharmavaram", "Dhule", "Dindigul", "Durg", "Durgapur", "Eluru", "Erode", "Etawah", "Faridabad", "Farrukhabad", "Fatehpur", "Firozabad", "Gandhidham", "Gandhinagar", "Ganganagar", "Gangtok", "Gaya", "Ghaziabad", "Ghazipur", "Giridih", "Godhra", "Gondia", "Gorakhpur", "Greater Noida", "Gudivada", "Gulbarga", "Guntakal", "Guntur", "Gurgaon", "Guwahati", "Gwalior", "Hajipur", "Haldia", "Haldwani", "Haora", "Hapur", "Haridwar", "Hazaribagh", "Hindupur", "Hisar", "Hoshiarpur", "Howrah", "Hubli-Dharwad", "Hugli-Chinsurah", "Hyderabad", "Ichalkaranji", "Imphal", "Indore", "Itarsi", "Jabalpur", "Jaipur", "Jalandhar", "Jalgaon", "Jalna", "Jamalpur", "Jammu", "Jamnagar", "Jamshedpur", "Jaunpur", "Jehanabad", "Jhansi", "Jodhpur", "Junagadh", "Kadapa", "Kakinada", "Kalyan-Dombivali", "Kamarhati", "Kanchipuram", "Kanpur", "Karawal Nagar", "Karimnagar", "Karnal", "Katihar", "Kavali", "Khammam", "Khandwa", "Kharagpur", "Kirari Suleman Nagar", "Kishanganj", "Kochi", "Kolhapur", "Kolkata", "Kollam", "Korba", "Kota", "Kozhikode", "Kulti", "Kurnool", "Latur", "Loni", "Lucknow", "Ludhiana", "Machilipatnam", "Madanapalle", "Madurai", "Mahbubnagar", "Maheshtala", "Malegaon", "Mangalore", "Mango", "Mathura", "Mau", "Meerut", "Mira-Bhayandar", "Miryalaguda", "Mirzapur", "Moradabad", "Morbi", "Morena", "Motihari", "Mumbai", "Munger", "Muzaffarnagar", "Muzaffarpur", "Mysore", "Nadiad", "Nagercoil", "Nagaon", "Nagpur", "Naihati", "Nanded", "Nandyal", "Narasaraopet", "Nashik", "Navi Mumbai", "Nellore", "New Delhi", "Nizamabad", "Noida", "North Dumdum", "Ongole", "Orai", "Ozhukarai", "Pali", "Panihati", "Panipat", "Panvel", "Parbhani", "Patiala", "Patna", "Phagwara", "Pimpri-Chinchwad", "Pondicherry", "Proddatur", "Pudukkottai", "Pune", "Purnia", "Raebareli", "Raichur", "Raiganj", "Raipur", "Rajahmundry", "Rajapalayam", "Rajarhat Gopalpur", "Rajkot", "Rajnandgaon", "Ramagundam", "Rampur", "Ranchi", "Ratlam", "Rewa", "Rohtak", "Roorkee", "Rourkela", "Sagar", "Saharanpur", "Saharsa", "Salem", "Sambalpur", "Sambhal", "Sangli", "Sasaram", "Satara", "Satna", "Secunderabad", "Serampore", "Shahjahanpur", "Shimla", "Shivamogga", "Sikar", "Siliguri", "Singrauli", "Sirsa", "Siwan", "Solapur", "Sonipat", "South Dumdum", "Sri Ganganagar", "Srikakulam", "Srinagar", "Surat", "Suryapet", "Tadepalligudem", "Tadipatri", "Tenali", "Thane", "Thanjavur", "Thiruvananthapuram", "Thoothukudi", "Thrissur", "Tinsukia", "Tiruchirappalli", "Tirunelveli", "Tirupati", "Tiruppur", "Tiruvottiyur", "Tumkur", "Udaipur", "Udupi", "Ujjain", "Ulhasnagar", "Uluberia", "Unnao", "Vadodara", "Valsad", "Vapi", "Varanasi", "Vasai-Virar", "Vellore", "Vijayanagaram", "Vijayawada", "Visakhapatnam", "Warangal", "Yamunanagar"
];
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { customFetch } from "@/utils/api/custom-fetch";
import { useAuthStore } from "@/contexts/authStore";
import * as Location from "expo-location";
import MapView from "react-native-maps";

export default function AddAddressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const searchInputRef = useRef<TextInput>(null);

  const [label, setLabel] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [shortAddress, setShortAddress] = useState("Select an area");
  const [cityOrCountry, setCityOrCountry] = useState("Select a city");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [completeAddress, setCompleteAddress] = useState("");
  const [contactType, setContactType] = useState<"myself" | "someone_else">("someone_else");
  const [receiverName, setReceiverName] = useState("");
  const [step, setStep] = useState(params.step === "2" ? 2 : 1);
  const [region, setRegion] = useState({
    latitude: 27.1751,
    longitude: 78.0421,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [showCityModal, setShowCityModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // Only auto-locate if Map View is opened and we haven't picked a city manually
    if (step === 1 && cityOrCountry === "Select a city") {
      handleUseCurrentLocation();
    }
    // Quietly detect location for unbiased searching, without modifying address fields
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch(e) {}
    })();
  }, [step]);

  const handleUseCurrentLocation = async () => {
    try {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const newRegion = {
        ...region,
        latitude,
        longitude,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);

      await fetchAddressForCoords(latitude, longitude);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddressForCoords = async (lat: number, lng: number) => {
    try {
      setShortAddress("Locating...");
      setCityOrCountry("...");

      // Use free native OS geocoding instead of relying on the backend Google Maps key
      const [place] = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (place) {
        const fullAddress = [place.name, place.streetNumber, place.street, place.city, place.region, place.country]
          .filter(Boolean)
          .join(", ");

        setAddressLine(fullAddress);
        setShortAddress(place.name || place.street || place.city || "Selected Location");

        let sub = [place.city, place.region].filter(Boolean).join(", ");
        if (!sub && place.country) sub = place.country;
        setCityOrCountry(sub || "Unknown Area");
      } else {
        setShortAddress("Unknown Location");
        setCityOrCountry("Try adjusting the pin");
      }
    } catch (error) {
      console.log("Native reverse geocode failed", error);
      setShortAddress("Location not found");
      setCityOrCountry("Check your connection or API");
    }
  };

  const onRegionChangeComplete = async (r: any) => {
    setRegion(r);
    await fetchAddressForCoords(r.latitude, r.longitude);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 0) {
      setSearching(true);
      try {
        const locQuery = userCoords ? `&lat=${userCoords.lat}&lng=${userCoords.lng}&radius=50000` : "";
        const results = await customFetch<any[]>(`/api/places/autocomplete?input=${encodeURIComponent(text)}${locQuery}`);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = async (item: any) => {
    try {
      const details = await customFetch<any>(`/api/places/details/${item.id}`);
      const newRegion = {
        ...region,
        latitude: details.lat,
        longitude: details.lng,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      setSearchQuery("");
      setSearchResults([]);
      await fetchAddressForCoords(details.lat, details.lng);
    } catch (error) {
      console.error("Select place error:", error);
    }
  };

  const handleSelectAreaSearchResultModal = async (item: any) => {
    await handleSelectSearchResult(item);
    setShowAreaModal(false);
  };

  const { user, setUser } = useAuthStore();

  const handleSave = async () => {
    if (!completeAddress || !phone || !receiverName) {
      Alert.alert("Missing information", "Please fill all required fields (*).");
      return;
    }

    try {
      setLoading(true);
      const finalAddress = `${completeAddress}, ${addressLine}`;
      const finalLabel = contactType === "myself" ? "Home" : (label.trim() || receiverName || "Other");

      const updatedAddresses = await customFetch<any[]>("/api/users/addresses", {
        method: "POST",
        body: JSON.stringify({
          label: finalLabel,
          addressLine: finalAddress,
          phone,
          receiverName,
          coordinates: {
            lat: region.latitude,
            lng: region.longitude,
          },
        }),
      });

      if (user) {
        setUser({ ...user, addresses: updatedAddresses });
      }

      Alert.alert("Success", "Address saved successfully!");
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to save address.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCity = async (cityName: string) => {
    setCityOrCountry(cityName);
    setShortAddress("Select an area");
    setAddressLine("");
    setShowCityModal(false);

    try {
      const geoResult = await Location.geocodeAsync(`${cityName}, India`);
      if (geoResult && geoResult.length > 0) {
        const coords = { lat: geoResult[0].latitude, lng: geoResult[0].longitude };
        setUserCoords(coords);
        setRegion(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
      }
    } catch (error) {
      console.error("Geocode error for city:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { step === 2 ? setStep(1) : router.back() }} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? "Confirm map pin location" : "Add address details"}
        </Text>
      </View>

      {step === 1 ? (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
          />

          <View style={styles.searchOverlayWrapper}>
            <View style={styles.searchOverlay}>
              <Feather name="search" size={20} color="#4B5563" style={{ marginRight: 10 }} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search for a new area, locality..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searching && <ActivityIndicator size="small" color="#F87171" />}
            </View>

            {searchResults.length > 0 && (
              <ScrollView style={styles.searchResultsBox} keyboardShouldPersistTaps="handled">
                {searchResults.map(item => (
                  <TouchableOpacity key={item.id} style={styles.searchItemRow} onPress={() => handleSelectSearchResult(item)}>
                    <Text style={styles.searchItemName}>{item.name}</Text>
                    <Text style={styles.searchItemAddress} numberOfLines={1}>{item.address}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.centerMarkerContainer} pointerEvents="none">
            <View style={styles.tooltipBubble}>
              <Text style={styles.tooltipText}>Move the pin to adjust your location</Text>
            </View>
            <View style={styles.tooltipTriangle} />
            <View style={styles.markerIcon}>
              <View style={styles.markerDot} />
            </View>
            <View style={styles.markerPin} />
            <View style={styles.markerShadow} />
          </View>

          <View style={styles.bottomOverlay}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <TouchableOpacity style={styles.useCurrentLocBtn} onPress={handleUseCurrentLocation}>
                <Feather name="crosshair" size={16} color="#06B6D4" />
                <Text style={styles.useCurrentLocText}>Use current location</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomCard}>
              <Text style={styles.cardHeader}>Delivering your order to</Text>

              <View style={styles.addressSummaryBox}>
                <View style={styles.addressIconWrap}>
                  <Feather name="map-pin" size={20} color="#374151" />
                </View>
                <View style={styles.addressTextWrap}>
                  <Text style={styles.shortAddress}>{shortAddress}</Text>
                  <Text style={styles.cityCountry}>{cityOrCountry}</Text>
                </View>
                <TouchableOpacity style={styles.changeBtn} onPress={() => searchInputRef.current?.focus()}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}>
                <Text style={styles.primaryBtnText}>Add more address details ▶</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.helpLink}>
                <Text style={styles.helpLinkText}>I don't know the exact location on map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.detailsContainer}>
          <ScrollView contentContainerStyle={styles.detailsScroll}>
            {/* Address Details Card */}
            <View style={styles.detailsCard}>
              <Text style={styles.cardSectionTitle}>Address details</Text>
              
              {/* City Row */}
              <View style={styles.locationInfoRow}>
                <View style={styles.iconBox}>
                  <FontAwesome5 name="building" size={20} color="#06B6D4" />
                </View>
                <View style={styles.locationTextWrap}>
                  <Text style={styles.locationLabelText}>City</Text>
                  <Text style={styles.locationValueText}>{cityOrCountry}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowCityModal(true)}>
                  <Text style={styles.changeActionText}>Change</Text>
                </TouchableOpacity>
              </View>

              {/* Area Row */}
              <View style={styles.locationInfoRow}>
                <View style={styles.iconBox}>
                  <Feather name="map-pin" size={20} color="#06B6D4" />
                </View>
                <View style={styles.locationTextWrap}>
                  <Text style={styles.locationLabelText}>Select an area, street</Text>
                  <Text style={styles.locationValueText}>{shortAddress}</Text>
                  {addressLine ? <Text style={styles.locationSubText} numberOfLines={1}>{addressLine}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => setShowAreaModal(true)}>
                  <Text style={styles.changeActionText}>Change</Text>
                </TouchableOpacity>
              </View>

              {/* Complete Address Input */}
              <TextInput
                style={styles.detailInput}
                placeholder="Enter complete address*"
                placeholderTextColor="#9CA3AF"
                value={completeAddress}
                onChangeText={setCompleteAddress}
              />
              <Text style={styles.inputHint}>Example: 3rd floor, C-2/54, Block-B, Sushant lok phase 1</Text>
            </View>

            {/* Contact Details Card */}
            <View style={styles.detailsCard}>
              <Text style={styles.cardSectionTitle}>Contact details</Text>
              
              <View style={styles.radioRow}>
                <TouchableOpacity style={styles.radioOpt} onPress={() => setContactType("myself")}>
                  <View style={[styles.radioCircle, contactType === "myself" && styles.radioCircleActive]}>
                    {contactType === "myself" && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>Myself</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.radioOpt} onPress={() => setContactType("someone_else")}>
                  <View style={[styles.radioCircle, contactType === "someone_else" && styles.radioCircleActive]}>
                    {contactType === "someone_else" && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>Someone else</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.detailInput}
                placeholder="Receiver's name*"
                placeholderTextColor="#9CA3AF"
                value={receiverName}
                onChangeText={setReceiverName}
              />
              
              <View style={[styles.detailInput, styles.inputWithIconBetween]}>
                <TextInput
                  style={styles.flexInput}
                  placeholder="Receiver's phone number*"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <Feather name="book-open" size={20} color="#6B7280" />
              </View>

              <TextInput
                style={styles.detailInput}
                placeholder="Save as address (optional)"
                placeholderTextColor="#9CA3AF"
                value={label}
                onChangeText={setLabel}
              />
            </View>
          </ScrollView>

          {/* Fixed Bottom Next Button */}
          <View style={styles.fixedBottomBox}>
            <TouchableOpacity 
              style={[styles.nextBtn, loading && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.nextBtnText}>Next</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showCityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setShowCityModal(false)}>
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select a city</Text>
            <View style={styles.modalSearchBox}>
              <Feather name="search" size={20} color="#06B6D4" />
              <TextInput 
                placeholder="Search for a city" 
                style={styles.modalSearchInput} 
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {citySearchQuery.length === 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Top cities</Text>
                  <View style={styles.topCitiesGrid}>
                    {TOP_CITIES.map((c: any) => (
                        <TouchableOpacity key={c.name} style={styles.topCityCard} onPress={() => handleSelectCity(c.name)}>
                          <FontAwesome5 name={c.icon} size={28} color="#4B5563" solid={false} />
                          <Text style={styles.topCityName}>{c.name}</Text>
                        </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.modalSectionTitle}>Other cities</Text>

              {OTHER_CITIES.filter(c => c.toLowerCase().includes(citySearchQuery.toLowerCase())).map(c => (
                  <TouchableOpacity key={c} style={styles.otherCityRow} onPress={() => handleSelectCity(c)}>
                      <Text style={styles.otherCityText}>{c}</Text>
                  </TouchableOpacity>
              ))}
              <View style={{height: 20}} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showAreaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseCircle} onPress={() => setShowAreaModal(false)}>
            <Feather name="x" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select an area</Text>
            <View style={styles.modalSearchBox}>
              <Feather name="search" size={20} color="#06B6D4" />
              <TextInput 
                placeholder="Search for area, street name..." 
                style={styles.modalSearchInput} 
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {searchResults.map(item => (
                  <TouchableOpacity key={item.id} style={styles.otherCityRow} onPress={() => handleSelectAreaSearchResultModal(item)}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                      <View style={{alignItems: 'center', marginRight: 12}}>
                        <Feather name="map-pin" size={20} color="#6B7280" />
                        {item.distance_meters && (
                           <View style={{backgroundColor: '#4B5563', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, marginTop: 4}}>
                              <Text style={{fontSize: 9, color: '#FFF', fontWeight: 'bold'}}>{(item.distance_meters / 1000).toFixed(1)} km</Text>
                           </View>
                        )}
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={[styles.otherCityText, {fontWeight: '600'}]} numberOfLines={1}>{item.name}</Text>
                        <Text style={{fontSize: 12, color: "#6B7280"}} numberOfLines={1}>{item.address}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 40 : 60,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  mapWrap: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  searchOverlayWrapper: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchOverlay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchResultsBox: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    borderRadius: 8,
    maxHeight: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchItemRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchItemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  searchItemAddress: {
    fontSize: 11,
    color: "#6B7280",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  centerMarkerContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -100 }, { translateY: -100 }], // Adjust based on tooltips
    alignItems: "center",
    justifyContent: "center",
    width: 200,
    height: 200,
  },
  tooltipBubble: {
    backgroundColor: "#222222",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 0,
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  tooltipTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#222222",
    marginBottom: 4,
  },
  markerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 2,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  markerPin: {
    width: 4,
    height: 12,
    backgroundColor: "#111827",
    marginTop: -2,
    zIndex: 1,
  },
  markerShadow: {
    width: 24,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    opacity: 0.8,
    marginTop: -4,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  useCurrentLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  useCurrentLocText: {
    marginLeft: 8,
    color: "#06B6D4",
    fontWeight: "700",
    fontSize: 11,
  },
  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  addressSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  addressIconWrap: {
    marginRight: 12,
  },
  addressTextWrap: {
    flex: 1,
  },
  shortAddress: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  cityCountry: {
    fontSize: 11,
    color: "#6B7280",
  },
  changeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#06B6D4",
  },
  changeBtnText: {
    color: "#06B6D4",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  primaryBtn: {
    backgroundColor: "#06B6D4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginRight: 8,
  },
  helpLink: {
    alignItems: "center",
  },
  helpLinkText: {
    color: "#06B6D4",
    fontSize: 11,
    fontWeight: "600",
    textDecorationLine: "underline",
    textDecorationStyle: "dashed",
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6", 
  },
  detailsScroll: {
    padding: 16,
    paddingBottom: 110,
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  locationInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabelText: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  locationValueText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  locationSubText: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  changeActionText: {
    color: "#06B6D4",
    fontWeight: "700",
    fontSize: 11,
    marginLeft: 8,
  },
  detailInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  inputHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 16,
    marginLeft: 4,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
  },
  inputWithIconBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 0,
    paddingRight: 16,
  },
  flexInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    paddingTop: 0, 
    paddingBottom: 0,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 24,
  },
  radioOpt: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  radioCircleActive: {
    borderColor: "#06B6D4",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#06B6D4",
  },
  radioLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  fixedBottomBox: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  nextBtn: {
    backgroundColor: "#06B6D4",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCloseCircle: {
    alignSelf: "center", marginBottom: 12,
    backgroundColor: "#111827", width: 40, height: 40,
    borderRadius: 20, alignItems: "center", justifyContent: "center"
  },
  modalSheet: {
    backgroundColor: "#F9FAFB", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    height: "85%", padding: 20,
  },
  modalTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 16 },
  modalSearchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 8, marginBottom: 20
  },
  modalSearchInput: { flex: 1, marginLeft: 10, fontSize: 13, color: "#111827" },
  modalSectionTitle: { fontSize: 11, fontWeight: "600", color: "#4B5563", marginBottom: 12 },
  topCitiesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },
  topCityCard: {
    width: "31%", backgroundColor: "#FFFFFF", borderRadius: 8, alignItems: "center", 
    paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB"
  },
  topCityName: { fontSize: 11, fontWeight: "600", color: "#111827", marginTop: 8 },
  otherCityRow: {
    backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB"
  },
  otherCityText: { fontSize: 13, fontWeight: "500", color: "#111827" },
});
