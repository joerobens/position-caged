import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Position",
    short_name: "Position",
    description: "Learn the neck, practise it to a clock, and keep your songs and sets for the stand.",
    start_url: "/play",
    display: "standalone",
    orientation: "any",
    background_color: "#12100E",
    theme_color: "#12100E",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
