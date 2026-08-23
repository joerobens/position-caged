import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Position - CAGED practice",
    short_name: "Position",
    description: "The five CAGED shapes in any key, with a drone and a metronome that moves you between positions.",
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
