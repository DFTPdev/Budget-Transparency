// Minimal mock data replacement to fix build errors
// This is a temporary solution to get the build working

export const _mock = {
  id: (index: number) => `mock-id-${index}`,
  fullName: (index: number) => ['John Doe', 'Jane Smith', 'Bob Johnson'][index % 3],
  email: (index: number) => `user${index}@example.com`,
  phoneNumber: (index: number) => '+1 555-0123',
  country: (index: number) => 'United States',
  boolean: (index: number) => index % 2 === 0,
  time: (index: number) => new Date().toISOString(),
  image: {
    avatar: (index: number) => `/assets/images/avatar/avatar-${(index % 24) + 1}.webp`,
    cover: (index: number) => `/assets/images/cover/cover-${(index % 24) + 1}.webp`,
  },
  number: {
    rating: (index: number) => 4.5,
    price: (index: number) => 99.99,
  },
};

// Static arrays
export const _tags = ['budget', 'transparency', 'government', 'spending', 'civic'];
export const _socials = [
  { label: 'Twitter', value: 'twitter' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'LinkedIn', value: 'linkedin' },
];

export const _testimonials = [
  { name: 'John Smith', message: 'Great platform!', avatar: '/assets/images/avatar/avatar-1.webp', createdAt: new Date() },
  { name: 'Jane Doe', message: 'Very helpful!', avatar: '/assets/images/avatar/avatar-2.webp', createdAt: new Date() },
];

export const _carouselsMembers = [
  { id: '1', name: 'John Doe', avatar: '/assets/images/avatar/avatar-1.webp' },
  { id: '2', name: 'Jane Smith', avatar: '/assets/images/avatar/avatar-2.webp' },
];

export const _contacts: any[] = [];
export const _notifications: any[] = [];
export const _userAbout = { socialLinks: {} };
export const _userPlans: any[] = [];
export const _userPayment: any[] = [];
export const _userInvoices: any[] = [];
export const _userAddressBook: any[] = [];
export const _posts: any[] = [];
export const _allPosts: any[] = [];
export const _files: any[] = [];
export const _folders: any[] = [];
export const _allFiles: any[] = [];
export const FILE_TYPE_OPTIONS: any[] = [];

// Map contact data for contact page
export const _mapContact = [
  {
    latlng: [37.5407, -77.4360],
    address: '1111 East Broad Street, Richmond, VA 23219',
    phoneNumber: '+1 (804) 786-0000',
  },
];

// Export everything that might be imported
export * from './assets';
export * from './_order';
export * from './_user';
