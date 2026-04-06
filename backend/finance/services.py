from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from django.utils import timezone

def generate_receipt_pdf(receipt):
    """
    Generates a professional A4 Receipt PDF using ReportLab.
    """
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    booking = receipt.payment.booking
    balance = booking.total_cost - booking.paid_amount

    # --- Header ---
    p.setFont("Helvetica-Bold", 20)
    p.drawCentredString(width / 2, height - 1 * inch, "OFFICIAL RECEIPT")
    
    p.setFont("Helvetica", 10)
    p.drawCentredString(width / 2, height - 1.25 * inch, "MRANGA TOURS & SAFARI LTD.")
    p.drawCentredString(width / 2, height - 1.4 * inch, "Arman Complex, opposite Diani Sea Lodge, Diani, Kenya | +254 116 837982/+41 79 400 28 81")
    p.drawCentredString(width / 2, height - 1.55 * inch, "Email: info@mrangatoursandsafaris.com")
    
    # --- Receipt Info ---
    p.setStrokeColor(colors.lightgrey)
    p.line(0.5 * inch, height - 1.8 * inch, width - 0.5 * inch, height - 1.8 * inch)
    
    p.setFont("Helvetica-Bold", 11)
    p.drawString(0.5 * inch, height - 2.1 * inch, f"Receipt No: {receipt.receipt_no}")
    p.drawRightString(width - 0.5 * inch, height - 2.1 * inch, f"Date: {receipt.generated_at.strftime('%d %b %Y, %H:%M')}")
    
    # --- Details ---
    p.setFont("Helvetica", 11)
    y = height - 2.6 * inch
    
    details = [
        ("Received From:", receipt.payment.booking.client.full_name),
        ("Booking Ref:", receipt.payment.booking.reference_no),
        ("Narration:", receipt.narration or "Tour Payment"),
        ("Payment Method:", receipt.payment.get_method_display()),
        ("Transaction Ref:", receipt.payment.txn_reference or "N/A"),
    ]
    
    for label, value in details:
        p.setFont("Helvetica-Bold", 11)
        p.drawString(0.5 * inch, y, label)
        p.setFont("Helvetica", 11)
        p.drawString(2.5 * inch, y, str(value))
        y -= 0.3 * inch
    
    # --- Amount Section ---
    y -= 0.4 * inch
    p.setFillColor(colors.whitesmoke)
    p.rect(0.5 * inch, y - 0.4 * inch, width - 1 * inch, 0.6 * inch, fill=1)
    p.setFillColor(colors.black)
    
    p.setFont("Helvetica-Bold", 14)
    p.drawString(0.7 * inch, y - 0.2 * inch, "TOTAL PAID")
    p.drawRightString(width - 0.7 * inch, y - 0.2 * inch, f"{receipt.payment.currency} {receipt.payment.amount:,.2f}")
    
    # --- Balance Section ---
    y -= 0.8 * inch
    p.setFont("Helvetica-Bold", 10)
    p.drawString(0.5 * inch, y, "REMAINING BALANCE:")
    p.setFont("Helvetica", 10)
    p.drawString(2.5 * inch, y, f"{booking.currency} {balance:,.2f}")
    
    # --- Footer ---
    y -= 1.5 * inch
    p.setFont("Helvetica", 10)
    p.drawRightString(width - 0.5 * inch, y - 1 * inch, "Authorized Signature: _______________________")

    p.showPage()
    p.save()
    
    buffer.seek(0)
    return buffer
