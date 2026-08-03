import type { ReactNode } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';

interface PayPalProviderProps {
  children: ReactNode;
}

const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

export default function PayPalProvider({ children }: PayPalProviderProps) {
  if (!paypalClientId) {
    return <>{children}</>;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: 'USD',
        intent: 'subscription',
        vault: true,
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
