import { runUpdateLoopCore } from './update-loop-core.js';
import { runUpdateLoopEntities } from './update-loop-entities.js';

export function updateMainLoopSystem(_, dt) {
  const shifts = runUpdateLoopCore.call(this, dt);
  if (!shifts) return;
  runUpdateLoopEntities.call(this, dt, shifts.pulseShift, shifts.pulseXShift);
}
