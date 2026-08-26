(function(global){
  function clamp(value, min, max){ return Math.max(min, Math.min(max, value)); }
  function parseHex(hex){
    const clean = (hex || '#ffffff').replace('#','');
    const full = clean.length === 3 ? clean.split('').map(c=>c+c).join('') : clean;
    return {
      r: parseInt(full.slice(0,2), 16),
      g: parseInt(full.slice(2,4), 16),
      b: parseInt(full.slice(4,6), 16)
    };
  }
  function rgbToRgba(hex, alpha){
    const {r,g,b} = parseHex(hex);
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
  }
  function isDark(hex){
    const {r,g,b} = parseHex(hex);
    const luminance = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return luminance < 0.45;
  }

  class P5Brush {
    constructor(ctx){
      this.ctx = ctx;
      this.style = 'soft';
    }
    setStyle(style){
      this.style = style || 'soft';
      return this;
    }
    drawSegment(start, end, color, size, options = {}){
      const ctx = this.ctx;
      const { bgColor = '#ffffff', alpha = 1 } = options;
      const darkBg = isDark(bgColor);
      const steps = Math.max(4, Math.round(Math.hypot(end.x - start.x, end.y - start.y) / Math.max(2, size * 0.18)));
      const radius = Math.max(1.5, size * 0.55);

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = clamp(alpha, 0, 1);

      if (darkBg) {
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = Math.max(1, size * 0.18);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }

      if (this.style === 'ink') {
        this._drawInk(start, end, color, size, darkBg);
      } else if (this.style === 'marker') {
        this._drawMarker(start, end, color, size, darkBg);
      } else if (this.style === 'spray') {
        this._drawSpray(start, end, color, size, darkBg);
      } else if (this.style === 'watercolor') {
        this._drawWatercolor(start, end, color, size, darkBg);
      } else {
        this._drawSoft(start, end, color, radius, darkBg);
      }

      ctx.restore();
    }

    drawPoint(x, y, color, size, options = {}){
      const ctx = this.ctx;
      const { bgColor = '#ffffff', alpha = 1 } = options;
      const darkBg = isDark(bgColor);
      const radius = Math.max(3, size * 0.55);
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = clamp(alpha, 0, 1);

      if (darkBg) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, rgbToRgba(color, 0.95));
      gradient.addColorStop(0.4, rgbToRgba(color, 0.55));
      gradient.addColorStop(1, rgbToRgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    _drawSoft(start, end, color, size, darkBg){
      const ctx = this.ctx;
      const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, rgbToRgba(color, darkBg ? 0.9 : 0.7));
      gradient.addColorStop(0.55, rgbToRgba(color, darkBg ? 0.58 : 0.42));
      gradient.addColorStop(1, rgbToRgba(color, darkBg ? 0.2 : 0.08));
      ctx.strokeStyle = gradient;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    _drawInk(start, end, color, size, darkBg){
      const ctx = this.ctx;
      const jitter = size * 0.06;
      ctx.strokeStyle = rgbToRgba(color, darkBg ? 0.9 : 0.75);
      ctx.lineWidth = Math.max(1, size * 0.55);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x + (Math.random() - 0.5) * jitter, end.y + (Math.random() - 0.5) * jitter);
      ctx.stroke();
    }

    _drawMarker(start, end, color, size, darkBg){
      const ctx = this.ctx;
      const steps = Math.max(4, Math.round(Math.hypot(end.x - start.x, end.y - start.y) / 4));
      ctx.strokeStyle = rgbToRgba(color, darkBg ? 0.78 : 0.7);
      ctx.lineWidth = size * 0.95;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const px = start.x + (end.x - start.x) * t;
        const py = start.y + (end.y - start.y) * t;
        ctx.lineTo(px + (Math.random() - 0.5) * 0.8, py + (Math.random() - 0.5) * 0.8);
      }
      ctx.stroke();
    }

    _drawSpray(start, end, color, size, darkBg){
      const ctx = this.ctx;
      const steps = Math.max(10, Math.round(size * 2.8));
      const spread = size * 0.7;
      ctx.fillStyle = rgbToRgba(color, darkBg ? 0.55 : 0.4);
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1 || 1);
        const px = start.x + (end.x - start.x) * t + (Math.random() - 0.5) * spread;
        const py = start.y + (end.y - start.y) * t + (Math.random() - 0.5) * spread;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.8, size * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    _drawWatercolor(start, end, color, size, darkBg){
      const ctx = this.ctx;
      const steps = Math.max(5, Math.round(size * 0.35));
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1 || 1);
        const px = start.x + (end.x - start.x) * t + (Math.random() - 0.5) * size * 0.4;
        const py = start.y + (end.y - start.y) * t + (Math.random() - 0.5) * size * 0.4;
        const radius = Math.max(1.4, size * (0.9 - i * 0.08));
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
        gradient.addColorStop(0, rgbToRgba(color, darkBg ? 0.34 : 0.24));
        gradient.addColorStop(1, rgbToRgba(color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  global.P5Brush = P5Brush;
})(window);
