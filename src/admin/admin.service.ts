import { Injectable } from '@nestjs/common';
import { LotionDto } from './dto/create-admin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { SearchService } from 'src/search/search.service';

@Injectable()
export class AdminService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly search: SearchService
  ) { }

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
    page: number = 1,
    priceOrder: 'asc' | 'desc' = 'asc',
    brand?: string,
    chords?: string[],
  ) {
    return await this.search.enhancedSearch({
      name,
      brand,
      chords,
      priceOrder,
      page
    })
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

  // Método para agregar nuevas correcciones de marcas
  public async addBrandCorrections(corrections: { originalName: string; correctedName: string }[]) {
    try {
      // Normaliza las entradas para evitar duplicados
      const normalizedCorrections = corrections.map((correction) => ({
        originalName: correction.originalName.trim().toLowerCase(),
        correctedName: correction.correctedName.trim().toLowerCase(),
      }));

      // Obtiene las correcciones existentes de la base de datos
      const existingCorrections = await this.prisma.brandCorrection.findMany({
        where: {
          originalName: { in: normalizedCorrections.map((c) => c.originalName) },
        },
        select: { originalName: true },
      });

      const existingNames = new Set(existingCorrections.map((c) => c.originalName));

      // Filtra las correcciones nuevas
      const newCorrections = normalizedCorrections.filter(
        (correction) => !existingNames.has(correction.originalName)
      );

      // Inserta solo las correcciones nuevas
      const createdCorrections = await this.prisma.brandCorrection.createMany({
        data: newCorrections,
      });

      return {
        success: true,
        message: `${createdCorrections.count} new brand corrections added successfully.`,
      };
    } catch (error) {
      console.error('Error adding brand corrections:', error.message);
      return { success: false, error: error.message };
    }
  }

  public async getAllBrands() {
    try {
      // Obtiene todas las lociones con sus marcas
      const lotions = await this.prisma.lotion.findMany({
        select: { brand: true },
      });

      // Obtiene las correcciones desde la base de datos
      const corrections = await this.prisma.brandCorrection.findMany();
      const correctionsMap = new Map(
        corrections.map((correction) => [correction.originalName, correction.correctedName])
      );

      // Normaliza y corrige las marcas
      const uniqueBrands = new Set<string>();

      lotions.forEach((lotion) => {
        const normalizedBrand = lotion.brand.trim().toLowerCase();
        const correctedBrand = correctionsMap.get(normalizedBrand) || normalizedBrand;
        uniqueBrands.add(correctedBrand);
      });

      return { success: true, data: Array.from(uniqueBrands).sort() };
    } catch (error) {
      console.error('Error fetching brands:', error.message);
      return { success: false, error: error.message };
    }
  }

  public async saveLotionHouses(brands: string[]) {
    try {
      // Normaliza las marcas para evitar duplicados
      const normalizedBrands = brands.map((brand) => brand.trim().toLowerCase());

      // Verifica las marcas que ya existen en la base de datos
      const existingHouses = await this.prisma.lotionHouse.findMany({
        where: {
          name: { in: normalizedBrands },
        },
        select: { name: true },
      });

      const existingHouseNames = new Set(
        existingHouses.map((house) => house.name)
      );

      // Filtra las marcas que no están en la base de datos
      const newBrands = normalizedBrands.filter(
        (brand) => !existingHouseNames.has(brand)
      );

      // Crea las nuevas casas de lociones en la base de datos una por una
      const createdHouses = await Promise.all(
        newBrands.map((brand) =>
          this.prisma.lotionHouse.create({
            data: { name: brand },
          })
        )
      );

      return {
        success: true,
        message: `${createdHouses.length} new lotion houses added successfully.`,
      };
    } catch (error) {
      console.error('Error saving lotion houses:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Método para actualizar una loción de la casa
  public async updateLotionHouse(
    id: string,
    data: { name?: string; logo?: Express.Multer.File },
  ) {
    try {
      // Prepara el objeto de datos con las propiedades que se proporcionan
      const updateData: any = {};

      // Normaliza el nombre si está presente
      if (data.name) {
        updateData.name = data.name.trim();
      }

      // Subir la imagen a Cloudinary si está presente
      if (data.logo) {
        const [uploadedLogoUrl] = await this.cloudinary.uploadFile(data.logo);
        updateData.logo = uploadedLogoUrl; // Guardar la URL subida
      }

      // Verifica que al menos uno de los campos (name o logo) esté presente para realizar la actualización
      if (Object.keys(updateData).length === 0) {
        throw new Error('No data to update');
      }

      // Actualiza la loción de la casa en la base de datos
      const updatedLotionHouse = await this.prisma.lotionHouse.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        data: updatedLotionHouse,
      };
    } catch (error) {
      console.error('Error updating lotion house:', error.message);
      return { success: false, error: error.message };
    }
  }

  public async getHousesLotions(page: number = 1) {
    try {
      const pageSize = 20; // 20 items per page
      const skip = (page - 1) * pageSize;

      // Obtener las casas con la paginación
      const houses = await this.prisma.lotionHouse.findMany({
        skip,
        take: pageSize,
      });

      // Obtener el total de registros
      const totalHouses = await this.prisma.lotionHouse.count();

      // Calcular el total de páginas
      const totalPages = Math.ceil(totalHouses / pageSize);

      return {
        success: true,
        data: houses,
        pagination: {
          totalHouses,
          totalPages,
          currentPage: page,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error fetching houses and lotions:', error.message);
        return { success: false, error: error.message };
      }
    }
  }

  public async getLotionsByHousesCarrousel() {
    try {
      // Realizamos la consulta a la base de datos con Prisma, limitando a las primeras 20
      const lotions = await this.prisma.lotionHouse.findMany({
        take: 20, // Limita a las primeras 20 lociones
        orderBy: {
          id: 'asc', // Ordena por el campo id en orden ascendente
        },
      });

      // Validación por si no se encuentran lociones
      if (lotions.length === 0) {
        return {
          success: false,
          message: 'No se encontraron lociones en la base de datos.',
        };
      }

      return { success: true, data: lotions };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error fetching lotions for carousel:', error.message);

        return {
          success: false,
          error: error.message,
          message: 'Hubo un problema al obtener las lociones. Inténtalo nuevamente más tarde.'
        };
      }

      // Por si el error no es una instancia de Error
      return {
        success: false,
        message: 'Ocurrió un error desconocido.'
      };
    }
  }

  public async getLotionsByHouses(brand: string, page: number = 1) {
    try {
      const pageSize = 20;
      const currentPage = Math.max(Number(page) || 1, 1);
      const skip = (currentPage - 1) * pageSize;

      // Limpiamos el nombre de la marca eliminando espacios innecesarios
      const cleanedBrand = brand.trim().toLowerCase();

      // Realizamos la consulta paginada a la base de datos con Prisma
      const [lotions, totalLotions] = await Promise.all([
        this.prisma.lotion.findMany({
          where: {
            brand: {
              equals: cleanedBrand,
              mode: 'insensitive',
            },
          },
          skip,
          take: pageSize, // Límite de lociones por página
        }),
        this.prisma.lotion.count({
          where: {
            brand: {
              equals: cleanedBrand,
              mode: 'insensitive',
            },
          },
        }),
      ]);

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
        console.error('Error fetching paginated lotions by brand:', error.message);
        return { success: false, error: error.message };
      }
    }
  }

  public async getLotionHouse(brand: string) {
    try {
      // Limpiamos el nombre de la marca eliminando espacios innecesarios
      const cleanedBrand = brand.trim().toLowerCase();

      // Consultamos la información de la LotionHouse asociada con la marca
      const lotionHouse = await this.prisma.lotionHouse.findFirst({
        where: {
          name: {
            equals: cleanedBrand,
            mode: 'insensitive',
          },
        },
      });

      // Verificamos si se encontró la LotionHouse
      if (!lotionHouse) {
        return {
          success: false,
          error: 'No se encontró la casa de loción para esta marca.',
        };
      }

      return {
        success: true,
        data: lotionHouse,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error fetching lotion house:', error.message);
        return { success: false, error: error.message };
      }
    }
  }
}
