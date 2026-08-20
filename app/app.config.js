export default {
  expo: {
    name: 'Flavour',
    slug: 'flavour',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'flavour',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.flavour.customer',
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'This app uses your location to show nearby services and track your deliveries.',
      },
      // Universal Links: lets a normal https:// link (e.g. shared via WhatsApp/SMS) open this
      // app directly instead of a browser. Swap the domain below for your real web domain once
      // decided (currently reusing the API domain as a placeholder). Also requires hosting
      // `apple-app-site-association` there — see backend/src/index.ts — with your real Apple
      // Team ID filled in (Apple Developer account → Membership), which nothing in this repo
      // can supply automatically.
      associatedDomains: ['applinks:x-api.triozen.tech'],
    },
    android: {
      package: 'com.flavour.customer',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/images/icon.png',
        backgroundColor: '#ffffff',
      },
      usesCleartextTraffic: true,
      navigationBar: {
        backgroundColor: '#FFFFFF',
        buttonStyle: 'dark',
      },
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.RECEIVE_BOOT_COMPLETED',
      ],
      // Android App Links: same idea as iOS associatedDomains above. Also requires hosting
      // `assetlinks.json` on the domain below — see backend/src/index.ts — with your app's
      // real release-signing SHA256 fingerprint filled in (get it via `eas credentials`),
      // which nothing in this repo can supply automatically.
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'x-api.triozen.tech', pathPrefix: '/restaurant-menu' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    notification: {
      icon: './assets/images/icon.png',
      color: '#ffffff',
    },
    web: {
      favicon: './assets/images/icon.png',
    },
    plugins: [
      [
        'expo-router',
        {
          origin: 'https://replit.com/',
        },
      ],
      'expo-font',
      'expo-web-browser',
      '@react-native-community/datetimepicker',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#ffffff',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      webUrl: process.env.EXPO_PUBLIC_WEB_URL,
      eas: {
        projectId: 'b53cf032-dea6-4aff-835e-b3cd717e54a3',
      },
    },
  },
};