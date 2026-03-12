import { PostHog } from 'posthog-node';

export default function PostHogClient() {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey) {
        // Return a mock client that does nothing if no key is present (e.g. local dev without keys)
        return {
            capture: () => { },
            shutdown: () => { }
        } as unknown as PostHog;
    }

    const posthogClient = new PostHog(posthogKey, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0
    });
    return posthogClient;
}
