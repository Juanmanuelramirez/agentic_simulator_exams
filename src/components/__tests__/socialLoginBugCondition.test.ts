/**
 * Bug Condition Exploration Test - Social Login Missing Stale Token Cleanup
 *
 * This test encodes the EXPECTED (correct) behavior for social login functions.
 * When run against the UNFIXED code, these tests SHOULD FAIL — confirming the bug exists.
 *
 * Bug: loginWithGoogle() and loginWithAmazon() call signInWithRedirect() directly
 * without first calling signOut() to clear stale Cognito tokens from localStorage.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock aws-amplify/auth ---
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockSignInWithRedirect = vi.fn().mockResolvedValue(undefined);
const mockGetCurrentUser = vi.fn().mockRejectedValue(new Error('No user'));
const mockFetchUserAttributes = vi.fn().mockRejectedValue(new Error('No user'));

vi.mock('aws-amplify/auth', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signInWithRedirect: (...args: unknown[]) => mockSignInWithRedirect(...args),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  fetchUserAttributes: (...args: unknown[]) => mockFetchUserAttributes(...args),
  signUp: vi.fn(),
  signIn: vi.fn(),
  confirmSignUp: vi.fn(),
  resendSignUpCode: vi.fn(),
}));

vi.mock('aws-amplify', () => ({
  Amplify: { configure: vi.fn() },
}));

vi.mock('aws-amplify/utils', () => ({
  Hub: { listen: vi.fn().mockReturnValue(vi.fn()) },
}));

vi.mock('../../services/subscriptionService', () => ({
  subscriptionService: { getSubscription: vi.fn() },
  computeEffectiveStatus: vi.fn(),
}));

vi.mock('../../services/organizationService', () => ({
  getOrganizationById: vi.fn(),
  computeOrgAccessStatus: vi.fn(),
}));

// --- Helper to render AuthProvider and extract context ---
import React from 'react';
import ReactDOMClient from 'react-dom/client';
import { act } from 'react';
import { AuthProvider, useAuth } from '../AuthContext';

/** Seed localStorage with stale Cognito / Amplify keys */
function seedStaleTokens() {
  localStorage.setItem(
    'CognitoIdentityServiceProvider.abc123.idToken',
    'stale-id-token',
  );
  localStorage.setItem(
    'CognitoIdentityServiceProvider.abc123.accessToken',
    'stale-access-token',
  );
  localStorage.setItem('amplify-signin-with-hostedUI', 'true');
}

/** Returns true if any stale Cognito/Amplify keys remain in localStorage */
function hasStaleKeys(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith('CognitoIdentityServiceProvider') ||
        key.startsWith('amplify'))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Renders AuthProvider and returns the context value via a consumer component.
 * We wait for the initial checkUser to settle before returning.
 */
