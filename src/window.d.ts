export {};

declare global {
  interface Window {
    EmbersWorker: Worker;
  }
}
