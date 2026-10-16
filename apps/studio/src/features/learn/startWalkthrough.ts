import { driver, type DriveStep } from "driver.js";
import type { Studio } from "../../app/useStudio";
import { walkthroughAnchor } from "./anchors";
import type { IWalkthrough, IWalkthroughStep } from "./model";

interface IStartWalkthrough {
  tour: IWalkthrough;
  studio: Studio;
  onComplete: () => void;
  onClose: (completed: boolean) => void;
}

function prepareStep(studio: Studio, step: IWalkthroughStep | undefined) {
  switch (step?.prepare) {
    case "media":
    case "device":
    case "tools":
      studio.setPanel(step.prepare);
      break;
    case "inspector":
    case "sound":
    case "animation":
      studio.setInspector(step.prepare);
      studio.setInspectorOpen(true);
      break;
    case "timeline": {
      const toggle = document.querySelector('button[aria-label="Show timeline"]');
      if (toggle instanceof HTMLButtonElement) toggle.click();
      break;
    }
  }
}

function shortcutText(body: string) {
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  const mod = mac ? "⌘" : "Ctrl+";
  return body
    .replaceAll("{{copy}}", `${mod}C`)
    .replaceAll("{{paste}}", `${mod}V`)
    .replaceAll("{{undo}}", `${mod}Z`)
    .replaceAll("{{save}}", `${mod}S`);
}

export function startWalkthrough(options: IStartWalkthrough) {
  const { tour, studio, onComplete, onClose } = options;
  const steps: DriveStep[] = tour.steps.map((step) => ({
    element: walkthroughAnchor(step.anchor),
    popover: {
      title: step.title,
      description: shortcutText(step.body),
      side: step.side,
      align: step.align,
    },
  }));
  let closing = false;
  const finish = () => {
    if (closing) return;
    closing = true;
    const completed = guide.isLastStep();
    if (completed) onComplete();
    guide.destroy();
    onClose(completed);
  };
  const guide = driver({
    steps,
    animate: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    popoverClass: "buzzzz-tour",
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    waitForElement: 600,
    skipMissingElement: true,
    overlayColor: "rgba(0, 0, 0, 1)",
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 4,
    onDestroyStarted: finish,
    onNextClick: () => {
      if (guide.isLastStep()) return finish();
      prepareStep(studio, tour.steps[(guide.getActiveIndex() ?? 0) + 1]);
      requestAnimationFrame(() => {
        if (!closing) guide.moveNext();
      });
    },
    onPrevClick: () => {
      prepareStep(studio, tour.steps[Math.max(0, (guide.getActiveIndex() ?? 0) - 1)]);
      requestAnimationFrame(() => {
        if (!closing) guide.movePrevious();
      });
    },
  });
  studio.document.route.showEditor();
  prepareStep(studio, tour.steps[0]);
  requestAnimationFrame(() => {
    if (!closing) guide.drive();
  });
  return () => {
    closing = true;
    guide.destroy();
  };
}
