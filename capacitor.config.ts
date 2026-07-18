import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.manglacommunication.inventory",
  appName: "Mangla Communication",
  webDir: "mobile-web",
  server: {
    url: "https://manglacom.shadabagasta.workers.dev",
    cleartext: false,
    allowNavigation: ["manglacom.shadabagasta.workers.dev"],
  },
  android: {
    backgroundColor: "#0b0d0f",
  },
};

export default config;
