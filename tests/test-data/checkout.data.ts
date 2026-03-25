export const TEST_PRODUCT = {
  pdpUrl: 'https://georgetowncupcake.com/products/logo-t-shirt-black',
  searchQuery: 'Logo T-shirt (Black)',
  size: 'M',
  quantity: 2,
} as const;

export const NATIONWIDE_ORDER_DATA = {
  zipCode: '10001',
  contactEmail: 'test+10@mtnhausdigital.com',
  recipient: {
    firstName: 'Test',
    lastName: 'User',
    phone: '2125551234',
    addressLine1: '340 W 28th St Apt 9j, New York, NY 10001',
  },
} as const;

export const BYOB_CUSTOM_DOZEN_DATA = {
  shipNationwideUrl: 'https://georgetowncupcake.com/pages/ship-nationwide',
  customDozenUrl: 'https://georgetowncupcake.com/products/custom-dozen',
  flavorName: 'Red Velvet',
  flavorQty: 12,
  bundleQty: 2,
  expectedSidecartTitle: 'Custom Dozen',
  expectedVariant: 'Red Velvet X 12',
  expectedLinePrice: '$84.00',
} as const;
