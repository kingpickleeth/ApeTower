import { useEffect, useRef } from 'react';

const InteractiveParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animationFrameId: number;
  
    const particles: any[] = [];
    const particleCount = 100;
  
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
  
    const mouse = { x: -9999, y: -9999 };
  
    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
  
    document.addEventListener('mousedown', () => {
      for (let p of particles) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
  
        if (dist < 100) {
          const angle = Math.atan2(dy, dx);
          const burstVelocity = 10;
  
          p.vx = Math.cos(angle) * burstVelocity;
          p.vy = Math.sin(angle) * burstVelocity;
          p.burstCooldown = 30; // ~0.5 sec escape time (30 frames)
        }
      }
    });
  
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: 1 + Math.random() * 2,
        glow: 0.4 + Math.random() * 0.6,
        baseVx: (Math.random() - 0.5) * 0.4,
        baseVy: (Math.random() - 0.5) * 0.4,
        life: Infinity,
        burstCooldown: 0
      });
    }
  
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
  
        if (p.burstCooldown > 0) {
          p.burstCooldown -= 1;
        }
  
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
  
        // Only attract if not in burst cooldown
        if (dist < 100 && p.burstCooldown <= 0) {
          const force = (100 - dist) / 100;
          p.vx += (dx / dist) * force * 0.1;
          p.vy += (dy / dist) * force * 0.1;
        }
  
        // Apply drag
        p.vx *= 0.96;
        p.vy *= 0.96;
  
        // Drift correction if not burst escaping
        if (p.burstCooldown <= 0) {
          p.vx += (p.baseVx - p.vx) * 0.01;
          p.vy += (p.baseVy - p.vy) * 0.01;
        }
  
        // Clamp only if not in burst
        if (p.burstCooldown <= 0) {
          const maxSpeed = 1.5;
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (speed > maxSpeed) {
            p.vx = (p.vx / speed) * maxSpeed;
            p.vy = (p.vy / speed) * maxSpeed;
          }
        }
  
        // Move
        p.x += p.vx;
        p.y += p.vy;
  
        // Wrap edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
  
        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 179, 255, ${p.glow})`;
        ctx.shadowColor = '#00b3ff';
        ctx.shadowBlur = 10;
        ctx.fill();
      }
  
      animationFrameId = requestAnimationFrame(draw);
    };
  
    draw();
  
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
};

export default InteractiveParticles;
