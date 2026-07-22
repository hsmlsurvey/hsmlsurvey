import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* 👇 Google Site Verification Meta Tag */}
        <meta name="google-site-verification" content="p9wWzAtSev8X130CAUM9h1rj9aUk0wQlnoYZa51li9Y" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
