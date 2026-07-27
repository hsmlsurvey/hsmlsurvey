import '@/lib/suppressWarnings'; // 👈 Must remain the first import

import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { GlobalScrollbarStyle } from '@/components/ui';

export default function RootLayout() {
  useFrameworkReady();

  // Hydration Safety Guard (Prevents SSR Mismatch Error #418)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Register PWA Service Worker on Web platform
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((reg) => console.log('PWA Service Worker registered successfully:', reg.scope))
          .catch((err) => console.error('Service Worker registration failed:', err));
      });
    }
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <>
          {/* SEO & PWA Head Tags */}
          <Head>
            <title>HSML Survey - Hamza Sugar Mills</title>
            <meta name="google-site-verification" content="p9wWzAtSev8X13OCAUM9h1rj9aUk0wQlnoYZa51li9Y" />
            <meta 
              name="description" 
              content="Official Grower Survey application for Hamza Sugar Mills (HSML)." 
            />
            <meta 
              name="keywords" 
              content="hsmlsurvey, hsml survey, hamza sugar mills, growers data" 
            />

            {/* PWA Manifest & App Installation Links */}
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#000000" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <link rel="apple-touch-icon" href="/icon-192.png" />
          </Head>

          <GlobalScrollbarStyle />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </>
      </AuthProvider>
    </ThemeProvider>
  );
}