import { Position } from '../types';


// Returns a random integer within the givin range

export const randomInRange = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;



// Finds a position that doen't overlap with existing position

export const findNonOverlappingPosition = (
    existing: Position[],
    padding = 40,
    minDist = 50,
    maxAttempts = 200,
    width = 780,
    height = 540
): Position => {

    // Try multiple times to find a valid position
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const x = randomInRange(padding, width - padding);
        const y = randomInRange(padding, height - padding);
        
        let overlap = false;


        // Check the distance against all existing position
        for (const pos of existing) {
            const dx = pos.x - x;
            const dy = pos.y - y;

            // Mark as overlapping if too close
            if (Math.sqrt(dx * dx + dy * dy) < minDist) {
                overlap = true;
                break;
            }
        }

        // Rturn position if no overlap found
        if (!overlap) return { x, y };
    }

    // Fallback, return any random position if any attempt fails!
    return { x: randomInRange(padding, width - padding), y: randomInRange(padding, height - padding) };
};