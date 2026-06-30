import { inject, injectable } from 'tsyringe';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service.js';
import { NotFoundError, ValidationError } from '../../shared/errors/app.error.js';

@injectable()
export class DocumentService {
  constructor(
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(CloudinaryService) private readonly cloudinary: CloudinaryService,
  ) {}

  async uploadApartmentPhoto(organizationId: string, apartmentId: string, file: Express.Multer.File, uploadedById: string) {
    if (!file) throw new ValidationError('Fichier requis');

    const apartment = await this.prisma.apartment.findFirst({
      where: { id: apartmentId, organizationId },
    });
    if (!apartment) throw new NotFoundError('Appartement introuvable');

    const upload = await this.cloudinary.uploadFile(file, {
      folder: `immo-tec/${organizationId}/apartments/${apartmentId}`,
    });

    return this.prisma.document.create({
      data: {
        organizationId,
        type: DocumentType.APARTMENT_PHOTO,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        cloudinaryUrl: upload.url,
        cloudinaryPublicId: upload.publicId,
        apartmentId,
        uploadedById,
      },
    });
  }

  async listByApartment(organizationId: string, apartmentId: string) {
    return this.prisma.document.findMany({
      where: { organizationId, apartmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(organizationId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, organizationId } });
    if (!doc) throw new NotFoundError('Document introuvable');
    await this.prisma.document.delete({ where: { id } });
  }
}
