import { Tile } from '@common/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateGameDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    id: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    size: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    gameMode: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsBoolean()
    visibility: boolean;

    @ApiProperty()
    @IsArray()
    map: Tile[];

    @ApiProperty()
    @IsArray()
    map2: Tile[];

    @ApiProperty()
    @IsString()
    modificationDate: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    screenshot: string;
}
