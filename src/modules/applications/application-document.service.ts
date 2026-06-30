import { inject, injectable } from 'tsyringe';
import { ApplicationDocumentCategory, RentalApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/app.error.js';

@injectable()
export class ApplicationDocumentService {
  constructor(
    @inject(PrismaService) private readonly prisma: PrismaService,
    @inject(CloudinaryService) private readonly cloudinary: CloudinaryService,
  ) {}

  async list(applicationId: string) {
    return this.prisma.applicationDocument.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    applicationId: string,
    category: ApplicationDocumentCategory,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    if (!file) throw new ValidationError('Fichier requis');

    const app = await this.prisma.rentalApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundError('Candidature introuvable');
    if (app.applicantUserId !== uploadedById) throw new ForbiddenError('Accès refusé');
    if (app.status !== RentalApplicationStatus.DRAFT) {
      throw new ValidationError('Les documents ne peuvent être modifiés qu\'en brouillon');
    }

    if (category !== ApplicationDocumentCategory.ADDITIONAL) {
      const existing = await this.prisma.applicationDocument.findFirst({
        where: { applicationId, category },
      });
      if (existing) {
        await this.prisma.applicationDocument.delete({ where: { id: existing.id } });
      }
    }

    const upload = await this.cloudinary.uploadFile(file, {
      folder: `itc/applications/${applicationId}`,
      fileName: `${category.toLowerCase()}-${Date.now()}-${file.originalname}`,
    });

    return this.prisma.applicationDocument.create({
      data: {
        applicationId,
        category,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileUrl: upload.url,
        storageKey: upload.publicId,
        uploadedById,
      },
    });
  }

  async delete(applicationId: string, documentId: string, applicantUserId: string) {
    const app = await this.prisma.rentalApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundError('Candidature introuvable');
    if (app.applicantUserId !== applicantUserId) throw new ForbiddenError('Accès refusé');
    if (app.status !== RentalApplicationStatus.DRAFT) {
      throw new ValidationError('Les documents ne peuvent être supprimés qu\'en brouillon');
    }

    const doc = await this.prisma.applicationDocument.findFirst({
      where: { id: documentId, applicationId },
    });
    if (!doc) throw new NotFoundError('Document introuvable');

    await this.prisma.applicationDocument.delete({ where: { id: documentId } });
  }
}
