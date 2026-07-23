/* ═══════════════════════════════════════════════════════════════
   GEAP POC — Charts Module
   Canvas-based charts: line chart, donut chart, mini sparklines
   ═══════════════════════════════════════════════════════════════ */

const Charts = (() => {

  // ── Line Chart ──
  function drawLineChart(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 70 };

    const {
      lineColor = 'hsl(217, 91%, 60%)',
      gradientStart = 'hsla(217, 91%, 60%, 0.15)',
      gradientEnd = 'hsla(217, 91%, 60%, 0)',
      showGrid = true,
      showLabels = true,
      showDots = false,
      animated = true,
      xKey = 'date',
      yKey = 'value',
    } = options;

    if (!data || data.length === 0) return;

    const values = data.map(d => d[yKey]);
    const minVal = Math.min(...values) * 0.998;
    const maxVal = Math.max(...values) * 1.002;
    const range = maxVal - minVal || 1;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const getX = (i) => padding.left + (i / (data.length - 1)) * chartWidth;
    const getY = (val) => padding.top + (1 - (val - minVal) / range) * chartHeight;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Grid lines
    if (showGrid) {
      ctx.strokeStyle = 'hsla(222, 20%, 30%, 0.15)';
      ctx.lineWidth = 1;
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (i / gridLines) * chartHeight;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Y-axis labels
        if (showLabels) {
          const val = maxVal - (i / gridLines) * range;
          ctx.fillStyle = 'hsl(222, 15%, 40%)';
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText('$' + val.toLocaleString('en-US', { maximumFractionDigits: 0 }), padding.left - 8, y + 4);
        }
      }
    }

    // X-axis labels
    if (showLabels && data.length > 0) {
      ctx.fillStyle = 'hsl(222, 15%, 40%)';
      ctx.font = '10px "Inter", sans-serif';
      ctx.textAlign = 'center';
      const labelCount = Math.min(6, data.length);
      for (let i = 0; i < labelCount; i++) {
        const idx = Math.floor(i * (data.length - 1) / (labelCount - 1));
        const x = getX(idx);
        const label = data[idx][xKey];
        // Format date label
        let displayLabel = label;
        if (label && label.includes('-')) {
          const d = new Date(label + 'T00:00:00');
          displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        ctx.fillText(displayLabel, x, height - 8);
      }
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, gradientStart);
    gradient.addColorStop(1, gradientEnd);

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(values[0]));
    for (let i = 1; i < values.length; i++) {
      ctx.lineTo(getX(i), getY(values[i]));
    }
    ctx.lineTo(getX(values.length - 1), height - padding.bottom);
    ctx.lineTo(getX(0), height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(values[0]));
    for (let i = 1; i < values.length; i++) {
      ctx.lineTo(getX(i), getY(values[i]));
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // End dot
    if (values.length > 0) {
      const lastX = getX(values.length - 1);
      const lastY = getY(values[values.length - 1]);

      // Glow
      ctx.beginPath();
      ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(217, 91%, 60%, 0.2)';
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();

      // White center
      ctx.beginPath();
      ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
    }

    // Store chart info for hover tooltip
    canvas._chartData = { data, values, getX, getY, padding, xKey, yKey, minVal, maxVal, range, chartWidth, chartHeight };
  }

  // ── Setup hover tooltip for line chart ──
  function setupLineChartTooltip(canvas, tooltipEl) {
    if (!canvas._chartData) return;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const { data, values, getX, getY, padding, xKey, yKey, chartWidth } = canvas._chartData;

      if (mouseX < padding.left || mouseX > padding.left + chartWidth) {
        tooltipEl.classList.remove('visible');
        return;
      }

      // Find closest data point
      const ratio = (mouseX - padding.left) / chartWidth;
      const idx = Math.round(ratio * (data.length - 1));
      if (idx < 0 || idx >= data.length) return;

      const x = getX(idx);
      const y = getY(values[idx]);

      const label = data[idx][xKey];
      const value = values[idx];

      tooltipEl.innerHTML = `
        <div style="font-weight:600;">${BrokerageData.formatCurrency(value)}</div>
        <div style="color: var(--text-tertiary);">${label}</div>
      `;
      tooltipEl.style.left = `${x}px`;
      tooltipEl.style.top = `${y - 50}px`;
      tooltipEl.classList.add('visible');
    });

    canvas.addEventListener('mouseleave', () => {
      tooltipEl.classList.remove('visible');
    });
  }

  // ── Donut Chart ──
  function drawDonutChart(canvas, segments, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 4;
    const innerRadius = outerRadius * 0.65;

    const {
      showCenter = true,
      centerText = '',
      centerSubtext = '',
    } = options;

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    let startAngle = -Math.PI / 2;

    segments.forEach(segment => {
      const sliceAngle = (segment.value / total) * Math.PI * 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = segment.color;
      ctx.fill();

      // Gap between segments
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'hsl(222, 30%, 6%)';
      ctx.stroke();

      startAngle += sliceAngle;
    });

    // Center text
    if (showCenter) {
      ctx.fillStyle = 'hsl(0, 0%, 95%)';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerText, centerX, centerY - 6);

      ctx.fillStyle = 'hsl(222, 15%, 58%)';
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillText(centerSubtext, centerX, centerY + 12);
    }
  }

  // ── Sparkline ──
  function drawSparkline(canvas, values, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 2;

    if (!values || values.length < 2) return;

    const {
      color = null,
      lineWidth = 1.5,
    } = options;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const isPositive = values[values.length - 1] >= values[0];
    const lineColor = color || (isPositive ? 'hsl(152, 69%, 45%)' : 'hsl(0, 84%, 60%)');

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();

    for (let i = 0; i < values.length; i++) {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (values[i] - min) / range) * (height - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ── Bar Chart (horizontal) ──
  function drawHorizontalBarChart(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { left: 80, right: 20, top: 10, bottom: 10 };

    const maxValue = Math.max(...data.map(d => d.value));
    const barHeight = Math.min(24, (height - padding.top - padding.bottom) / data.length - 4);

    data.forEach((item, i) => {
      const y = padding.top + i * (barHeight + 8);
      const barWidth = (item.value / maxValue) * (width - padding.left - padding.right);

      // Label
      ctx.fillStyle = 'hsl(222, 15%, 58%)';
      ctx.font = '11px "Inter", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, padding.left - 8, y + barHeight / 2);

      // Bar background
      ctx.fillStyle = 'hsla(222, 20%, 20%, 0.4)';
      ctx.beginPath();
      ctx.roundRect(padding.left, y, width - padding.left - padding.right, barHeight, 4);
      ctx.fill();

      // Bar fill
      ctx.fillStyle = item.color || 'hsl(217, 91%, 60%)';
      ctx.beginPath();
      ctx.roundRect(padding.left, y, barWidth, barHeight, 4);
      ctx.fill();

      // Value
      ctx.fillStyle = 'hsl(0, 0%, 95%)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(item.value.toFixed(1) + '%', padding.left + barWidth + 6, y + barHeight / 2);
    });
  }

  // ── Public API ──
  return {
    drawLineChart,
    setupLineChartTooltip,
    drawDonutChart,
    drawSparkline,
    drawHorizontalBarChart,
  };
})();
