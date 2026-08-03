/**
 * Unit tests for couponService — CRUD operations and code generation.
 * Tests the pure generateCouponCode() function directly.
 * DynamoDB-dependent functions are tested with mocks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock DynamoDB client ─────────────────────────────────────────────────────

const mockSend = vi.fn();

vi.mock('../aws', () => ({
  createDynamoDBClient: vi.fn().mockResolvedValue({ send: (...args: unknown[]) => mockSend(...args) }),
}));

import { couponService, type CreateCouponInput } from '../couponService';

describe('couponService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── generateCouponCode ───────────────────────────────────────────────────

  describe('generateCouponCode', () => {
    it('generates a code of exactly 12 characters', () => {
      const code = couponService.generateCouponCode();
      expect(code).toHaveLength(12);
    });

    it('generates a code containing only alphanumeric characters', () => {
      const code = couponService.generateCouponCode();
      expect(code).toMatch(/^[A-Za-z0-9]{12}$/);
    });

    it('generates different codes on successive calls', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        codes.add(couponService.generateCouponCode());
      }
      // With 62^12 possible codes, 20 calls should produce 20 unique codes
      expect(codes.size).toBe(20);
    });
  });

  // ── createCoupon ─────────────────────────────────────────────────────────

  describe('createCoupon', () => {
    const validInput: CreateCouponInput = {
      type: 'time',
      value: 30,
      expires_at: '2025-12-31T23:59:59.000Z',
      max_uses: 100,
      created_by: 'admin-123',
    };

    it('creates a coupon with correct fields when no collision', async () => {
      // GetItem returns no item (no collision)
      mockSend.mockResolvedValueOnce({ Item: undefined });
      // PutItem succeeds
      mockSend.mockResolvedValueOnce({});

      const coupon = await couponService.createCoupon(validInput);

      expect(coupon.code).toHaveLength(12);
      expect(coupon.code).toMatch(/^[A-Za-z0-9]{12}$/);
      expect(coupon.type).toBe('time');
      expect(coupon.value).toBe(30);
      expect(coupon.status).toBe('active');
      expect(coupon.current_uses).toBe(0);
      expect(coupon.max_uses).toBe(100);
      expect(coupon.expires_at).toBe('2025-12-31T23:59:59.000Z');
      expect(coupon.created_by).toBe('admin-123');
      expect(coupon.created_at).toBeDefined();
      expect(coupon.updated_at).toBeDefined();
    });

    it('retries on code collision and succeeds', async () => {
      // First attempt: collision
      mockSend.mockResolvedValueOnce({ Item: { code: 'existing' } });
      // Second attempt: no collision
      mockSend.mockResolvedValueOnce({ Item: undefined });
      // PutItem succeeds
      mockSend.mockResolvedValueOnce({});

      const coupon = await couponService.createCoupon(validInput);

      expect(coupon.code).toHaveLength(12);
      expect(coupon.status).toBe('active');
      // 3 calls: GetItem (collision) + GetItem (no collision) + PutItem
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('throws after 3 consecutive collisions', async () => {
      // All 3 attempts: collision
      mockSend.mockResolvedValueOnce({ Item: { code: 'existing1' } });
      mockSend.mockResolvedValueOnce({ Item: { code: 'existing2' } });
      mockSend.mockResolvedValueOnce({ Item: { code: 'existing3' } });

      await expect(couponService.createCoupon(validInput)).rejects.toThrow(
        'Failed to generate a unique coupon code after 3 attempts'
      );
    });

    it('creates a percentage coupon correctly', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });
      mockSend.mockResolvedValueOnce({});

      const input: CreateCouponInput = {
        type: 'percentage',
        value: 25,
        expires_at: '2025-06-30T00:00:00.000Z',
        max_uses: 50,
        created_by: 'admin-456',
      };

      const coupon = await couponService.createCoupon(input);

      expect(coupon.type).toBe('percentage');
      expect(coupon.value).toBe(25);
      expect(coupon.max_uses).toBe(50);
    });
  });

  // ── getCouponByCode ──────────────────────────────────────────────────────

  describe('getCouponByCode', () => {
    it('returns the coupon when found', async () => {
      const mockCoupon = {
        code: 'ABC123def456',
        type: 'time',
        value: 30,
        status: 'active',
        current_uses: 5,
        max_uses: 100,
        expires_at: '2025-12-31T00:00:00.000Z',
        created_by: 'admin-123',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      };

      mockSend.mockResolvedValueOnce({ Item: mockCoupon });

      const result = await couponService.getCouponByCode('ABC123def456');
      expect(result).toEqual(mockCoupon);
    });

    it('returns null when coupon not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await couponService.getCouponByCode('nonexistent1');
      expect(result).toBeNull();
    });
  });

  // ── getAllCoupons ─────────────────────────────────────────────────────────

  describe('getAllCoupons', () => {
    it('returns all coupons from scan', async () => {
      const mockCoupons = [
        { code: 'coupon1ABCDE', type: 'time', value: 10 },
        { code: 'coupon2FGHIJ', type: 'percentage', value: 20 },
      ];

      mockSend.mockResolvedValueOnce({ Items: mockCoupons });

      const result = await couponService.getAllCoupons();
      expect(result).toEqual(mockCoupons);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no coupons exist', async () => {
      mockSend.mockResolvedValueOnce({ Items: undefined });

      const result = await couponService.getAllCoupons();
      expect(result).toEqual([]);
    });
  });

  // ── deactivateCoupon ─────────────────────────────────────────────────────

  describe('deactivateCoupon', () => {
    it('deactivates a coupon and returns the updated coupon', async () => {
      const deactivatedCoupon = {
        code: 'ABC123def456',
        type: 'time',
        value: 30,
        status: 'inactive',
        current_uses: 5,
        max_uses: 100,
        expires_at: '2025-12-31T00:00:00.000Z',
        created_by: 'admin-123',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-07-01T00:00:00.000Z',
      };

      // UpdateCommand succeeds
      mockSend.mockResolvedValueOnce({});
      // GetItem returns the updated coupon
      mockSend.mockResolvedValueOnce({ Item: deactivatedCoupon });

      const result = await couponService.deactivateCoupon('ABC123def456');

      expect(result.status).toBe('inactive');
      expect(result.code).toBe('ABC123def456');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('throws if coupon not found after deactivation', async () => {
      // UpdateCommand succeeds
      mockSend.mockResolvedValueOnce({});
      // GetItem returns nothing
      mockSend.mockResolvedValueOnce({ Item: undefined });

      await expect(couponService.deactivateCoupon('nonexistent1')).rejects.toThrow(
        'Coupon not found after deactivation'
      );
    });
  });
});
