export function whatsappLink(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9 && digits.startsWith("9")) digits = `51${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}
