import { Position } from '../types';

export const randomInRange = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

export const findNonOverlappingPosition = (
    existing: Position[],
    padding = 40,
    minDist = 50,
    maxAttempts = 200,
    width = 780,
    height = 540
): Position => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const x = randomInRange(padding, width - padding);
        const y = randomInRange(padding, height - padding);
        let overlap = false;
        for (const pos of existing) {
            const dx = pos.x - x;
            const dy = pos.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < minDist) {
                overlap = true;
                break;
            }
        }
        if (!overlap) return { x, y };
    }
    return { x: randomInRange(padding, width - padding), y: randomInRange(padding, height - padding) };
};