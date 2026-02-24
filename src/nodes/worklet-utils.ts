/**
 * Shared utilities for AudioWorklet registration.
 *
 * Handles the boilerplate of registering worklet processors from inline code,
 * ensuring each processor is only registered once even with concurrent calls.
 */

const registrationPromises = new WeakMap<
  BaseAudioContext,
  Map<string, Promise<void>>
>();

/**
 * Registers an AudioWorklet processor from inline code.
 *
 * Only registers once per processor name per context, even if called
 * concurrently. Subsequent calls with the same context and processor name
 * return the existing promise. Uses a WeakMap keyed by context so that
 * closed/GC'd contexts don't leak memory.
 *
 * @param ctx - The AudioContext (or OfflineAudioContext) to register with
 * @param processorName - Unique name for the processor (must match registerProcessor call in code)
 * @param processorCode - JavaScript code defining the AudioWorkletProcessor class
 */
export async function registerWorkletOnce(
  ctx: BaseAudioContext,
  processorName: string,
  processorCode: string
): Promise<void> {
  let contextMap = registrationPromises.get(ctx);
  if (!contextMap) {
    contextMap = new Map<string, Promise<void>>();
    registrationPromises.set(ctx, contextMap);
  }

  const existing = contextMap.get(processorName);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const blob = new Blob([processorCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  })();

  contextMap.set(processorName, promise);
  return promise;
}
