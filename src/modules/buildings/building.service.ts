import { inject, injectable } from 'tsyringe';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { NotFoundError } from '../../shared/errors/app.error.js';
import { SubscriptionService } from '../subscriptions/subscription.service.js';

export interface BuildingInput {
  name: string;
  address: string;
  district?: string;
  city?: string;
  floorCount?: number;
  latitude?: number;
  longitude?: number;
  description?: string;
}

@injectable()
export class BuildingRepository {
  constructor(@inject(PrismaService) private readonly prisma: PrismaService) {}

  findMany(organizationId: string, skip: number, limit: number) {
    return Promise.all([
      this.prisma.building.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { apartments: true } } },
      }),
      this.prisma.building.count({ where: { organizationId } }),
    ]);
  }

  findById(organizationId: string, id: string) {
    return this.prisma.building.findFirst({
      where: { id, organizationId },
      include: { apartments: true },
    });
  }

  create(organizationId: string, data: BuildingInput) {
    return this.prisma.building.create({
      data: { ...data, organizationId, city: data.city ?? 'Brazzaville' },
    });
  }

  update(organizationId: string, id: string, data: Partial<BuildingInput>) {
    return this.prisma.building.updateMany({
      where: { id, organizationId },
      data,
    });
  }

  delete(organizationId: string, id: string) {
    return this.prisma.building.deleteMany({ where: { id, organizationId } });
  }
}

@injectable()
export class BuildingService {
  constructor(
    @inject(BuildingRepository) private readonly repo: BuildingRepository,
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(SubscriptionService) private readonly subscriptionService: SubscriptionService,
  ) {}

  async list(organizationId: string, page: number, limit: number, skip: number) {
    const [items, total] = await this.repo.findMany(organizationId, skip, limit);
    return { items, total };
  }

  async get(organizationId: string, id: string) {
    const building = await this.repo.findById(organizationId, id);
    if (!building) throw new NotFoundError('Immeuble introuvable');
    return building;
  }

  create(organizationId: string, data: BuildingInput) {
    return this.repo.create(organizationId, data);
  }

  async update(organizationId: string, id: string, data: Partial<BuildingInput>) {
    await this.get(organizationId, id);
    await this.repo.update(organizationId, id, data);
    return this.get(organizationId, id);
  }

  async delete(organizationId: string, id: string) {
    await this.get(organizationId, id);
    await this.repo.delete(organizationId, id);
  }

  async generateApartments(
    organizationId: string,
    buildingId: string,
    input: { count: number; defaultRentAmount: number; rooms?: number; surface?: number },
  ) {
    const building = await this.get(organizationId, buildingId);
    const apartments = [];

    for (let i = 0; i < input.count; i++) {
      await this.subscriptionService.assertCanCreateApartment(organizationId);
      const apt = await this.prisma.apartment.create({
        data: {
          organizationId,
          buildingId: building.id,
          label: `Porte ${i + 1}`,
          floor: Math.floor(i / 4),
          rooms: input.rooms,
          surface: input.surface,
          rentAmount: input.defaultRentAmount,
        },
      });
      apartments.push(apt);
    }

    return apartments;
  }
}
