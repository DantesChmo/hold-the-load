import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Игра полностью клиентская — собираем в статику, хостится где угодно.
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
