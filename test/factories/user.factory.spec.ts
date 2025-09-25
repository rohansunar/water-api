import { User, CustomerRole, Address, AddressType } from '../../src/common/interfaces/user.interface';

/**
 * Test factory for generating user test data
 * Provides consistent, realistic test data for user-related tests
 */
export class UserFactory {
  /**
   * Generate a complete user object for testing
   */
  static createUser(overrides: Partial<User> = {}): User {
    const defaultUser: User = {
      id: this.generateId(),
      phone: this.generatePhone(),
      name: this.generateName(),
      email: this.generateEmail(),
      addresses: [],
      walletBalance: this.generateWalletBalance(),
      role: CustomerRole.CUSTOMER,
      isActive: true,
      monthlyPaymentMode: false,
      createdAt: this.generatePastDate(),
      updatedAt: this.generateRecentDate(),
      ...overrides,
    };

    return defaultUser;
  }

  /**
   * Generate a customer user
   */
  static createCustomer(overrides: Partial<User> = {}): User {
    return this.createUser({
      role: CustomerRole.CUSTOMER,
      ...overrides,
    });
  }

  /**
   * Generate a vendor user
   */
  static createVendor(overrides: Partial<User> = {}): User {
    return this.createUser({
      role: CustomerRole.VENDOR,
      ...overrides,
    });
  }

  /**
   * Generate a delivery rider user
   */
  static createRider(overrides: Partial<User> = {}): User {
    return this.createUser({
      role: CustomerRole.DELIVERY_RIDER,
      ...overrides,
    });
  }

  /**
   * Generate an admin user
   */
  static createAdmin(overrides: Partial<User> = {}): User {
    return this.createUser({
      role: CustomerRole.ADMIN,
      ...overrides,
    });
  }

  /**
   * Generate multiple users for testing
   */
  static createUsers(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  /**
   * Generate user with address information
   */
  static createUserWithAddress(overrides: Partial<User> = {}): User {
    const addresses: Address[] = [
      {
        id: this.generateId(),
        customerId: 'customer-id',
        type: AddressType.HOME,
        street: this.generateStreet(),
        city: this.generateCity(),
        state: this.generateState(),
        pincode: this.generatePincode(),
        latitude: this.generateLatitude(),
        longitude: this.generateLongitude(),
        isDefault: true,
        createdAt: this.generatePastDate(),
        updatedAt: this.generateRecentDate(),
      },
    ];

    return this.createUser({
      addresses,
      ...overrides,
    });
  }

  /**
   * Generate user for authentication testing
   */
  static createUserForAuth(overrides: Partial<User> = {}): User & { password: string } {
    return {
      ...this.createUser(overrides),
      password: this.generatePassword(),
    };
  }

  // Helper methods for generating test data
  private static generateId(): string {
    return `test-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generatePhone(): string {
    return `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  }

  private static generateName(): string {
    return `Test User ${Math.floor(Math.random() * 1000)}`;
  }

  private static generateEmail(): string {
    return `test${Math.floor(Math.random() * 1000)}@example.com`;
  }

  private static generateWalletBalance(): number {
    return Math.floor(Math.random() * 10000);
  }

  private static generatePastDate(): Date {
    return new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
  }

  private static generateRecentDate(): Date {
    return new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  }

  private static generateStreet(): string {
    return `Test Street ${Math.floor(Math.random() * 1000)}`;
  }

  private static generateCity(): string {
    return `Test City ${Math.floor(Math.random() * 100)}`;
  }

  private static generateState(): string {
    return `Test State ${Math.floor(Math.random() * 50)}`;
  }

  private static generatePincode(): string {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
  }

  private static generateLatitude(): number {
    return 28.6139 + (Math.random() - 0.5) * 0.1; // Around Delhi
  }

  private static generateLongitude(): number {
    return 77.2090 + (Math.random() - 0.5) * 0.1; // Around Delhi
  }

  private static generatePassword(): string {
    return `TestPass${Math.floor(Math.random() * 1000)}!`;
  }
}

/**
 * Test data builders for specific test scenarios
 */
export class UserTestData {
  /**
   * Generate test data for user registration
   */
  static getUserRegistrationData(overrides: Partial<User> = {}) {
    return {
      phone: UserFactory['generatePhone'](),
      email: UserFactory['generateEmail'](),
      name: UserFactory['generateName'](),
      password: UserFactory['generatePassword'](),
      ...overrides,
    };
  }

  /**
   * Generate test data for user profile update
   */
  static getUserProfileUpdateData(overrides: Partial<User> = {}) {
    return {
      name: UserFactory['generateName'](),
      email: UserFactory['generateEmail'](),
      ...overrides,
    };
  }

  /**
   * Generate test data for user search filters
   */
  static getUserSearchFilters() {
    return {
      role: UserFactory['generateRole'](),
      isActive: Math.random() > 0.5,
      searchTerm: UserFactory['generateName'](),
    };
  }

  /**
   * Generate invalid user data for validation testing
   */
  static getInvalidUserData() {
    return {
      invalidPhone: 'invalid-phone',
      invalidEmail: 'invalid-email',
      tooShortPassword: '12345',
      missingRequiredFields: {},
    };
  }

  /**
   * Generate random role for testing
   */
  private static generateRole(): CustomerRole {
    const roles = Object.values(CustomerRole);
    return roles[Math.floor(Math.random() * roles.length)];
  }
}