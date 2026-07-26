import { LogBox, Platform } from 'react-native';

// Disable LogBox warning overlay on web & mobile
LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
  'shadow*',
  'Use "boxShadow"',
]);

// Console level override for Web DevTools
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const warn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('shadow*') || args[0].includes('boxShadow') || args[0].includes('deprecated'))
    ) {
      return;
    }
    warn(...args);
  };
}