'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerPortal from '@/components/isp/CustomerPortal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

export default function PortalPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <CustomerPortal onBack={() => {}} showBackButton={false} />
    </QueryClientProvider>
  );
}
