import { useMemo, useState } from "react";
import QRCode from "qrcode-terminal/vendor/QRCode/index.js";
import QRErrorCorrectLevel from "qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel.js";

function nativeRemoteConfiguration(location = window.location) {
  const parameters = new URLSearchParams(location.search);
  if (parameters.get("nativeHost") !== "1") return null;
  try {
    const url = new URL(parameters.get("share") || "");
    if (url.protocol !== "http:" || url.pathname !== "/remote") return null;
    return { shareUrl: url.toString() };
  } catch { return null; }
}

export function buildQrModules(value) {
  const qr = new QRCode(-1, QRErrorCorrectLevel.L);
  qr.addData(value);
  qr.make();
  return qr.modules;
}

function RemoteQrCode({ value }) {
  const modules = useMemo(() => buildQrModules(value), [value]);
  const quietZone = 4;
  const size = modules.length + (quietZone * 2);
  const path = modules.flatMap((row, y) => row.map((dark, x) => dark ? `M${x + quietZone} ${y + quietZone}h1v1h-1z` : "")).join("");
  return <svg className="native-remote-qr__code" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code for the GRMetro Phone Remote" shapeRendering="crispEdges">
    <rect width={size} height={size} fill="#fff" />
    <path d={path} fill="#111827" />
  </svg>;
}

export function NativeRemoteAccess() {
  const configuration = nativeRemoteConfiguration();
  const [qrVisible, setQrVisible] = useState(false);
  if (!configuration) return null;
  return <>
    <section className="native-remote-access" aria-label="Native Phone Remote access">
      <div><span>GRMetro desktop</span><strong>Phone Remote</strong></div>
      <button type="button" onClick={() => setQrVisible(true)}>Show Phone QR</button>
    </section>
    {qrVisible && <div className="native-remote-qr" role="dialog" aria-modal="true" aria-labelledby="native-remote-qr-title">
      <div className="native-remote-qr__panel">
        <button className="native-remote-qr__close" type="button" onClick={() => setQrVisible(false)} aria-label="Close phone QR">×</button>
        <span className="mobile-eyebrow">Open on a phone</span>
        <h2 id="native-remote-qr-title">Scan Phone Remote</h2>
        <RemoteQrCode value={configuration.shareUrl} />
        <p>{configuration.shareUrl}</p>
        <button className="operations-primary" type="button" onClick={() => setQrVisible(false)}>Done</button>
      </div>
    </div>}
  </>;
}

export { nativeRemoteConfiguration };
