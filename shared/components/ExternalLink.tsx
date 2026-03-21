import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform } from 'react-native';

type Props = Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string };

export function ExternalLink(props: Props) {
  return (
    <Link
      target="_blank"
      {...props}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      href={props.href as any}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          e.preventDefault();
          WebBrowser.openBrowserAsync(props.href);
        }
      }}
    />
  );
}
