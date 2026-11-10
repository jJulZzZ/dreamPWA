<script lang="ts">
  import { onMount } from 'svelte';

  let canvas: HTMLCanvasElement;

  // Plasma shader adapted from Svelte Bits: https://sveltebits.xyz/backgrounds/plasma
  const vertex = `#version 300 es
    in vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragment = `#version 300 es
    precision highp float;
    uniform vec2 resolution;
    uniform float time;
    out vec4 fragColor;

    void main() {
      vec2 C = gl_FragCoord.xy;
      vec2 r = resolution;
      C = (C - r * 0.5) / 1.15 + r * 0.5;
      float i = 0.0, d = 0.0, z = 0.0, T = time * 0.16;
      vec3 O = vec3(0.0), p, S;
      vec4 o = vec4(0.0);
      for (vec2 Q; ++i < 60.0; O += o.w / d * o.xyz) {
        p = z * normalize(vec3(C - 0.5 * r, r.y));
        p.z -= 4.0;
        S = p;
        d = p.y - T;
        p.x += 0.4 * (1.0 + p.y) * sin(d + p.x * 0.1) * cos(0.34 * d + p.x * 0.05);
        Q = p.xz *= mat2(cos(p.y + vec4(0, 11, 33, 0) - T));
        z += d = abs(sqrt(length(Q * Q)) - 0.25 * (5.0 + S.y)) / 3.0 + 8e-4;
        o = 1.0 + sin(S.y + p.z * 0.5 + S.z - length(S - p) + vec4(2, 1, 0, 8));
      }
      vec3 rgb = tanh(O / 1e4);
      float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
      if (isnan(intensity) || isinf(intensity)) intensity = 0.0;
      fragColor = vec4(vec3(0.655, 0.40, 1.0) * intensity, clamp(length(rgb) * 0.38, 0.0, 1.0));
    }
  `;

  onMount(() => {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    let lastFrame = 0;
    let start = performance.now();
    let lost = false;

    function setup() {
      const context = gl!;
      const compile = (type: number, source: string) => {
        const shader = context.createShader(type);
        if (!shader) return null;
        context.shaderSource(shader, source);
        context.compileShader(shader);
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) { context.deleteShader(shader); return null; }
        return shader;
      };
      const vs = compile(context.VERTEX_SHADER, vertex);
      const fs = compile(context.FRAGMENT_SHADER, fragment);
      if (!vs || !fs) { if (vs) context.deleteShader(vs); if (fs) context.deleteShader(fs); return; }
      program = context.createProgram();
      if (!program) { context.deleteShader(vs); context.deleteShader(fs); return; }
      context.attachShader(program, vs); context.attachShader(program, fs); context.linkProgram(program);
      context.deleteShader(vs); context.deleteShader(fs);
      if (!context.getProgramParameter(program, context.LINK_STATUS)) { context.deleteProgram(program); program = null; return; }
      buffer = context.createBuffer();
      context.bindBuffer(context.ARRAY_BUFFER, buffer);
      context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), context.STATIC_DRAW);
      const position = context.getAttribLocation(program, 'position');
      context.enableVertexAttribArray(position);
      context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
      context.useProgram(program);
    }
    function draw(now: number) {
      if (!gl || !program || lost || document.hidden) return;
      if (now - lastFrame >= 33 || motion.matches) {
        lastFrame = now;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.width, canvas.height);
        gl.uniform1f(gl.getUniformLocation(program, 'time'), motion.matches ? 0 : (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!motion.matches) frame = requestAnimationFrame(draw);
    }
    function render() { cancelAnimationFrame(frame); if (!document.hidden && !lost) frame = requestAnimationFrame(draw); }
    function resize() {
      const rect = canvas.getBoundingClientRect();
      // The effect is intentionally soft, so a low resolution saves mobile GPU work.
      const ratio = Math.min(window.devicePixelRatio || 1, 1) * 0.65;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      render();
    }
    function onLost(event: Event) { event.preventDefault(); lost = true; cancelAnimationFrame(frame); }
    function onRestored() { lost = false; setup(); start = performance.now(); resize(); }
    setup();
    if (!program) return;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    document.addEventListener('visibilitychange', render);
    motion.addEventListener('change', render);
    resize();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      document.removeEventListener('visibilitychange', render);
      motion.removeEventListener('change', render);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
    };
  });
</script>

<div class="plasma-background" aria-hidden="true"><canvas bind:this={canvas}></canvas></div>
