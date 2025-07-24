export const prerender = true;

export const GET = () => {
  return new Response(
    `User-agent: *
  Allow: /
  Sitemap: https://play.ponzi.land/sitemap.xml
  `,
    {
      headers: {
        'Content-Type': 'text/plain',
      },
    },
  );
};
