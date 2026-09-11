import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

export function RadarAnimation() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let angle = 0;

    const drawRadar = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;

      // Draw radar circles
      for (let i = 1; i <= 4; i++) {
        const radius = (maxRadius / 4) * i;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.15 - i * 0.03})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw radar sweep
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.2)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, -Math.PI / 6, Math.PI / 6);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw sweep line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxRadius, 0);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Draw random blips
      for (let i = 0; i < 8; i++) {
        const blipAngle = (angle - (Math.PI / 4) + Math.random() * Math.PI / 2) % (Math.PI * 2);
        const blipDistance = Math.random() * maxRadius;
        const blipX = centerX + Math.cos(blipAngle) * blipDistance;
        const blipY = centerY + Math.sin(blipAngle) * blipDistance;

        ctx.beginPath();
        ctx.arc(blipX, blipY, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${0.6 - (angle % (Math.PI * 2)) / (Math.PI * 4)})`;
        ctx.fill();
      }

      angle += 0.02;
      requestAnimationFrame(drawRadar);
    };

    drawRadar();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 opacity-30"
    />
  );
}
