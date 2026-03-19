import clsx from "clsx";

import { CLASSES, isTransparent } from "@excalidraw/common";

import {
  shouldAllowVerticalAlign,
  suppportsHorizontalAlign,
  hasBoundTextElement,
  isTextElement,
  isLinearElement,
  isElbowArrow,
  isArrowElement,
  isImageElement,
  toolIsArrow,
} from "@excalidraw/element";

import { Popover } from "radix-ui";

import type {
  ExcalidrawElement,
  NonDeletedElementsMap,
  NonDeletedSceneElementsMap,
} from "@excalidraw/element/types";

import {
  canChangeRoundness,
  getTargetElements,
  hasBackground,
  hasStrokeStyle,
  hasStrokeWidth,
} from "../scene";

import { getFormValue } from "../actions/actionProperties";

import { t } from "../i18n";

import { useTextEditorFocus } from "../hooks/useTextEditorFocus";

import { alignActionsPredicate } from "../actions/actionAlign";

import { canChangeStrokeColor, canChangeBackgroundColor } from "./Actions";
import { useExcalidrawContainer } from "./App";
import { PropertiesPopover } from "./PropertiesPopover";
import { Tooltip } from "./Tooltip";

import {
  sharpArrowIcon,
  roundArrowIcon,
  elbowArrowIcon,
  TextSizeIcon,
  adjustmentsIcon,
  DotsHorizontalIcon,
} from "./icons";

import type { AppClassProperties, AppState, UIAppState } from "../types";
import type { ActionManager } from "../actions/manager";

import "./MobileSettingsRow.scss";

// Common CSS class combinations (same as Actions.tsx)
const PROPERTIES_CLASSES = clsx([
  CLASSES.SHAPE_ACTIONS_THEME_SCOPE,
  "properties-content",
]);

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
        <MobileSettingsShapeProperties
          appState={appState}
          renderAction={renderAction}
          setAppState={setAppState}
          targetElements={targetElements}
          container={container}
        />

        {/* Combined Arrow Properties */}
        <MobileSettingsArrowProperties
          appState={appState}
          renderAction={renderAction}
          setAppState={setAppState}
          targetElements={targetElements}
          container={container}
          app={app}
        />

        {/* Linear Editor */}
        <MobileSettingsLinearEditor
          appState={appState}
          renderAction={renderAction}
          targetElements={targetElements}
        />

        {/* Text Properties */}
        {(appState.activeTool.type === "text" ||
          targetElements.some(isTextElement)) && (
          <>
            <div className="mobile-settings-row__item compact-action-item">
              {renderAction("changeFontFamily")}
            </div>
            <MobileSettingsTextProperties
              appState={appState}
              renderAction={renderAction}
              setAppState={setAppState}
              targetElements={targetElements}
              container={container}
              elementsMap={elementsMap}
            />
          </>
        )}

        {/* Combined Extra Actions (layers, align, group, etc.) */}
        <MobileSettingsExtraActions
          appState={appState}
          renderAction={renderAction}
          targetElements={targetElements}
          setAppState={setAppState}
          container={container}
          app={app}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components (mirror the ones in Actions.tsx but render in the settings row)
// ---------------------------------------------------------------------------

const MobileSettingsShapeProperties = ({
  appState,
  renderAction,
  setAppState,
  targetElements,
  container,
}: {
  targetElements: ExcalidrawElement[];
  appState: UIAppState;
  renderAction: ActionManager["renderAction"];
  setAppState: React.Component<any, AppState>["setState"];
  container: HTMLDivElement | null;
}) => {
  const showFillIcons =
    (hasBackground(appState.activeTool.type) &&
      !isTransparent(appState.currentItemBackgroundColor)) ||
    targetElements.some(
      (element) =>
        hasBackground(element.type) && !isTransparent(element.backgroundColor),
    );

  const shouldShow =
    targetElements.length > 0 ||
    !TOOLS_WITHOUT_SETTINGS.has(appState.activeTool.type);

  const isOpen = appState.openPopup === "compactStrokeStyles";

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="mobile-settings-row__item compact-action-item">
      <Popover.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (open) {
            setAppState({ openPopup: "compactStrokeStyles" });
          } else {
            setAppState({ openPopup: null });
          }
        }}
      >
        <Tooltip label={t("labels.stroke")}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={clsx("compact-action-button properties-trigger", {
                active: isOpen,
              })}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAppState({
                  openPopup: isOpen ? null : "compactStrokeStyles",
                });
              }}
            >
              {adjustmentsIcon}
            </button>
          </Popover.Trigger>
        </Tooltip>
        {isOpen && (
          <PropertiesPopover
            className={PROPERTIES_CLASSES}
            container={container}
            style={{ maxWidth: "13rem" }}
            onClose={() => {}}
          >
            <div className="selected-shape-actions">
              {showFillIcons && renderAction("changeFillStyle")}
              {(hasStrokeWidth(appState.activeTool.type) ||
                targetElements.some((element) =>
                  hasStrokeWidth(element.type),
                )) &&
                renderAction("changeStrokeWidth")}
              {(hasStrokeStyle(appState.activeTool.type) ||
                targetElements.some((element) =>
                  hasStrokeStyle(element.type),
                )) && (
                <>
                  {renderAction("changeStrokeStyle")}
                  {renderAction("changeSloppiness")}
                </>
              )}
              {(canChangeRoundness(appState.activeTool.type) ||
                targetElements.some((element) =>
                  canChangeRoundness(element.type),
                )) &&
                renderAction("changeRoundness")}
              {renderAction("changeOpacity")}
            </div>
          </PropertiesPopover>
        )}
      </Popover.Root>
    </div>
  );
};

