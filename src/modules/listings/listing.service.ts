import { inject, injectable } from 'tsyringe';
import { ApartmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { NotFoundError, ValidationError } from '../../shared/errors/app.error.js';

export interface ListingSearchFilters {
  city?: string;
  district?: string;
  minRent?: number;
  maxRent?: number;
  minRooms?: number;
  search?: string;
}

@injectable()
export class ListingService {
  constructor(@inject(PrismaService) private readonly prisma: PrismaService) {}

  async search(skip: number, limit: number, filters: ListingSearchFilters) {
    const where: Prisma.ApartmentWhereInput = {
      isPublished: true,
      status: ApartmentStatus.AVAILABLE,
      organization: { isActive: true, isValidated: true },
      ...(filters.city && { building: { city: { contains: filters.city, mode: 'insensitive' } } }),
      ...(filters.district && { building: { district: { contains: filters.district, mode: 'insensitive' } } }),
      ...(filters.minRent !== undefined && { rentAmount: { gte: filters.minRent } }),
      ...(filters.maxRent !== undefined && { rentAmount: { lte: filters.maxRent } }),
      ...(filters.minRooms !== undefined && { rooms: { gte: filters.minRooms } }),
      ...(filters.search && {
        OR: [
          { label: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { building: { name: { contains: filters.search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.apartment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          building: { select: { id: true, name: true, address: true, district: true, city: true } },
          organization: { select: { id: true, name: true, type: true } },
          documents: { where: { type: 'APARTMENT_PHOTO' }, take: 3 },
        },
      }),
      this.prisma.apartment.count({ where }),
    ]);

    return { items, total };
  }

  async getPublicListing(apartmentId: string) {
    const apt = await this.prisma.apartment.findFirst({
      where: {
        id: apartmentId,
        isPublished: true,
        status: ApartmentStatus.AVAILABLE,
        organization: { isActive: true, isValidated: true },
      },
      include: {
        building: true,
        organization: { select: { id: true, name: true, type: true, phone: true } },
        documents: { where: { type: 'APARTMENT_PHOTO' } },
      },
    });
    if (!apt) throw new NotFoundError('Annonce introuvable ou non disponible');
    return apt;
  }

  async publish(organizationId: string, apartmentId: string, amenities?: string) {
    const apt = await this.prisma.apartment.findFirst({
      where: { id: apartmentId, organizationId },
    });
    if (!apt) throw new NotFoundError('Appartement introuvable');
    if (apt.status !== ApartmentStatus.AVAILABLE) {
      throw new ValidationError('Seuls les biens disponibles peuvent être publiés');
    }

    return this.prisma.apartment.update({
      where: { id: apartmentId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        ...(amenities !== undefined && { amenities }),
      },
      include: { building: true },
    });
  }

  async unpublish(organizationId: string, apartmentId: string) {
    const apt = await this.prisma.apartment.findFirst({
      where: { id: apartmentId, organizationId },
    });
    if (!apt) throw new NotFoundError('Appartement introuvable');

    return this.prisma.apartment.update({
      where: { id: apartmentId },
      data: { isPublished: false, publishedAt: null },
      include: { building: true },
    });
  }
}
