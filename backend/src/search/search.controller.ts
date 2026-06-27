import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtGuard } from '../identity/auth/jwt.guard';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';

@Controller('search')
@UseGuards(JwtGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async globalSearch(
    @Query('q') query: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!query) return [];
    const entities = await this.searchService.searchEntities(query, user.id);

    return {
      entities,
      // members, rules, etc.
    };
  }
}
