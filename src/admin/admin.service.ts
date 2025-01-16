import { Injectable } from '@nestjs/common';
import { LotionDto } from './dto/create-admin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class AdminService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService
  ) { }

  // Lotion management

  // Método para agregar una nueva loción
  public async addLotion(data: LotionDto, files: Express.Multer.File[]) {
    const {
      name,
      description,
      brand,
      genre,
      isAvailable,
      chords,
      price
    } = data;

    try {
      // Valida que existan archivos
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      // Normaliza las cadenas de texto eliminando espacios al principio y al final
      const trimmedName = name.trim();
      const trimmedDescription = description ? description.trim() : '';
      const trimmedBrand = brand.trim();
      const trimmedChords = JSON.parse(chords).map((chord: string) => chord.trim()); // Si hay chords, también se eliminan los espacios
      const trimmedPrice = Number(price);

      // Sube las imágenes a Cloudinary
      const uploadedImages = await this.cloudinary.uploadFile(files); // Ya no necesitas map aquí

      // Crea la loción en la base de datos
      const newLotion = await this.prisma.lotion.create({
        data: {
          name: trimmedName,
          description: trimmedDescription,
          brand: trimmedBrand,
          images: uploadedImages, // Esto ya será string[]
          genre,
          isAvailable: JSON.parse(isAvailable),
          chords: trimmedChords,
          price: trimmedPrice
        },
      });

      return { success: true, data: newLotion };
    } catch (error) {
      console.error('Error creating lotion:', error.message);
      throw error;
    }
  }

  public async getOnlyLotion(id: string) {
    try {
      const lotion = await this.prisma.lotion.findUnique({ where: { id } });
      return { success: true, data: lotion }
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      }
    }
  }

  // Método para actualizar una loción existente
  public async updateLotion(id: string, data: Partial<LotionDto>) {
    try {
      // Normaliza los datos para asegurar que los tipos son correctos
      const { isAvailable, chords, ...restData } = data;

      // Convierte `isAvailable` a boolean si viene como string
      const normalizedIsAvailable = isAvailable !== undefined
        ? JSON.parse(isAvailable.toString())
        : undefined;

      // Convierte los `chords` a una lista de strings si vienen como JSON string
      const normalizedChords = chords ? JSON.parse(chords.toString()) : undefined;

      // Actualiza la loción en la base de datos
      const updatedLotion = await this.prisma.lotion.update({
        where: { id },
        data: {
          ...restData,
          ...(normalizedIsAvailable !== undefined && { isAvailable: normalizedIsAvailable }),
          ...(normalizedChords && { chords: normalizedChords }),
        },
      });

      return { success: true, data: updatedLotion };
    } catch (error) {
      console.error('Error updating lotion:', error.message);
      throw error;
    }
  }

  // Método para obtener los chords de una loción específica
  public async getLotionChords(id: string) {
    try {
      const lotion = await this.prisma.lotion.findUnique({
        where: { id },
        select: { chords: true },
      });
      if (!lotion) throw new Error('Lotion not found');
      return { success: true, data: lotion.chords };
    } catch (error) {
      console.error('Error fetching lotion chords:', error.message);
      throw error;
    }
  }

  // Método para editar los chords de una loción específica
  public async updateLotionChords(id: string, newChords: string[]) {
    try {
      const trimmedChords = newChords.map((chord) => chord.trim().toLowerCase());
      const updatedLotion = await this.prisma.lotion.update({
        where: { id },
        data: { chords: trimmedChords },
      });
      return { success: true, data: updatedLotion };
    } catch (error) {
      console.error('Error updating lotion chords:', error.message);
      throw error;
    }
  }

  // Método para agregar imágenes adicionales a una loción específica
  public async addImagesToLotion(id: string, files: Express.Multer.File[]) {
    try {
      if (!files || files.length === 0) throw new Error('No files provided');

      const uploadedImages = await this.cloudinary.uploadFile(files);
      
      const updatedLotion = await this.prisma.lotion.update({
        where: { id },
        data: {
          images: {
            push: uploadedImages,
          },
        },
      });

      return { success: true, data: updatedLotion };
    } catch (error) {
      console.error('Error adding images to lotion:', error.message);
      throw error;
    }
  }

  public async allLotions(page: number = 1) {
    try {
      const pageSize = 20;
      const skip = (page - 1) * pageSize;

      const lotions = await this.prisma.lotion.findMany({
        skip,
        take: pageSize,
      });

      const totalLotions = await this.prisma.lotion.count();  // Contar el total de lotiones

      const totalPages = Math.ceil(totalLotions / pageSize);

      return {
        success: true,
        data: lotions,
        pagination: {
          currentPage: page,
          totalPages,
          totalLotions,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
    }
  }

  public async searchNameLotion(
    name: string,
    page: number = 1, // Página actual (por defecto es 1)
    priceOrder: 'asc' | 'desc' = 'asc', // Orden de precio: ascendente o descendente
    brand?: string, // Filtro opcional por marca
    chords?: string[], // Filtro opcional por chords
  ) {
    try {
      // Define el tamaño de la página
      const pageSize = 20;
      const skip = (page - 1) * pageSize; // Desplazamiento según la página

      // Construcción de filtros y orden
      const whereClause: any = {};

      // Si se proporciona un nombre, lo utilizamos para buscar por el nombre
      if (name) {
        whereClause.name = {
          contains: name.trim(), // Se usa .trim() para evitar espacios innecesarios
          mode: 'insensitive',
        };
      }

      // Si se proporciona una marca, la usamos como filtro insensible a mayúsculas/minúsculas
      if (brand) {
        whereClause.brand = {
          contains: brand.trim(), // Se aplica .trim() en el brand
          mode: 'insensitive', // Hace la búsqueda insensible a mayúsculas/minúsculas
        };
      }

      // Si se proporciona un array de chords, buscamos lociones que contengan al menos uno de esos chords
      if (chords && chords.length > 0) {
        whereClause.chords = {
          hasSome: chords.map(chord => chord.trim().toLowerCase()), // Normalizamos los chords y buscamos si alguno está presente
        };
      }

      // Realiza la búsqueda con paginación, orden y filtros
      const lotions = await this.prisma.lotion.findMany({
        where: whereClause,
        orderBy: {
          price: priceOrder, // Ordena por precio
        },
        skip: skip, // Paginación (salto de resultados)
        take: pageSize, // Limita los resultados a 20 por página
      });

      // Si no se encuentran resultados, devuelve un mensaje adecuado
      if (lotions.length === 0) {
        return { success: false, message: 'No lotions found with the given parameters' };
      }

      // Calcular el total de páginas en el backend y enviarlo
      const totalCount = await this.prisma.lotion.count({
        where: whereClause, // Contamos el total de lociones según los filtros
      });

      const totalPages = Math.ceil(totalCount / pageSize);

      // Devuelve los resultados encontrados con la paginación
      return {
        success: true,
        data: lotions,
        pagination: {
          page,
          totalPages, // Enviamos totalPages ya calculado
          totalCount, // Total de lociones encontradas
        },
      };
    } catch (error) {
      console.error('Error searching lotions:', error.message);
      return { success: false, error: error.message };
    }
  }

  public async getAllChords() {
    try {
      // Obtiene todas las lociones
      const lotions = await this.prisma.lotion.findMany({
        select: {
          chords: true, // Solo seleccionamos los chords
        },
      });

      // Crea un conjunto para almacenar los chords únicos
      const allChords = new Set<string>();

      // Recorre cada loción y agrega sus chords al set
      lotions.forEach((lotion) => {
        lotion.chords.forEach((chord) => {
          // Normaliza el string para evitar duplicados por diferencias en mayúsculas/minúsculas o espacios extra
          const normalizedChord = chord.trim().toLowerCase();
          allChords.add(normalizedChord);
        });
      });

      // Devuelve un array con los chords únicos (convertido a un array desde el set)
      return { success: true, data: Array.from(allChords) };
    } catch (error) {
      console.error('Error fetching chords:', error.message);
      return { success: false, error: error.message };
    }
  }

  public async randomTenImages() {
    try {
      // Obtiene todas las imágenes de todas las lociones
      const allImages = await this.prisma.lotion.findMany({
        select: {
          images: true, // Solo seleccionamos las imágenes
        },
      });

      // Aplana el array para obtener una lista única de imágenes
      const imagesArray = allImages.flatMap(lotion => lotion.images);

      // Si no hay suficientes imágenes, devuelve todas las disponibles
      if (imagesArray.length <= 10) {
        return { success: true, data: imagesArray };
      }

      // Mezcla las imágenes de forma aleatoria y selecciona las primeras 10
      const randomImages = imagesArray
        .sort(() => 0.5 - Math.random()) // Mezcla aleatoria
        .slice(0, 10); // Selecciona 10 imágenes

      return { success: true, data: randomImages };
    } catch (error) {
      console.error('Error fetching random images:', error.message);
      return { success: false, error: error.message };
    }
  }
}
