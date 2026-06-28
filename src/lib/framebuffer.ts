export class Framebuffer {
  private ctx: CanvasRenderingContext2D | null = null
  private canvas: HTMLCanvasElement | null = null

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
  }

  detach(): void {
    this.canvas = null
    this.ctx = null
  }

  clear(color = '#000000'): void {
    if (!this.ctx || !this.canvas) return
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  rect(x: number, y: number, w: number, h: number, color = '#00ff00'): void {
    if (!this.ctx) return
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, w, h)
  }

  fill(color = '#00ff00'): void {
    if (!this.ctx || !this.canvas) return
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  text(x: number, y: number, text: string, color = '#00ff00'): void {
    if (!this.ctx) return
    this.ctx.fillStyle = color
    this.ctx.font = '14px monospace'
    this.ctx.fillText(text, x, y)
  }

  pixel(x: number, y: number, color = '#00ff00'): void {
    if (!this.ctx) return
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, 1, 1)
  }

  line(x1: number, y1: number, x2: number, y2: number, color = '#00ff00'): void {
    if (!this.ctx) return
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.stroke()
  }

  circle(cx: number, cy: number, r: number, color = '#00ff00'): void {
    if (!this.ctx) return
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2)
    this.ctx.fill()
  }

  image(data: ImageData, x: number, y: number): void {
    if (!this.ctx) return
    this.ctx.putImageData(data, x, y)
  }

  save(): void {
    if (!this.ctx || !this.canvas) return
    const dataUrl = this.canvas.toDataURL('image/png')
    try {
      localStorage.setItem('ci-simulator:framebuffer-screenshot', dataUrl)
    } catch {}
  }

  getState(): ImageData | null {
    if (!this.ctx || !this.canvas) return null
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
  }

  get width(): number {
    return this.canvas?.width ?? 0
  }

  get height(): number {
    return this.canvas?.height ?? 0
  }
}
