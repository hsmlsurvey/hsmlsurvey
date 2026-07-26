import '@/lib/suppressWarnings'; // 👈 Must remain the first import

import React, { useState, useEffect } from 'react';
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
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <>
          {/* Google Search (SEO) Meta Tags */}
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