// Keyboard and mouse state. Edge-triggered presses are cleared once a frame so actions
// such as entering a car or pausing never repeat while a key is held.
// Input only records intent; the systems themselves decide what each key means.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseButtons = new Set();
    this.mousePressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this.lastMouseMove = 0;
    this.enabled = true;

    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    document.addEventListener('mousedown', (event) => this.onMouseDown(event));
    document.addEventListener('mouseup', (event) => this.onMouseUp(event));
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      this.onLockChange?.(this.locked);
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  onKeyDown(event) {
    if (!this.enabled) return;
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (!this.keys.has(event.code)) this.pressed.add(event.code);
    this.keys.add(event.code);
    this.onAnyKey?.(event);
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
  }

  onMouseMove(event) {
    if (!this.locked) return;
    this.mouseDX += event.movementX;
    this.mouseDY += event.movementY;
    this.lastMouseMove = performance.now();
  }

  onMouseDown(event) {
    if (!this.enabled) return;
    this.mouseButtons.add(event.button);
    this.mousePressed.add(event.button);
    this.onMouseDown?.(event);
  }

  onMouseUp(event) {
    this.mouseButtons.delete(event.button);
  }

  down(code) {
    return this.keys.has(code);
  }

  consume(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  mouseDown(button = 0) {
    return this.mouseButtons.has(button);
  }

  consumeMouse(button = 0) {
    return this.mousePressed.delete(button);
  }

  requestPointerLock() {
    if (document.pointerLockElement !== this.canvas) {
      const promise = this.canvas.requestPointerLock?.();
      if (promise?.catch) promise.catch(() => {});
    }
  }

  clear() {
    this.keys.clear();
    this.pressed.clear();
    this.mouseButtons.clear();
  }

  endFrame() {
    this.pressed.clear();
    this.mousePressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
