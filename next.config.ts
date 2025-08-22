
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'newsapi.org',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'gnews.io',
        port: '',
        pathname: '/**',
      }
    ],
  },
  env: {
    NEWS_API_KEY: process.env.NEWS_API_KEY,
    GNEWS_API_KEY: process.env.GNEWS_API_KEY,
  }
};

export default nextConfig;
