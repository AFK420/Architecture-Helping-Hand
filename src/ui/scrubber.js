/**
 * Architecture Helping Hand - Numeric Scrubber & Fine Adjustment Utility
 * Allows numeric inputs to be scrubbed horizontally with mouse/pointer drag,
 * stepped with Arrow keys (Shift=10x, Ctrl/Cmd=0.1x), while preserving 100%
 * native typing support when clicked or focused.
 */

export function attachNumericScrubber(inputEl, options = {}) {
  if (!inputEl) return () => {};

  const step = typeof options.step === 'number' ? options.step : (parseFloat(inputEl.step) || 0.1);
  const min = typeof options.min === 'number' ? options.min : (parseFloat(inputEl.min) ?? -Infinity);
  const max = typeof options.max === 'number' ? options.max : (parseFloat(inputEl.max) ?? Infinity);
  const precision = typeof options.precision === 'number' ? options.precision : 2;
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;
  const onCommit = typeof options.onCommit === 'function' ? options.onCommit : null;

  let isDragging = false;
  let startX = 0;
  let startVal = 0;

  // Add scrub class for visual styling cues
  inputEl.classList.add('scrubbable-input');
  if (!inputEl.title) {
    inputEl.title = 'Drag horizontally to scrub value, or click to type';
  }

  function clampAndRound(val) {
    const clamped = Math.max(min, Math.min(max, val));
    return parseFloat(clamped.toFixed(precision));
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseFloat(inputEl.value) || 0;
      let mult = 1;
      if (e.shiftKey) mult = 10;
      else if (e.ctrlKey || e.metaKey) mult = 0.1;
      const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * mult;
      const next = clampAndRound(current + delta);
      inputEl.value = next.toFixed(precision);
      if (onChange) onChange(next);
      if (onCommit) onCommit(next);
    }
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    startX = e.clientX;
    startVal = parseFloat(inputEl.value) || 0;
    isDragging = false;

    function onPointerMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      if (!isDragging && Math.abs(dx) > 4) {
        isDragging = true;
        try { inputEl.setPointerCapture(e.pointerId); } catch (err) {}
        document.body.style.cursor = 'ew-resize';
      }
      if (isDragging) {
        let mult = 1;
        if (moveEvent.shiftKey) mult = 10;
        else if (moveEvent.ctrlKey || moveEvent.metaKey) mult = 0.1;
        // Sensitivity: 6 pixels of movement per base step unit
        const delta = (dx / 6) * step * mult;
        const next = clampAndRound(startVal + delta);
        inputEl.value = next.toFixed(precision);
        if (onChange) onChange(next);
      }
    }

    function onPointerUp() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = '';
      if (isDragging) {
        try { inputEl.releasePointerCapture(e.pointerId); } catch (err) {}
        const finalVal = clampAndRound(parseFloat(inputEl.value) || 0);
        inputEl.value = finalVal.toFixed(precision);
        if (onCommit) onCommit(finalVal);
      }
      isDragging = false;
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  inputEl.addEventListener('keydown', handleKeyDown);
  inputEl.addEventListener('pointerdown', onPointerDown);

  return function detach() {
    inputEl.removeEventListener('keydown', handleKeyDown);
    inputEl.removeEventListener('pointerdown', onPointerDown);
  };
}
