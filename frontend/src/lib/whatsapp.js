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
