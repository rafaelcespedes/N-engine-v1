/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This repo is nested under other lockfiles; pin the tracing root to itself so Next
  // doesn't infer the home directory as the workspace root.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
