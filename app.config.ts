import { ExpoConfig, ConfigContext } from 'expo/config';

function semverToVersionCode(version: string): number {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

const appVersion = (process.env.APP_VERSION ?? '0.0.1').replace(/^v\.?/, '');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "It's a My Money!",
  slug: 'its-a-my-money',
  version: appVersion,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'itsamymoney',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1A1A2E',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.itsmariodias.itsamymoney',
  },
  android: {
    versionCode: semverToVersionCode(appVersion),
    package: 'com.itsmariodias.itsamymoney',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static' as const,
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-sqlite',
    'expo-web-browser',
    process.env.GOOGLE_IOS_URL_SCHEME
      ? ['@react-native-google-signin/google-signin', { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME }]
      : '@react-native-google-signin/google-signin',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#2f95dc',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? '',
    googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? '',
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
  },
});
