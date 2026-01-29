/**
 * Shared utilities for AudioWorklet registration.
 *
 * Handles the boilerplate of registering worklet processors from inline code,
 * ensuring each processor is only registered once even with concurrent calls.
 */

const registrationPromises = new Map<string, Promise<void>>();

/**
 * Registers an AudioWorklet processor from inline code.
 *
 * Only registers once per processor name, even if called concurrently.
 * Subsequent calls with the same processor name return the existing promise.
 *
 * @param ctx - The AudioContext to register with
 * @param processorName - Unique name for the processor (must match registerProcessor call in code)
 * @param processorCode - JavaScript code defining the AudioWorkletProcessor class
 */
export async function registerWorkletOnce(
  ctx: AudioContext,
  processorName: string,
  processorCode: string
): Promise<void> {
  const existing = registrationPromises.get(processorName);
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

  registrationPromises.set(processorName, promise);
  return promise;
}
