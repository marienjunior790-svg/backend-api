import { inject, injectable } from 'tsyringe';

import { ApartmentStatus, LeaseStatus, PaymentStatus, MaintenanceTicketStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

import { PaymentRepository } from '../payments/payment.service.js';

import { decimalToNumber } from '../../shared/utils/response.util.js';



const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];



function serializePayment(p: Prisma.PaymentGetPayload<{

  include: { lease: { include: { tenant: true; apartment: true } } };

}>) {

  return {

    id: p.id,

    status: p.status,

    amount: decimalToNumber(p.amount),

    amountPaid: decimalToNumber(p.amountPaid),

    periodMonth: p.periodMonth,

    periodYear: p.periodYear,

    dueDate: p.dueDate,

    paidAt: p.paidAt,

    updatedAt: p.updatedAt,

    lease: p.lease

      ? {

          id: p.lease.id,

          tenant: p.lease.tenant

            ? {

                id: p.lease.tenant.id,

                firstName: p.lease.tenant.firstName,

                lastName: p.lease.tenant.lastName,

              }

            : null,

          apartment: p.lease.apartment

            ? { id: p.lease.apartment.id, label: p.lease.apartment.label }

            : null,

        }

      : null,

  };

}



@injectable()

export class DashboardService {

  constructor(

    @inject(PrismaService) private readonly prisma: PrismaService,

    @inject(PaymentRepository) private readonly paymentRepo: PaymentRepository,

  ) {}



