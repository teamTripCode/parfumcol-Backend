import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import Fuse from 'fuse.js';
import { SearchOptions } from './dto/create-search.dto';



@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService
  ) { }

  private async getAllLotions() {
    return await this.prisma.lotion.findMany();
  }

  private getFuseInstance(data: any[]) {
    return new Fuse(data, {
      keys: ['name', 'brand'],
      threshold: 0.3,  // valor para controlar la precisión (0 = coincidencia exacta, 1 = coincidencia muy flexible)
      includeScore: true,
      useExtendedSearch: true,
      ignoreLocation: true,
      shouldSort: true,
      findAllMatches: true,
    })
  }

  public async enhancedSearch({
    name,
    brand,
    chords,
    priceOrder = 'asc',
    page = 1,
    pageSize = 20,
    genre,
  }: SearchOptions) {
    try {
      let lotions = await this.getAllLotions();

      // Filtro por género si está especificado
      if (genre) lotions = lotions.filter(lotion => lotion.genre === genre);

      // Búsqueda difusa si hay nombre o marca
      if (name || brand) {
        const fuse = this.getFuseInstance(lotions);
        const searchPattern = [];

        if (name) searchPattern.push({ name: name.trim() });
        if (brand) searchPattern.push({ brand: brand.trim() });

        const searchResult = fuse.search({ $or: searchPattern });

        // Filtrar por score para mantener solo resultados relevantes
        lotions = searchResult
          .filter(result => result.score && result.score < 0.4)
          .map(result => result.item);
      }

      // Aplicar filtro de acordes
      if (chords && chords.length > 0) {
        const normalizedChords = chords.map(chords => chords.trim().toLowerCase());
        lotions = lotions.filter(lotion =>
          normalizedChords.some(chord =>
            lotion.chords.map(c => c.toLowerCase()).includes(chord)
          )
        );
      }

      // ordenar por precio
      lotions.sort((a, b) => {
        return priceOrder === 'asc' ? a.price - b.price : b.price - a.price;
      });

      const totalCount = lotions.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const skip = (page - 1) * pageSize;
      const paginatedLotions = lotions.slice(skip, skip + pageSize);

      if (paginatedLotions.length === 0) {
        return {
          success: false,
          message: 'No lotions found with the given parameters',
          pagination: {
            page,
            totalPages,
            totalCount,
          },
        };
      }

      return {
        success: true,
        data: paginatedLotions,
        pagination: {
          page,
          totalPages,
          totalCount,
        },
      };

    } catch (error) {
      if (error instanceof Error) {
        console.error('Error in enhanced search: ', error.message)
        return {
          success: false,
          error: error.message,
          pagination: {
            page,
            totalPages: 0,
            totalCount: 0,
          },
        };
      }
    }
  }

  public async getSearchSuggestions(query: string, limit: number = 5) {
    try {
      const lotions = await this.getAllLotions();
      const fuse = this.getFuseInstance(lotions);

      const results = fuse.search(query, { limit });

      return {
        success: true,
        data: results.map(result => ({
          name: result.item.name,
          brand: result.item.brand,
          score: result.score,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
