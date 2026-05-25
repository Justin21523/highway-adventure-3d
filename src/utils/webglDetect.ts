export type WebGLStatus =
  | { ok: true }
  | { ok: false; browser: 'chrome' | 'firefox' | 'safari' | 'other'; reason: string };

function getBrowser(): 'chrome' | 'firefox' | 'safari' | 'other' {
  const ua = navigator.userAgent;
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari';
  if (/Chrome|Chromium|Edg/i.test(ua)) return 'chrome';
  return 'other';
}

export function detectWebGL(): WebGLStatus {
  const canvas = document.createElement('canvas');
  const opts: WebGLContextAttributes = { failIfMajorPerformanceCaveat: false };

  const ctx =
    canvas.getContext('webgl2', opts) ||
    canvas.getContext('webgl', opts) ||
    (canvas.getContext as (id: string, opts?: WebGLContextAttributes) => RenderingContext | null)(
      'experimental-webgl',
      opts,
    );

  if (ctx) return { ok: true };

  return { ok: false, browser: getBrowser(), reason: 'WebGL context creation failed' };
}

export const FIX_INSTRUCTIONS: Record<'chrome' | 'firefox' | 'safari' | 'other', string[]> = {
  chrome: [
    'Go to chrome://settings/system and enable "Use graphics acceleration when available", then restart Chrome.',
    'Or launch Chrome from terminal: chromium --use-angle=swiftshader --ignore-gpu-blocklist http://localhost:3000',
    'Or open chrome://flags, search "Override software rendering list", set it to Enabled, then relaunch.',
  ],
  firefox: [
    'Open about:config in the address bar.',
    'Search for webgl.force-enabled and set it to true.',
    'Search for webgl.disabled and set it to false.',
    'Restart Firefox.',
  ],
  safari: [
    'Open Safari > Preferences > Advanced.',
    'Check "Show Develop menu in menu bar".',
    'Open Develop > Experimental Features and ensure WebGL is enabled.',
  ],
  other: [
    'Enable hardware acceleration in your browser settings.',
    'Try Chrome or Firefox with WebGL enabled.',
  ],
};
