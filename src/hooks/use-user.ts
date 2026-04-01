import { useQuery } from '@tanstack/react-query';

export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      // Return a mock user for Vercel deployment
      return {
        id: '1',
        name: 'Demo User',
        email: 'demo@example.com'
      };
    },
  });
};
