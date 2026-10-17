import { patternEnd } from "@buzzzz/core";
import { SelectionInspector } from "../features/composer/SelectionInspector";
import { deleteSelection } from "../features/composer/editing";
import { SoundPanel } from "../features/audio/SoundPanel";
import { RiveInspector } from "../features/rive/RiveInspector";
import { AnimationPanel } from "../features/animation/AnimationPanel";
import { InspectorTabs } from "./inspector/InspectorTabs";
import { InspectorLayers } from "./inspector/InspectorLayers";
import { InspectorControls } from "./inspector/InspectorControls";
import { InspectorPlayback } from "./inspector/InspectorPlayback";
import { InspectorPreview } from "./inspector/InspectorPreview";
import { InspectorMarkers } from "./inspector/InspectorMarkers";
import { InspectorExports } from "./inspector/InspectorExports";
import { InspectorSection } from "../components/InspectorSection";
import type { Studio } from "./useStudio";

interface IInspectorPanel {
  studio: Studio;
}
export function InspectorPanel(props: IInspectorPanel) {
  const { studio } = props;
  const { document, composer } = studio;
  const duration = Math.max(
    patternEnd(document.pattern),
    studio.audio.analysis?.durationMs ?? 0,
    studio.animation.source?.durationMs ?? 0,
    document.preset.editor?.durationMs ?? 0,
  );
  return (
    <aside className="workspace-inspector" aria-label="Inspector">
      <InspectorTabs
        current={studio.inspector}
        onChange={studio.setInspector}
        onCollapse={() => studio.setInspectorOpen(false)}
      />
      <div
        className="inspector-tab-content"
        role="tabpanel"
        id={`panel-${studio.inspector}`}
        aria-labelledby={`tab-${studio.inspector}`}
        tabIndex={0}
      >
        {studio.inspector === "sound" ? (
          <SoundPanel
            key={`${document.projectId}/${document.preset.id}/${studio.audio.source?.url ?? ""}`}
            audio={studio.audio}
            currentPattern={document.pattern}
            onApply={studio.applyGenerated}
            onRestore={studio.restore}
            onPreserve={studio.preserve}
            presetName={document.preset.name}
            onFile={studio.importFile}
            onRemove={() => void studio.media.detach("audio")}
            onOpenMedia={() => studio.setPanel("media")}
          />
        ) : studio.inspector === "animation" && studio.session.riv ? (
          <RiveInspector studio={studio} />
        ) : studio.inspector === "animation" ? (
          <AnimationPanel
            key={`${document.projectId}/${document.preset.id}/${studio.animation.source?.url ?? ""}/${studio.animation.source?.animationId ?? ""}`}
            animation={studio.animation}
            currentPattern={document.pattern}
            presetName={document.preset.name}
            onApply={studio.applyGenerated}
            onRestore={studio.restore}
            onPreserve={studio.preserve}
            onFile={studio.importFile}
            onRemove={() => void studio.media.detach("animation")}
            onOpenMedia={() => studio.setPanel("media")}
          />
        ) : (
          <>
            <InspectorLayers composer={composer} />
            <InspectorControls studio={studio} />
            <InspectorSection
              title="Selection"
              description="Click a point or event on the canvas to edit it here. Double-click empty canvas to add one to the active layer."
            >
              <SelectionInspector
                pattern={document.pattern}
                selected={composer.selected}
                durationMs={duration}
                begin={document.begin}
                onEdit={studio.editSelection}
                valueDecimals={composer.settings.values.valueDecimals}
                onDelete={() =>
                  studio.applyPattern(
                    deleteSelection({
                      pattern: document.pattern,
                      selection: composer.selection.length
                        ? composer.selection
                        : composer.selected
                          ? [composer.selected]
                          : [],
                    }),
                  )
                }
              />
            </InspectorSection>
            <InspectorPlayback studio={studio} />
            <InspectorPreview studio={studio} />
            <InspectorMarkers studio={studio} />
            <InspectorExports key={studio.document.projectId} studio={studio} />
          </>
        )}
      </div>
    </aside>
  );
}
