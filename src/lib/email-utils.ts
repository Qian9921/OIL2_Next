function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function hasHeaderControlChars(value: string): boolean {
  return /[\r\n]/.test(value);
}

export function normalizeRecipientIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return null;
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

export function buildTeacherEmailHtml(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">Message from Teacher</h2>
        <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db;">
          ${escapeHtml(content).replace(/\r?\n/g, '<br>')}
        </div>
        <div style="margin-top: 20px; padding: 15px; background-color: #e8f4f8; border-radius: 8px;">
          <p style="margin: 0; color: #34495e; font-size: 14px;">
            This email is sent from Open Impact Lab Learning Platform
          </p>
        </div>
      </div>
    </div>
  `;
}