const MobileSettingsArrowProperties = ({
  appState,
  renderAction,
  setAppState,
  targetElements,
  container,
  app,
}: {
  targetElements: ExcalidrawElement[];
  appState: UIAppState;
  renderAction: ActionManager["renderAction"];
  setAppState: React.Component<any, AppState>["setState"];
  container: HTMLDivElement | null;
  app: AppClassProperties;
}) => {
  const showArrowProperties =
    toolIsArrow(appState.activeTool.type) ||
    targetElements.some((element) => toolIsArrow(element.type));
  const isOpen = appState.openPopup === "compactArrowProperties";

  if (!showArrowProperties) {
    return null;
  }

  return (
    <div className="mobile-settings-row__item compact-action-item">
      <Popover.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (open) {
            setAppState({ openPopup: "compactArrowProperties" });
          } else {
            setAppState({ openPopup: null });
          }
        }}
      >
        <Tooltip label={t("labels.arrowtypes")}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={clsx("compact-action-button properties-trigger", {
                active: isOpen,
              })}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAppState({
                  openPopup: isOpen ? null : "compactArrowProperties",
                });
              }}
            >
              {(() => {
                const arrowType = getFormValue(
                  targetElements,
                  app,
                  (element) => {
                    if (isArrowElement(element)) {
                      return element.elbowed
                        ? "elbow"
                        : element.roundness
                        ? "round"
                        : "sharp";
                    }
                    return null;
                  },
                  (element) => isArrowElement(element),
                  (hasSelection) =>
                    hasSelection ? null : appState.currentItemArrowType,
                );

                if (arrowType === "elbow") {
                  return elbowArrowIcon;
                }
                if (arrowType === "round") {
                  return roundArrowIcon;
                }
                return sharpArrowIcon;
              })()}
            </button>
          </Popover.Trigger>
        </Tooltip>
        {isOpen && (
          <PropertiesPopover
            container={container}
            className="properties-content"
            style={{ maxWidth: "13rem" }}
            onClose={() => {}}
          >
            {renderAction("changeArrowProperties")}
          </PropertiesPopover>
        )}
      </Popover.Root>
    </div>
  );
};

const MobileSettingsTextProperties = ({
  appState,
  renderAction,
  setAppState,
  targetElements,
  container,
  elementsMap,
}: {
  appState: UIAppState;
  renderAction: ActionManager["renderAction"];
  setAppState: React.Component<any, AppState>["setState"];
  targetElements: ExcalidrawElement[];
  container: HTMLDivElement | null;
  elementsMap: NonDeletedElementsMap | NonDeletedSceneElementsMap;
}) => {
  const { saveCaretPosition, restoreCaretPosition } = useTextEditorFocus();
  const isOpen = appState.openPopup === "compactTextProperties";

  return (
    <div className="mobile-settings-row__item compact-action-item">
      <Popover.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (open) {
            if (appState.editingTextElement) {
              saveCaretPosition();
            }
            setAppState({ openPopup: "compactTextProperties" });
          } else {
            setAppState({ openPopup: null });
            if (appState.editingTextElement) {
              restoreCaretPosition();
            }
          }
        }}
      >
        <Tooltip label={t("labels.textAlign")}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={clsx("compact-action-button properties-trigger", {
                active: isOpen,
              })}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (isOpen) {
                  setAppState({ openPopup: null });
                } else {
                  if (appState.editingTextElement) {
                    saveCaretPosition();
                  }
                  setAppState({ openPopup: "compactTextProperties" });
                }
              }}
            >
              {TextSizeIcon}
            </button>
          </Popover.Trigger>
        </Tooltip>
        {appState.openPopup === "compactTextProperties" && (
          <PropertiesPopover
            className={PROPERTIES_CLASSES}
            container={container}
            style={{ maxWidth: "13rem" }}
            preventAutoFocusOnTouch={!!appState.editingTextElement}
            onClose={() => {
              if (appState.editingTextElement) {
                restoreCaretPosition();
              }
            }}
          >
            <div className="selected-shape-actions">
              {(appState.activeTool.type === "text" ||
                targetElements.some(isTextElement)) &&
                renderAction("changeFontSize")}
              {(appState.activeTool.type === "text" ||
                suppportsHorizontalAlign(targetElements, elementsMap)) &&
                renderAction("changeTextAlign")}
              {shouldAllowVerticalAlign(targetElements, elementsMap) &&
                renderAction("changeVerticalAlign")}
            </div>
          </PropertiesPopover>
        )}
      </Popover.Root>
    </div>
  );
};

