import clsx from "clsx";

import { isTextElement } from "@excalidraw/element";

import type {
  NonDeletedElementsMap,
  NonDeletedSceneElementsMap,
} from "@excalidraw/element/types";

import { getTargetElements } from "../scene";

import {
  canChangeStrokeColor,
  canChangeBackgroundColor,
  CombinedShapeProperties,
  CombinedArrowProperties,
  CombinedTextProperties,
  CombinedExtraActions,
  LinearEditorAction,
} from "./Actions";
import { useExcalidrawContainer } from "./App";

import "./MobileSettingsRow.scss";

import type { AppClassProperties, AppState, UIAppState } from "../types";
import type { ActionManager } from "../actions/manager";

/** Tools that have no settings row */
const TOOLS_WITHOUT_SETTINGS = new Set([
  "selection",
  "eraser",
  "hand",
  "laser",
  "lasso",
]);

export const MobileSettingsRow = ({
  appState,
  elementsMap,
  renderAction,
  app,
  setAppState,
}: {
  appState: UIAppState;
  elementsMap: NonDeletedElementsMap | NonDeletedSceneElementsMap;
  renderAction: ActionManager["renderAction"];
  app: AppClassProperties;
  setAppState: React.Component<any, AppState>["setState"];
}) => {
  const targetElements = getTargetElements(elementsMap, appState);
  const { container } = useExcalidrawContainer();

  const hasSettings =
    !TOOLS_WITHOUT_SETTINGS.has(appState.activeTool.type) ||
    targetElements.length > 0;

  const collapsed = !hasSettings;

  return (
    <div
      className={clsx("mobile-settings-row", {
        "mobile-settings-row--collapsed": collapsed,
      })}
    >
      <div className="mobile-settings-row__content">
        {/* Stroke Color */}
        {canChangeStrokeColor(appState, targetElements) && (
          <div className="mobile-settings-row__item compact-action-item">
            {renderAction("changeStrokeColor")}
          </div>
        )}

        {/* Background Color */}
        {canChangeBackgroundColor(appState, targetElements) && (
          <div className="mobile-settings-row__item compact-action-item">
            {renderAction("changeBackgroundColor")}
          </div>
        )}

        {/* Combined Shape Properties (stroke width, style, roundness, opacity) */}
        <div className="mobile-settings-row__item">
          <CombinedShapeProperties
            appState={appState}
            renderAction={renderAction}
            setAppState={setAppState}
            targetElements={targetElements}
            container={container}
          />
        </div>

        {/* Combined Arrow Properties */}
        <div className="mobile-settings-row__item">
          <CombinedArrowProperties
            appState={appState}
            renderAction={renderAction}
            setAppState={setAppState}
            targetElements={targetElements}
            container={container}
            app={app}
          />
        </div>

        {/* Linear Editor */}
        <div className="mobile-settings-row__item">
          <LinearEditorAction
            appState={appState}
            renderAction={renderAction}
            targetElements={targetElements}
          />
        </div>

        {/* Text Properties */}
        {(appState.activeTool.type === "text" ||
          targetElements.some(isTextElement)) && (
          <>
            <div className="mobile-settings-row__item compact-action-item">
              {renderAction("changeFontFamily")}
            </div>
            <div className="mobile-settings-row__item">
              <CombinedTextProperties
                appState={appState}
                renderAction={renderAction}
                setAppState={setAppState}
                targetElements={targetElements}
                container={container}
                elementsMap={elementsMap}
              />
            </div>
          </>
        )}

        {/* Combined Extra Actions (layers, align, group, etc.) */}
        <div className="mobile-settings-row__item">
          <CombinedExtraActions
            appState={appState}
            renderAction={renderAction}
            targetElements={targetElements}
            setAppState={setAppState}
            container={container}
            app={app}
            showDuplicate
            showDelete
          />
        </div>
      </div>
    </div>
  );
};
