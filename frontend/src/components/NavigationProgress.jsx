// Thin teal progress bar pinned to the very top of the viewport. Becomes
// visible the instant React Router enters a "loading" or "submitting"
// navigation state (e.g. while a lazy route chunk is downloading) and
// fades out when the next page renders.
//
// Requires the data router (createBrowserRouter + RouterProvider) — the
// `useNavigation` hook only exists in that mode. Render it once inside
// every layout that mounts under <RouterProvider>.
//
// Behaviour
// - Idle: not in the DOM.
// - Loading: appears, animates from ~15% → ~80% over 1.5s (visual hint
//   of progress without a real percentage), then sits at 80% until the
//   navigation completes.
// - Complete: snaps to 100% then fades out + unmounts after 200ms.

import { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";

export default function NavigationProgress() {
  const navigation = useNavigation();
  const isActive =
    navigation.state === "loading" || navigation.state === "submitting";

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let creep;
    let hideTimer;

    if (isActive) {
      setVisible(true);
      setProgress(15);
      // Creep upward toward 80% to suggest progress without faking
      // completion. The router will end the navigation before we hit
      // the ceiling in the vast majority of cases.
      creep = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 80) return current;
          return current + Math.max(1, (80 - current) * 0.12);
        });
      }, 120);
    } else if (visible) {
      // Snap to 100% then unmount after a short fade so the bar feels
      // like it completed rather than disappearing mid-motion.
      setProgress(100);
      hideTimer = window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 220);
    }

    return () => {
      if (creep) window.clearInterval(creep);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [isActive, visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 top-0 z-[9999] h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-[#157A7A] shadow-[0_0_8px_rgba(24,139,139,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
