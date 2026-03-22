import Constants from 'expo-constants';

// Read from app.config.ts > extra, which pulls from env vars.
// See .env.example for setup instructions.
const extra = Constants.expoConfig?.extra ?? {};

export const GOOGLE_WEB_CLIENT_ID: string = extra.googleWebClientId ?? '';
export const GOOGLE_IOS_CLIENT_ID: string = extra.googleIosClientId ?? '';
