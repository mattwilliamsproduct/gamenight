/**
 * Preview-only gate for /review.
 * Production and cardknight.vercel.app always 404, even if files leaked into public/.
 */

export const config = {
  matcher: ['/review', '/review/', '/review/:path*']
};

function isProductionHost(host) {
  const name = String(host || '').split(':')[0].toLowerCase();
  return name === 'cardknight.vercel.app' || name.endsWith('.cardknight.vercel.app');
}

export default function middleware(request) {
  const host = request.headers.get('host') || '';
  if (process.env.VERCEL_ENV === 'production' || isProductionHost(host)) {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-back-porch-review': 'production-blocked'
      }
    });
  }
}
