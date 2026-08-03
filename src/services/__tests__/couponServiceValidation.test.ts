/**
 * Unit tests for couponService — Validation and Application functions.
 * Tests: isUserInOrganization, validateCoupon, formatCouponPreview,
 *        calculateDiscountedPrice, applyTimeCoupon, applyPercentageCoupon.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock DynamoDB client ─────────────────────────────────────────────────────

const mockSend = vi.fn();

vi.mock('../aws', () => ({
  createDynamoDBClient: vi.fn().mockResolvedValue({ send: (...args: unknown[]) => mockSend(...args) }),
}));

// ── Mock organizationService ─────────────────────────────────────────────────

const mockGetOrganizations = vi.fn();

vi.mock('../organizationService', () => ({
  getOrganizations: (...args: unknown[]) => mockGetOrganizations(...args),
}));

// ── Mock subscriptionService ─────────────────────────────────────────────────

const mockGetSubscription = vi.fn();

vi.mock('../subscriptionService', () => ({
  subscriptionService: {
    getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
  },
}));

import { couponService } from '../couponService';
import type { Coupon } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    code: 'TESTCODE1234',
    type: 'time',
    value: 30,
    status: 'active',
    current_uses: 0,
    max_uses: 100,
    expires_at: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
    created_by: 'admin-1',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('couponService — Validation & Application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── isUserInOrganization ─────────────────────────────────────────────────

  describe('isUserInOrganization', () => {
    it('returns true when user is a member of an active organization', async () => {
      mockGetOrganizations.mockResolvedValueOnce([
        {
          id: 'org-1',
          is_active: true,
          members: [{ user_id: 'user-123', email: 'test@test.com', role: 'user' }],
        },
      ]);

      const result = await couponService.isUserInOrganization('user-123');
      expect(result).toBe(true);
    });

    it('returns false when user is not in any organization', async () => {
      mockGetOrganizations.mockResolvedValueOnce([
        {
          id: 'org-1',
          is_active: true,
          members: [{ user_id: 'other-user', email: 'other@test.com', role: 'user' }],
        },
      ]);

      const result = await couponService.isUserInOrganization('user-123');
      expect(result).toBe(false);
    });

    it('returns false when organization is inactive', async () => {
      mockGetOrganizations.mockResolvedValueOnce([
        {
          id: 'org-1',
          is_active: false,
          members: [{ user_id: 'user-123', email: 'test@test.com', role: 'user' }],
        },
      ]);

      const result = await couponService.isUserInOrganization('user-123');
      expect(result).toBe(false);
    });

    it('returns false when no organizations exist', async () => {
      mockGetOrganizations.mockResolvedValueOnce([]);

      const result = await couponService.isUserInOrganization('user-123');
      expect(result).toBe(false);
    });
  });

  // ── validateCoupon ───────────────────────────────────────────────────────

  describe('validateCoupon', () => {
    it('rejects user in organization', async () => {
      mockGetOrganizations.mockResolvedValueOnce([
        {
          id: 'org-1',
          is_active: true,
          members: [{ user_id: 'user-123' }],
        },
      ]);

      const result = await couponService.validateCoupon('TESTCODE1234', 'user-123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('coupon_error_org_member');
    });

    it('rejects non-existent coupon', async () => {
      mockGetOrganizations.mockResolvedValueOnce([]);
      // getCouponByCode returns null
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await couponService.validateCoupon('NONEXISTENT1', 'user-123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('coupon_error_invalid');
    });

    it('rejects inactive coupon', async () => {
      mockGetOrganizations.mockResolvedValueOnce([]);
      mockSend.mockResolvedValueOnce({ Item: makeCoupon({ status: 'inactive' }) });

      const result = await couponService.validateCoupon('TESTCODE1234', 'user-123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('coupon_error_inactive');
    });

    it('rejects expired coupon', async () => {
      mockGetOrganizations.mockResolvedValueOnce([]);
      mockSend.mockResolvedValueOnce({
        Item: makeCoupon({ expires_at: '2020-01-01T00:00:00.000Z' }),
      });

      const result = await couponService.validateCoupon('TESTCODE1234', 'user-123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('coupon_error_expired');
    });

    it('rejects coupon at max uses', async () => {
      mockGetOrganizations.mockResolvedValueOnce([]);
      mockSend.mockResolvedValueOnce({
        Item: makeCoupon({ current_uses: 100, max_uses: 100 }),
      });

      const result = await couponService.validateCoupon('TESTCODE1234', 'user-123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('coupon_error_max_uses');
    });

    it('rejects time coupon when user has active paid subscription', async () => {
      mockGetOrganizations.mockResolvedValueOnce([]);
      mockSend.mockResolvedValueOnce({ Item: makeCoupon({ type: 'time' }) });
      mockGetSubscription.mockResolvedValueOnce({
        user_id: 'user-123',
        status: 'active',
        paypal_subscription_id: 'sub-paypal-123',
      });

      const result = await couponService.validateCoupon('TESTCODE1234', 'user-123');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('coupon_error_active_sub');
    });

    it('accepts valid time coupon for user without paid subscription', async () => {
      mockGetOrganizations.mockResolvedValueOnce([]);
      const coupon = makeCoupon({ type: 'time' });
      mockSend.mockResolvedValueOnce({ Item: coupon });
      mockGetSubscription.mockResolvedValueOnce(null);

      const result = await couponService.validateCoupon('TESTCODE1234', 'user-123');
      expect(result.valid).toBe(true);
      expect(result.coupon).toEqual(coupon);
      expect(result.preview).toBeDefined();
      expect(result.preview!.type).toBe('time');
    });

    it('accepts valid percentage coupon without checking subscription', async () => {
      mockGetOrganizations.mockResolvedValueOnce([]);
      const coupon = makeCoupon({ type: 'percentage', value: 25 });
      mockSend.mockResolvedValueOnce({ Item: coupon });

      const result = await couponService.validateCoupon('TESTCODE1234', 'user-123');
      expect(result.valid).toBe(true);
      expect(result.coupon).toEqual(coupon);
      expect(result.preview!.type).toBe('percentage');
      // subscriptionService.getSubscription should NOT have been called
      expect(mockGetSubscription).not.toHaveBeenCalled();
    });
  });

  // ── formatCouponPreview ──────────────────────────────────────────────────

  describe('formatCouponPreview', () => {
    it('formats time coupon preview correctly', () => {
      const coupon = makeCoupon({ type: 'time', value: 30 });
      const preview = couponService.formatCouponPreview(coupon);

      expect(preview.code).toBe('TESTCODE1234');
      expect(preview.type).toBe('time');
      expect(preview.value).toBe(30);
      expect(preview.description).toBe('Suscripción gratuita por 30 días');
    });

    it('formats percentage coupon preview correctly', () => {
      const coupon = makeCoupon({ type: 'percentage', value: 50 });
      const preview = couponService.formatCouponPreview(coupon);

      expect(preview.code).toBe('TESTCODE1234');
      expect(preview.type).toBe('percentage');
      expect(preview.value).toBe(50);
      expect(preview.description).toBe('Descuento del 50% en tu suscripción');
    });
  });

  // ── calculateDiscountedPrice ─────────────────────────────────────────────

  describe('calculateDiscountedPrice', () => {
    it('calculates 25% discount on $100', () => {
      expect(couponService.calculateDiscountedPrice(100, 25)).toBe(75);
    });

    it('calculates 50% discount on $99.99', () => {
      expect(couponService.calculateDiscountedPrice(99.99, 50)).toBe(50);
    });

    it('calculates 100% discount returns 0', () => {
      expect(couponService.calculateDiscountedPrice(100, 100)).toBe(0);
    });

    it('calculates 10% discount on $33.33', () => {
      expect(couponService.calculateDiscountedPrice(33.33, 10)).toBe(30);
    });

    it('rounds to 2 decimal places', () => {
      // 19.99 * (1 - 15/100) = 19.99 * 0.85 = 16.9915 → 16.99
      expect(couponService.calculateDiscountedPrice(19.99, 15)).toBe(16.99);
    });
  });

  // ── applyTimeCoupon ──────────────────────────────────────────────────────

  describe('applyTimeCoupon', () => {
    it('creates subscription and increments coupon uses', async () => {
      const coupon = makeCoupon({ type: 'time', value: 30 });
      // getCouponByCode
      mockSend.mockResolvedValueOnce({ Item: coupon });
      // PutCommand (create subscription)
      mockSend.mockResolvedValueOnce({});
      // UpdateCommand (increment uses)
      mockSend.mockResolvedValueOnce({});

      const result = await couponService.applyTimeCoupon(
        'TESTCODE1234',
        'user-123',
        ['exam-1', 'exam-2']
      );

      expect(result.user_id).toBe('user-123');
      expect(result.status).toBe('active');
      expect(result.selected_exam_ids).toEqual(['exam-1', 'exam-2']);
      expect(result.start_date).toBeDefined();
      expect(result.current_period_end).toBeDefined();
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('throws when coupon not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      await expect(
        couponService.applyTimeCoupon('NONEXISTENT1', 'user-123', ['exam-1'])
      ).rejects.toThrow('Coupon not found');
    });
  });

  // ── applyPercentageCoupon ────────────────────────────────────────────────

  describe('applyPercentageCoupon', () => {
    it('updates subscription with coupon reference and increments uses', async () => {
      const coupon = makeCoupon({ type: 'percentage', value: 25 });
      // getCouponByCode
      mockSend.mockResolvedValueOnce({ Item: coupon });
      // UpdateCommand (update subscription)
      mockSend.mockResolvedValueOnce({});
      // UpdateCommand (increment uses)
      mockSend.mockResolvedValueOnce({});

      await couponService.applyPercentageCoupon('TESTCODE1234', 'user-123');

      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('throws when coupon not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      await expect(
        couponService.applyPercentageCoupon('NONEXISTENT1', 'user-123')
      ).rejects.toThrow('Coupon not found');
    });
  });
});
