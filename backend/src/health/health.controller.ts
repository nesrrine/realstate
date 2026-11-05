import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryStorageService } from '../storage/cloudinary-storage.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: CloudinaryStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('cloudinary')
  @ApiOperation({ summary: 'Test Cloudinary connection and list documents' })
  @ApiResponse({ status: 200, description: 'Cloudinary status and sample documents' })
  async checkCloudinary() {
    try {
      const { v2: cloudinary } = require('cloudinary');
      
      // Test 1: Ping API
      await cloudinary.api.ping();
      
      // Test 2: List some private documents
      const docs = await cloudinary.api.resources({
        type: 'private',
        resource_type: 'raw',
        max_results: 5,
        prefix: 'real-estate/documents',
      });

      // Test 3: Try to read one document if available
      let readTest = null;
      if (docs.resources.length > 0) {
        const testDoc = docs.resources[0];
        try {
          const buffer = await this.storage.read(testDoc.public_id);
          readTest = {
            success: true,
            publicId: testDoc.public_id,
            size: buffer.length,
          };
        } catch (err) {
          readTest = {
            success: false,
            publicId: testDoc.public_id,
            error: err.message,
          };
        }
      }

      return {
        status: 'ok',
        cloudinary: 'connected',
        documentsFound: docs.resources.length,
        sampleDocuments: docs.resources.map((doc: any) => ({
          publicId: doc.public_id,
          format: doc.format,
          bytes: doc.bytes,
          createdAt: doc.created_at,
        })),
        readTest,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        cloudinary: 'error',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('documents/:propertyId')
  @ApiOperation({ summary: 'Test document download for a specific property' })
  @ApiResponse({ status: 200, description: 'List of documents with download test results' })
  async testPropertyDocuments(@Param('propertyId') propertyId: string) {
    try {
      const documents = await this.prisma.propertyDocument.findMany({
        where: { propertyId },
        select: {
          id: true,
          title: true,
          originalName: true,
          storageKey: true,
          size: true,
          mimeType: true,
        },
      });

      const results = await Promise.all(
        documents.map(async (doc) => {
          try {
            const buffer = await this.storage.read(doc.storageKey);
            return {
              documentId: doc.id,
              title: doc.title,
              storageKey: doc.storageKey,
              success: true,
              sizeInDb: doc.size,
              sizeRead: buffer.length,
              match: doc.size === buffer.length,
            };
          } catch (error) {
            return {
              documentId: doc.id,
              title: doc.title,
              storageKey: doc.storageKey,
              success: false,
              error: error.message,
            };
          }
        })
      );

      return {
        status: 'ok',
        propertyId,
        totalDocuments: documents.length,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