const MobileSettingsLinearEditor = ({
  appState,
  renderAction,
  targetElements,
}: {
  appState: UIAppState;
  targetElements: ExcalidrawElement[];
  renderAction: ActionManager["renderAction"];
}) => {
  const showLineEditorAction =
    appState.selectedLinearElement &&
    !appState.selectedLinearElement.isEditing &&
    targetElements.length === 1 &&
    isLinearElement(targetElements[0]) &&
    !isElbowArrow(targetElements[0]);

  if (!showLineEditorAction) {
    return null;
  }

  return (
    <div className="mobile-settings-row__item compact-action-item">
      {renderAction("toggleLinearEditor")}
    </div>
  );
};

const MobileSettingsExtraActions = ({
  appState,
  renderAction,
  targetElements,
  setAppState,
  container,
  app,
}: {
  appState: UIAppState;
  targetElements: ExcalidrawElement[];
  renderAction: ActionManager["renderAction"];
  setAppState: React.Component<any, AppState>["setState"];
  container: HTMLDivElement | null;
  app: AppClassProperties;
}) => {
  const isEditingTextOrNewElement = Boolean(
    appState.editingTextElement || appState.newElement,
  );
  const showCropEditorAction =
    !appState.croppingElementId &&
    targetElements.length === 1 &&
    isImageElement(targetElements[0]);
  const showLinkIcon = targetElements.length === 1;
  const showAlignActions = alignActionsPredicate(appState, app);
  let isSingleElementBoundContainer = false;
  if (
    targetElements.length === 2 &&
    (hasBoundTextElement(targetElements[0]) ||
      hasBoundTextElement(targetElements[1]))
  ) {
    isSingleElementBoundContainer = true;
  }

  const isRTL = document.documentElement.getAttribute("dir") === "rtl";
  const isOpen = appState.openPopup === "compactOtherProperties";

  if (isEditingTextOrNewElement || targetElements.length === 0) {
    return null;
  }

  return (
    <div className="mobile-settings-row__item compact-action-item">
      <Popover.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (open) {
            setAppState({ openPopup: "compactOtherProperties" });
          } else {
            setAppState({ openPopup: null });
          }
        }}
      >
        <Tooltip label={t("labels.actions")}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={clsx("compact-action-button properties-trigger", {
                active: isOpen,
              })}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAppState({
                  openPopup: isOpen ? null : "compactOtherProperties",
                });
              }}
            >
              {DotsHorizontalIcon}
            </button>
          </Popover.Trigger>
        </Tooltip>
        {isOpen && (
          <PropertiesPopover
            className={PROPERTIES_CLASSES}
            container={container}
            style={{
              maxWidth: "12rem",
              justifyContent: "center",
              alignItems: "center",
            }}
            onClose={() => {}}
          >
            <div className="selected-shape-actions">
              <fieldset>
                <legend>{t("labels.layers")}</legend>
                <div className="buttonList">
                  {renderAction("sendToBack")}
                  {renderAction("sendBackward")}
                  {renderAction("bringForward")}
                  {renderAction("bringToFront")}
                </div>
              </fieldset>
              {showAlignActions && !isSingleElementBoundContainer && (
                <fieldset>
                  <legend>{t("labels.align")}</legend>
                  <div className="buttonList">
                    {isRTL ? (
                      <>
                        {renderAction("alignRight")}
                        {renderAction("alignHorizontallyCentered")}
                        {renderAction("alignLeft")}
                      </>
                    ) : (
                      <>
                        {renderAction("alignLeft")}
                        {renderAction("alignHorizontallyCentered")}
                        {renderAction("alignRight")}
                      </>
                    )}
                    {targetElements.length > 2 &&
                      renderAction("distributeHorizontally")}
                    <div style={{ flexBasis: "100%", height: 0 }} />
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: ".5rem",
                        marginTop: "-0.5rem",
                      }}
                    >
                      {renderAction("alignTop")}
                      {renderAction("alignVerticallyCentered")}
                      {renderAction("alignBottom")}
                      {targetElements.length > 2 &&
                        renderAction("distributeVertically")}
                    </div>
                  </div>
                </fieldset>
              )}
              <fieldset>
                <legend>{t("labels.actions")}</legend>
                <div className="buttonList">
                  {renderAction("group")}
                  {renderAction("ungroup")}
                  {showLinkIcon && renderAction("hyperlink")}
                  {showCropEditorAction && renderAction("cropEditor")}
                  {renderAction("duplicateSelection")}
                  {renderAction("deleteSelectedElements")}
                </div>
              </fieldset>
            </div>
          </PropertiesPopover>
        )}
      </Popover.Root>
    </div>
  );
};
