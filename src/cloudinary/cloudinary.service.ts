// cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary-response';

@Injectable()
export class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    async uploadFile(files: Express.Multer.File | Express.Multer.File[]): Promise<string[]> {
        try {
            // Aseguramos que siempre trabajamos con un array
            const fileArray = Array.isArray(files) ? files : [files];

            // Creamos un array de promesas de subida
            const uploadPromises = fileArray.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: process.env.FOLDER_CLOUDINARY },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result.secure_url);
                        }
                    );

                    uploadStream.end(file.buffer);
                });
            });

            // Esperamos a que todas las subidas se completen
            return await Promise.all(uploadPromises);
        } catch (error) {
            throw new Error(`Error uploading files: ${error.message}`);
        }
    }
}
