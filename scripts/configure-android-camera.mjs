import { readFileSync, writeFileSync } from "node:fs";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = readFileSync(manifestPath, "utf8");

const cameraPermission = '<uses-permission android:name="android.permission.CAMERA" />';
const cameraFeature = '<uses-feature android:name="android.hardware.camera" android:required="false" />';

if (!manifest.includes(cameraPermission)) {
  manifest = manifest.replace(/(<manifest\b[^>]*>)/, `$1\n\n    ${cameraPermission}\n    ${cameraFeature}`);
}

writeFileSync(manifestPath, manifest);
console.log("Android camera permission configured for phone-box barcode scanning.");
