import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clean Crate — Quality Food Essentials & Booking",
    short_name: "Clean Crate",
    description:
      "At Clean Crate, we are committed to bringing you quality food essentials, thoughtfully sourced and neatly packaged.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1611",
    theme_color: "#123523",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/images/products/signature-crate.webp",
        sizes: "1200x900",
        type: "image/webp",
      },
    ],
  };
}

