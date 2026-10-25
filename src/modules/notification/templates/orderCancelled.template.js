/**
 * @file orderCancelled.template.js
 * @description Responsive HTML email template for ORDER_CANCELLED & Refund Notification.
 * Provides clear transparency on order cancellation, items cancelled, and refund turnaround time.
 */

export const renderOrderCancelledEmail = ({
  customerName = 'Valued Customer',
  orderNumber = '',
  grandTotal = 0,
  refundAmount = 0,
  reason = 'Cancelled by system / customer request',
  items = [],
  supportEmail = 'support@chhotabhai.com',
}) => {
  const itemsHtml = items.length > 0
    ? items
        .map(
          (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
            <strong style="color: #0f172a; font-size: 13px; display: block;">${item.title || 'Product'}</strong>
            <span style="color: #64748b; font-size: 11px;">Qty: ${item.quantity || 1} &bull; ₹${item.unitPrice || 0} each</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #475569; font-size: 13px; font-weight: 600;">
            ₹${item.totalPrice || (item.unitPrice * (item.quantity || 1)) || 0}
          </td>
        </tr>
      `
        )
        .join('')
    : '';

  const finalRefund = refundAmount || grandTotal;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order #${orderNumber} Cancelled & Refund Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          
          <!-- Header Branding -->
          <tr>
            <td style="padding: 28px 32px; background-color: #0f172a; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">
                Chhota<span style="color: #e11938;">Bhai</span>
              </h1>
              <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">
                Customer Care & Returns
              </p>
            </td>
          </tr>

          <!-- Cancellation Hero Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <div style="width: 56px; height: 56px; background-color: #fee2e2; border-radius: 50%; margin: 0 auto 16px auto; line-height: 56px; text-align: center;">
                <span style="font-size: 26px; color: #dc2626;">&times;</span>
              </div>
              <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 20px; font-weight: 800;">
                Order Cancelled
              </h2>
              <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                Hello <strong>${customerName}</strong>, your order <strong>#${orderNumber}</strong> has been cancelled.
              </p>
            </td>
          </tr>

          <!-- Refund Notice Card -->
          <tr>
            <td style="padding: 20px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                      <strong style="color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                        &check; Refund Initiated
                      </strong>
                    </div>
                    <p style="margin: 0; color: #15803d; font-size: 13px; line-height: 1.6;">
                      A full refund of <strong style="font-size: 16px; color: #14532d;">₹${finalRefund.toLocaleString('en-IN')}</strong> has been triggered to your original payment method. Depending on your bank or card issuer, funds will reflect in your account within <strong>3&ndash;5 business days</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order & Cancellation Details Table -->
          <tr>
            <td style="padding: 10px 32px 20px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 18px 20px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700; padding-bottom: 8px;">Order Details</td>
                  <td style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700; text-align: right; padding-bottom: 8px;">Status</td>
                </tr>
                <tr>
                  <td style="color: #0f172a; font-size: 14px; font-weight: 700;">#${orderNumber}</td>
                  <td style="text-align: right;">
                    <span style="background-color: #fef2f2; color: #dc2626; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Cancelled</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 12px; font-size: 12px; color: #64748b;">
                    <strong>Reason:</strong> ${reason}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            itemsHtml
              ? `
          <!-- Cancelled Items Breakdown -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                Items in This Order
              </h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>
          `
              : ''
          }

          <!-- Support Contact CTA -->
          <tr>
            <td style="padding: 20px 32px 32px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 13px;">
                If you did not request this cancellation or have queries regarding your refund, reach out to our 24/7 support desk.
              </p>
              <a href="mailto:${supportEmail}?subject=Cancellation%20Enquiry%20Order%20${encodeURIComponent(orderNumber)}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 13px; font-weight: 700;">
                Contact Support Desk
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px;">
                &copy; ${new Date().getFullYear()} ChhotaBhai Accessories. All rights reserved.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                Need assistance? Email us at <a href="mailto:${supportEmail}" style="color: #e11938; text-decoration: none;">${supportEmail}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};
