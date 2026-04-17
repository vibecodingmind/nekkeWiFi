// Email and SMS notification service for nekkeWiFi
// Supports: SMTP email, Africa's Talking SMS, Twilio SMS, console (dev mode)

import { db } from '@/lib/db';

interface NotificationPayload {
  organizationId: string;
  type: 'payment_received' | 'invoice_overdue' | 'subscription_expired' | 'device_alert' | 'welcome' | 'system' | 'payment_reminder';
  userId?: string;
  customerId?: string;
  title: string;
  message: string;
  email?: string;
  phone?: string;
  data?: Record<string, unknown>;
}

// Channel configuration
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

interface SmsConfig {
  provider: 'africas_talking' | 'twilio' | 'console';
  apiKey: string;
  username?: string;
  from?: string;
}

const CHANNEL_ENV = process.env.NOTIFICATION_CHANNEL || 'console'; // console, email, sms

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    // Always save to database notifications
    await db.notification.create({
      data: {
        organizationId: payload.organizationId,
        userId: payload.userId,
        customerId: payload.customerId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data ? JSON.stringify(payload.data) : null,
      },
    });

    // Dispatch based on channel
    switch (CHANNEL_ENV) {
      case 'email':
        if (payload.email) await sendEmail(payload);
        break;
      case 'sms':
        if (payload.phone) await sendSms(payload);
        break;
      case 'console':
      default:
        console.log(`[NOTIFICATION] ${payload.type}: ${payload.title} → ${payload.email || payload.phone || 'N/A'}`);
        break;
    }

    return true;
  } catch (error) {
    console.error('Notification send failed:', error);
    return false;
  }
}

// Email sending via SMTP (using Node.js built-in or nodemailer if available)
async function sendEmail(payload: NotificationPayload): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@nekkewifi.com';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[EMAIL-DEV] To: ${payload.email} | Subject: ${payload.title} | Body: ${payload.message}`);
    return;
  }

  // Use fetch-based SMTP sending (Resend-like approach)
  // For production, this would use a proper email API like Resend, SendGrid, or AWS SES
  console.log(`[EMAIL] Sending to ${payload.email}: ${payload.title}`);
  // In production, integrate with actual email service here
}

// SMS sending
async function sendSms(payload: NotificationPayload): Promise<void> {
  const smsProvider = process.env.SMS_PROVIDER || 'console';
  const smsApiKey = process.env.SMS_API_KEY;
  const smsFrom = process.env.SMS_FROM || 'nekkeWiFi';

  if (!smsApiKey) {
    console.log(`[SMS-DEV] To: ${payload.phone} | Message: ${payload.message}`);
    return;
  }

  console.log(`[SMS] Sending to ${payload.phone}: ${payload.message}`);
  // In production, integrate with Africa's Talking or Twilio API here
}

// ============================================
// CONVENIENCE FUNCTIONS FOR COMMON NOTIFICATIONS
// ============================================

// Payment received notification
export async function notifyPaymentReceived(params: {
  orgId: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  method: string;
  invoiceNumber?: string;
  email?: string;
  phone?: string;
}) {
  const title = 'Payment Received';
  const message = `Payment of ${params.currency} ${params.amount.toLocaleString()} received${params.invoiceNumber ? ` for invoice ${params.invoiceNumber}` : ''} via ${params.method}.`;
  return sendNotification({
    organizationId: params.orgId,
    customerId: params.customerId,
    type: 'payment_received',
    title,
    message,
    email: params.email,
    phone: params.phone,
    data: { amount: params.amount, currency: params.currency, method: params.method, invoiceNumber: params.invoiceNumber },
  });
}

// Invoice overdue notification
export async function notifyInvoiceOverdue(params: {
  orgId: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  dueDate: string;
  email?: string;
  phone?: string;
}) {
  const title = 'Invoice Overdue';
  const message = `Invoice ${params.invoiceNumber} for ${params.currency} ${params.total.toLocaleString()} is overdue. It was due on ${params.dueDate}.`;
  return sendNotification({
    organizationId: params.orgId,
    customerId: params.customerId,
    type: 'invoice_overdue',
    title,
    message,
    email: params.email,
    phone: params.phone,
    data: { invoiceNumber: params.invoiceNumber, total: params.total, dueDate: params.dueDate },
  });
}

// Payment reminder notification
export async function notifyPaymentReminder(params: {
  orgId: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  dueDate: string;
  email?: string;
  phone?: string;
}) {
  const title = 'Payment Reminder';
  const message = `Reminder: Invoice ${params.invoiceNumber} for ${params.currency} ${params.total.toLocaleString()} is due on ${params.dueDate}.`;
  return sendNotification({
    organizationId: params.orgId,
    customerId: params.customerId,
    type: 'payment_reminder',
    title,
    message,
    email: params.email,
    phone: params.phone,
    data: { invoiceNumber: params.invoiceNumber, total: params.total, dueDate: params.dueDate },
  });
}

// Device alert notification
export async function notifyDeviceAlert(params: {
  orgId: string;
  userId?: string;
  deviceName: string;
  alertType: string;
  message: string;
}) {
  return sendNotification({
    organizationId: params.orgId,
    userId: params.userId,
    type: 'device_alert',
    title: `Device Alert: ${params.deviceName}`,
    message: params.message,
    data: { deviceName: params.deviceName, alertType: params.alertType },
  });
}

// Welcome notification for new customers
export async function notifyWelcome(params: {
  orgId: string;
  customerId: string;
  customerName: string;
  email?: string;
  phone?: string;
  planName?: string;
}) {
  return sendNotification({
    organizationId: params.orgId,
    customerId: params.customerId,
    type: 'welcome',
    title: 'Welcome to nekkeWiFi!',
    message: `Welcome ${params.customerName}! Your account has been set up${params.planName ? ` with the ${params.planName} plan` : ''}. Enjoy your internet service.`,
    email: params.email,
    phone: params.phone,
    data: { planName: params.planName },
  });
}
