// Simple mock data replacement for removed _mock directory
// This provides basic static data for components that still need mock data

export const mockData = {
  // Basic data
  id: (index: number) => `mock-id-${index}`,
  fullName: (index: number) => ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'][index % 5],
  email: (index: number) => [`user${index}@example.com`][0],
  phoneNumber: (index: number) => '+1 555-0123',
  country: (index: number) => 'United States',
  
  // Images - using placeholder paths
  image: {
    avatar: (index: number) => `/assets/images/avatar/avatar-${(index % 24) + 1}.webp`,
    cover: (index: number) => `/assets/images/cover/cover-${(index % 24) + 1}.webp`,
  },
  
  // Numbers
  number: {
    rating: (index: number) => 4.5,
    price: (index: number) => 99.99,
  },
  
  // Boolean
  boolean: (index: number) => index % 2 === 0,
  
  // Time
  time: (index: number) => new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
};

// Static arrays for common data
export const mockUsers = Array.from({ length: 10 }, (_, index) => ({
  id: mockData.id(index),
  name: mockData.fullName(index),
  email: mockData.email(index),
  avatar: mockData.image.avatar(index),
  phone: mockData.phoneNumber(index),
  country: mockData.country(index),
}));

export const mockNotifications: any[] = [];
export const mockContacts: any[] = [];
