/**
 * Device detection store for responsive performance and UI adjustments
 */
export let deviceStore = $state({
  isMobile: false,
  isTouch: false,
  deviceType: 'desktop' as 'mobile' | 'tablet' | 'desktop',
  screenSize: { width: 1920, height: 1080 },
});

/**
 * Initialize device detection and set up listeners
 */
export function initDeviceDetection() {
  if (typeof window === 'undefined') return;

  // Function to detect device characteristics
  const detectDevice = () => {
    // Check for touch capability
    const isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    // Check screen size
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Detect mobile via user agent (fallback)
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent,
      );

    // Determine device type based on screen width
    let deviceType: 'mobile' | 'tablet' | 'desktop';
    if (width < 768) {
      deviceType = 'mobile';
    } else if (width < 1024) {
      deviceType = 'tablet';
    } else {
      deviceType = 'desktop';
    }

    // Mobile is determined by either small screen, touch + small screen, or mobile UA
    const isMobile =
      deviceType === 'mobile' || (isTouch && width < 1024) || isMobileUA;

    // Update store
    deviceStore.isMobile = isMobile;
    deviceStore.isTouch = isTouch;
    deviceStore.deviceType = deviceType;
    deviceStore.screenSize = { width, height };
  };

  // Initial detection
  detectDevice();

  // Set up resize listener
  let resizeTimeout: ReturnType<typeof setTimeout>;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(detectDevice, 150); // Debounce resize events
  };

  window.addEventListener('resize', handleResize);

  // Also listen for orientation changes on mobile
  window.addEventListener('orientationchange', detectDevice);

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', detectDevice);
    clearTimeout(resizeTimeout);
  };
}

/**
 * Helper to check if we should use mobile optimizations
 */
export function shouldUseMobileOptimizations(): boolean {
  return deviceStore.isMobile || deviceStore.deviceType === 'tablet';
}

/**
 * Helper to get recommended performance preset based on device
 */
export function getDevicePerformancePreset():
  | 'high'
  | 'medium'
  | 'low'
  | 'off' {
  if (deviceStore.isMobile) {
    return 'low'; // Aggressive optimization for mobile
  } else if (deviceStore.deviceType === 'tablet') {
    return 'medium'; // Moderate optimization for tablets
  } else {
    return 'high'; // Full quality for desktop
  }
}
