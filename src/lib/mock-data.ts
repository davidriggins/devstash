/**
 * Placeholder user for the sidebar until NextAuth lands. Everything else on the
 * dashboard now reads real data through `lib/db`.
 */
export const mockUser = {
  id: 'user_1',
  email: 'demo@devstash.io',
  name: 'John Doe',
  isPro: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};
