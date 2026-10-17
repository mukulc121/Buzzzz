interface IPosition {
  x: number;
  y: number;
}

interface IDragAxis {
  origin: IPosition;
  position: IPosition;
  shift: boolean;
}

interface IConstrainedPosition extends IPosition {
  lockedAxis: "x" | "y" | null;
}

export function constrainDragAxis(props: IDragAxis): IConstrainedPosition {
  const { origin, position, shift } = props;
  if (!shift) return { ...position, lockedAxis: null };
  return Math.abs(position.x - origin.x) >= Math.abs(position.y - origin.y)
    ? { x: position.x, y: origin.y, lockedAxis: "y" }
    : { x: origin.x, y: position.y, lockedAxis: "x" };
}