async function renderAuthProvider(): Promise<{
  getContext: () => ReturnType<typeof useAuth>;
  cleanup: () => void;
}> {
  let contextRef: ReturnType<typeof useAuth> | undefined;

  function Consumer() {
    const ctx = useAuth();
    contextRef = ctx;
    return null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: ReactDOMClient.Root;

  await act(async () => {
    root = ReactDOMClient.createRoot(container);
    root.render(
      React.createElement(AuthProvider, null, React.createElement(Consumer)),
    );
  });

  // Allow checkUser to settle (it's async in useEffect)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });

  return {
    getContext: () => {
      if (!contextRef) throw new Error('Context not available');
      return contextRef;
    },
    cleanup: () => {
      act(() => {
        root!.unmount();
      });
      document.body.removeChild(container);
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Bug Condition Exploration: Social Login Missing Stale Token Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Ensure getCurrentUser rejects so checkUser takes the catch path (non-dev)
    mockGetCurrentUser.mockRejectedValue(new Error('No current user'));
    mockFetchUserAttributes.mockRejectedValue(new Error('No attributes'));
    mockSignOut.mockResolvedValue(undefined);
    mockSignInWithRedirect.mockResolvedValue(undefined);
  });

  /**
   * **Validates: Requirements 1.1, 2.1**
   *
   * Property: For loginWithGoogle() with stale Cognito tokens in localStorage,
   * stale keys MUST be cleared before signInWithRedirect is called.
   *
   * Note: We do NOT call signOut() because Amplify v6 signOut() triggers a
   * redirect to the Cognito logout endpoint, causing the page flash/blink.
   * Instead we only clear localStorage keys directly.
   */
  it('loginWithGoogle: stale tokens must be cleared before signInWithRedirect when stale tokens exist', async () => {
    const { getContext, cleanup } = await renderAuthProvider();

    // Seed stale tokens AFTER initial render (simulating accumulated stale state)
    seedStaleTokens();
    // Reset mocks so we only track calls from loginWithGoogle
    mockSignOut.mockClear();
    mockSignInWithRedirect.mockClear();

    // Track that stale keys are cleared BEFORE signInWithRedirect is called
    let staleKeysExistedAtRedirectTime = true;
    mockSignInWithRedirect.mockImplementation(async () => {
      staleKeysExistedAtRedirectTime = hasStaleKeys();
    });

    await act(async () => {
      await getContext().loginWithGoogle();
    });

    // EXPECTED (correct) behavior: stale keys cleared, signInWithRedirect called
    expect(mockSignInWithRedirect).toHaveBeenCalledWith({ provider: 'Google' });
    expect(staleKeysExistedAtRedirectTime).toBe(false);
    // signOut should NOT be called (it causes redirect/flash)
    expect(mockSignOut).not.toHaveBeenCalled();

    cleanup();
  });

  /**
   * **Validates: Requirements 1.1, 2.1**
   *
   * Property: For loginWithAmazon() with stale Cognito tokens in localStorage,
   * stale keys MUST be cleared before signInWithRedirect is called.
   *
   * Note: We do NOT call signOut() because Amplify v6 signOut() triggers a
   * redirect to the Cognito logout endpoint, causing the page flash/blink.
   */
  it('loginWithAmazon: stale tokens must be cleared before signInWithRedirect when stale tokens exist', async () => {
    const { getContext, cleanup } = await renderAuthProvider();

    seedStaleTokens();
    mockSignOut.mockClear();
    mockSignInWithRedirect.mockClear();

    let staleKeysExistedAtRedirectTime = true;
    mockSignInWithRedirect.mockImplementation(async () => {
      staleKeysExistedAtRedirectTime = hasStaleKeys();
    });

    await act(async () => {
      await getContext().loginWithAmazon();
    });

    // EXPECTED (correct) behavior: stale keys cleared, signInWithRedirect called
    expect(mockSignInWithRedirect).toHaveBeenCalledWith({
      provider: 'Amazon',
    });
    expect(staleKeysExistedAtRedirectTime).toBe(false);
    // signOut should NOT be called (it causes redirect/flash)
    expect(mockSignOut).not.toHaveBeenCalled();

    cleanup();
  });

  /**
   * **Validates: Requirements 1.3, 2.1**
   *
   * Property: When signInWithRedirect throws an error during loginWithGoogle,
   * the error must be caught (not propagate as unhandled rejection).
   *
   * On UNFIXED code, there is no try/catch → the error propagates → this test SHOULD FAIL.
   */
  it('loginWithGoogle: errors from signInWithRedirect must be caught, not propagate', async () => {
    const { getContext, cleanup } = await renderAuthProvider();

    seedStaleTokens();
    mockSignOut.mockClear();
    mockSignInWithRedirect.mockClear();

    const testError = new Error('OAuth redirect failed');
    mockSignInWithRedirect.mockRejectedValue(testError);

    // The CORRECT behavior is that loginWithGoogle catches the error internally.
    // On UNFIXED code, the error propagates → calling loginWithGoogle will reject.
    let caughtError: unknown = null;
    await act(async () => {
      try {
        await getContext().loginWithGoogle();
      } catch (err) {
        caughtError = err;
      }
    });

    // EXPECTED: error should NOT propagate (it should be caught internally)
    expect(caughtError).toBeNull();

    cleanup();
  });

  /**
   * **Validates: Requirements 2.1**
   *
   * Property: After loginWithGoogle completes, stale localStorage keys
   * (CognitoIdentityServiceProvider*, amplify*) must be cleared.
   *
   * On UNFIXED code, no cleanup happens → stale keys remain → this test SHOULD FAIL.
   */
  it('loginWithGoogle: stale localStorage keys must be cleared before redirect', async () => {
    const { getContext, cleanup } = await renderAuthProvider();

    // Seed stale tokens after render
    seedStaleTokens();
    expect(hasStaleKeys()).toBe(true);

    mockSignOut.mockClear();
    mockSignInWithRedirect.mockClear();

    // Track that stale keys are cleared BEFORE signInWithRedirect is called
    let staleKeysExistedAtRedirectTime = false;
    mockSignInWithRedirect.mockImplementation(async () => {
      staleKeysExistedAtRedirectTime = hasStaleKeys();
    });

    await act(async () => {
      await getContext().loginWithGoogle();
    });

    // EXPECTED: stale keys should be cleared before signInWithRedirect runs
    expect(staleKeysExistedAtRedirectTime).toBe(false);

    cleanup();
  });
});
