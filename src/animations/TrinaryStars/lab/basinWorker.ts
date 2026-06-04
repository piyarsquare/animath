/// <reference lib="webworker" />
/** Basin-map worker: computes a contiguous range of pixels and posts the
 *  averaged RGB + per-pixel outcome/time back (buffers transferred). */

import { computeBasinRange } from './basin';

const ctx: any = self;
ctx.onmessage = (e: MessageEvent) => {
  const { cfg, bc, start, count } = e.data;
  const { rgb, out, t, stat } = computeBasinRange(cfg, bc, start, count);
  ctx.postMessage({ start, count, rgb, out, t, stat }, [rgb.buffer, out.buffer, t.buffer, stat.buffer]);
};
