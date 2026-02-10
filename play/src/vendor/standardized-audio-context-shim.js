const NativeAudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
const NativeOfflineAudioContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
const NativeAudioWorkletNode = globalThis.AudioWorkletNode;
const NativeAudioBuffer = globalThis.AudioBuffer;
const NativeAudioNode = globalThis.AudioNode;
const NativeAudioParam = globalThis.AudioParam;

export const AudioContext = NativeAudioContext;
export const OfflineAudioContext = NativeOfflineAudioContext;
export const AudioWorkletNode = NativeAudioWorkletNode;
export const AudioBuffer = NativeAudioBuffer;

export const isSupported = () =>
  Promise.resolve(Boolean(NativeAudioContext && NativeOfflineAudioContext));

export const isAnyAudioContext = (value) => {
  if (!NativeAudioContext) return false;
  return value instanceof NativeAudioContext;
};

export const isAnyOfflineAudioContext = (value) => {
  if (!NativeOfflineAudioContext) return false;
  return value instanceof NativeOfflineAudioContext;
};

export const isAnyAudioNode = (value) => {
  if (!NativeAudioNode) return false;
  return value instanceof NativeAudioNode;
};

export const isAnyAudioParam = (value) => {
  if (!NativeAudioParam) return false;
  return value instanceof NativeAudioParam;
};
