import { Tile } from '@common/interfaces';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

@Schema()
export class Game {
    @Prop()
    @IsUUID()
    id: string;

    @Prop({ required: true, trim: true, maxlength: 100 })
    description: string;

    @Prop({ required: true, trim: true, unique: true })
    name: string;

    @Prop({ required: true, enum: ['Grande Taille', 'Moyenne Taille', 'Petite Taille'], default: 'Moyenne Taille' })
    size: string;

    @Prop({ required: true, enum: ['Classique', 'CTF'], default: 'Classique' })
    gameMode: string;

    @Prop({ required: true, default: false })
    visibility: boolean;

    @Prop({ required: true })
    @IsArray()
    @ArrayMinSize(1, { message: 'The map must contain at least one tile.' })
    @ValidateNested({ each: true })
    map: Tile[];

    @Prop({ required: true })
    @IsArray()
    @ArrayMinSize(1, { message: 'The map2 must contain at least one tile.' })
    @ValidateNested({ each: true })
    map2: Tile[];

    @Prop({ default: () => new Date().toISOString() })
    modificationDate: string;

    @Prop({ required: true })
    screenshot: string;
}

export const gameSchema = SchemaFactory.createForClass(Game);
