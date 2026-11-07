/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Disables Vercel's server-side image transformations to bypass the 1,000 monthly limit on Free Hobby tier.
    // Tailoram compresses all designer portfolio images, avatars, and garments client-side to WebP (<150KB) on upload.
    // Setting unoptimized: true prevents Vercel 402 Payment Required errors and reduces Vercel transformation usage to 0.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
