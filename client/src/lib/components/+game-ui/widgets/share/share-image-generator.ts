// Import canvas polyfills
import '$lib/utils/canvas-polyfills';

// Re-declare the global interface to ensure TypeScript recognizes the methods
declare global {
  interface CanvasRenderingContext2D {
    fillRoundRect(
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
    ): void;
    strokeRoundRect(
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number,
    ): void;
  }
}

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

export async function generateShareImage(
  data: ShareImageData,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Set canvas size for high quality
    canvas.width = 760;
    canvas.height = 600;

    // Load and draw PnL-green background image
    const bgImage = new Image();
    bgImage.onload = () => {
      // Draw the PnL-green image as background
      ctx.drawImage(bgImage, 0, 0, 760, 600);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(data.title || 'PonziLand', 380, 60);

      // Position card background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      const cardX = 280,
        cardY = 90,
        cardW = 200,
        cardH = 50;
      ctx.fillRoundRect(cardX, cardY, cardW, cardH, 8);
      ctx.strokeRoundRect(cardX, cardY, cardW, cardH, 8);

      // Position text
      ctx.fillStyle = '#d8b4fe'; // purple-300
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Position', 380, 110);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${data.positionX}, ${data.positionY}`, 380, 130);

      // P&L card background
      const pnlCardY = 160;
      const pnlCardH = 80;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRoundRect(230, pnlCardY, 300, pnlCardH, 12);
      ctx.strokeRoundRect(230, pnlCardY, 300, pnlCardH, 12);

      // P&L label
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText('Net P&L', 380, 185);

      // P&L amount
      ctx.fillStyle = data.isProfitable ? '#4ade80' : '#f87171'; // green-400 : red-400
      ctx.font = 'bold 36px monospace';
      ctx.fillText(data.pnlAmount, 380, 220);

      // Status badge
      const statusY = 270;
      const statusText = data.isActive
        ? 'ACTIVE POSITION'
        : `CLOSED ${data.closeReason ? `(${data.closeReason.toUpperCase()})` : ''}`;
      const statusColor = data.isActive ? '#10b981' : '#6b7280'; // emerald-500 : gray-500
      const statusBgColor = data.isActive
        ? 'rgba(16, 185, 129, 0.2)'
        : 'rgba(107, 114, 128, 0.2)';

      // Measure text for badge sizing
      ctx.font = '12px Arial, sans-serif';
      const statusWidth = ctx.measureText(statusText).width + 20;
      const badgeX = (760 - statusWidth) / 2;

      ctx.fillStyle = statusBgColor;
      ctx.strokeStyle = statusColor + '40'; // Add alpha to stroke
      ctx.lineWidth = 1;
      ctx.fillRoundRect(badgeX, statusY, statusWidth, 24, 12);
      ctx.strokeRoundRect(badgeX, statusY, statusWidth, 24, 12);

      ctx.fillStyle = statusColor;
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.fillText(statusText, 380, statusY + 16);

      // URL
      ctx.fillStyle = '#d8b4fe'; // purple-300
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText(data.websiteUrl || window.location.origin, 380, 520);

      // Convert to data URL
      resolve(canvas.toDataURL('image/png'));
    };

    bgImage.onerror = () => {
      reject(
        new Error(
          'Failed to load background image for PnL share image generation',
        ),
      );
    };

    bgImage.src = '/PnL/PnL-green.png';
  });
}
