interface IFeedback {
  amplitude: number;
  frequency: number;
}

interface ISensorState {
  dotX: number;
  dotY: number;
  velocityX: number;
  velocityY: number;
  isColliding: boolean;
  lastCollisionTime: number;
  lastScratchTime: number;
}

interface ISensorStep {
  state: ISensorState;
  sensorX: number;
  sensorY: number;
  isAndroid: boolean;
  now: number;
}

export function sensorTypeForPlatform(isAndroid: boolean) {
  return isAndroid ? "GYROSCOPE" : "ACCELEROMETER";
}

export const SENSOR_INITIAL_STATE: ISensorState = {
  dotX: 133,
  dotY: 133,
  velocityX: 0,
  velocityY: 0,
  isColliding: false,
  lastCollisionTime: 0,
  lastScratchTime: 0,
};

export function advanceSensor(input: ISensorStep) {
  "worklet";
  const { sensorX, sensorY, isAndroid, now } = input;
  const state = { ...input.state };
  const scale = isAndroid ? 1.5 : 0.6;
  const damping = isAndroid ? 0.75 : 0.8;
  const inputX = isAndroid ? sensorY : sensorX;
  const inputY = isAndroid ? sensorX : -sensorY;
  state.velocityX = (state.velocityX + inputX * scale) * damping;
  state.velocityY = (state.velocityY + inputY * scale) * damping;
  const newX = state.dotX + state.velocityX;
  const newY = state.dotY + state.velocityY;
  const dx = newX + 15 - 148;
  const dy = newY + 15 - 148;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = Math.sqrt(state.velocityX * state.velocityX + state.velocityY * state.velocityY);
  let discrete: IFeedback | undefined;
  let feedbackSpeed = speed;
  if (distance > 133) {
    const angle = Math.atan2(dy, dx);
    state.dotX = 148 + Math.cos(angle) * 133 - 15;
    state.dotY = 148 + Math.sin(angle) * 133 - 15;
    const nx = dx / distance;
    const ny = dy / distance;
    const radial = state.velocityX * nx + state.velocityY * ny;
    state.velocityX -= 1.6 * radial * nx;
    state.velocityY -= 1.6 * radial * ny;
    if (!state.isColliding) {
      state.isColliding = true;
      if (speed > 2) {
        if (now - state.lastCollisionTime > 200) {
          state.lastCollisionTime = now;
          discrete = { amplitude: 1, frequency: 1 };
        }
      } else if (speed > 0.3 && now - state.lastScratchTime > 200) {
        state.lastScratchTime = now;
        discrete = { amplitude: 0.6, frequency: 0.35 };
      }
    }
    feedbackSpeed = Math.sqrt(
      state.velocityX * state.velocityX + state.velocityY * state.velocityY,
    );
  } else {
    if (distance < 133 * 0.85) state.isColliding = false;
    state.dotX = newX;
    state.dotY = newY;
  }
  if (!(feedbackSpeed > 0.5)) return { state, discrete, continuous: { kind: "stop" } as const };
  const progress = Math.max(0, Math.min(1, (feedbackSpeed - 0.5) / 11.5));
  return {
    state,
    discrete,
    continuous: {
      kind: "set" as const,
      amplitude: 0.1 + progress * 0.4,
      frequency: 0.2 + progress * 0.5,
    },
  };
}
