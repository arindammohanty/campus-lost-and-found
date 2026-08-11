/** @type {import('next').NextConfig} */
const nextConfig = {
    swcMinify: false,
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
    experimental: {
        serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
    },
    webpack: (config, { isServer }) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            'sharp$': false,
            'onnxruntime-node$': false,
        };
        return config;
    }
};

export default nextConfig;
