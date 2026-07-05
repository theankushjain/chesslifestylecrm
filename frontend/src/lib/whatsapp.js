// Helpers for opening WhatsApp deep links with pre-filled messages.

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function normalizePhone(phone) {
  // wa.me requires digits only (country code included, no + sign)
  return (phone || "").replace(/\D/g, "");
}

export function openWhatsapp(phone, message) {
  const digits = normalizePhone(phone);
  if (!digits) return false;
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function studentReminderMessage(student, unpaidPayment) {
  const to = student.parent_name || student.name || "there";
  if (unpaidPayment) {
    const m = MONTHS[(unpaidPayment.month || 1) - 1];
    return `Hi ${to},\n\nThis is a friendly reminder from The Chess Lifestyle. ${student.name}'s monthly fee of ₹${unpaidPayment.amount} for ${m} ${unpaidPayment.year} is pending.\n\nKindly pay at your earliest convenience.\n\nThank you!`;
  }
  return `Hi ${to},\n\nThis is regarding ${student.name}'s classes at The Chess Lifestyle chess academy.\n\nBest regards.`;
}

export function studentBirthdayMessage(student) {
  const to = student.parent_name || student.name || "there";
  const who = student.name || "your child";
  return `Hi ${to},\n\nWishing ${who} a very happy birthday! ♟️\n\nMay this year be full of great moves, brilliant checkmates and joyful learning.\n\n— Team The Chess Lifestyle`;
}

export function studentPortalCredentialsMessage(student, email, password) {
  const to = student.parent_name || student.name || "there";
  return `Hi ${to},\n\nWe've created a student portal account for ${student.name} at The Chess Lifestyle!\n\nYou can log in to view attendance, fees, and more.\n\nLogin link: https://thechesslifestyle.com/login\nEmail: ${email}\nPassword: ${password}\n\nPlease keep these credentials safe.\n\nBest regards,`;
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function nextBirthdayDays(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

export function leadOutreachMessage(lead) {
  const templates = {
    new: `Hi ${lead.name},\n\nThanks for your interest in The Chess Lifestyle chess academy! Would you like to book a free trial class?\n\nHappy to answer any questions.`,
    contacted: `Hi ${lead.name},\n\nJust following up on your enquiry with The Chess Lifestyle. Would you like to schedule a trial class this week?`,
    trial_scheduled: `Hi ${lead.name},\n\nA quick reminder about your upcoming trial class at The Chess Lifestyle. Looking forward to seeing you!`,
    trial_done: `Hi ${lead.name},\n\nThanks for attending the trial at The Chess Lifestyle! We'd love to have you on board — let me know if you'd like to enrol.`,
    enrolled: `Hi ${lead.name},\n\nWelcome to The Chess Lifestyle! Excited to have you with us.`,
    not_interested: `Hi ${lead.name},\n\nHope you're doing well. If your plans change and you'd like to explore chess coaching, we're here.`,
  };
  return templates[lead.stage] || `Hi ${lead.name},\n\nThis is from The Chess Lifestyle chess academy.`;
}
