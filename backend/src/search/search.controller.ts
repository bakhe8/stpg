import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtGuard } from '../identity/auth/jwt.guard';

@Controller('search')
@UseGuards(JwtGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async globalSearch(@Query('q') query: string) {
    if (!query) return [];
    
    // In a real app, you might want to search across multiple indices and aggregate
    const entities = await this.searchService.search('entities', query);
    
    return {
      entities,
      // members, rules, etc.
    };
  }
}
