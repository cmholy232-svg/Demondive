export interface CameraFeedbackOffset {
  x:number;
  y:number;
}

/**
 * Produces a bounded, deterministic camera impulse. The previous random jitter
 * changed every render and could read as vibration instead of authored impact.
 * This curve is presentation-only: it never feeds back into world simulation.
 */
export function shapedCameraOffset(amplitude:number,timeSeconds:number,enabled=true):CameraFeedbackOffset {
  if(!enabled||!Number.isFinite(amplitude)||!Number.isFinite(timeSeconds)||amplitude<=0)return{x:0,y:0};
  const bounded=Math.min(14,amplitude);
  const x=(Math.sin(timeSeconds*79.3)+Math.sin(timeSeconds*131.7+.4)*.35)*bounded*.36;
  const y=(Math.sin(timeSeconds*96.1+1.1)+Math.sin(timeSeconds*157.4+.8)*.25)*bounded*.28;
  return{x,y};
}
