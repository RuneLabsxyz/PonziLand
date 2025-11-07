interface ShareImageData {
  positionX: number;
  positionY: number;
  pnlAmount: string;
  isProfitable: boolean;
  isActive: boolean;
  closeReason?: string;
  title?: string;
  websiteUrl?: string;
}

export async function generateShareImage(data: ShareImageData): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Set canvas size for high quality
    canvas.width = 1200; // 2x for retina
    canvas.height = 800;
    ctx.scale(2, 2); // Scale down for crisp rendering

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    gradient.addColorStop(0, '#1e1b4b'); // purple-900
    gradient.addColorStop(0.5, '#5b21b6'); // purple-800  
    gradient.addColorStop(1, '#3730a3'); // indigo-800
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 400);

    // Add subtle geometric pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 600; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 20, 400);
      ctx.stroke();
    }

    // Add decorative elements
    const addGlow = (x: number, y: number, radius: number, color: string) => {
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glowGradient.addColorStop(0, color);
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };

    addGlow(550, 50, 40, 'rgba(255, 255, 255, 0.1)');
    addGlow(50, 350, 50, 'rgba(168, 85, 247, 0.2)');

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.title || 'PonziLand', 300, 60);

    // Position card background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    const cardX = 200, cardY = 90, cardW = 200, cardH = 50;
    ctx.fillRoundRect(cardX, cardY, cardW, cardH, 8);
    ctx.strokeRoundRect(cardX, cardY, cardW, cardH, 8);

    // Position text
    ctx.fillStyle = '#d8b4fe'; // purple-300
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('Position', 300, 110);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`${data.positionX}, ${data.positionY}`, 300, 130);

    // P&L card background
    const pnlCardY = 160;
    const pnlCardH = 80;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRoundRect(150, pnlCardY, 300, pnlCardH, 12);
    ctx.strokeRoundRect(150, pnlCardY, 300, pnlCardH, 12);

    // P&L label
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('Net P&L', 300, 185);

    // P&L amount
    ctx.fillStyle = data.isProfitable ? '#4ade80' : '#f87171'; // green-400 : red-400
    ctx.font = 'bold 36px monospace';
    ctx.fillText(data.pnlAmount, 300, 220);

    // Status badge
    const statusY = 270;
    const statusText = data.isActive ? 'ACTIVE POSITION' : `CLOSED ${data.closeReason ? `(${data.closeReason.toUpperCase()})` : ''}`;
    const statusColor = data.isActive ? '#10b981' : '#6b7280'; // emerald-500 : gray-500
    const statusBgColor = data.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)';
    
    // Measure text for badge sizing
    ctx.font = '12px Arial, sans-serif';
    const statusWidth = ctx.measureText(statusText).width + 20;
    const badgeX = (600 - statusWidth) / 2;
    
    ctx.fillStyle = statusBgColor;
    ctx.strokeStyle = statusColor + '40'; // Add alpha to stroke
    ctx.lineWidth = 1;
    ctx.fillRoundRect(badgeX, statusY, statusWidth, 24, 12);
    ctx.strokeRoundRect(badgeX, statusY, statusWidth, 24, 12);
    
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText(statusText, 300, statusY + 16);

    // URL
    ctx.fillStyle = '#d8b4fe'; // purple-300
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(data.websiteUrl || window.location.origin, 300, 350);

    // Convert to data URL
    resolve(canvas.toDataURL('image/png'));
  });
}

// Add rounded rectangle method to canvas context if not available
declare global {
  interface CanvasRenderingContext2D {
    fillRoundRect(x: number, y: number, width: number, height: number, radius: number): void;
    strokeRoundRect(x: number, y: number, width: number, height: number, radius: number): void;
  }
}

if (!CanvasRenderingContext2D.prototype.fillRoundRect) {
  CanvasRenderingContext2D.prototype.fillRoundRect = function(x, y, width, height, radius) {
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    this.fill();
  };
}

if (!CanvasRenderingContext2D.prototype.strokeRoundRect) {
  CanvasRenderingContext2D.prototype.strokeRoundRect = function(x, y, width, height, radius) {
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
    this.stroke();
  };
}