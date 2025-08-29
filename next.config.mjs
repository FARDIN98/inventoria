import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { i18n } = require('./next-i18next.config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  transpilePackages: ['i18next'],
};

export default nextConfig;