  async getStats(organizationId: string) {

    await this.paymentRepo.markLatePayments();



    const now = new Date();

    const currentMonth = now.getMonth() + 1;

    const currentYear = now.getFullYear();



    const [

      totalApartments,

      availableApartments,

      occupiedApartments,

      maintenanceApartments,

      unavailableApartments,

      totalBuildings,

      activeLeases,

      totalTenants,

      pendingPayments,

      latePayments,

      paidThisMonth,

      paidLastMonth,

      currentMonthPayments,

      recentPayments,

      revenueByMonth,

    ] = await Promise.all([

      this.prisma.apartment.count({ where: { organizationId } }),

      this.prisma.apartment.count({ where: { organizationId, status: ApartmentStatus.AVAILABLE } }),

      this.prisma.apartment.count({ where: { organizationId, status: ApartmentStatus.OCCUPIED } }),

      this.prisma.apartment.count({ where: { organizationId, status: ApartmentStatus.MAINTENANCE } }),

      this.prisma.apartment.count({ where: { organizationId, status: ApartmentStatus.UNAVAILABLE } }),

      this.prisma.building.count({ where: { organizationId } }),

      this.prisma.lease.count({ where: { organizationId, status: LeaseStatus.ACTIVE } }),

      this.prisma.tenant.count({ where: { organizationId } }),

      this.prisma.payment.count({ where: { organizationId, status: PaymentStatus.PENDING } }),

      this.prisma.payment.count({ where: { organizationId, status: PaymentStatus.LATE } }),

      this.getPaidInMonth(organizationId, currentYear, currentMonth),

      this.getPaidInMonth(
        organizationId,
        currentMonth === 1 ? currentYear - 1 : currentYear,
        currentMonth === 1 ? 12 : currentMonth - 1,
      ),

      this.prisma.payment.findMany({

        where: { organizationId, periodMonth: currentMonth, periodYear: currentYear },

        select: { status: true, amount: true, amountPaid: true },

      }),

      this.prisma.payment.findMany({

        where: { organizationId },

        take: 5,

        orderBy: { updatedAt: 'desc' },

        include: {

          lease: { include: { tenant: true, apartment: true } },

        },

      }),

      this.getRevenueChart(organizationId, 6),

    ]);



    const expectedThisMonth = currentMonthPayments.reduce((sum, p) => sum + decimalToNumber(p.amount), 0);

    const collectedThisMonth = paidThisMonth;

    const unpaidThisMonth = Math.max(0, expectedThisMonth - collectedThisMonth);

    const unpaidTenants = currentMonthPayments.filter(

      (p) => p.status === PaymentStatus.PENDING || p.status === PaymentStatus.LATE || p.status === PaymentStatus.PARTIAL,

    ).length;



    const occupancyRate = totalApartments > 0 ? Math.round((occupiedApartments / totalApartments) * 100) : 0;



    const collectedTrend = paidLastMonth > 0

      ? Math.round(((paidThisMonth - paidLastMonth) / paidLastMonth) * 100)

      : paidThisMonth > 0 ? 100 : 0;



    const rentStatus = this.buildRentStatus(currentMonthPayments);

    const propertyStatus = [

      { name: 'Occupés', value: occupiedApartments, color: '#2ECC71' },

      { name: 'Libres', value: availableApartments, color: '#F1C40F' },

      { name: 'En maintenance', value: maintenanceApartments, color: '#94A3B8' },

      ...(unavailableApartments > 0

        ? [{ name: 'Indisponibles', value: unavailableApartments, color: '#64748B' }]

        : []),

    ];



    const maintenanceApartmentsList = await this.prisma.apartment.findMany({

      where: { organizationId, status: ApartmentStatus.MAINTENANCE },

      take: 3,

      orderBy: { updatedAt: 'desc' },

      include: { building: true },

    });

    const recentMaintenanceTickets = await this.prisma.maintenanceTicket.findMany({
      where: {
        organizationId,
        status: { notIn: [MaintenanceTicketStatus.CLOSED, MaintenanceTicketStatus.CANCELLED] },
      },
      take: 5,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        apartment: { include: { building: true } },
        tenant: true,
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });



    return {

      apartments: {

        total: totalApartments,

        available: availableApartments,

        occupied: occupiedApartments,

        maintenance: maintenanceApartments,

        unavailable: unavailableApartments,

      },

      buildings: { total: totalBuildings },

      leases: { active: activeLeases },

      tenants: { total: totalTenants },

      payments: {

        pending: pendingPayments,

        late: latePayments,

        collectedThisMonth,

        expectedThisMonth,

        unpaidThisMonth,

        unpaidTenants,

        collectedTrend,

      },

      occupancy: { rate: occupancyRate },

      rentStatus,

      propertyStatus,

      revenueChart: revenueByMonth,

      trends: {

        collected: {

          value: collectedThisMonth,

          trend: collectedTrend,

          trendLabel: 'vs mois dernier',

        },

        occupancy: {

          value: occupancyRate,

          trend: 0,

          trendLabel: 'taux actuel',

        },

      },

      maintenanceApartments: maintenanceApartmentsList.map((a) => ({

        id: a.id,

        label: a.label,

        building: a.building?.name ?? '',

        updatedAt: a.updatedAt,

      })),

      recentMaintenanceTickets: recentMaintenanceTickets.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        apartmentLabel: t.apartment.label,
        building: t.apartment.building?.name ?? '',
        tenantName: t.tenant ? `${t.tenant.firstName} ${t.tenant.lastName}` : null,
        assignedToName: t.assignedToName
          ?? (t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : null),
        createdAt: t.createdAt,
      })),

      recentPayments: recentPayments.map(serializePayment),

    };

  }



  private buildRentStatus(

    payments: { status: PaymentStatus; amount: Prisma.Decimal; amountPaid: Prisma.Decimal }[],

  ) {

    let paid = 0;

    let late = 0;

    let unpaid = 0;



    for (const p of payments) {

      if (p.status === PaymentStatus.PAID) paid += 1;

      else if (p.status === PaymentStatus.LATE) late += 1;

      else if (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.PARTIAL) unpaid += 1;

    }



    return [

      { name: 'Payés', value: paid, color: '#2ECC71' },

      { name: 'En retard', value: late, color: '#F39C12' },

      { name: 'Impayés', value: unpaid, color: '#E74C3C' },

    ];

  }



  private async getPaidInMonth(organizationId: string, year: number, month: number) {

    const start = new Date(year, month - 1, 1);

    const end = new Date(year, month, 0, 23, 59, 59);



    const payments = await this.prisma.payment.findMany({

      where: {

        organizationId,

        status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIAL] },

        paidAt: { gte: start, lte: end },

      },

      select: { amountPaid: true },

    });



    return payments.reduce((sum, p) => sum + decimalToNumber(p.amountPaid), 0);

  }



  private async getRevenueChart(organizationId: string, months: number) {

    const now = new Date();

    const points: { month: string; revenue: number; expenses: number }[] = [];



    for (let i = months - 1; i >= 0; i--) {

      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const year = d.getFullYear();

      const month = d.getMonth() + 1;

      const revenue = await this.getPaidInMonth(organizationId, year, month);

      points.push({

        month: MONTH_LABELS[d.getMonth()] ?? `${month}`,

        revenue,

        expenses: 0,

      });

    }



    return points;

  }

  async exportReport(organizationId: string): Promise<string> {
    const stats = await this.getStats(organizationId);
    const rows = [
      ['metric', 'value'],
      ['apartments_total', stats.apartments.total],
      ['apartments_occupied', stats.apartments.occupied],
      ['buildings_total', stats.buildings.total],
      ['leases_active', stats.leases.active],
      ['tenants_total', stats.tenants.total],
      ['payments_pending', stats.payments.pending],
      ['payments_late', stats.payments.late],
      ['collected_this_month', stats.payments.collectedThisMonth],
      ['expected_this_month', stats.payments.expectedThisMonth],
      ['occupancy_rate', stats.occupancy.rate],
    ];
    return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  }
}

