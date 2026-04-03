export default {
  "expo": {
    "name": "Driver App",
    "slug": "driver-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "driver-app",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false
    },
    "android": {},
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
      "expo-web-browser"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "apiUrl": process.env.EXPO_PUBLIC_API_URL,
      "eas": {
        "projectId": "728cb440-8f89-4730-98d1-98283051650a"
      }
    }
  }
}
