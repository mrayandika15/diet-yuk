import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export const MOBILE_WIDTH = 430;
export const TAB_BAR_HEIGHT = 72;
export const TAB_BAR_GAP = 10;

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "web") {
      const shown = Keyboard.addListener("keyboardDidShow", () =>
        setVisible(true),
      );
      const hidden = Keyboard.addListener("keyboardDidHide", () =>
        setVisible(false),
      );
      return () => {
        shown.remove();
        hidden.remove();
      };
    }
    const viewport = window.visualViewport;
    if (!viewport) return;
    let focusFrame = 0;
    const update = () => {
      const active = document.activeElement;
      const editing =
        active instanceof HTMLElement &&
        (active.matches("input, textarea") || active.isContentEditable);
      const keyboardOpen =
        editing &&
        viewport.scale === 1 &&
        window.innerHeight - viewport.height > 120;
      setVisible(keyboardOpen);
      cancelAnimationFrame(focusFrame);
      if (keyboardOpen)
        focusFrame = requestAnimationFrame(() => {
          focusFrame = requestAnimationFrame(() => {
            if (document.activeElement === active)
              active.scrollIntoView({ block: "nearest", inline: "nearest" });
          });
        });
    };
    viewport.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    update();
    return () => {
      cancelAnimationFrame(focusFrame);
      viewport.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);
  return visible;
}
