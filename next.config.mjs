/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // OAuth token endpoint: {account}.talkdeskid.com
        source: '/api/talkdesk-auth/:path*',
        destination: `https://${process.env.NEXT_PUBLIC_TALKDESK_ACCOUNT_NAME || 'unknown'}.talkdeskid.com/:path*`,
      },
      {
        // Digital Connect API: api.talkdeskapp.com
        source: '/api/talkdesk/:path*',
        destination: 'https://api.talkdeskapp.com/:path*',
      },
    ];
  },
};

export default nextConfig;
