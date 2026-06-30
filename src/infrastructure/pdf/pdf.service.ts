import PDFDocument from 'pdfkit';
import { injectable } from 'tsyringe';
import { decimalToNumber } from '../../shared/utils/response.util.js';

type LeaseWithRelations = {
  id: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: { toNumber?: () => number } | number;
  depositAmount?: { toNumber?: () => number } | number | null;
  currency: string;
  terms?: string | null;
  apartment: {
    label: string;
    floor?: number | null;
    building?: { name: string; address: string } | null;
  };
  tenant: { firstName: string; lastName: string; phone: string; email?: string | null };
  organization?: { name: string; address?: string | null; phone?: string | null } | null;
};

type PaymentWithRelations = {
  id: string;
  amount: { toNumber?: () => number } | number;
  amountPaid: { toNumber?: () => number } | number;
  currency: string;
  periodMonth: number;
  periodYear: number;
  paidAt?: Date | null;
  method?: string | null;
  reference?: string | null;
  lease: {
    tenant: { firstName: string; lastName: string; phone: string };
    apartment: { label: string };
    organization?: { name: string; phone?: string | null } | null;
  };
};

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function bufferFromPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function formatXaf(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} XAF`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

@injectable()
export class PdfService {
  async generateLeaseContract(lease: LeaseWithRelations): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const bufferPromise = bufferFromPdf(doc);

    const orgName = lease.organization?.name ?? 'IMMO-tec';
    const building = lease.apartment.building;
    const rent = decimalToNumber(lease.monthlyRent);
    const deposit = decimalToNumber(lease.depositAmount);

    doc.fontSize(18).text('CONTRAT DE LOCATION', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`Réf. ${lease.id}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1.5);

    doc.fontSize(12).text(`Entre : ${orgName}`, { continued: false });
    if (lease.organization?.address) doc.text(`Adresse : ${lease.organization.address}`);
    if (lease.organization?.phone) doc.text(`Tél. : ${lease.organization.phone}`);
    doc.moveDown();

    doc.text('Et le locataire :');
    doc.text(`${lease.tenant.firstName} ${lease.tenant.lastName}`);
    doc.text(`Tél. : ${lease.tenant.phone}`);
    if (lease.tenant.email) doc.text(`Email : ${lease.tenant.email}`);
    doc.moveDown();

    doc.fontSize(14).text('Article 1 — Objet', { underline: true });
    doc.fontSize(11).moveDown(0.5);
    doc.text(
      `Le bailleur loue au locataire le logement suivant : ${lease.apartment.label}` +
      (building ? `, situé dans ${building.name}, ${building.address}` : '') +
      (lease.apartment.floor != null ? `, étage ${lease.apartment.floor}` : '') + '.',
    );
    doc.moveDown();

    doc.fontSize(14).text('Article 2 — Durée', { underline: true });
    doc.fontSize(11).moveDown(0.5);
    doc.text(`Du ${formatDate(new Date(lease.startDate))} au ${formatDate(new Date(lease.endDate))}.`);
    doc.moveDown();

    doc.fontSize(14).text('Article 3 — Loyer et dépôt', { underline: true });
    doc.fontSize(11).moveDown(0.5);
    doc.text(`Loyer mensuel : ${formatXaf(rent)}`);
    if (deposit > 0) doc.text(`Dépôt de garantie : ${formatXaf(deposit)}`);
    doc.moveDown();

    if (lease.terms) {
      doc.fontSize(14).text('Article 4 — Clauses particulières', { underline: true });
      doc.fontSize(11).moveDown(0.5).text(lease.terms);
      doc.moveDown();
    }

    doc.moveDown(2);
    doc.text('Fait à Brazzaville, le ' + formatDate(new Date()));
    doc.moveDown(3);
    doc.text('Signature bailleur : ___________________', 50, doc.y);
    doc.text('Signature locataire : ___________________', 300, doc.y - 12);

    doc.end();
    return bufferPromise;
  }

  async generatePaymentReceipt(payment: PaymentWithRelations): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const bufferPromise = bufferFromPdf(doc);

    const orgName = payment.lease.organization?.name ?? 'IMMO-tec';
    const amount = decimalToNumber(payment.amountPaid);
    const period = `${MONTHS_FR[payment.periodMonth - 1]} ${payment.periodYear}`;

    doc.fontSize(20).text('QUITTANCE DE LOYER', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`N° ${payment.id}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(2);

    doc.fontSize(12);
    doc.text(`Émetteur : ${orgName}`);
    if (payment.lease.organization?.phone) doc.text(`Tél. : ${payment.lease.organization.phone}`);
    doc.moveDown();
    doc.text(`Locataire : ${payment.lease.tenant.firstName} ${payment.lease.tenant.lastName}`);
    doc.text(`Logement : ${payment.lease.apartment.label}`);
    doc.text(`Période : ${period}`);
    doc.moveDown();

    doc.fontSize(16).text(`Montant reçu : ${formatXaf(amount)}`, { align: 'center' });
    doc.moveDown();

    if (payment.paidAt) doc.text(`Date de paiement : ${formatDate(new Date(payment.paidAt))}`);
    if (payment.method) doc.text(`Mode : ${payment.method.replace('_', ' ')}`);
    if (payment.reference) doc.text(`Référence : ${payment.reference}`);

    doc.moveDown(3);
    doc.fontSize(10).fillColor('#666').text('Document généré par IMMO-tec — Ce reçu fait foi de paiement.', { align: 'center' });

    doc.end();
    return bufferPromise;
  }
}
