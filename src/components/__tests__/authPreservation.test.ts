/**
 * @vitest-environment jsdom
 */
/**
 * Preservation Property Tests - Non-Social-Login Auth Flows Unchanged
 *
 * These tests encode the OBSERVED behavior of non-social-login auth actions
 * on the UNFIXED code. They must PASS on both unfixed and fixed code,
 * confirming that the social login fix does not regress existing flows.
 *
 * Observations (UNFIXED code):
 * 1. signIn({ username, password }) calls amplifySignIn; on success (signInStep === 'DONE') calls checkUser
 * 2. signUp(input) calls amplifySignUp and returns the output; on error, logs and re-throws
 * 3. confirmSignUp(input) calls amplifyConfirmSignUp and returns the output; on error, logs and re-throws
 * 4. resendCode(username) calls amplifyResendSignUpCode({ username })
 * 5. logout() calls signOut() and sets user to null
 * 6. checkUser() on page load calls getCurrentUser + fetchUserAttributes to restore session;
 *    on failure clears stale localStorage keys
 *
 * **Validates: Requirements 3.1, 3.3, 3.4, 3.5**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock aws-amplify/auth ---
const mockGetCurrentUser = vi.fn();
const mockFetchUserAttributes = vi.fn();
const mockSignOut = vi.fn();
const mockAmplifySignIn = vi.fn();
const mockAmplifySignUp = vi.fn();
const mockAmplifyConfirmSignUp = vi.fn();
const mockAmplifyResendSignUpCode = vi.fn();
const mockSignInWithRedirect = vi.fn();

vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  fetchUserAttributes: (...args: unknown[]) => mockFetchUserAttributes(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signIn: (...args: unknown[]) => mockAmplifySignIn(...args),
  signUp: (...args: unknown[]) => mockAmplifySignUp(...args),
  confirmSignUp: (...args: unknown[]) => mockAmplifyConfirmSignUp(...args),
  resendSignUpCode: (...args: unknown[]) => mockAmplifyResendSignUpCode(...args),
  signInWithRedirect: (...args: unknown[]) => mockSignInWithRedirect(...args),
}));

vi.mock('aws-amplify', () => ({
  Amplify: { configure: vi.fn() },
}));

// Capture the Hub.listen callback so we can simulate auth events
let hubListenCallback: ((data: { payload: { event: string; data?: unknown } }) => void) | null = null;
const mockHubListen = vi.fn().mockImplementation((_channel: string, callback: unknown) => {
  hubListenCallback = callback as typeof hubListenCallback;
  return vi.fn(); // unsubscribe
});

vi.mock('aws-amplify/utils', () => ({
  Hub: { listen: (...args: unknown[]) => mockHubListen(...args) },
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

/**
 * Renders AuthProvider and returns the context value via a consumer component.
 * Overrides import.meta.env.DEV to false so the production checkUser path runs.
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

  // Allow checkUser to settle
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

describe('Preservation: Non-Social-Login Auth Flows Unchanged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    hubListenCallback = null;

    // Override DEV so the production checkUser path runs.
    // @ts-expect-error -- DEV is boolean at runtime but stubEnv types expect string
    vi.stubEnv('DEV', '');
    // jsdom defaults hostname to 'localhost', which triggers the dev bypass.
    // Override it to a non-localhost value so the production path runs.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hostname: 'app.example.com', origin: 'https://app.example.com' },
      writable: true,
    });

    // Default: getCurrentUser rejects (no session) so checkUser takes catch path
    mockGetCurrentUser.mockRejectedValue(new Error('No current user'));
    mockFetchUserAttributes.mockRejectedValue(new Error('No attributes'));
    mockSignOut.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // Observation 1: signIn calls amplifySignIn; on success calls checkUser
  // **Validates: Requirements 3.1**
  // ---------------------------------------------------------------------------
  describe('signIn preservation', () => {
    it('signIn calls amplifySignIn with the provided credentials', async () => {
      mockAmplifySignIn.mockResolvedValue({
        nextStep: { signInStep: 'CONFIRM_SIGN_UP' },
      });

      const { getContext, cleanup } = await renderAuthProvider();

      await act(async () => {
        await getContext().signIn({ username: 'testuser', password: 'pass123' });
      });

      expect(mockAmplifySignIn).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'pass123',
      });

      cleanup();
    });

    it('signIn calls checkUser when signInStep is DONE', async () => {
      // First call during mount (checkUser fails), second call after signIn success
      mockGetCurrentUser
        .mockRejectedValueOnce(new Error('No user'))
        .mockResolvedValueOnce({ userId: 'user-1', username: 'testuser' });
      mockFetchUserAttributes
        .mockRejectedValueOnce(new Error('No attrs'))
        .mockResolvedValueOnce({ email: 'test@example.com' });

      mockAmplifySignIn.mockResolvedValue({
        nextStep: { signInStep: 'DONE' },
      });

      const { getContext, cleanup } = await renderAuthProvider();

      // getCurrentUser was called once during mount
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);

      await act(async () => {
        await getContext().signIn({ username: 'testuser', password: 'pass123' });
      });

      // getCurrentUser called again by checkUser after signIn success
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(2);

      cleanup();
    });

    it('signIn does NOT call checkUser when signInStep is not DONE', async () => {
      mockAmplifySignIn.mockResolvedValue({
        nextStep: { signInStep: 'CONFIRM_SIGN_UP' },
      });

      const { getContext, cleanup } = await renderAuthProvider();
      const callCountBefore = mockGetCurrentUser.mock.calls.length;

      await act(async () => {
        await getContext().signIn({ username: 'testuser', password: 'pass123' });
      });

      // No additional checkUser call
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(callCountBefore);

      cleanup();
    });

    it('signIn re-throws errors from amplifySignIn', async () => {
      const signInError = new Error('Invalid credentials');
      mockAmplifySignIn.mockRejectedValue(signInError);

      const { getContext, cleanup } = await renderAuthProvider();

      await expect(
        act(async () => {
          await getContext().signIn({ username: 'bad', password: 'wrong' });
        }),
      ).rejects.toThrow('Invalid credentials');

      cleanup();
    });
  });

  // ---------------------------------------------------------------------------
  // Observation 2: signUp calls amplifySignUp and returns output; re-throws errors
  // **Validates: Requirements 3.1**
  // ---------------------------------------------------------------------------
  describe('signUp preservation', () => {
    it('signUp calls amplifySignUp and returns the output', async () => {
      const signUpOutput = { isSignUpComplete: false, userId: 'new-user', nextStep: { signUpStep: 'CONFIRM_SIGN_UP' } };
      mockAmplifySignUp.mockResolvedValue(signUpOutput);

      const { getContext, cleanup } = await renderAuthProvider();

      let result: unknown;
      await act(async () => {
        result = await getContext().signUp({
          username: 'newuser',
          password: 'Str0ng!Pass',
          options: { userAttributes: { email: 'new@example.com' } },
        });
      });

      expect(mockAmplifySignUp).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'Str0ng!Pass',
        options: { userAttributes: { email: 'new@example.com' } },
      });
      expect(result).toEqual(signUpOutput);

      cleanup();
    });

    it('signUp re-throws errors from amplifySignUp', async () => {
      const signUpError = new Error('Username already exists');
      mockAmplifySignUp.mockRejectedValue(signUpError);

      const { getContext, cleanup } = await renderAuthProvider();

      await expect(
        act(async () => {
          await getContext().signUp({
            username: 'existing',
            password: 'Pass123!',
          });
        }),
      ).rejects.toThrow('Username already exists');

      cleanup();
    });
  });

  // ---------------------------------------------------------------------------
  // Observation 3: confirmSignUp calls amplifyConfirmSignUp and returns output; re-throws errors
  // **Validates: Requirements 3.1**
  // ---------------------------------------------------------------------------
  describe('confirmSignUp preservation', () => {
    it('confirmSignUp calls amplifyConfirmSignUp and returns the output', async () => {
      const confirmOutput = { isSignUpComplete: true, nextStep: { signUpStep: 'DONE' } };
      mockAmplifyConfirmSignUp.mockResolvedValue(confirmOutput);

      const { getContext, cleanup } = await renderAuthProvider();

      let result: unknown;
      await act(async () => {
        result = await getContext().confirmSignUp({
          username: 'newuser',
          confirmationCode: '123456',
        });
      });

      expect(mockAmplifyConfirmSignUp).toHaveBeenCalledWith({
        username: 'newuser',
        confirmationCode: '123456',
      });
      expect(result).toEqual(confirmOutput);

      cleanup();
    });

    it('confirmSignUp re-throws errors from amplifyConfirmSignUp', async () => {
      const confirmError = new Error('Invalid code');
      mockAmplifyConfirmSignUp.mockRejectedValue(confirmError);

      const { getContext, cleanup } = await renderAuthProvider();

      await expect(
        act(async () => {
          await getContext().confirmSignUp({
            username: 'newuser',
            confirmationCode: 'wrong',
          });
        }),
      ).rejects.toThrow('Invalid code');

      cleanup();
    });
  });

  // ---------------------------------------------------------------------------
  // Observation 4: resendCode calls amplifyResendSignUpCode({ username })
  // **Validates: Requirements 3.1**
  // ---------------------------------------------------------------------------
  describe('resendCode preservation', () => {
    it('resendCode calls amplifyResendSignUpCode with { username }', async () => {
      mockAmplifyResendSignUpCode.mockResolvedValue(undefined);

      const { getContext, cleanup } = await renderAuthProvider();

      await act(async () => {
        await getContext().resendCode('myuser');
      });

      expect(mockAmplifyResendSignUpCode).toHaveBeenCalledWith({ username: 'myuser' });

      cleanup();
    });
  });

  // ---------------------------------------------------------------------------
  // Observation 5: logout calls signOut() and sets user to null
  // **Validates: Requirements 3.1**
  // ---------------------------------------------------------------------------
  describe('logout preservation', () => {
    it('logout calls signOut and sets user to null', async () => {
      // Set up a successful session so user is non-null after mount
      mockGetCurrentUser.mockResolvedValue({ userId: 'user-1', username: 'testuser' });
      mockFetchUserAttributes.mockResolvedValue({ email: 'test@example.com' });
      mockSignOut.mockResolvedValue(undefined);

      const { getContext, cleanup } = await renderAuthProvider();

      // User should be set after checkUser succeeds
      expect(getContext().user).not.toBeNull();

      await act(async () => {
        await getContext().logout();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(getContext().user).toBeNull();

      cleanup();
    });
  });

  // ---------------------------------------------------------------------------
  // Observation 6: checkUser restores session on page load; on failure clears stale keys
  // **Validates: Requirements 3.3**
  // ---------------------------------------------------------------------------
  describe('checkUser preservation', () => {
    it('checkUser restores user from getCurrentUser + fetchUserAttributes on page load', async () => {
      mockGetCurrentUser.mockResolvedValue({ userId: 'user-1', username: 'testuser' });
      mockFetchUserAttributes.mockResolvedValue({
        email: 'test@example.com',
        'custom:role': 'user',
      });

      const { getContext, cleanup } = await renderAuthProvider();

      expect(getContext().user).toEqual(
        expect.objectContaining({
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          role: 'user',
        }),
      );
      expect(getContext().loading).toBe(false);

      cleanup();
    });

    it('checkUser clears stale localStorage keys when getCurrentUser fails', async () => {
      // Seed stale keys
      localStorage.setItem('CognitoIdentityServiceProvider.abc.idToken', 'stale');
      localStorage.setItem('amplify-signin-with-hostedUI', 'true');
      localStorage.setItem('unrelated-key', 'keep-me');

      mockGetCurrentUser.mockRejectedValue(new Error('No user'));
      mockFetchUserAttributes.mockRejectedValue(new Error('No attrs'));

      const { getContext, cleanup } = await renderAuthProvider();

      // Stale keys should be cleared
      expect(localStorage.getItem('CognitoIdentityServiceProvider.abc.idToken')).toBeNull();
      expect(localStorage.getItem('amplify-signin-with-hostedUI')).toBeNull();
      // Unrelated keys should remain
      expect(localStorage.getItem('unrelated-key')).toBe('keep-me');
      // User should be null
      expect(getContext().user).toBeNull();
      expect(getContext().loading).toBe(false);

      cleanup();
    });
  });

  // ---------------------------------------------------------------------------
  // Hub listener preservation
  // **Validates: Requirements 3.4, 3.5**
  // ---------------------------------------------------------------------------
  describe('Hub listener preservation', () => {
    it('Hub.listen is registered for auth channel on mount', async () => {
      const { cleanup } = await renderAuthProvider();

      expect(mockHubListen).toHaveBeenCalledWith('auth', expect.any(Function));

      cleanup();
    });

    it('signInWithRedirect Hub event triggers checkUser', async () => {
      // Mount with no session
      mockGetCurrentUser.mockRejectedValue(new Error('No user'));
      mockFetchUserAttributes.mockRejectedValue(new Error('No attrs'));

      const { getContext, cleanup } = await renderAuthProvider();

      // After mount, checkUser was called once (failed)
      const callCountAfterMount = mockGetCurrentUser.mock.calls.length;

      // Now simulate a successful OAuth redirect
      mockGetCurrentUser.mockResolvedValue({ userId: 'oauth-user', username: 'googleuser' });
      mockFetchUserAttributes.mockResolvedValue({ email: 'google@example.com' });

      // Fire the Hub event
      await act(async () => {
        hubListenCallback?.({ payload: { event: 'signInWithRedirect' } });
        await new Promise((r) => setTimeout(r, 50));
      });

      // checkUser should have been called again
      expect(mockGetCurrentUser.mock.calls.length).toBeGreaterThan(callCountAfterMount);
      expect(getContext().user).toEqual(
        expect.objectContaining({
          id: 'oauth-user',
          username: 'googleuser',
          email: 'google@example.com',
        }),
      );

      cleanup();
    });

    it('signInWithRedirect_failure Hub event sets loading to false', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('No user'));
      mockFetchUserAttributes.mockRejectedValue(new Error('No attrs'));

      const { getContext, cleanup } = await renderAuthProvider();

      // After mount, loading should already be false (checkUser finished)
      expect(getContext().loading).toBe(false);

      // Fire the failure event — should not crash and loading stays false
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        hubListenCallback?.({
          payload: { event: 'signInWithRedirect_failure', data: 'OAuth error' },
        });
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(getContext().loading).toBe(false);

      consoleSpy.mockRestore();
      cleanup();
    });
  });
});
