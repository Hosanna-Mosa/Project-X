export default {
  "expo": {
    "name": "Flavour",
    "slug": "flavour",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "flavour",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.flavour.customer",
      "config": {
        "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      },
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app uses your location to show nearby services and track your deliveries."
      }
    },
    "android": {
      "package": "com.flavour.customer",
      "usesCleartextTraffic": true,
      "navigationBar": {
        "backgroundColor": "#FFFFFF",
        "buttonStyle": "dark"
      },
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      },
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"
      ]
    },
    "web": {
      "favicon": "./assets/images/icon.png"
    },
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://replit.com/"
        }
      ],
      "expo-font",
      "expo-web-browser",
      "@react-native-community/datetimepicker"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
       "apiUrl": process.env.EXPO_PUBLIC_API_URL,
       "eas": {
        "projectId": "a59a7934-9b67-4dc2-b01c-0958cdc8f819"
      }
    }
  }
}
