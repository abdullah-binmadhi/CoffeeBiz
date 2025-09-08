import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCache, closeCacheConnection, CacheService } from '../services/cache';

describe('Cache Service Tests', () => {
  let cache: CacheService;

  beforeAll(async () => {
    cache = getCache();
    // Wait for Redis connection
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await closeCacheConnection();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache values', async () => {
      const testKey = 'test-key';
      const testValue = { message: 'Hello, Cache!', timestamp: Date.now() };

      // Set cache value
      const setResult = await cache.set(testKey, testValue, 60);
      expect(setResult).toBe(true);

      // Get cache value
      const cachedValue = await cache.get(testKey);
      expect(cachedValue).toEqual(testValue);

      // Clean up
      await cache.del(testKey);
    });

    it('should handle cache expiration', async () => {
      const testKey = 'expiring-key';
      const testValue = { data: 'This will expire' };

      // Set cache value with 1 second TTL
      await cache.set(testKey, testValue, 1);

      // Should exist immediately
      const immediateValue = await cache.get(testKey);
      expect(immediateValue).toEqual(testValue);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be null after expiration
      const expiredValue = await cache.get(testKey);
      expect(expiredValue).toBeNull();
    });

    it('should handle non-existent keys', async () => {
      const nonExistentValue = await cache.get('non-existent-key');
      expect(nonExistentValue).toBeNull();
    });

    it('should delete cache values', async () => {
      const testKey = 'delete-test';
      const testValue = { data: 'To be deleted' };

      // Set and verify
      await cache.set(testKey, testValue);
      const setValue = await cache.get(testKey);
      expect(setValue).toEqual(testValue);

      // Delete and verify
      const deleteResult = await cache.del(testKey);
      expect(deleteResult).toBe(true);

      const deletedValue = await cache.get(testKey);
      expect(deletedValue).toBeNull();
    });
  });

  describe('Advanced Cache Operations', () => {
    it('should handle multiple keys', async () => {
      const keyValuePairs = {
        'key1': { data: 'value1' },
        'key2': { data: 'value2' },
        'key3': { data: 'value3' }
      };

      // Set multiple keys
      const msetResult = await cache.mset(keyValuePairs, 60);
      expect(msetResult).toBe(true);

      // Get multiple keys
      const keys = Object.keys(keyValuePairs);
      const values = await cache.mget(keys);

      expect(values).toHaveLength(3);
      expect(values[0]).toEqual(keyValuePairs.key1);
      expect(values[1]).toEqual(keyValuePairs.key2);
      expect(values[2]).toEqual(keyValuePairs.key3);

      // Clean up
      for (const key of keys) {
        await cache.del(key);
      }
    });

    it('should handle getOrSet pattern', async () => {
      const testKey = 'get-or-set-test';
      let fetchCallCount = 0;

      const fetchFunction = async () => {
        fetchCallCount++;
        return { data: 'Fetched data', callCount: fetchCallCount };
      };

      // First call should fetch
      const firstResult = await cache.getOrSet(testKey, fetchFunction, 60);
      expect(firstResult.callCount).toBe(1);
      expect(fetchCallCount).toBe(1);

      // Second call should use cache
      const secondResult = await cache.getOrSet(testKey, fetchFunction, 60);
      expect(secondResult.callCount).toBe(1); // Same as first call
      expect(fetchCallCount).toBe(1); // Fetch function not called again

      // Clean up
      await cache.del(testKey);
    });

    it('should handle pattern deletion', async () => {
      // Set multiple keys with pattern
      await cache.set('pattern:key1', { data: 'value1' });
      await cache.set('pattern:key2', { data: 'value2' });
      await cache.set('other:key', { data: 'other' });

      // Delete by pattern
      const deletedCount = await cache.delPattern('pattern:*');
      expect(deletedCount).toBe(2);

      // Verify pattern keys are deleted
      const value1 = await cache.get('pattern:key1');
      const value2 = await cache.get('pattern:key2');
      expect(value1).toBeNull();
      expect(value2).toBeNull();

      // Verify other key still exists
      const otherValue = await cache.get('other:key');
      expect(otherValue).toEqual({ data: 'other' });

      // Clean up
      await cache.del('other:key');
    });
  });

  describe('Cache Health and Stats', () => {
    it('should perform health check', async () => {
      const isHealthy = await cache.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should get cache statistics', async () => {
      const stats = await cache.getStats();
      expect(stats).toBeDefined();
      // Stats structure depends on Redis configuration
    });

    it('should handle TTL operations', async () => {
      const testKey = 'ttl-test';
      const testValue = { data: 'TTL test' };

      // Set with TTL
      await cache.set(testKey, testValue, 300); // 5 minutes

      // Check TTL
      const ttl = await cache.ttl(testKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(300);

      // Clean up
      await cache.del(testKey);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      // This test assumes cache operations might fail gracefully
      // In a real scenario, you might test with a disconnected Redis instance
      
      const testKey = 'error-test';
      const testValue = { data: 'test' };

      // These should not throw errors even if Redis is having issues
      const setResult = await cache.set(testKey, testValue);
      const getValue = await cache.get(testKey);
      
      // Results depend on Redis availability
      expect(typeof setResult).toBe('boolean');
      // getValue could be the actual value or null if Redis is down
    });
  });
});