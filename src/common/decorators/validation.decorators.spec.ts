import { validate } from 'class-validator';
import {
  IsValidUUID,
  IsValidPincode,
  IsValidLatitude,
  IsValidLongitude,
  IsPositiveNumber,
  IsValidAmount,
  IsValidQuantity,
} from './validation.decorators';

class TestClass {
  @IsValidUUID()
  uuid: string;

  @IsValidPincode()
  pincode: string;

  @IsValidLatitude()
  latitude: number;

  @IsValidLongitude()
  longitude: number;

  @IsPositiveNumber()
  positiveNumber: number;

  @IsValidAmount()
  amount: number;

  @IsValidQuantity()
  quantity: number;
}

describe('Validation Decorators', () => {
  let testInstance: TestClass;

  beforeEach(() => {
    testInstance = new TestClass();
  });

  describe('IsValidUUID', () => {
    it('should pass for valid UUID', async () => {
      testInstance.uuid = '123e4567-e89b-12d3-a456-426614174000';
      const errors = await validate(testInstance);
      const uuidErrors = errors.filter((error) => error.property === 'uuid');
      expect(uuidErrors).toHaveLength(0);
    });

    it('should fail for invalid UUID', async () => {
      testInstance.uuid = 'invalid-uuid';
      const errors = await validate(testInstance);
      const uuidErrors = errors.filter((error) => error.property === 'uuid');
      expect(uuidErrors).toHaveLength(1);
      expect(uuidErrors[0].constraints).toHaveProperty('isValidUUID');
    });

    it('should fail for non-string values', async () => {
      testInstance.uuid = 123 as any;
      const errors = await validate(testInstance);
      const uuidErrors = errors.filter((error) => error.property === 'uuid');
      expect(uuidErrors).toHaveLength(1);
    });
  });

  describe('IsValidPincode', () => {
    it('should pass for valid Indian pincode', async () => {
      testInstance.pincode = '560001';
      const errors = await validate(testInstance);
      const pincodeErrors = errors.filter(
        (error) => error.property === 'pincode',
      );
      expect(pincodeErrors).toHaveLength(0);
    });

    it('should fail for pincode starting with 0', async () => {
      testInstance.pincode = '012345';
      const errors = await validate(testInstance);
      const pincodeErrors = errors.filter(
        (error) => error.property === 'pincode',
      );
      expect(pincodeErrors).toHaveLength(1);
    });

    it('should fail for invalid length', async () => {
      testInstance.pincode = '12345'; // 5 digits
      const errors = await validate(testInstance);
      const pincodeErrors = errors.filter(
        (error) => error.property === 'pincode',
      );
      expect(pincodeErrors).toHaveLength(1);

      testInstance.pincode = '1234567'; // 7 digits
      const errors2 = await validate(testInstance);
      const pincodeErrors2 = errors2.filter(
        (error) => error.property === 'pincode',
      );
      expect(pincodeErrors2).toHaveLength(1);
    });

    it('should fail for non-numeric pincode', async () => {
      testInstance.pincode = '12345a';
      const errors = await validate(testInstance);
      const pincodeErrors = errors.filter(
        (error) => error.property === 'pincode',
      );
      expect(pincodeErrors).toHaveLength(1);
    });
  });

  describe('IsValidLatitude', () => {
    it('should pass for valid latitude values', async () => {
      const validLatitudes = [0, 45.5, -45.5, 90, -90];

      for (const lat of validLatitudes) {
        testInstance.latitude = lat;
        const errors = await validate(testInstance);
        const latErrors = errors.filter(
          (error) => error.property === 'latitude',
        );
        expect(latErrors).toHaveLength(0);
      }
    });

    it('should fail for latitude out of range', async () => {
      testInstance.latitude = 91;
      const errors = await validate(testInstance);
      const latErrors = errors.filter((error) => error.property === 'latitude');
      expect(latErrors).toHaveLength(1);

      testInstance.latitude = -91;
      const errors2 = await validate(testInstance);
      const latErrors2 = errors2.filter(
        (error) => error.property === 'latitude',
      );
      expect(latErrors2).toHaveLength(1);
    });

    it('should fail for non-number values', async () => {
      testInstance.latitude = 'invalid' as any;
      const errors = await validate(testInstance);
      const latErrors = errors.filter((error) => error.property === 'latitude');
      expect(latErrors).toHaveLength(1);
    });
  });

  describe('IsValidLongitude', () => {
    it('should pass for valid longitude values', async () => {
      const validLongitudes = [0, 45.5, -45.5, 180, -180];

      for (const lng of validLongitudes) {
        testInstance.longitude = lng;
        const errors = await validate(testInstance);
        const lngErrors = errors.filter(
          (error) => error.property === 'longitude',
        );
        expect(lngErrors).toHaveLength(0);
      }
    });

    it('should fail for longitude out of range', async () => {
      testInstance.longitude = 181;
      const errors = await validate(testInstance);
      const lngErrors = errors.filter(
        (error) => error.property === 'longitude',
      );
      expect(lngErrors).toHaveLength(1);

      testInstance.longitude = -181;
      const errors2 = await validate(testInstance);
      const lngErrors2 = errors2.filter(
        (error) => error.property === 'longitude',
      );
      expect(lngErrors2).toHaveLength(1);
    });
  });

  describe('IsPositiveNumber', () => {
    it('should pass for positive numbers', async () => {
      const positiveNumbers = [1, 0.1, 100, 999.99];

      for (const num of positiveNumbers) {
        testInstance.positiveNumber = num;
        const errors = await validate(testInstance);
        const numErrors = errors.filter(
          (error) => error.property === 'positiveNumber',
        );
        expect(numErrors).toHaveLength(0);
      }
    });

    it('should fail for zero and negative numbers', async () => {
      testInstance.positiveNumber = 0;
      const errors = await validate(testInstance);
      const numErrors = errors.filter(
        (error) => error.property === 'positiveNumber',
      );
      expect(numErrors).toHaveLength(1);

      testInstance.positiveNumber = -1;
      const errors2 = await validate(testInstance);
      const numErrors2 = errors2.filter(
        (error) => error.property === 'positiveNumber',
      );
      expect(numErrors2).toHaveLength(1);
    });
  });

  describe('IsValidAmount', () => {
    it('should pass for valid amounts', async () => {
      const validAmounts = [0, 0.01, 100, 999.99];

      for (const amount of validAmounts) {
        testInstance.amount = amount;
        const errors = await validate(testInstance);
        const amountErrors = errors.filter(
          (error) => error.property === 'amount',
        );
        expect(amountErrors).toHaveLength(0);
      }
    });

    it('should fail for negative amounts', async () => {
      testInstance.amount = -1;
      const errors = await validate(testInstance);
      const amountErrors = errors.filter(
        (error) => error.property === 'amount',
      );
      expect(amountErrors).toHaveLength(1);
    });

    it('should fail for infinite values', async () => {
      testInstance.amount = Infinity;
      const errors = await validate(testInstance);
      const amountErrors = errors.filter(
        (error) => error.property === 'amount',
      );
      expect(amountErrors).toHaveLength(1);
    });
  });

  describe('IsValidQuantity', () => {
    it('should pass for valid quantities', async () => {
      const validQuantities = [1, 5, 50, 100];

      for (const qty of validQuantities) {
        testInstance.quantity = qty;
        const errors = await validate(testInstance);
        const qtyErrors = errors.filter(
          (error) => error.property === 'quantity',
        );
        expect(qtyErrors).toHaveLength(0);
      }
    });

    it('should fail for zero and negative quantities', async () => {
      testInstance.quantity = 0;
      const errors = await validate(testInstance);
      const qtyErrors = errors.filter((error) => error.property === 'quantity');
      expect(qtyErrors).toHaveLength(1);

      testInstance.quantity = -1;
      const errors2 = await validate(testInstance);
      const qtyErrors2 = errors2.filter(
        (error) => error.property === 'quantity',
      );
      expect(qtyErrors2).toHaveLength(1);
    });

    it('should fail for quantities exceeding limit', async () => {
      testInstance.quantity = 101;
      const errors = await validate(testInstance);
      const qtyErrors = errors.filter((error) => error.property === 'quantity');
      expect(qtyErrors).toHaveLength(1);
    });

    it('should fail for non-integer quantities', async () => {
      testInstance.quantity = 1.5;
      const errors = await validate(testInstance);
      const qtyErrors = errors.filter((error) => error.property === 'quantity');
      expect(qtyErrors).toHaveLength(1);
    });
  });
});
