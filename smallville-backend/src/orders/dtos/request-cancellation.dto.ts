import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestCancellationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
