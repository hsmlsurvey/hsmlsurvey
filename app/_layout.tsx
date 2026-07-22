import { useEffect } from 'react';
import { Stack } from 'expo-router';
import Head from 'expo-router/head'; // 👈 Fix: Curly braces {} hata di hain
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { GlobalScrollbarStyle } from '@/components/ui';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <ThemeProvider>
      <AuthProvider>
        <>
          {/* Google Search (SEO) ke liye Meta Tags */}
          <Head>
            <title>HSML Survey - Hamza Sugar Mills</title>
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