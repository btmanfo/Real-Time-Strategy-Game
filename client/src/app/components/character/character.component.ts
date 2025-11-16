import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-character',
    imports: [CommonModule],
    templateUrl: './character.component.html',
    styleUrls: ['./character.component.scss'],
})
export class CharacterSelectionComponent {
    @Input() character!: { src: string; name: string };
    @Input() disabled: boolean = false;
    @Input() selectedCharacterSrc!: string | null;
    @Output() selected = new EventEmitter<string>();

    get isSelected(): boolean {
        return this.character.src === this.selectedCharacterSrc;
    }

    onSelect(): void {
        if (this.isSelected) {
            return;
        }

        this.selected.emit(this.character.src);
    }
}
