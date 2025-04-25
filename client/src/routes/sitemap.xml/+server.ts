import { dev } from '$app/environment';

export const GET = async () => {
  const base = 'https://play.ponzi.land';

  const urls = ['', '/game', '/dashboard', '/ramp', '/onboarding'];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls
    .map(
      (path) => `
    <url>
      <loc>${base}${path}</loc>
    </url>`,
    )
    .join('')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
