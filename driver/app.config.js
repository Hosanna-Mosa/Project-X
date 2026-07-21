export default {
  "expo": {
    "name": "Flavour Driver",
    "slug": "flavour-driver",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "flavour-driver",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.flavour.driver",
      "config": {
        "googleMapsApiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      }
    },
    "android": {
      "package": "com.flavour.driver",
      "googleServicesFile": "./google-services.json",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/icon.png",
        "backgroundColor": "#ffffff"
      },
      "config": {
        "googleMaps": {
          "apiKey": process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      },
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.RECEIVE_BOOT_COMPLETED"
      ]
    },
    "notification": {
      "icon": "./assets/images/icon.png",
      "color": "#ffffff"
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
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Driver App to use your location for real-time order tracking and navigation even in background.",
          "locationWhenInUsePermission": "Allow Driver App to use your location for real-time order tracking and navigation.",
          "isAndroidBackgroundLocationEnabled": true
        }
      ],
      "expo-font",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "apiUrl": process.env.EXPO_PUBLIC_API_URL,
      "eas": {
        "projectId": "8105f2ed-0656-417f-9922-bbf9c40869a1"
      }
    },
    "owner": "hosanna4190"
  }
}