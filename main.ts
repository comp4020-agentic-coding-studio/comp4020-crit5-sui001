// The TypeScript entry point, loaded as a module by index.html. Vite compiles
// it; `pnpm typecheck` type-checks it.
import kaplay from "kaplay";

kaplay({
  root: document.getElementById("game")!,
  width: 800,
  height: 600,
  letterbox: true,
});
