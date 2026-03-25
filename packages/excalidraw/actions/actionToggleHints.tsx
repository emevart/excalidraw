import { CaptureUpdateAction } from "@excalidraw/element";

import { eyeIcon } from "../components/icons";

import { register } from "./register";

export const actionToggleHints = register({
  name: "hints",
  label: "buttons.hints",
  icon: eyeIcon,
  viewMode: true,
  trackEvent: {
    category: "canvas",
    predicate: (appState) => !appState.hintsEnabled,
  },
  perform(elements, appState) {
    return {
      appState: {
        ...appState,
        hintsEnabled: !this.checked!(appState),
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  checked: (appState) => appState.hintsEnabled,
});
