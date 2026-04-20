/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-wordcloud', 'd3-cloud', 'd3-selection', 'd3-dispatch', 'd3-drag', 'd3-zoom', 'd3-transition', 'd3-timer', 'd3-ease', 'd3-interpolate', 'd3-color', 'd3-scale', 'd3-array'],
  images: {
    domains: ['assemblypeople.go.kr', 'www.assembly.go.kr'],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
