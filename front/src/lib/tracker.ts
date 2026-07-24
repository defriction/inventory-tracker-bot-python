const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function trackEvent(
  token: string,
  event: string,
  category: string = 'general',
  tab: string = '',
  metadata: Record<string, any> = {},
  jwt?: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  const query = jwt ? '' : `?token=${token}`;
  fetch(`${API_URL}/api/usage/track${query}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ event, category, tab, metadata }),
  }).catch(() => {});
}
