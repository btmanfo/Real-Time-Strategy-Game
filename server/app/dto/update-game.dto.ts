import { Tile } from '@common/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateGameDto {
    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    id: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    size?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    gameMode?: string;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsBoolean()
    visibility: boolean;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    map: Tile[];

    @ApiProperty({ required: true })
    @IsNotEmpty()
    map2: Tile[];

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    modificationDate: string;

    @ApiProperty({ required: true })
    @IsNotEmpty()
    @IsString()
    screenshot: string;
}
