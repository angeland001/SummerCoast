import { useResponsive } from "./useResponsive";

// Legacy hook kept so existing screens keep working unchanged.
// "Tablet" means any device whose short side is 500dp or more
// (the 7" wall tablet and the 11" iPad both qualify).
const useScreenSize = () => {
  const { isTablet } = useResponsive();
  return isTablet;
};

export default useScreenSize;
