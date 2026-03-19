import clsx from "clsx";
import { useCallback, useEffect, useRef } from "react";

import { THEME } from "@excalidraw/common";
import { getCommonBounds } from "@excalidraw/element";

import { t } from "../i18n";

import { useApp, useExcalidrawAppState } from "./App";
import { MinimapIcon } from "./icons";
import { Tooltip } from "./Tooltip";

import "./Minimap.scss";

const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = 100;
const PADDING = 10;

const Minimap = () => {
  const app = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const rafIdRef = useRef<number>(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_WIDTH * dpr;
    canvas.height = MINIMAP_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const { state } = app;
    const elements = app.scene.getNonDeletedElements();
    const isDark = state.theme === THEME.DARK;

    // Clear
    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Viewport bounds in scene coordinates
    const vpMinX = -state.scrollX;
    const vpMinY = -state.scrollY;
    const vpMaxX = vpMinX + state.width / state.zoom.value;
    const vpMaxY = vpMinY + state.height / state.zoom.value;

    // Compute scene bounds = union of elements bounds and viewport bounds
    let sceneMinX = vpMinX;
    let sceneMinY = vpMinY;
    let sceneMaxX = vpMaxX;
    let sceneMaxY = vpMaxY;

    if (elements.length > 0) {
      const [elMinX, elMinY, elMaxX, elMaxY] = getCommonBounds(elements);
      sceneMinX = Math.min(sceneMinX, elMinX);
      sceneMinY = Math.min(sceneMinY, elMinY);
      sceneMaxX = Math.max(sceneMaxX, elMaxX);
      sceneMaxY = Math.max(sceneMaxY, elMaxY);
    }

    // Add padding in scene coords
    const sceneW = sceneMaxX - sceneMinX || 1;
    const sceneH = sceneMaxY - sceneMinY || 1;
    const padScene = Math.max(sceneW, sceneH) * (PADDING / MINIMAP_WIDTH);
    sceneMinX -= padScene;
    sceneMinY -= padScene;
    sceneMaxX += padScene;
    sceneMaxY += padScene;

    const totalW = sceneMaxX - sceneMinX;
    const totalH = sceneMaxY - sceneMinY;

    // Fit into minimap while preserving aspect ratio
    const scaleX = MINIMAP_WIDTH / totalW;
    const scaleY = MINIMAP_HEIGHT / totalH;
    const scale = Math.min(scaleX, scaleY);

    const drawW = totalW * scale;
    const drawH = totalH * scale;
    const offsetX = (MINIMAP_WIDTH - drawW) / 2;
    const offsetY = (MINIMAP_HEIGHT - drawH) / 2;

    // Transform scene coords to minimap pixel coords
    const toMiniX = (sx: number) => offsetX + (sx - sceneMinX) * scale;
    const toMiniY = (sy: number) => offsetY + (sy - sceneMinY) * scale;

    // Draw elements as simple filled rectangles
    const elColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";
    ctx.fillStyle = elColor;
    for (const el of elements) {
      const x = toMiniX(el.x);
      const y = toMiniY(el.y);
      const w = el.width * scale;
      const h = el.height * scale;
      ctx.fillRect(x, y, Math.max(w, 1), Math.max(h, 1));
    }

    // Draw viewport rectangle
    const vx = toMiniX(vpMinX);
    const vy = toMiniY(vpMinY);
    const vw = (vpMaxX - vpMinX) * scale;
    const vh = (vpMaxY - vpMinY) * scale;

    ctx.fillStyle = isDark ? "rgba(100,149,237,0.15)" : "rgba(59,130,246,0.1)";
    ctx.fillRect(vx, vy, vw, vh);

    ctx.strokeStyle = isDark ? "rgba(100,149,237,0.8)" : "rgba(59,130,246,0.7)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
  }, [app]);

  // Schedule render on relevant state changes
  const appState = useExcalidrawAppState();
  const sceneNonce = app.scene.getSceneNonce();

  useEffect(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [
    render,
    // re-render triggers:
    app.state.scrollX,
    app.state.scrollY,
    app.state.zoom.value,
    app.state.width,
    app.state.height,
    appState.viewBackgroundColor,
    appState.theme,
    sceneNonce,
  ]);

  const navigateTo = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const { state } = app;
      const elements = app.scene.getNonDeletedElements();

      // Recompute scene bounds (same logic as render)
      const vpMinX = -state.scrollX;
      const vpMinY = -state.scrollY;
      const vpMaxX = vpMinX + state.width / state.zoom.value;
      const vpMaxY = vpMinY + state.height / state.zoom.value;

      let sceneMinX = vpMinX;
      let sceneMinY = vpMinY;
      let sceneMaxX = vpMaxX;
      let sceneMaxY = vpMaxY;

      if (elements.length > 0) {
        const [elMinX, elMinY, elMaxX, elMaxY] = getCommonBounds(elements);
        sceneMinX = Math.min(sceneMinX, elMinX);
        sceneMinY = Math.min(sceneMinY, elMinY);
        sceneMaxX = Math.max(sceneMaxX, elMaxX);
        sceneMaxY = Math.max(sceneMaxY, elMaxY);
      }

      const sceneW = sceneMaxX - sceneMinX || 1;
      const sceneH = sceneMaxY - sceneMinY || 1;
      const padScene = Math.max(sceneW, sceneH) * (PADDING / MINIMAP_WIDTH);
      sceneMinX -= padScene;
      sceneMinY -= padScene;
      sceneMaxX += padScene;
      sceneMaxY += padScene;

      const totalW = sceneMaxX - sceneMinX;
      const totalH = sceneMaxY - sceneMinY;

      const scaleX = MINIMAP_WIDTH / totalW;
      const scaleY = MINIMAP_HEIGHT / totalH;
      const scale = Math.min(scaleX, scaleY);

      const drawW = totalW * scale;
      const drawH = totalH * scale;
      const offsetX = (MINIMAP_WIDTH - drawW) / 2;
      const offsetY = (MINIMAP_HEIGHT - drawH) / 2;

      // Convert minimap pixel to scene coords
      const sceneX = sceneMinX + (mx - offsetX) / scale;
      const sceneY = sceneMinY + (my - offsetY) / scale;

      // Center viewport on this scene point
      const scrollX = -(sceneX - state.width / (2 * state.zoom.value));
      const scrollY = -(sceneY - state.height / (2 * state.zoom.value));

      app.setAppState({ scrollX, scrollY });
    },
    [app],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isDraggingRef.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      navigateTo(e);
    },
    [navigateTo],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isDraggingRef.current) {
        navigateTo(e);
      }
    },
    [navigateTo],
  );

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div className="minimap__canvas-container">
      <canvas
        ref={canvasRef}
        className="minimap__canvas"
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
};

export const MinimapToggle = () => {
  const app = useApp();
  const appState = useExcalidrawAppState();

  const toggle = useCallback(() => {
    app.setAppState({ showMinimap: !app.state.showMinimap });
  }, [app]);

  return (
    <div className="minimap">
      <Tooltip label={t("labels.minimap")}>
        <button
          type="button"
          className={clsx("minimap__toggle", {
            "minimap__toggle--active": appState.showMinimap,
          })}
          onClick={toggle}
          aria-label={t("labels.minimap")}
        >
          {MinimapIcon}
        </button>
      </Tooltip>
      {appState.showMinimap && <Minimap />}
    </div>
  );
};
