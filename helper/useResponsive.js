import { useEffect, useMemo, useState } from "react";
import { Dimensions } from "react-native";

// Device buckets are decided by the screen's short side, which does not
// change when the device rotates:
//   phone        short side < 500dp   (all phones)
//   smallTablet  short side 500-700dp (7" wall tablet)
//   largeTablet  short side > 700dp   (11" iPad and larger)
const getDeviceType = (width, height) => {
  const shortSide = Math.min(width, height);
  if (shortSide < 500) return "phone";
  if (shortSide <= 700) return "smallTablet";
  return "largeTablet";
};

export const useResponsive = () => {
  const [window, setWindow] = useState(() => Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setWindow(window);
    });
    return () => subscription?.remove();
  }, []);

  return useMemo(() => {
    const device = getDeviceType(window.width, window.height);
    return {
      device,
      isPhone: device === "phone",
      isSmallTablet: device === "smallTablet",
      isLargeTablet: device === "largeTablet",
      isTablet: device !== "phone",
      width: window.width,
      height: window.height,
    };
  }, [window.width, window.height]);
};

export default useResponsive;
